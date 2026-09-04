# Security Specification & Threat Model

## 1. Application Invariants & Data Integrity Rules
- **PII Isolation (Pillar 6)**: `/users/{userId}` contains sensitive PII (National ID, KRA PIN, M-Pesa payout phone number, physical address, email, phone). Read access is strictly restricted to `isOwner(userId) || isAdmin()`. Public visitors and unauthenticated scrapers are blocked from harvesting user records.
- **Privilege Escalation Prevention (Pillars 2 & 4)**: Normal users cannot set or elevate their role to `admin`, nor can they alter `suspended` status. Role mutations are strictly reserved for verified system administrators.
- **Listing State & Fraud Protection (Pillars 2, 4, 6)**:
  - During creation, a landlord can only create a listing in `'pending'` or `'draft'` status. Direct self-activation (`status: 'active'`, `paymentStatus: 'verified'`) is strictly blocked.
  - Landlords cannot mutate immutable fields (`ownerId`, `createdAt`).
  - Listing activation (`status: 'active'`) and payment verification (`paymentStatus: 'verified'`) require administrative approval or trusted payment webhooks.
  - Landlords can only modify or delete listings that match their `request.auth.uid`.
- **Payment Ledger Fortress (Pillar 8)**:
  - Financial records (`/payments/{paymentId}`) can only be read by the paying user (`ownerId == request.auth.uid`) or administrators.
  - Regular users can only insert payment requests in `status: 'pending_verification'`. They are forbidden from forging `status: 'verified'` or `status: 'success'`.
  - Payment updates and approvals are strictly locked to `isAdmin()`.
- **Complaint & Fraud Report Triage**:
  - Complaints are confidential. Read access is restricted to `isAdmin()` and the complainant.
  - Complaints must be created in `status: 'pending'`. Complainants cannot mark complaints as resolved.
- **Denial of Wallet & Injection Guards (Pillars 3 & 5)**:
  - All IDs must conform to `^[a-zA-Z0-9_\-]+$` and length `<= 128`.
  - All text inputs have strict character bounds (descriptions <= 5000 chars, titles <= 150 chars).

## 2. The Dirty Dozen Attack Payloads (All Verified Rejected)
1. **Payload 1 (Privilege Escalation)**: Attacker sends `create` or `update` on `/users/{attackerUid}` with `{ role: 'admin' }` -> **REJECTED (403)**.
2. **Payload 2 (Unauthenticated PII Scraping)**: Anonymous visitor sends `get` or `list` to `/users/{victimUid}` to harvest National ID and KRA PIN -> **REJECTED (403)**.
3. **Payload 3 (Listing Activation Bypass)**: Landlord submits `create` on `/listings/{id}` with `{ status: 'active', paymentStatus: 'verified' }` without paying -> **REJECTED (403)**.
4. **Payload 4 (Listing Owner Spoofing)**: Landlord creates listing specifying `ownerId: 'victim-landlord-uid'` -> **REJECTED (403)**.
5. **Payload 5 (Cross-Landlord Listing Tampering)**: Landlord updates listing where `resource.data.ownerId != request.auth.uid` -> **REJECTED (403)**.
6. **Payload 6 (Payment Ledger Forgery)**: User inserts `/payments/{id}` with `{ status: 'verified', amount: 1500 }` to self-approve listing -> **REJECTED (403)**.
7. **Payload 7 (Payment Tampering)**: User updates `/payments/{id}` to flip status from `pending_verification` to `verified` -> **REJECTED (403)**.
8. **Payload 8 (Payment Snooping)**: User queries `/payments` to view competitor landlords' transaction numbers and phone numbers -> **REJECTED (403)**.
9. **Payload 9 (Resource Poisoning / Denial of Wallet)**: Attacker attempts to post a 5MB payload in listing description or title -> **REJECTED (403)**.
10. **Payload 10 (Path Poisoning / Injection)**: Attacker sends document ID with shell characters or 2KB path -> **REJECTED (403)**.
11. **Payload 11 (Complaint Self-Dismissal)**: Malicious landlord attempts to update `/complaints/{id}` to mark fraud report as `dismissed` -> **REJECTED (403)**.
12. **Payload 12 (Immutability Break)**: Landlord updates listing changing `ownerId` or `createdAt` -> **REJECTED (403)**.
