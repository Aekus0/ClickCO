# Firestore Security Specifications & Threat Model (ClickCO)

## Data Invariants
1. A conversion history item cannot be created or accessed by anyone other than its authenticated owner (`userId == request.auth.uid`).
2. Custom configs (language preference, auto-purge options) are private to the user scope.
3. System-level timestamps (`updatedAt` and `timestamp`) must always use server-assigned times (`request.time`) to maintain audit trails.
4. Identifiers (`userId` and `conversionId`) must be valid alphanumeric formats with strict safety limits.

## The "Dirty Dozen" Malicious Payloads Blocked
1. **The Identity Spoof (Create Conversion):** Attempting to write a conversion record into `/users/alice/conversions/item1` where `userId` in payload is `"bob"`. -> **BLOCKED by `data.userId == userId`**.
2. **The Unauthorized Cross-Read:** Bob attempting to list conversions under `/users/alice/conversions`. -> **BLOCKED by `isOwner(userId)`**.
3. **The Shadow Field Attack:** Attempt to append a shadow field `"isAdmin": true` inside user's settings. -> **BLOCKED by exact key size checks and `.affectedKeys().hasOnly()` during updates**.
4. **Denial of Wallet ID Poisoning:** Writing a conversion document with a 50KB ID of special chars (such as `/users/alice/conversions/%%%%...`). -> **BLOCKED by `isValidId(conversionId)`**.
5. **Timestamp Hijacking:** User sending custom past or future timestamps for `timestamp` or `updatedAt`. -> **BLOCKED by `== request.time` constraint**.
6. **Value Types Poisoning:** Injected strings for numeric fields, e.g., posting size as `{ originalSize: "1MB" }`. -> **BLOCKED by explicit `data.originalSize is int` schema checks**.
7. **Negative Size Allocation:** Posting a file with `-10405` bytes space. -> **BLOCKED by `originalSize >= 0` check**.
8. **Invalid State Transition:** Attempt to directly overwrite the conversion owner UID. -> **BLOCKED by immutable owner mapping rules**.
9. **Status Flooding:** Changing Status payload to an arbitrary string like `'ready_to_hack'`. -> **BLOCKED by strict enum allowlist in `isValidConversion`**.
10. **Huge File Blob Bomb:** Uploading a `downloadUrl` data-URI string of 10MB to exhaust Firestore document limits (1MB). -> **BLOCKED by `data.downloadUrl.size() <= 2097152` size constraints**.
11. **Orphaned Writes Check:** Attempting to update a profile or history entry with deleted fields. -> **BLOCKED by exact key list mismatch checks**.
12. **Anonymous Admin Claim:** Forging custom claims in user JWT token. -> **BLOCKED by strict auth checks (`request.auth.uid`) with no reliance on client-side claims or variables**.
