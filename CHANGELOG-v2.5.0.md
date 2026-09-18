# DocChaser v2.5.0

## Billing & Subscription
- Piano Starter €19/mese, Studio €39/mese, Team €79/mese.
- Stato abbonamento e periodo corrente nella pagina Fatturazione.
- Cambio piano tramite Stripe Subscription Item con proratazione.
- Annullamento programmato a fine periodo.
- Customer Portal per metodo di pagamento e fatture.
- Controlli owner/admin per modifiche all’abbonamento.
- Idempotency key sulle mutazioni Stripe.
- Audit degli upgrade/downgrade e dell’annullamento.
- Feature matrix centralizzata in `lib/billing.ts`.

> Le chiavi Stripe, i Price ID e il webhook devono essere configurati nell'ambiente di produzione.
