import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

export const Route = createFileRoute('/api/public/mercadopago/subscriptions')({ server: { handlers: { POST: async ({ request }) => {
  const secret = process.env['MERCADOPAGO_WEBHOOK_SECRET'];
  const token = process.env['MERCADOPAGO_ACCESS_TOKEN'];
  if (!secret || !token) return new Response('not configured', { status: 503 });
  const signature = request.headers.get('x-signature') ?? '';
  const requestId = request.headers.get('x-request-id');
  const parts = Object.fromEntries(signature.split(',').map((v) => v.trim().split('=')));
  const id = new URL(request.url).searchParams.get('data.id');
  if (!id || !requestId || !parts.ts || !/^[a-f0-9]{64}$/i.test(parts.v1 ?? '') || !/^\d+$/.test(parts.ts)) return new Response('unauthorized', { status: 401 });
  const timestamp = Number(parts.ts);
  if (Math.abs(Date.now() - (timestamp < 1e12 ? timestamp * 1000 : timestamp)) > 300000) return new Response('expired', { status: 401 });
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(parts.v1.match(/.{2}/g) ?? [], (v) => parseInt(v, 16));
  const verified = await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(`id:${id.toLowerCase()};request-id:${requestId};ts:${parts.ts};`));
  if (!verified) return new Response('unauthorized', { status: 401 });
  const parsed = z.object({ type: z.enum(['subscription_preapproval', 'subscription_authorized_payment']), data: z.object({ id: z.union([z.string().max(200), z.number()]) }) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || String(parsed.data.data.id).toLowerCase() !== id.toLowerCase()) return new Response('invalid event', { status: 400 });
  try {
    const { syncSubscriptionEvent } = await import('@/lib/subscriptions.server');
    await syncSubscriptionEvent(parsed.data.type, id, token, new URL(request.url).origin);
    return new Response('ok');
  } catch {
    return new Response('processing failed', { status: 500 });
  }
} } } });