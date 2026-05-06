# Tech Stack Decisions — Unit 2: Backend Core (Auth + Users)
## TMS (Team Management System) — Project KALAM

---

## 1. Overview

Unit 2 introduces the full backend dependency set. All versions are pinned exactly per SECURITY-10. Dependencies are chosen for security, TypeScript support, and ecosystem maturity.

---

## 2. Web Framework

### 2.1 Express 4.x

| Decision | Value |
|---|---|
| Package | `express` |
| Version | `4.21.1` |
| Types | `@types/express` `4.17.21` |

**Why Express over alternatives (Fastify, Hapi, NestJS)?**

| Criterion | Express | Fastify | NestJS |
|---|---|---|---|
| Ecosystem maturity | Highest | High | High |
| TypeScript support | Via @types | Native | Native |
| Learning curve | Lowest | Low | High |
| Middleware ecosystem | Largest | Growing | Large |
| Bundle size | Small | Small | Large |
| Opinionated structure | No | No | Yes |

Express is chosen for its simplicity, massive ecosystem, and the fact that the team is building a focused application (not a framework-heavy enterprise system). The lack of opinionated structure is a feature here — the architecture is defined explicitly in this documentation.

---

## 3. Authentication

### 3.1 jsonwebtoken

| Decision | Value |
|---|---|
| Package | `jsonwebtoken` |
| Version | `9.0.2` |
| Types | `@types/jsonwebtoken` `9.0.7` |

**Why jsonwebtoken?**
- De facto standard for JWT in Node.js
- Supports HS256, RS256, and other algorithms
- Well-maintained with security patches
- Simple API: `jwt.sign()`, `jwt.verify()`

**Alternative considered**: `jose` (Web Crypto API based). Rejected because `jsonwebtoken` has better TypeScript types and is more familiar to the team.

### 3.2 bcrypt

| Decision | Value |
|---|---|
| Package | `bcrypt` |
| Version | `5.1.1` |
| Types | `@types/bcrypt` `5.0.2` |

**Why bcrypt over alternatives?**

| Algorithm | Package | Security | Performance |
|---|---|---|---|
| bcrypt | `bcrypt` | High | ~300ms at cost 12 |
| argon2 | `argon2` | Higher | ~100ms |
| scrypt | Node built-in | High | Variable |

bcrypt is chosen because:
- Industry standard for password hashing
- Cost factor 12 provides good security/performance balance
- Well-understood attack resistance
- `argon2` would be preferred for new systems, but bcrypt is sufficient for MVP

**Note**: The `bcrypt` package uses native bindings. The `bcryptjs` pure-JS alternative is slower and not used.

---

## 4. Input Validation

### 4.1 Zod

| Decision | Value |
|---|---|
| Package | `zod` |
| Version | `3.23.8` |

**Why Zod over alternatives?**

| Criterion | Zod | Joi | Yup | class-validator |
|---|---|---|---|---|
| TypeScript inference | Excellent (native) | Manual | Partial | Decorator-based |
| Bundle size | Small | Medium | Medium | Large |
| Error messages | Structured | Structured | Structured | Decorator-based |
| Schema composition | Excellent | Good | Good | Limited |
| Runtime parsing | Yes | Yes | Yes | Yes |

Zod is chosen because it provides TypeScript type inference from schemas — the validated data is automatically typed without manual type definitions. This eliminates an entire class of type/runtime mismatch bugs.

---

## 5. Logging

### 5.1 Winston

| Decision | Value |
|---|---|
| Package | `winston` |
| Version | `3.17.0` |

**Why Winston over alternatives?**

| Criterion | Winston | Pino | Morgan |
|---|---|---|---|
| Structured JSON | Yes | Yes | Limited |
| Log levels | Yes | Yes | Limited |
| Transport support | Multiple | Multiple | Limited |
| TypeScript support | Via @types | Native | Via @types |
| Performance | Good | Excellent | Good |

Winston is chosen for its flexibility and familiar API. Pino would be preferred for maximum performance, but Winston's transport system is more flexible for future log routing needs.

**Configuration**:
```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    winston.format.errors({ stack: true }),
    process.env.NODE_ENV === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  ),
  transports: [new winston.transports.Console()],
});
```

---

## 6. Security Middleware

### 6.1 express-rate-limit

| Decision | Value |
|---|---|
| Package | `express-rate-limit` |
| Version | `7.4.1` |

**Configuration**:
```typescript
import rateLimit from 'express-rate-limit';

// Auth routes: 10 requests per 15 minutes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,    // Disable X-RateLimit-* headers
});

// Global: 100 requests per minute
export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
```

### 6.2 helmet

| Decision | Value |
|---|---|
| Package | `helmet` |
| Version | `8.0.0` |

helmet sets 11 security-related HTTP headers by default. It is applied as the first middleware in the stack.

### 6.3 cors

| Decision | Value |
|---|---|
| Package | `cors` |
| Version | `2.8.5` |
| Types | `@types/cors` `2.8.17` |

---

## 7. Utilities

### 7.1 uuid

| Decision | Value |
|---|---|
| Package | `uuid` |
| Version | `11.0.3` |
| Types | `@types/uuid` `10.0.0` |

Used for generating `requestId` values and `jti` claims in refresh tokens.

**Why uuid over `crypto.randomUUID()`?**
`crypto.randomUUID()` is available in Node 14.17+, so it could be used directly. `uuid` is kept for consistency and the additional UUID version support (v1, v3, v4, v5).

---

## 8. Complete Backend package.json

```json
{
  "name": "@tms/backend",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/index.js",
    "seed": "npx prisma db seed",
    "db:migrate": "npx prisma migrate dev",
    "db:generate": "npx prisma generate",
    "db:studio": "npx prisma studio",
    "db:reset": "npx prisma migrate reset",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "0.32.1",
    "@prisma/client": "5.22.0",
    "@tms/shared": "*",
    "bcrypt": "5.1.1",
    "cors": "2.8.5",
    "docx": "9.0.2",
    "express": "4.21.1",
    "express-rate-limit": "7.4.1",
    "helmet": "8.0.0",
    "jsonwebtoken": "9.0.2",
    "multer": "1.4.5-lts.1",
    "socket.io": "4.8.1",
    "uuid": "11.0.3",
    "winston": "3.17.0",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@types/bcrypt": "5.0.2",
    "@types/cors": "2.8.17",
    "@types/express": "4.17.21",
    "@types/jest": "29.5.12",
    "@types/jsonwebtoken": "9.0.7",
    "@types/multer": "1.4.12",
    "@types/node": "20.17.6",
    "@types/uuid": "10.0.0",
    "fast-check": "3.22.0",
    "jest": "29.7.0",
    "prisma": "5.22.0",
    "ts-jest": "29.2.4",
    "tsx": "4.19.2",
    "typescript": "5.6.3"
  }
}
```

---

## 9. Decision Log

| Decision | Choice | Alternatives | Rationale |
|---|---|---|---|
| Web framework | Express 4.x | Fastify, NestJS | Simplicity, ecosystem, team familiarity |
| JWT library | jsonwebtoken 9.x | jose, passport-jwt | Standard, simple API, good types |
| Password hashing | bcrypt 5.x | argon2, scrypt | Industry standard, sufficient security |
| Validation | Zod 3.x | Joi, Yup | TypeScript inference, no manual types |
| Logging | Winston 3.x | Pino, Morgan | Flexible transports, familiar API |
| Rate limiting | express-rate-limit 7.x | express-slow-down | Simple, standard, well-maintained |
| HTTP security | helmet 8.x | Manual headers | Comprehensive, maintained, standard |
| CORS | cors 2.x | Manual middleware | Standard, well-tested |
| Request IDs | uuid 11.x | crypto.randomUUID | Consistency, additional UUID versions |
