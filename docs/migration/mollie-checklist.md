# Mollie — checklist (Ingmar)

Bevestig in [Mollie Dashboard](https://my.mollie.com/) welke methodes actief zijn voor het live-profiel.

## Vereist

- [x] API-key live (`MOLLIE_API_KEY`)
- [x] Profile ID (`MOLLIE_PROFILE_ID`)
- [x] Payments API + webhook `/api/mollie/webhook`
- [x] Checkout redirect `/checkout/return`
- [ ] iDEAL zichtbaar in checkout
- [ ] Apple Pay (Safari + express op PDP/cart/checkout)
- [ ] Google Pay
- [ ] Visa / Mastercard
- [ ] Bancontact (BE)

## Optioneel (alleen tonen als Dashboard-actief)

- [ ] American Express
- [ ] PayPal
- [ ] Klarna
- [ ] Riverty
- [ ] SEPA / banktransfer

## Technisch

- Keys alleen server-side
- Webhook = bron van waarheid voor “betaald”
- Apple Pay domain verification via Mollie
- Method picker: `GET /v2/methods` gefilterd op amount/currency/locale
