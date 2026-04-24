/**
 * Mirrors server `getFieldMetaForGatewayKey` so the admin UI never shows an empty form
 * if the API omits fieldMeta (stale cache, older backend, or bad DB profile).
 */
export type AdminGatewayFieldMeta = {
  name: string;
  label: string;
  kind: 'text' | 'secret' | 'url';
  hint?: string;
  group?: string;
};

const FALLBACK: Record<string, AdminGatewayFieldMeta[]> = {
  flutterwave: [
    { name: 'publicKey', label: 'Public Key', kind: 'secret', group: 'Required credentials' },
    { name: 'secretKey', label: 'Secret Key', kind: 'secret', group: 'Required credentials' },
    {
      name: 'encryptionKey',
      label: 'Encryption Key',
      kind: 'secret',
      group: 'Required credentials',
      hint: 'From Flutterwave dashboard (checksum / card encryption).',
    },
    {
      name: 'webhookUrl',
      label: 'Webhook URL',
      kind: 'url',
      group: 'Webhooks & verification',
      hint: 'Same URL registered in Flutterwave → Webhooks.',
    },
    {
      name: 'webhookSecretHash',
      label: 'Webhook secret (verif-hash)',
      kind: 'secret',
      group: 'Webhooks & verification',
      hint: 'Must match the verif-hash header on incoming webhooks.',
    },
  ],
  mtn_momo: [
    {
      name: 'apiUser',
      label: 'API User ID',
      kind: 'text',
      group: 'Required',
      hint: 'UUID from MTN MoMo developer portal (Collections product).',
    },
    { name: 'apiKey', label: 'API Key', kind: 'secret', group: 'Required' },
    {
      name: 'subscriptionKey',
      label: 'Subscription Key',
      kind: 'secret',
      group: 'Required',
      hint: 'Sent as Ocp-Apim-Subscription-Key.',
    },
    {
      name: 'currency',
      label: 'Currency',
      kind: 'text',
      group: 'Required',
      hint: 'Sandbox often supports EUR; production Rwanda typically uses RWF.',
    },
    {
      name: 'orderCurrency',
      label: 'Order currency',
      kind: 'text',
      group: 'Required',
      hint: 'Currency used when creating checkout orders for MTN MoMo.',
    },
    {
      name: 'callbackUrl',
      label: 'Webhook URL',
      kind: 'url',
      group: 'Required',
      hint: 'MTN Collections callback URL — must match your MTN product.',
    },
    {
      name: 'baseUrl',
      label: 'API base URL',
      kind: 'url',
      group: 'Advanced',
      hint: 'Sandbox example: https://sandbox.momodeveloper.mtn.com',
    },
    {
      name: 'targetEnvironment',
      label: 'Target environment',
      kind: 'text',
      group: 'Advanced',
      hint: 'sandbox or mtnrwanda (production).',
    },
  ],
  airtel_money: [
    { name: 'clientId', label: 'Client ID', kind: 'secret', group: 'Required' },
    { name: 'clientSecret', label: 'Client Secret', kind: 'secret', group: 'Required' },
    {
      name: 'merchantId',
      label: 'Merchant ID',
      kind: 'text',
      group: 'Required',
      hint: 'From Airtel Africa Open API / partner onboarding.',
    },
    {
      name: 'webhookUrl',
      label: 'Webhook URL',
      kind: 'url',
      group: 'Required',
      hint: 'Callback URL registered with Airtel for your merchant.',
    },
  ],
  stripe: [
    { name: 'publishableKey', label: 'Publishable key', kind: 'secret', group: 'Required', hint: 'pk_live_… or pk_test_…' },
    { name: 'secretKey', label: 'Secret key', kind: 'secret', group: 'Required', hint: 'sk_live_… or sk_test_…' },
    {
      name: 'webhookSecret',
      label: 'Webhook secret',
      kind: 'secret',
      group: 'Required',
      hint: 'Signing secret (whsec_…) for /api/webhooks/stripe/webhook.',
    },
  ],
  paypal: [
    { name: 'clientId', label: 'Client ID', kind: 'secret', group: 'Required' },
    { name: 'clientSecret', label: 'Secret', kind: 'secret', group: 'Required' },
    { name: 'environment', label: 'Mode', kind: 'text', group: 'Required', hint: 'sandbox or live' },
    {
      name: 'webhookId',
      label: 'Webhook ID',
      kind: 'text',
      group: 'Required',
      hint: 'PayPal Developer → Webhooks → ID for /api/webhooks/paypal/webhook',
    },
  ],
};

export function fallbackFieldMetaForKey(key: string | undefined): AdminGatewayFieldMeta[] {
  if (!key) return [];
  return FALLBACK[key] ?? [];
}

export function mergeFieldMetaFromApi(
  key: string | undefined,
  fromApi: AdminGatewayFieldMeta[] | undefined
): AdminGatewayFieldMeta[] {
  if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi;
  return fallbackFieldMetaForKey(key);
}
