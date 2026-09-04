/**
 * Firestore Security Rules Threat Model & Invariant Tests
 * 
 * Verifies that all Dirty Dozen attack payloads are rejected by firestore.rules
 */

export const DIRTY_DOZEN_TEST_SUITE = [
  {
    name: "Payload 1: Privilege Escalation - Regular user assigns admin role",
    path: "users/attacker_uid",
    auth: { uid: "attacker_uid", email: "attacker@example.com" },
    operation: "create",
    data: { id: "attacker_uid", email: "attacker@example.com", role: "admin" },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 2: Unauthorized PII Harvesting - Reading private landlord profile",
    path: "users/victim_landlord_uid",
    auth: { uid: "stranger_uid", email: "stranger@example.com" },
    operation: "get",
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 3: Listing Activation Bypass - Direct self-activation without payment",
    path: "listings/listing_123",
    auth: { uid: "landlord_uid", email: "landlord@example.com" },
    operation: "create",
    data: {
      title: "Hacked Listing",
      description: "Attempting free activation",
      price: 25000,
      location: "Nairobi",
      ownerId: "landlord_uid",
      status: "active", // FORBIDDEN: non-admin cannot create as active
      paymentStatus: "verified"
    },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 4: Identity Spoofing - Creating listing with someone else's ownerId",
    path: "listings/listing_456",
    auth: { uid: "attacker_uid", email: "attacker@example.com" },
    operation: "create",
    data: {
      title: "Spoofed Listing",
      description: "Testing identity spoofing",
      price: 30000,
      location: "Mombasa",
      ownerId: "victim_landlord_uid", // MISMATCH: attacker tries to bind victim
      status: "pending"
    },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 5: Cross-Tenant Listing Tampering - Updating another landlord's listing",
    path: "listings/victim_listing",
    auth: { uid: "attacker_uid", email: "attacker@example.com" },
    operation: "update",
    existingData: { ownerId: "victim_uid", status: "active" },
    data: { price: 100 },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 6: Payment Ledger Forgery - Forging a verified payment record",
    path: "payments/fake_payment_1",
    auth: { uid: "attacker_uid", email: "attacker@example.com" },
    operation: "create",
    data: {
      listingId: "listing_123",
      ownerId: "attacker_uid",
      amount: 1500,
      reference: "FORGED_CODE",
      status: "verified" // FORBIDDEN: users cannot self-verify payments
    },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 7: Financial Record Tampering - Altering payment status to verified",
    path: "payments/payment_123",
    auth: { uid: "attacker_uid", email: "attacker@example.com" },
    operation: "update",
    existingData: { ownerId: "attacker_uid", status: "pending_verification" },
    data: { status: "verified" },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 8: Competitor Financial Snooping - Listing all payment records",
    path: "payments",
    auth: { uid: "regular_user_uid", email: "user@example.com" },
    operation: "list",
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 9: Denial of Wallet / Resource Exhaustion - Huge description payload",
    path: "listings/listing_huge",
    auth: { uid: "attacker_uid", email: "attacker@example.com" },
    operation: "create",
    data: {
      title: "Valid Title",
      description: "A".repeat(10000), // Exceeds 5000 character limit
      price: 15000,
      location: "Nairobi",
      ownerId: "attacker_uid",
      status: "pending"
    },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 10: Path / Document ID Injection - Malicious junk characters",
    path: "listings/bad%20id%20with%20symbols$$$",
    auth: { uid: "attacker_uid", email: "attacker@example.com" },
    operation: "create",
    data: {
      title: "Bad ID test",
      description: "Invalid ID path",
      price: 20000,
      location: "Nairobi",
      ownerId: "attacker_uid",
      status: "pending"
    },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 11: Complaint Dismissal Tampering - Landlord self-dismissing report",
    path: "complaints/complaint_1",
    auth: { uid: "landlord_uid", email: "landlord@example.com" },
    operation: "update",
    existingData: { status: "pending", complainantEmail: "tenant@example.com" },
    data: { status: "dismissed" },
    expected: "PERMISSION_DENIED"
  },
  {
    name: "Payload 12: Invariant Tampering - Overwriting immutable ownerId",
    path: "listings/my_listing",
    auth: { uid: "my_uid", email: "me@example.com" },
    operation: "update",
    existingData: { ownerId: "my_uid", status: "pending" },
    data: { ownerId: "new_owner_uid" },
    expected: "PERMISSION_DENIED"
  }
];
