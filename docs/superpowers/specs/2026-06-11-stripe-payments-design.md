# Stripe Payments Design Spec

This specification defines the database tables, backend Stripe integrations, webhook handlers, client payment elements, and redirect paths for processing payments for bookings.

---

## 1. Database Model (Prisma)

We will introduce a `Payment` model and associate it with the `Booking` and `User` models to maintain client payment histories.

### Schema Changes:
```prisma
model User {
  id                Int                @id @default(autoincrement())
  email             String             @unique
  name              String?
  password          String
  role              Role               @default(CLIENT)
  resetToken        String?
  resetTokenExpires DateTime?
  refreshTokens     RefreshToken[]
  specialistProfile SpecialistProfile?
  clientBookings    Booking[]          @relation("ClientBookings")
  payments          Payment[]
}

model Booking {
  id                  Int               @id @default(autoincrement())
  clientId            Int
  client              User              @relation("ClientBookings", fields: [clientId], references: [id], onDelete: Cascade)
  specialistProfileId Int
  specialistProfile   SpecialistProfile @relation(fields: [specialistProfileId], references: [id], onDelete: Cascade)
  startTime           DateTime
  endTime             DateTime
  status              String            @default("PENDING") // PENDING, CONFIRMED, COMPLETED, CANCELLED
  createdAt           DateTime          @default(now())
  payment             Payment?
}

model Payment {
  id              Int      @id @default(autoincrement())
  bookingId       Int      @unique
  booking         Booking  @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  clientId        Int
  client          User     @relation(fields: [clientId], references: [id], onDelete: Cascade)
  amount          Float
  currency        String   @default("usd")
  paymentIntentId String   @unique
  status          String   @default("PENDING") // PENDING, SUCCEEDED, FAILED
  createdAt       DateTime @default(now())
}
```

---

## 2. Backend Modules & API (NestJS)

We will create a `PaymentsModule` under `backend/src/payments/`.

### Endpoints:
1.  `GET /payments/config`
    *   **Access**: Client
    *   **Description**: Retrieves the Stripe publishable key: `{ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY }`.
2.  `GET /payments/me`
    *   **Access**: Client
    *   **Description**: Lists payment history for the logged-in client.
3.  `POST /payments/webhook`
    *   **Access**: Public (Stripe Signature Verified)
    *   **Description**: Listens for Stripe webhooks (`payment_intent.succeeded` and `payment_intent.payment_failed`).
        *   On `payment_intent.succeeded`:
            *   Updates associated `Payment.status` to `SUCCEEDED`.
            *   Updates associated `Booking.status` to `CONFIRMED`.
        *   On `payment_intent.payment_failed`:
            *   Updates associated `Payment.status` to `FAILED`.
            *   Updates associated `Booking.status` to `CANCELLED`.

### Stripe Integration Logic:
When a client requests a booking via `POST /bookings`:
1.  The booking is registered in `PENDING` status.
2.  The backend calls the Stripe API:
    ```typescript
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: specialist.price * 100, // in cents
      currency: 'usd',
      metadata: { bookingId: booking.id },
    });
    ```
3.  A pending `Payment` record is created containing the `paymentIntentId`.
4.  The endpoint returns the booking and the `clientSecret` from the Payment Intent.

---

## 3. Next.js API Proxy Routes

We will create the proxy route handler `frontend/src/app/api/payments/route.ts` and `frontend/src/app/api/payments/config/route.ts`.
*   `GET /api/payments/config`: Proxies to `GET http://localhost:3000/payments/config`.
*   `GET /api/payments/me`: Proxies to `GET http://localhost:3000/payments/me` (injects Bearer token).
*   `POST /api/payments/webhook`: Proxies Stripe signature headers and the raw request body to the NestJS backend webhook endpoint.

---

## 4. Page Layouts (Next.js App Router)

### A. Stripe Elements Payment Form on `/specialists/[id]`
*   **Design**: Soft UI Drawer overlay or inline checkout sheet.
*   **Flow**:
    1.  Client clicks "Confirm Booking".
    2.  An overlay mounts Stripe Elements using the retrieved `clientSecret` and publishable key.
    3.  Client inputs card details and clicks "Pay Now".
    4.  Stripe redirects to `/booking/success?bookingId=X` upon successful confirmation.

### B. Redirect Pages
*   **Success `/booking/success`**: Display a Soft UI card with a checkmark, confirming the appointment and prompting them to check their email for notifications.
*   **Cancel `/booking/cancel`**: Display a notification stating that the payment was not completed, and prompt them to try again.

### C. Client Dashboard Updates
*   Booking items display a payment status tag next to the approval status tag:
    *   `Unpaid`: Gray border, indicating payment hasn't cleared.
    *   `Paid`: Green border, indicating successful Stripe checkout.
