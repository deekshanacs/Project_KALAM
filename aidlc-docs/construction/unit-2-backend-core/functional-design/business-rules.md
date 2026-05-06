# Business Rules — Unit 2: Backend Core (Auth + Users)
## TMS (Team Management System) — Project KALAM

---

## 1. Password Rules

### 1.1 Password Requirements

| Rule | Value | Enforcement |
|---|---|---|
| Minimum length | 8 characters | Zod schema: `z.string().min(8)` |
| Maximum length | 128 characters | Zod schema: `z.string().max(128)` |
| Character requirements | None (any characters allowed) | Simplicity for MVP |
| Hashing algorithm | bcrypt | `bcrypt.hash(password, 12)` |
| bcrypt cost factor | 12 | Balances security and performance (~300ms on modern hardware) |
| Storage | Hash only | Raw password never stored or logged |

### 1.2 Password Hashing Rules

- **BR-PWD-01**: Passwords must be hashed with bcrypt at cost factor 12 before storage.
- **BR-PWD-02**: The raw password must never appear in logs, error messages, or API responses.
- **BR-PWD-03**: Password comparison must use `bcrypt.compare()` (timing-safe), never string equality.
- **BR-PWD-04**: Password hashing must occur in the service layer, not in route handlers.
- **BR-PWD-05**: The `password` field must be excluded from all API responses using a `select` clause or explicit omission.

```typescript
// Correct: exclude password in Prisma query
const user = await prisma.user.findUnique({
  where: { id },
  select: {
    id: true, email: true, name: true, role: true,
    availabilityStatus: true, avatarUrl: true,
    supervisorId: true, createdAt: true, updatedAt: true,
    // password: NOT included
  },
});
```

---

## 2. JWT Rules

### 2.1 Access Token Rules

| Rule | Value |
|---|---|
| Algorithm | HS256 |
| Expiry | 15 minutes |
| Secret | `JWT_SECRET` environment variable |
| Payload | `{ sub: userId, email, role, type: 'access', iat, exp }` |
| Storage (client) | Memory or localStorage (frontend decision) |

- **BR-JWT-01**: Access tokens expire in exactly 15 minutes.
- **BR-JWT-02**: Access tokens use HS256 algorithm.
- **BR-JWT-03**: The `type: 'access'` claim must be present and verified to prevent refresh tokens from being used as access tokens.
- **BR-JWT-04**: The `sub` claim contains the userId (cuid string).
- **BR-JWT-05**: Access tokens are stateless — no database lookup required for verification.

### 2.2 Refresh Token Rules

| Rule | Value |
|---|---|
| Algorithm | HS256 |
| Expiry | 7 days |
| Secret | `JWT_REFRESH_SECRET` (different from JWT_SECRET) |
| Payload | `{ sub: userId, type: 'refresh', jti: uuid, iat, exp }` |
| Storage (server) | SHA-256 hash stored in `refresh_tokens` table |
| Rotation | On every use — old token revoked, new pair issued |

- **BR-JWT-06**: Refresh tokens expire in exactly 7 days.
- **BR-JWT-07**: Refresh tokens use a different secret than access tokens (`JWT_REFRESH_SECRET`).
- **BR-JWT-08**: The `type: 'refresh'` claim must be present and verified.
- **BR-JWT-09**: Only the SHA-256 hash of the refresh token is stored in the database.
- **BR-JWT-10**: Each refresh token can only be used once (rotation on use).
- **BR-JWT-11**: After rotation, the old refresh token is marked `revokedAt = now()`.
- **BR-JWT-12**: If a revoked refresh token is presented, the server returns 401 (possible replay attack).
- **BR-JWT-13**: The `JWT_SECRET` and `JWT_REFRESH_SECRET` must be different values.

---

## 3. Brute-Force Protection Rules

- **BR-BF-01**: After 5 consecutive failed login attempts for the same email, the account is locked for 15 minutes.
- **BR-BF-02**: The lockout is per email address (case-insensitive).
- **BR-BF-03**: A successful login resets the attempt counter for that email.
- **BR-BF-04**: The lockout response returns HTTP 429 with a `retryAfter` field (seconds until unlock).
- **BR-BF-05**: The error message for failed login is always `'Invalid credentials'` regardless of whether the email exists or the password is wrong (prevents user enumeration).
- **BR-BF-06**: The attempt tracker is in-memory (resets on server restart — acceptable for MVP).
- **BR-BF-07**: Stale attempt records (no activity for 30 minutes) are cleaned up periodically.

---

## 4. Role Hierarchy Rules

### 4.1 Role Weight

| Role | Weight | Can Assign To |
|---|---|---|
| ADMIN | 4 | Anyone |
| TEAM_LEADER | 3 | Own TMs and their JTMs |
| TEAM_MEMBER | 2 | Own JTMs only |
| JUNIOR_MEMBER | 1 | Nobody |

- **BR-ROLE-01**: Role hierarchy is strictly enforced server-side on every request.
- **BR-ROLE-02**: ADMIN can perform any action on any user.
- **BR-ROLE-03**: TEAM_LEADER can only modify users within their own subtree.
- **BR-ROLE-04**: TEAM_MEMBER can only modify their own direct subordinates.
- **BR-ROLE-05**: JUNIOR_MEMBER has no management permissions.
- **BR-ROLE-06**: Role assignment is restricted to ADMIN only (`PATCH /api/users/:id/role`).
- **BR-ROLE-07**: A user cannot assign themselves a higher role.

### 4.2 Supervisor Assignment Rules

- **BR-SUP-01**: Only ADMIN can change any user's `supervisorId`.
- **BR-SUP-02**: TEAM_LEADER can change `supervisorId` for users within their own subtree only.
- **BR-SUP-03**: Setting `supervisorId = null` is only allowed for the root Admin user.
- **BR-SUP-04**: Circular supervisor relationships are prohibited (a user cannot be their own ancestor).
- **BR-SUP-05**: Before updating `supervisorId`, the system must verify the new supervisor is not a descendant of the user being updated.

---

## 5. CORS Rules

- **BR-CORS-01**: CORS is restricted to the exact origin specified in `CORS_ORIGIN` environment variable.
- **BR-CORS-02**: No wildcard (`*`) CORS origins are permitted in production.
- **BR-CORS-03**: Allowed methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- **BR-CORS-04**: Allowed headers: `Content-Type, Authorization`.
- **BR-CORS-05**: Credentials are allowed (`credentials: true`) to support cookie-based auth if needed.

```typescript
const corsConfig: CorsOptions = {
  origin: env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
```

---

## 6. Workload Color Rules

| Percentage Range | Color Tier | Meaning |
|---|---|---|
| 0–40% | `green` | Capacity available |
| 41–70% | `amber` | Approaching capacity |
| 71–100% | `red` | At or near capacity |

- **BR-WL-01**: Workload percentage is always clamped to `[0, 100]`.
- **BR-WL-02**: Workload is calculated as `Math.min(100, Math.max(0, Math.round((openTasks / maxCapacity) * 100)))`.
- **BR-WL-03**: Open tasks are those with status `TODO`, `IN_PROGRESS`, or `REVIEW`.
- **BR-WL-04**: `DONE` tasks do not count toward workload.
- **BR-WL-05**: Max capacity is role-based: ADMIN=20, TEAM_LEADER=15, TEAM_MEMBER=10, JUNIOR_MEMBER=7.

---

## 7. User Visibility Rules

- **BR-VIS-01**: ADMIN can see all users.
- **BR-VIS-02**: TEAM_LEADER can see all users in their subtree plus themselves.
- **BR-VIS-03**: TEAM_MEMBER can see their own JTMs plus themselves.
- **BR-VIS-04**: JUNIOR_MEMBER can only see themselves.
- **BR-VIS-05**: The user list endpoint (`GET /api/users`) returns all users for ADMIN; scoped results for others.

---

## 8. Rate Limiting Rules

- **BR-RL-01**: Auth routes (`/api/auth/*`) are limited to 10 requests per 15 minutes per IP.
- **BR-RL-02**: All other API routes are limited to 100 requests per minute per IP.
- **BR-RL-03**: Rate limit exceeded returns HTTP 429 with `Retry-After` header.
- **BR-RL-04**: Rate limiting is applied before authentication middleware.

---

## 9. Testable Properties (PBT-01)

### 9.1 Round-Trip: JWT Encode → Decode = Original Payload (PBT-02)

**Property**: For any valid user payload `{ id, email, role }`, encoding as an access token and then decoding returns the same `id` and `role`.

**Invariant**: The JWT round-trip is lossless for the payload fields we care about.

```typescript
fc.assert(
  fc.property(
    fc.record({
      id: fc.string({ minLength: 1, maxLength: 50 }),
      email: fc.emailAddress(),
      role: fc.constantFrom<Role>('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER'),
    }),
    (user) => {
      const token = generateAccessToken(user);
      const decoded = verifyAccessToken(token);
      return decoded.sub === user.id && decoded.role === user.role && decoded.email === user.email;
    }
  )
);
```

### 9.2 Invariant: Workload Percentage Always in [0, 100] (PBT-03)

**Property**: For any non-negative integer `openTasks` and any `Role`, the calculated workload percentage is always in `[0, 100]`.

```typescript
fc.assert(
  fc.property(
    fc.nat({ max: 10000 }),
    fc.constantFrom<Role>('ADMIN', 'TEAM_LEADER', 'TEAM_MEMBER', 'JUNIOR_MEMBER'),
    (openTasks, role) => {
      const maxCapacity = MAX_CAPACITY[role];
      const percentage = Math.min(100, Math.max(0, Math.round((openTasks / maxCapacity) * 100)));
      return percentage >= 0 && percentage <= 100;
    }
  )
);
```

### 9.3 Invariant: bcrypt Hash of Same Password Always Verifies True (PBT-03)

**Property**: For any password string, `bcrypt.hash(password, cost)` followed by `bcrypt.compare(password, hash)` always returns `true`.

```typescript
fc.assert(
  fc.asyncProperty(
    fc.string({ minLength: 1, maxLength: 72 }),
    async (password) => {
      const hash = await bcrypt.hash(password, 10); // cost 10 for test speed
      const result = await bcrypt.compare(password, hash);
      return result === true;
    }
  )
);
```

### 9.4 Idempotent: Revoking an Already-Revoked Token is Safe (PBT-04)

**Property**: Calling `revokeToken(tokenHash)` multiple times does not throw and leaves the token in a revoked state.

```typescript
fc.assert(
  fc.asyncProperty(
    fc.string({ minLength: 64, maxLength: 64 }), // SHA-256 hex string
    async (tokenHash) => {
      // Setup: create a token record
      await prisma.refreshToken.upsert({
        where: { tokenHash },
        create: { tokenHash, userId: testUserId, expiresAt: futureDate },
        update: {},
      });
      
      // First revocation
      await revokeToken(tokenHash);
      // Second revocation (idempotent — should not throw)
      await revokeToken(tokenHash);
      
      const token = await prisma.refreshToken.findUnique({ where: { tokenHash } });
      return token !== null && token.revokedAt !== null;
    }
  )
);
```

### 9.5 Invariant: Hierarchy Traversal Returns Consistent Subtree (PBT-03)

**Property**: `getDescendantIds(userId)` called twice for the same userId returns the same set of IDs (deterministic).

```typescript
fc.assert(
  fc.asyncProperty(
    fc.constantFrom(...seedUserIds), // use known user IDs from seed
    async (userId) => {
      const result1 = new Set(await getDescendantIds(userId));
      const result2 = new Set(await getDescendantIds(userId));
      
      if (result1.size !== result2.size) return false;
      for (const id of result1) {
        if (!result2.has(id)) return false;
      }
      return true;
    }
  )
);
```
