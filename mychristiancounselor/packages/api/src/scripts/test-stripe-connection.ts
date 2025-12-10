import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_PREMIUM_MONTHLY_PRICE_ID = process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID;
const STRIPE_PREMIUM_ANNUAL_PRICE_ID = process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID;
const STRIPE_ORG_GRADUATED_PRICE_ID = process.env.STRIPE_ORG_GRADUATED_PRICE_ID;

async function testStripeConnection() {
  console.log('🔍 Testing Stripe Connection...\n');
  console.log('═══════════════════════════════════════════════════════════════');

  // Check if API key is configured
  if (!STRIPE_SECRET_KEY) {
    console.error('❌ STRIPE_SECRET_KEY not found in environment variables');
    process.exit(1);
  }

  console.log('✅ Stripe API Key found:', STRIPE_SECRET_KEY.substring(0, 20) + '...');
  console.log('');

  // Initialize Stripe
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover',
  });

  try {
    // Test 1: List all products
    console.log('📦 Fetching Products...');
    console.log('───────────────────────────────────────────────────────────────');
    const products = await stripe.products.list({ limit: 10, active: true });

    if (products.data.length === 0) {
      console.log('⚠️  No products found in Stripe');
    } else {
      console.log(`✅ Found ${products.data.length} product(s):\n`);
      products.data.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`);
        console.log(`   ID: ${product.id}`);
        console.log(`   Description: ${product.description || 'N/A'}`);
        console.log(`   Active: ${product.active}`);
        console.log('');
      });
    }

    // Test 2: List all prices
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💰 Fetching Prices...');
    console.log('───────────────────────────────────────────────────────────────');
    const prices = await stripe.prices.list({ limit: 20, active: true });

    if (prices.data.length === 0) {
      console.log('⚠️  No prices found in Stripe');
    } else {
      console.log(`✅ Found ${prices.data.length} price(s):\n`);
      prices.data.forEach((price, index) => {
        const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
        const currency = price.currency?.toUpperCase() || 'N/A';
        const interval = price.recurring ? `/${price.recurring.interval}` : 'one-time';

        console.log(`${index + 1}. ${price.nickname || 'Unnamed Price'}`);
        console.log(`   Price ID: ${price.id}`);
        console.log(`   Product ID: ${price.product}`);
        console.log(`   Amount: ${amount} ${currency} ${interval}`);
        console.log(`   Active: ${price.active}`);
        console.log('');
      });
    }

    // Test 3: Validate configured price IDs
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔍 Validating Configured Price IDs...');
    console.log('───────────────────────────────────────────────────────────────');

    const configuredPrices = [
      { name: 'Premium Monthly', id: STRIPE_PREMIUM_MONTHLY_PRICE_ID },
      { name: 'Premium Annual', id: STRIPE_PREMIUM_ANNUAL_PRICE_ID },
      { name: 'Organization Graduated', id: STRIPE_ORG_GRADUATED_PRICE_ID },
    ];

    for (const { name, id } of configuredPrices) {
      if (!id) {
        console.log(`⚠️  ${name}: Not configured in .env`);
        continue;
      }

      try {
        const price = await stripe.prices.retrieve(id);
        const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
        const currency = price.currency?.toUpperCase() || 'N/A';
        const interval = price.recurring ? `/${price.recurring.interval}` : 'one-time';

        console.log(`✅ ${name}:`);
        console.log(`   Price ID: ${id}`);
        console.log(`   Amount: ${amount} ${currency} ${interval}`);
        console.log(`   Active: ${price.active}`);

        // Get product details
        if (typeof price.product === 'string') {
          const product = await stripe.products.retrieve(price.product);
          console.log(`   Product: ${product.name}`);
        }
        console.log('');
      } catch (error: any) {
        console.log(`❌ ${name}: Invalid price ID (${id})`);
        console.log(`   Error: ${error.message}`);
        console.log('');
      }
    }

    // Test 4: Test API connectivity with account info
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🏢 Account Information...');
    console.log('───────────────────────────────────────────────────────────────');
    const account = await stripe.accounts.retrieve();
    console.log(`✅ Connected to Stripe Account`);
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Type: ${account.type}`);
    console.log(`   Email: ${account.email || 'N/A'}`);
    console.log(`   Country: ${account.country || 'N/A'}`);
    console.log(`   Charges Enabled: ${account.charges_enabled}`);
    console.log(`   Payouts Enabled: ${account.payouts_enabled || 'N/A'}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ Stripe connection test completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error: any) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('❌ Stripe Connection Test Failed');
    console.error('───────────────────────────────────────────────────────────────');
    console.error('Error:', error.message);
    if (error.type) {
      console.error('Type:', error.type);
    }
    if (error.code) {
      console.error('Code:', error.code);
    }
    console.error('═══════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Run the test
testStripeConnection();
