# Booking System Design Spec

This specification defines the database tables, backend APIs, email notifications, proxy routes, and frontend dashboard views for the Booking System on the Booking Platform.

---

## 1. Database Model (Prisma)

We will modify `schema.prisma` to adjust the `Booking` model and add a reverse relationship to the `User` model for client-side queries.

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
}
```

---

## 2. Backend Modules & API (NestJS)

We will create a `BookingsModule` under `backend/src/bookings/`.

### Endpoints:
1.  `POST /bookings`
    *   **Access**: Client
    *   **Description**: Creates a new booking in `PENDING` status.
    *   **Validations**:
        *   Checks if the selected specialist profile exists.
        *   Verifies that the slot does not overlap with any existing `CONFIRMED` or `PENDING` bookings for the specialist.
    *   **Notifications**: Calls `MailService.sendBookingConfirmation` to dispatch notification emails.
2.  `GET /bookings/me`
    *   **Access**: Logged-in Client or Specialist
    *   **Description**: Lists bookings.
        *   If `CLIENT`, filters by `clientId = req.user.id`.
        *   If `SPECIALIST`, filters by `specialistProfile.userId = req.user.id`.
3.  `PATCH /bookings/:id/status`
    *   **Access**: Client (to cancel) or Specialist (to approve/complete/cancel)
    *   **Description**: Updates status (`CONFIRMED`, `COMPLETED`, `CANCELLED`).
        *   Clients can only transition bookings to `CANCELLED`.
        *   Specialists can transition bookings to `CONFIRMED`, `COMPLETED`, or `CANCELLED`.

### MailService Extension (`backend/src/mail/mail.service.ts`):
```typescript
async sendBookingConfirmation(
  clientEmail: string,
  specialistEmail: string,
  specialistName: string,
  startTime: Date,
): Promise<void> {
  const dateStr = startTime.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' });
  const subject = 'Booking Confirmation Request';
  const text = `A new booking has been requested for ${dateStr} with ${specialistName}.`;
  const html = `<p>A new booking has been requested for <strong>${dateStr}</strong> with <strong>${specialistName}</strong>.</p>`;

  if (this.transporter) {
    // Send to client
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || '"Booking Platform" <noreply@booking.com>',
      to: clientEmail,
      subject,
      text,
      html,
    });
    // Send to specialist
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || '"Booking Platform" <noreply@booking.com>',
      to: specialistEmail,
      subject: `New Appointment Request - ${dateStr}`,
      text: `Client (${clientEmail}) requested a booking.`,
      html: `<p>Client <strong>${clientEmail}</strong> requested a booking on <strong>${dateStr}</strong>.</p>`,
    });
  } else {
    this.logger.log(`[EMAIL SIMULATION] Booking created. Client: ${clientEmail} | Specialist: ${specialistEmail} | Time: ${dateStr}`);
  }
}
```

---

## 3. Next.js API Proxy Routes

We will create the proxy route handler `frontend/src/app/api/bookings/route.ts` and `frontend/src/app/api/bookings/[id]/route.ts`.
*   `GET /api/bookings`: Maps to `GET http://localhost:3000/bookings/me` (injects Bearer token).
*   `POST /api/bookings`: Maps to `POST http://localhost:3000/bookings` (injects Bearer token).
*   `PATCH /api/bookings/[id]`: Maps to `PATCH http://localhost:3000/bookings/[id]/status` (injects Bearer token).
*   `DELETE /api/bookings/[id]`: Maps to `PATCH http://localhost:3000/bookings/[id]/status` with `status: "CANCELLED"` to cancel the booking.

---

## 4. Page Layouts (Next.js App Router)

### A. Client Dashboard `/dashboard`
*   **Design**: Slate-50 background, elegant split card list.
*   **Sections**:
    *   **Upcoming Appointments**: Filtered by status `PENDING` or `CONFIRMED` and `startTime >= now`. Displays date/time, specialist name, avatar, category, and status tags (`Pending` = yellow, `Confirmed` = green).
    *   **Past Appointments**: Filtered by `COMPLETED` or `CANCELLED`, or `startTime < now`.
*   **Actions**: "Cancel Session" button triggers a modal dialog requesting confirmation.

### B. Specialist Bookings Manager `/dashboard/bookings`
*   **Design**: Slate-50 background, tabs for `Pending`, `Confirmed`, and `Past`.
*   **Items**: List card for each booking displaying client name/email, session date/time, and current status.
*   **Actions**:
    *   For `PENDING` bookings: "Confirm" button (green border, sets status to `CONFIRMED`) and "Decline" button (red border, sets status to `CANCELLED`).
    *   For `CONFIRMED` bookings: "Mark Completed" button (sets status to `COMPLETED`) and "Cancel" button (sets status to `CANCELLED`).

### C. Booking Confirmation on `/specialists/[id]`
*   **Update**: After picking a date and time slot in the sidebar, a "Confirm Booking" button appears. If selected, it sends a POST request to `/api/bookings` and displays a success message.
