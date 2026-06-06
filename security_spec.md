# Security Specification for Milk Dairy

## Data Invariants
1. A Business Profile can only be created/read/updated by its owning user.
2. A Customer record can only be accessed by the user who created it (owner).
3. A Milk Price record is user-specific.
4. A Delivery record must reference an existing Customer ID and be owned by the same user.
5. A Payment record must reference an existing Customer ID and be owned by the same user.
6. All records must have a valid `userId` matching the authenticated user.
7. Timestamps `createdAt` are immutable after creation.
8. `userId` is immutable after creation.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing**: Attempt to create a customer with someone else's `userId`.
2. **PII Leak**: Authenticated User A tries to read Customer records belonging to User B.
3. **Ghost Update**: Attempt to update a Customer's `totalOutstanding` to 0 without a corresponding Payment record (if enforced).
4. **ID Poisoning**: Creating a customer with a 2MB long ID string.
5. **Type Confusion**: Sending `dailyQuantity` as a string instead of a number.
6. **Immutable Violation**: Trying to change the `userId` of an existing Customer record.
7. **Orphaned Write**: Creating a Delivery for a non-existent `customerId`.
8. **Shadow Field Injection**: Adding an `isAdmin: true` field to a Business Profile.
9. **Timestamp Manipulation**: Sending a manual `createdAt` date from the past instead of `request.time`.
10. **Resource Exhaustion**: Sending a payload with 1000 extra fields not in the schema.
11. **State Shortcut**: Updating a Delivery's `delivered` status without the proper keys.
12. **Public Read**: Unauthenticated user trying to list all customers.

## Implementation Plan
1. Standalone `isValidId` helper.
2. Entity-specific `isValid[Entity]` helpers.
3. Match blocks for all collections with `userId` check.
4. Action-based updates for status changes or specific field edits.
