import Stripe from 'stripe';

// Use the live key provided by user
const STRIPE_LIVE_KEY = 'REDACTED_STRIPE_KEY';

async function getLivePrices() {
  console.log('🔍 Fetching Live Stripe Prices...\n');
  console.log('═══════════════════════════════════════════════════════════════');

  const stripe = new Stripe(STRIPE_LIVE_KEY, {
    apiVersion: '2025-11-17.clover',
  });

  try {
    // Fetch all active prices
    const prices = await stripe.prices.list({
      active: true,
      limit: 20,
      expand: ['data.product']
    });

    if (prices.data.length === 0) {
      console.log('⚠️  No prices found in Live mode');
      console.log('\nYou need to create prices in Stripe Dashboard:');
      console.log('https://dashboard.stripe.com/prices\n');
      return;
    }

    console.log(`✅ Found ${prices.data.length} live price(s):\n`);

    prices.data.forEach((price, index) => {
      const product = price.product as Stripe.Product;
      const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : 'N/A';
      const currency = price.currency?.toUpperCase() || 'N/A';
      const interval = price.recurring
        ? `${price.recurring.interval}ly`
        : 'one-time';

      console.log(`${index + 1}. ${product.name || 'Unnamed Product'}`);
      console.log(`   Price ID: ${price.id}`);
      console.log(`   Product ID: ${product.id}`);
      console.log(`   Amount: $${amount} ${currency} (${interval})`);
      console.log(`   Nickname: ${price.nickname || 'N/A'}`);
      console.log(`   Active: ${price.active}`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📋 Copy these Price IDs to your environment:');
    console.log('───────────────────────────────────────────────────────────────');

    // Try to identify which is which
    const monthly = prices.data.find(p =>
      p.recurring?.interval === 'month' ||
      p.nickname?.toLowerCase().includes('monthly')
    );

    const annual = prices.data.find(p =>
      p.recurring?.interval === 'year' ||
      p.nickname?.toLowerCase().includes('annual') ||
      p.nickname?.toLowerCase().includes('yearly')
    );

    const group = prices.data.find(p => {
      const product = p.product as Stripe.Product;
      return product.name?.toLowerCase().includes('group') ||
             product.name?.toLowerCase().includes('organization') ||
             p.nickname?.toLowerCase().includes('group') ||
             p.nickname?.toLowerCase().includes('org');
    });

    if (monthly) {
      console.log(`STRIPE_PREMIUM_MONTHLY_PRICE_ID="${monthly.id}"`);
    }
    if (annual) {
      console.log(`STRIPE_PREMIUM_ANNUAL_PRICE_ID="${annual.id}"`);
    }
    if (group) {
      console.log(`STRIPE_ORG_GRADUATED_PRICE_ID="${group.id}"`);
    }

    if (!monthly || !annual || !group) {
      console.log('\n⚠️  Could not automatically identify all price IDs.');
      console.log('Please manually match them from the list above.');
    }

    console.log('═══════════════════════════════════════════════════════════════');

  } catch (error: any) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('❌ Failed to Fetch Live Prices');
    console.error('───────────────────────────────────────────────────────────────');
    console.error('Error:', error.message);
    if (error.type) {
      console.error('Type:', error.type);
    }
    console.error('═══════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

// Run the script
getLivePrices();
