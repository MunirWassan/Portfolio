import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5174;
const MONERIS_URL = process.env.MONERIS_URL || 'https://gateway.moneris.com/chkt/request/request.php';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

app.use(express.json());
app.use(express.static(ROOT_DIR));

function validateEnv() {
  const missing = [];
  if (!process.env.MONERIS_STORE_ID) missing.push('MONERIS_STORE_ID');
  if (!process.env.MONERIS_API_TOKEN) missing.push('MONERIS_API_TOKEN');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

function buildCheckoutPayload(body = {}) {
  const { amount, orderId, transactionType } = body;
  if (!amount) {
    throw new Error('Amount is required.');
  }

  validateEnv();

  const checkoutId = body.checkoutId || `demo-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const environment = (process.env.MONERIS_ENV || 'qa').toLowerCase();

  return {
    request: {
      store_id: process.env.MONERIS_STORE_ID,
      api_token: process.env.MONERIS_API_TOKEN,
      checkout_id: checkoutId,
      txn_total: Number(amount).toFixed(2),
      transaction_type: (transactionType || 'purchase').toLowerCase(),
      order_no: orderId || checkoutId,
      environment,
      redirect_url: body.redirectUrl,
      status_callback_url: body.statusCallbackUrl,
      dynamic_descriptor: body.dynamicDescriptor || process.env.MONERIS_DESCRIPTOR,
      customer_id: body.customerId,
      email: body.email,
      billing: body.billing,
      shipping: body.shipping,
    },
  };
}

async function createCheckout(body) {
  const payload = buildCheckoutPayload(body);
  const response = await fetch(MONERIS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    json = { raw: text };
  }

  if (!response.ok) {
    const message = json?.response?.error_message || json?.error || response.statusText;
    const err = new Error(message);
    err.status = response.status;
    err.details = json;
    throw err;
  }

  const checkoutId = json?.response?.checkout_id || json?.checkout_id || json?.id;
  if (!checkoutId) {
    const err = new Error('Checkout ID was not returned by Moneris.');
    err.details = json;
    throw err;
  }

  return {
    checkoutId,
    environment: payload.request.environment,
    moneris: json,
  };
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'moneris-checkout.html'));
});

app.post('/api/moneris/checkout', async (req, res) => {
  try {
    const result = await createCheckout(req.body);
    res.json(result);
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      message: error.message,
      details: error.details,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Moneris demo server listening on http://localhost:${PORT}`);
});
