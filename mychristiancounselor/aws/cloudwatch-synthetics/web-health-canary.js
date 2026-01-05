/**
 * CloudWatch Synthetics Canary - Web Application Health Testing
 *
 * This canary runs comprehensive tests on the Web application to ensure:
 * - Homepage loads successfully
 * - Login page accessible
 * - Response times are acceptable
 * - No critical errors in page load
 *
 * Cost: ~$10/month for 5-minute checks
 */

// AWS CloudWatch Synthetics runtime modules (provided by Lambda environment)
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const https = require('https');
const http = require('http');
const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatch({ region: 'us-east-2' });

// Configuration
const WEB_BASE_URL = 'https://www.mychristiancounselor.online';
const MAX_RESPONSE_TIME_MS = 10000; // Alert if response takes longer than 10 seconds

// Apdex Configuration (Application Performance Index)
const APDEX_THRESHOLD = 2000; // 2 seconds - satisfied threshold
const APDEX_TOLERATING_THRESHOLD = 8000; // 8 seconds - 4x threshold

// Performance tracking
const performanceMetrics = {
  homepage: null,
  login: null,
  apdexScore: 0,
  totalRequests: 0,
  satisfiedRequests: 0,
  toleratingRequests: 0,
  frustratedRequests: 0,
};

/**
 * Calculate Apdex category for a response time
 */
const calculateApdexCategory = (responseTime) => {
  if (responseTime <= APDEX_THRESHOLD) {
    return 'satisfied';
  } else if (responseTime <= APDEX_TOLERATING_THRESHOLD) {
    return 'tolerating';
  } else {
    return 'frustrated';
  }
};

/**
 * Record performance metric for Apdex calculation
 */
const recordPerformance = (pageName, responseTime) => {
  performanceMetrics.totalRequests++;

  const category = calculateApdexCategory(responseTime);

  if (category === 'satisfied') {
    performanceMetrics.satisfiedRequests++;
  } else if (category === 'tolerating') {
    performanceMetrics.toleratingRequests++;
  } else {
    performanceMetrics.frustratedRequests++;
  }

  performanceMetrics[pageName] = {
    responseTime,
    category,
  };

  log.info(`   Performance: ${pageName} = ${responseTime}ms (${category})`);
};

/**
 * Calculate Apdex score
 */
const calculateApdexScore = () => {
  if (performanceMetrics.totalRequests === 0) {
    return 0;
  }

  const score = (
    performanceMetrics.satisfiedRequests +
    (performanceMetrics.toleratingRequests / 2)
  ) / performanceMetrics.totalRequests;

  return score;
};

/**
 * Send custom metrics to CloudWatch
 */
const sendMetricsToCloudWatch = async () => {
  const apdexScore = calculateApdexScore();

  const params = {
    Namespace: 'MyChristianCounselor/Web',
    MetricData: [
      {
        MetricName: 'ApdexScore',
        Value: apdexScore,
        Unit: 'None',
        Timestamp: new Date(),
      },
      {
        MetricName: 'HomepageResponseTime',
        Value: performanceMetrics.homepage?.responseTime || 0,
        Unit: 'Milliseconds',
        Timestamp: new Date(),
      },
      {
        MetricName: 'LoginPageResponseTime',
        Value: performanceMetrics.login?.responseTime || 0,
        Unit: 'Milliseconds',
        Timestamp: new Date(),
      },
      {
        MetricName: 'SatisfiedRequests',
        Value: performanceMetrics.satisfiedRequests,
        Unit: 'Count',
        Timestamp: new Date(),
      },
      {
        MetricName: 'ToleratingRequests',
        Value: performanceMetrics.toleratingRequests,
        Unit: 'Count',
        Timestamp: new Date(),
      },
      {
        MetricName: 'FrustratedRequests',
        Value: performanceMetrics.frustratedRequests,
        Unit: 'Count',
        Timestamp: new Date(),
      },
    ],
  };

  try {
    await cloudwatch.putMetricData(params).promise();
    log.info(`✓ Metrics sent to CloudWatch (Apdex: ${apdexScore.toFixed(3)})`);
  } catch (error) {
    log.error(`Failed to send metrics to CloudWatch: ${error.message}`);
  }
};

/**
 * Make HTTP/HTTPS request
 */
const makeRequest = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, WEB_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'User-Agent': 'CloudWatch-Synthetics',
        ...headers,
      },
      timeout: MAX_RESPONSE_TIME_MS,
    };

    const startTime = Date.now();

    const req = lib.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime,
        });
      });
    });

    req.on('error', (error) => {
      const responseTime = Date.now() - startTime;
      error.responseTime = responseTime;
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${MAX_RESPONSE_TIME_MS}ms`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
};

/**
 * Test 1: Homepage Load
 */
const testHomepage = async () => {
  log.info('═══════════════════════════════════════');
  log.info('Test 1: Homepage Load');
  log.info('═══════════════════════════════════════');

  const response = await makeRequest('GET', '/');

  // Check HTTP status
  if (response.statusCode !== 200) {
    throw new Error(`Homepage returned status ${response.statusCode}`);
  }

  // Check for critical content
  if (!response.body.includes('MyChristianCounselor')) {
    throw new Error('Homepage missing expected content');
  }

  // Check response time
  if (response.responseTime > MAX_RESPONSE_TIME_MS) {
    throw new Error(`Homepage took ${response.responseTime}ms (max: ${MAX_RESPONSE_TIME_MS}ms)`);
  }

  // Record performance for Apdex calculation
  recordPerformance('homepage', response.responseTime);

  log.info(`✓ Homepage loaded successfully (${response.responseTime}ms)`);
  return response.responseTime;
};

/**
 * Test 2: Login Page
 */
const testLoginPage = async () => {
  log.info('═══════════════════════════════════════');
  log.info('Test 2: Login Page');
  log.info('═══════════════════════════════════════');

  const response = await makeRequest('GET', '/login');

  // Check HTTP status
  if (response.statusCode !== 200) {
    throw new Error(`Login page returned status ${response.statusCode}`);
  }

  // Check for login form elements
  if (!response.body.includes('login') && !response.body.includes('email')) {
    throw new Error('Login page missing expected form elements');
  }

  // Record performance for Apdex calculation
  recordPerformance('login', response.responseTime);

  log.info(`✓ Login page accessible (${response.responseTime}ms)`);
  return response.responseTime;
};

/**
 * Test 3: Performance Check
 */
const testPerformance = async (homepageResponseTime) => {
  log.info('═══════════════════════════════════════');
  log.info('Test 3: Performance Check');
  log.info('═══════════════════════════════════════');

  const PERFORMANCE_THRESHOLD = 5000; // 5 seconds

  if (homepageResponseTime > PERFORMANCE_THRESHOLD) {
    throw new Error(
      `Homepage response time (${homepageResponseTime}ms) exceeds threshold (${PERFORMANCE_THRESHOLD}ms)`
    );
  }

  log.info(`✓ Performance acceptable (${homepageResponseTime}ms < ${PERFORMANCE_THRESHOLD}ms)`);
};

/**
 * Test 4: Static Assets
 */
const testStaticAssets = async () => {
  log.info('═══════════════════════════════════════');
  log.info('Test 4: Static Assets');
  log.info('═══════════════════════════════════════');

  // Test favicon (common asset that should always be there)
  const response = await makeRequest('GET', '/favicon.ico');

  // Accept 200 or 404 (some sites don't have favicon, but should respond)
  if (response.statusCode !== 200 && response.statusCode !== 404) {
    throw new Error(`Static asset check returned unexpected status ${response.statusCode}`);
  }

  log.info(`✓ Static assets responding (${response.responseTime}ms)`);
};

/**
 * Main canary handler
 */
const webHealthTest = async function () {
  log.info('');
  log.info('═══════════════════════════════════════════════════════');
  log.info('🔍 CloudWatch Synthetics - Web Health Check');
  log.info(`   Target: ${WEB_BASE_URL}`);
  log.info(`   Timestamp: ${new Date().toISOString()}`);
  log.info('═══════════════════════════════════════════════════════');
  log.info('');

  try {
    // Test 1: Homepage
    const homepageResponseTime = await testHomepage();

    // Test 2: Login Page
    await testLoginPage();

    // Test 3: Performance
    await testPerformance(homepageResponseTime);

    // Test 4: Static Assets
    await testStaticAssets();

    // Send performance metrics to CloudWatch
    await sendMetricsToCloudWatch();

    log.info('');
    log.info('═══════════════════════════════════════════════════════');
    log.info('✅ ALL TESTS PASSED');
    log.info(`   Apdex Score: ${calculateApdexScore().toFixed(3)}`);
    log.info(`   Satisfied: ${performanceMetrics.satisfiedRequests}, Tolerating: ${performanceMetrics.toleratingRequests}, Frustrated: ${performanceMetrics.frustratedRequests}`);
    log.info('═══════════════════════════════════════════════════════');
    log.info('');

  } catch (error) {
    // Still send metrics even if tests failed
    try {
      await sendMetricsToCloudWatch();
    } catch (metricsError) {
      log.error(`Failed to send metrics: ${metricsError.message}`);
    }

    log.error('');
    log.error('═══════════════════════════════════════════════════════');
    log.error('❌ CANARY FAILED');
    log.error('═══════════════════════════════════════════════════════');
    log.error(`Error: ${error.message}`);
    log.error(`Stack: ${error.stack}`);
    log.error('═══════════════════════════════════════════════════════');
    log.error('');
    throw error;
  }
};

exports.handler = async () => {
  // Execute the web health test
  await webHealthTest();
};
