# NestJS Authentication System Design Spec

Spec for implementing the full NestJS-based authentication system for the Booking Platform, integrating JWT, Prisma, bcrypt, and password reset functionality via Nodemailer.

## Goal

Provide a secure, role-based, token-rotated authentication flow with registration, login, and password reset.

## Database Schema (Prisma)

We will update `backend/prisma/schema.prisma` to include password columns, roles, and a `RefreshToken` session tracking table.

### Changes:
```prisma
enum Role {
  CLIENT
  SPECIALIST
}

model User {
  id                Int            @id @default(autoincrement())
  email             String         @unique
  name              String?
  password          String
  role              Role           @default(CLIENT)
  resetToken        String?
  resetTokenExpires DateTime?
  refreshTokens     RefreshToken[]
}

model RefreshToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  isRevoked Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## Authentication Mechanism

### 1. Token Properties
*   **Access Token**: JWT containing `{ sub: userId, email, role }`. Expiration: 15 minutes.
*   **Refresh Token**: Long-lived cryptographically secure random string stored in the database. Expiration: 7 days.

### 2. Refresh Token Rotation (RTR)
*   When a client requests `POST /auth/refresh` with a valid refresh token:
    1. Look up the token in the database.
    2. Check if the token is expired or revoked (`isRevoked === true`).
    3. If the token is already revoked, this suggests **token reuse / theft**:
        *   Revoke **all** refresh tokens for that user (`isRevoked = true` for all user's tokens) to terminate all active sessions.
        *   Throw an `UnauthorizedException`.
    4. If the token is valid, mark it as revoked (`isRevoked = true`), generate a new access token and a new refresh token, save the new refresh token to the DB, and return the new pair.

### 3. Password Hashing
*   Uses `bcrypt` with `10` rounds of salt generation.

---

## Endpoint API Routing

*   `POST /auth/register`
    *   **Body**: `{ email, password, name, role }`
    *   **Returns**: User details (no password).
*   `POST /auth/login`
    *   **Body**: `{ email, password }`
    *   **Returns**: `{ accessToken, refreshToken, user: { id, email, name, role } }`
*   `POST /auth/refresh`
    *   **Body**: `{ refreshToken }`
    *   **Returns**: `{ accessToken, refreshToken }`
*   `POST /auth/forgot-password`
    *   **Body**: `{ email }`
    *   **Returns**: `{ message: "Reset link sent if email exists" }` (Doesn't leak existence of email).
*   `POST /auth/reset-password`
    *   **Body**: `{ token, password }`
    *   **Returns**: `{ message: "Password updated successfully" }`

---

## Authorization Guards

*   `JwtAuthGuard` (Global): Evaluates standard JWTs in request headers (`Authorization: Bearer <token>`). Enabled globally, bypassed via custom `@Public()` decorator.
*   `RolesGuard` (Global / Endpoint Specific): Evaluates role configurations defined by `@Roles(Role.CLIENT, Role.SPECIALIST)` decorator. If user's JWT role doesn't match, throws `ForbiddenException`.

---

## Email Password Reset Service

*   `MailService`: Wraps `nodemailer` transport.
*   Uses environment variables: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
*   Fallback behavior: If environment variables are missing, falls back to logging the reset link directly to the console or creating an ephemeral Ethereal mailer.

---

## Verification Plan

### Automated/Unit Tests
*   Write unit tests for `AuthService` covering register, login, refresh, token rotation theft detection, and reset password actions.
*   Validate using NestJS end-to-end (e2e) tests for the authentication controllers.

### Manual Verification
*   Utilize Postman/cURL or automated tests to confirm token exchanges, invalidations, and HTTP error responses.
