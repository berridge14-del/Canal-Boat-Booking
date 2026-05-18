require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;
const siteUrl = process.env.SITE_URL || `http://localhost:${port}`;

const stripe = process.env.STRIPE_SECRET_KEY
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })
  : null;

app.use(cors({ origin: true }));

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Stripe webhook is not configured.');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  if (event.type === 'checkout.session.completed' && supabase) {
    const session = event.data.object;
    await supabase
      .from('booking_enquiries')
      .update({
        status: 'deposit_paid',
        stripe_payment_intent_id: session.payment_intent || null,
        paid_at: new Date().toISOString()
      })
      .eq('stripe_checkout_session_id', session.id);
  }

  res.json({ received: true });
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

const toIntegerPounds = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0;
};

function requireSupabase(res) {
  if (!supabase) {
    res.status(503).json({ error: 'Supabase is not configured on the server.' });
    return false;
  }
  return true;
}

function requireStripe(res) {
  if (!stripe) {
    res.status(503).json({ error: 'Stripe is not configured on the server.' });
    return false;
  }
  return true;
}

function bookingPayload(body) {
  return {
    arrival_date: body.arrivalDate || null,
    checkout_date: body.checkoutDate || null,
    nights: Number(body.nights) || null,
    guest_count: Number(body.guestCount) || null,
    estimated_total: toIntegerPounds(body.estimatedTotal),
    season: body.season || null,
    customer_name: body.name || null,
    customer_email: body.email || null,
    customer_phone: body.phone || null,
    message: body.message || null
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    supabase: Boolean(supabase),
    stripe: Boolean(stripe)
  });
});

app.post('/api/messages', async (req, res) => {
  if (!requireSupabase(res)) return;

  const message = String(req.body.message || '').trim();
  if (!message) {
    return res.status(400).json({ error: 'Please add a short message for the concierge.' });
  }

  const booking = bookingPayload(req.body);
  const { data: enquiry, error: enquiryError } = await supabase
    .from('booking_enquiries')
    .insert(booking)
    .select('id')
    .single();

  if (enquiryError) {
    return res.status(500).json({ error: enquiryError.message });
  }

  const { error: messageError } = await supabase
    .from('concierge_messages')
    .insert({
      enquiry_id: enquiry.id,
      customer_name: booking.customer_name,
      customer_email: booking.customer_email,
      customer_phone: booking.customer_phone,
      message,
      source: 'website'
    });

  if (messageError) {
    return res.status(500).json({ error: messageError.message });
  }

  res.json({ ok: true, enquiryId: enquiry.id });
});

app.post('/api/create-checkout-session', async (req, res) => {
  if (!requireSupabase(res) || !requireStripe(res)) return;

  const totalPounds = toIntegerPounds(req.body.estimatedTotal);
  if (!totalPounds) {
    return res.status(400).json({ error: 'Select dates before securing a deposit.' });
  }

  const depositPounds = Math.max(50, Math.round(totalPounds * 0.25));
  const booking = bookingPayload(req.body);
  booking.status = 'checkout_started';

  const { data: enquiry, error: enquiryError } = await supabase
    .from('booking_enquiries')
    .insert(booking)
    .select('id')
    .single();

  if (enquiryError) {
    return res.status(500).json({ error: enquiryError.message });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: depositPounds * 100,
          product_data: {
            name: 'Rest & Roam Mystery Mooring deposit',
            description: `${booking.nights || ''} night stay from ${booking.arrival_date || 'selected arrival'}`
          }
        }
      }
    ],
    metadata: {
      enquiry_id: enquiry.id,
      arrival_date: booking.arrival_date || '',
      checkout_date: booking.checkout_date || '',
      estimated_total: String(totalPounds)
    },
    success_url: `${siteUrl}/index.html?booking=deposit-secured&session_id={CHECKOUT_SESSION_ID}#booking`,
    cancel_url: `${siteUrl}/index.html?booking=deposit-cancelled#booking`
  });

  await supabase
    .from('booking_enquiries')
    .update({ stripe_checkout_session_id: session.id })
    .eq('id', enquiry.id);

  res.json({ url: session.url, enquiryId: enquiry.id });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Rest & Roam server running at ${siteUrl}`);
});
