# Payment gateways (configuration-only)

All checkout providers are registered in **`server/src/financial/paymentGatewayRegistry.ts`**.

| Admin key (`PaymentGatewayConfig.key`) | Checkout method (`Order.payment.provider`) | Credentials in admin |
|----------------------------------------|---------------------------------------------|----------------------|
| `flutterwave` | `flutterwave` | Public/secret/encryption keys + webhook |
| `mtn_momo` | `momo` | API user, key, subscription, callback URL |
| `airtel_money` | `airtel` | Client ID/secret, merchant ID, webhook |
| `stripe` | `stripe` | Publishable, secret, webhook signing secret |
| `paypal` | `paypal` | Client ID/secret, mode, webhook ID |
| `offline` | — | None (manual/COD) |

## Flow

1. **Server start** — `ensureCorePaymentGateways()` upserts every registry row in MongoDB.
2. **Admin** — `/admin/finance` → Payment Gateways: save encrypted credentials + test connection.
3. **Checkout** — `GET /api/public/payment-gateways` returns only gateways that are **enabled ∧ fully configured**.
4. **Pay** — `initializePayment` → `assertCheckoutGatewayEnabled(method)` → provider SDK.
5. **Settle** — `finalizeSuccessfulEscrowPayment` → escrow + **`recordPaymentCaptured`** (TransactionLog `PAYMENT` + `FEE`).

## Referral (buyer)

When admin enables Marketing → Referral:

- Buyers see **Account → Invite Friends** with share link (`/auth?ref=CODE`) and referral code.
- API: `GET /api/buyer/referral` (authenticated).
- Signup pages read `?ref=` and admin `referralProgramEnabled` from `GET /public/marketing/referral-status`.


## Transaction log

Use **`paymentTransactionLog.service.ts`** (`recordPaymentTransaction`, `recordPaymentCaptured`) for all new money events so `metadata.gatewayKey` and `metadata.provider` stay consistent.
