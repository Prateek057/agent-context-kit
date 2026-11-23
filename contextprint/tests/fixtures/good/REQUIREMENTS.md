# Requirements

Owner: PO · Status: Accepted

## Login

### REQ-012 Login lockout
After 5 consecutive failed logins the account is locked for 900 s, counted from the 5th failure.
- Edge: the 5th failure returns INVALID_CREDENTIALS and starts the lock; attempt 6 returns ACCOUNT_LOCKED.
- Must not: a lock must not last longer than 900 s.
- Example: attempt 6 with the right password -> ACCOUNT_LOCKED

### REQ-013 Token lifetime
Access tokens expire 600 s after issue, measured by the service clock.
- Must not: the token must not contain the email address.
