import crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

type PaystackInitializePayload = {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callback_url: string;
  metadata: Record<string, unknown>;
};

function getPaystackSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server');
  }
  return secretKey;
}

export async function initializePaystackTransaction(payload: PaystackInitializePayload) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.status) {
    throw new Error(data?.message || 'Unable to initialize Paystack transaction');
  }

  return data.data as {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function verifyPaystackTransaction(reference: string) {
  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.status) {
    throw new Error(data?.message || 'Unable to verify Paystack transaction');
  }

  return data.data as {
    id?: number | string;
    status?: string;
    reference?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    channel?: string;
    metadata?: Record<string, unknown>;
  };
}

export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;

  const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  if (hash.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

export function createPaystackReference(hospitalId: string) {
  const normalizedHospitalId = hospitalId.replace(/[^a-zA-Z0-9]/g, '').slice(-10) || 'hospital';
  return `h1-sub-${normalizedHospitalId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}
