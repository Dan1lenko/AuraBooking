# Notifications (Queue, Scheduler & WebSocket) Design Spec

This specification defines the database tables, Bull queue scheduler, WebSocket notifications push, and frontend header notifications bell UI for the booking platform.

---

## 1. Database Model (Prisma)

We will introduce a `Notification` model to store in-app notifications.

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
  chats             Chat[]             @relation("ClientChats")
  messages          Message[]
  notifications     Notification[]
}

model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      String   // BOOKING_CONFIRMED, REMINDER, MESSAGE, etc.
  text      String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
}
```

---

## 2. Backend Bull Queue & Job Scheduler (NestJS)

We will use the `@nestjs/bull` module to schedule delayed email reminders.

### Job Flow:
1.  **Trigger Event**: When a specialist updates booking status to `CONFIRMED` in `BookingsService.updateStatus()`:
    *   Calculate time differences for **24h before** and **1h before** the session.
    *   If `startTime - 24h` is in the future, schedule a reminder job with Bull queue using a unique job ID:
        *   `jobId: "reminder-24h-" + bookingId`
        *   `delay: (startTime - 24h) - Date.now()`
    *   If `startTime - 1h` is in the future, schedule a reminder job:
        *   `jobId: "reminder-1h-" + bookingId`
        *   `delay: (startTime - 1h) - Date.now()`
2.  **Cancel Event**: If a booking is `CANCELLED`:
    *   Query the queue for jobs matching `"reminder-24h-" + bookingId` and `"reminder-1h-" + bookingId`.
    *   Cancel/remove the jobs from the queue if found.

---

## 3. In-App Notifications & WebSocket Push

We will reuse the `ChatGateway` (connected rooms `user_${userId}`) to push real-time notifications.

- When a new database `Notification` is created via `NotificationsService.createNotification(userId, type, text)`:
  - Save the record in the database.
  - Inject `ChatGateway` to push a WebSocket event `new_notification` directly to the recipient's room `user_${userId}` with the notification payload.

---

## 4. HTTP API Endpoints

We will create a `NotificationsModule` exposing:

1.  `GET /notifications`: Lists all notifications for the authenticated user, ordered by `createdAt` descending.
2.  `PUT /notifications/:id/read`: Marks a specific notification as read.
3.  `PUT /notifications/read-all`: Marks all notifications for the current user as read.

---

## 5. Frontend UI (Next.js 14 Header Bell)

- **Header Component**:
  - Add a notification bell icon button with a floating unread count badge (using `animate-pulse` when new ones arrive).
  - Clicking the bell opens a popover dropdown list of notifications.
- **Dropdown List**:
  - Show a list of recent notifications.
  - Clicking a notification marks it as read and redirects the user (e.g. if it's a message, go to chat; if it's a booking, go to dashboard).
  - Displays a "Mark all as read" button at the top.
  - Different icons per notification type:
    - `BOOKING_CONFIRMED`: Calendar check icon (green)
    - `REMINDER`: Clock alarm icon (amber)
    - `MESSAGE`: Message icon (blue)
