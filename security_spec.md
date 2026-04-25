# Security Specification - TAF Timer

## 1. Data Invariants
- The timer state must be one of: `idle`, `running`, `paused`, `finished`.
- `accumulatedTime` must be a non-negative integer.
- `startTime` must be a Timestamp (if running) or null (if not).
- Only authorized administrators can modify the timer state.
- Anyone can read the timer state.
- Anyone can perform the clock sync handshake (limited write).

## 2. The "Dirty Dozen" Payloads (Anti-Patterns)
1. **State Injection**: `{ "state": "invalid_state" }` -> Should be rejected (enum Check).
2. **Time Warp**: `{ "accumulatedTime": -1000 }` -> Should be rejected (Boundary check).
3. **Ghost Field**: `{ "state": "running", "extra_field": "hacker" }` -> Should be rejected (Strict keys).
4. **Identity Spoofing**: An unauthenticated user tries to set the state to `running`.
5. **Admin Escalation**: A user tries to create an admin record for themselves.
6. **Clock Sync Flood**: A user tries to write 1MB of data to the handshake document.
7. **Negative Start**: `{ "startTime": -1 }` (if it were a number).
8. **Future Start**: `{ "startTime": Timestamp(2099, 1, 1) }`.
9. **Accumulated Time Overflow**: `{ "accumulatedTime": 999999999999 }`.
10. **State Skipping**: Trying to go from `idle` directly to `finished` without `running` (if we want to enforce state machine).
11. **ID Poisoning**: Trying to write to `/sync/aaaaa... (1KB of 'a')`.
12. **Unauthorized Handshake**: Changing someone else's handshake sample.

## 3. Test Runner Concept (Handled by Model reasoning)
We will verify:
- `allow read: if true` for `/sync/timer`.
- `allow write: if isAdmin()` for `/sync/timer`.
- `allow write: if isRecentAndSmall()` for `/sync/handshake`.
