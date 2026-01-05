/**
 * CloudWatch Synthetics Canary - Comprehensive API Health Testing
 *
 * This canary runs comprehensive tests on the API to ensure it's not just "up"
 * but actually functioning correctly. Tests include:
 * - /health/ready endpoint with component health checks
 * - CORS headers
 * - Response times
 * - Optional: Authentication flow (uncomment to enable)
 *
 * Cost: ~$10/month for 5-minute checks
 * Better than UptimeRobot because it actually tests API functionality
 */

// AWS CloudWatch Synthetics runtime modules (provided by Lambda environment)
const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const https = require('https');
const http = require('http');

// Configuration
const API_BASE_URL = 'https://api.mychristiancounselor.online';
const WEB_ORIGIN = 'https://www.mychristiancounselor.online';
const MAX_RESPONSE_TIME_MS = 5000; // Alert if response takes longer than 5 seconds

/**
 * Make HTTP/HTTPS request
 */
const makeRequest = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CloudWatch-Synthetics-Canary',
        ...headers,
      },
      timeout: MAX_RESPONSE_TIME_MS,
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const startTime = Date.now();
    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const responseTime = Date.now() - startTime;

        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = data;
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsedData,
          responseTime,
        });
      });
    });

    req.on('error', (error) => {
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
 * Test 1: Health Ready Endpoint
 * Verifies all components (database, Redis, environment) are healthy
 */
const testHealthReady = async () => {
  log.info('═══════════════════════════════════════');
  log.info('Test 1: Health Ready Endpoint');
  log.info('═══════════════════════════════════════');

  const response = await makeRequest('GET', '/health/ready');

  // Check HTTP status
  if (response.statusCode !== 200) {
    throw new Error(`Health check failed with status ${response.statusCode}: ${JSON.stringify(response.body)}`);
  }

  // Check response time
  log.info(`Response time: ${response.responseTime}ms`);
  if (response.responseTime > MAX_RESPONSE_TIME_MS) {
    log.warn(`⚠️  Response time exceeded ${MAX_RESPONSE_TIME_MS}ms`);
  }

  // Verify status is "ready"
  if (response.body.status !== 'ready') {
    throw new Error(`Health status is "${response.body.status}", expected "ready". Response: ${JSON.stringify(response.body)}`);
  }

  // Verify all component checks exist and are healthy
  const checks = response.body.checks || [];
  const requiredChecks = ['database', 'redis', 'environment'];

  for (const checkName of requiredChecks) {
    const check = checks.find(c => c.name === checkName);

    if (!check) {
      throw new Error(`Missing health check: ${checkName}`);
    }

    if (check.status !== 'healthy') {
      throw new Error(`Health check "${checkName}" is ${check.status}: ${check.error || 'No error message'}`);
    }

    log.info(`  ✅ ${checkName}: healthy (${check.responseTime}ms)`);
  }

  log.info('✅ Health Ready: PASSED');
  return response.responseTime;
};

/**
 * Test 2: CORS Headers
 * Verifies API properly handles CORS for web app
 */
const testCORS = async () => {
  log.info('═══════════════════════════════════════');
  log.info('Test 2: CORS Headers');
  log.info('═══════════════════════════════════════');

  const response = await makeRequest('GET', '/health', null, {
    'Origin': WEB_ORIGIN,
  });

  // Check for CORS headers
  const corsHeader = response.headers['access-control-allow-origin'];

  if (!corsHeader) {
    throw new Error('Missing access-control-allow-origin header');
  }

  // Verify CORS header allows our web app origin
  if (corsHeader !== WEB_ORIGIN && corsHeader !== '*') {
    throw new Error(`CORS header is "${corsHeader}", expected "${WEB_ORIGIN}" or "*"`);
  }

  log.info(`  ✅ CORS header present: ${corsHeader}`);
  log.info('✅ CORS: PASSED');
};

/**
 * Test 3: Response Time Performance
 * Verifies API responds within acceptable time
 */
const testPerformance = async (healthResponseTime) => {
  log.info('═══════════════════════════════════════');
  log.info('Test 3: Performance Check');
  log.info('═══════════════════════════════════════');

  const maxAcceptableTime = 3000; // 3 seconds
  const warningTime = 2000; // 2 seconds

  if (healthResponseTime > maxAcceptableTime) {
    throw new Error(`Performance degraded: ${healthResponseTime}ms exceeds ${maxAcceptableTime}ms threshold`);
  }

  if (healthResponseTime > warningTime) {
    log.warn(`⚠️  Response time ${healthResponseTime}ms exceeds warning threshold of ${warningTime}ms`);
  } else {
    log.info(`  ✅ Response time acceptable: ${healthResponseTime}ms`);
  }

  log.info('✅ Performance: PASSED');
};

/**
 * Optional Test 4: Authentication Flow
 * Uncomment to test login endpoint (requires test credentials)
 */
/*
const testAuthentication = async () => {
  log.info('═══════════════════════════════════════');
  log.info('Test 4: Authentication Flow');
  log.info('═══════════════════════════════════════');

  // Note: You need to create a dedicated test account for this
  const testCredentials = {
    email: process.env.TEST_USER_EMAIL || 'canary-test@example.com',
    password: process.env.TEST_USER_PASSWORD || 'test-password'
  };

  const response = await makeRequest('POST', '/auth/login', testCredentials);

  if (response.statusCode !== 200 && response.statusCode !== 201) {
    throw new Error(`Authentication failed with status ${response.statusCode}`);
  }

  if (!response.body.accessToken) {
    throw new Error('Authentication response missing accessToken');
  }

  log.info('  ✅ Login successful, token received');

  // Test authenticated endpoint
  const profileResponse = await makeRequest('GET', '/profile', null, {
    'Authorization': `Bearer ${response.body.accessToken}`
  });

  if (profileResponse.statusCode !== 200) {
    throw new Error(`Profile fetch failed with status ${profileResponse.statusCode}`);
  }

  log.info('  ✅ Authenticated request successful');
  log.info('✅ Authentication: PASSED');
};
*/

/**
 * Main canary handler
 */
const apiHealthTest = async function () {
  log.info('');
  log.info('═══════════════════════════════════════════════════════');
  log.info('🔍 CloudWatch Synthetics - API Health Check');
  log.info(`   Target: ${API_BASE_URL}`);
  log.info(`   Timestamp: ${new Date().toISOString()}`);
  log.info('═══════════════════════════════════════════════════════');
  log.info('');

  try {
    // Test 1: Health Ready
    const healthResponseTime = await testHealthReady();

    // Test 2: CORS
    await testCORS();

    // Test 3: Performance
    await testPerformance(healthResponseTime);

    // Optional Test 4: Authentication (uncomment to enable)
    // await testAuthentication();

    log.info('');
    log.info('═══════════════════════════════════════════════════════');
    log.info('✅ ALL TESTS PASSED');
    log.info('═══════════════════════════════════════════════════════');
    log.info('');

  } catch (error) {
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
  // Execute the API health test
  await apiHealthTest();
};
