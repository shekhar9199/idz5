import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.list({ limit: 100 });
  const existingNames = existingProducts.data.map(p => p.name);

  const plans = [
    {
      name: 'One Time Ads Setup',
      description: 'Complete one-time Facebook & Instagram ad campaign setup with targeting, creatives, and launch',
      amount: 34900,
      metadata: { plan_type: 'one-time', plan_key: 'one-time' },
    },
    {
      name: 'Manage Ads - 1 Week',
      description: 'Ongoing ad management with optimization, monitoring & performance tracking for 1 week',
      amount: 49900,
      metadata: { plan_type: 'manage', plan_key: 'manage-weekly', duration: '1 Week' },
    },
    {
      name: 'Manage Ads - 15 Days',
      description: 'Ongoing ad management with optimization, monitoring & performance tracking for 15 days',
      amount: 84900,
      metadata: { plan_type: 'manage', plan_key: 'manage-15days', duration: '15 Days' },
    },
    {
      name: 'Manage Ads - 1 Month',
      description: 'Ongoing ad management with optimization, monitoring & performance tracking for 1 month',
      amount: 149900,
      metadata: { plan_type: 'manage', plan_key: 'manage-monthly', duration: '1 Month' },
    },
  ];

  for (const plan of plans) {
    if (existingNames.includes(plan.name)) {
      console.log(`Skipping "${plan.name}" - already exists`);
      continue;
    }

    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: 'inr',
    });

    console.log(`Created: ${plan.name} -> Product: ${product.id}, Price: ${price.id}`);
  }

  console.log('Done seeding products.');
}

createProducts().catch(console.error);
