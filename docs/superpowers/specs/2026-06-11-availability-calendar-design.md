# Availability & Calendar Design Spec

This specification defines the database tables, API algorithms, and page layouts for managing specialist availability and booking calendars on the Booking Platform.

## 1. Database Model (Prisma)

We will introduce a `WorkingHours` model representing weekly schedule slots and a `Booking` model to track reserved times.

### Schema Changes:
```prisma
model SpecialistProfile {
  id           Int           @id @default(autoincrement())
  bio          String        @db.Text
  category     String
  price        Float
  experience   Int
  avatarUrl    String?
  rating       Float         @default(0.0)
  reviewsCount Int           @default(0)
  userId       Int           @unique
  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  workingHours WorkingHours[]
  bookings     Booking[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}

model WorkingHours {
  id                  Int               @id @default(autoincrement())
  dayOfWeek           Int               // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime           String            // e.g. "09:00"
  endTime             String            // e.g. "18:00"
  isAvailable         Boolean           @default(true)
  specialistProfileId Int
  specialistProfile   SpecialistProfile @relation(fields: [specialistProfileId], references: [id], onDelete: Cascade)

  @@unique([specialistProfileId, dayOfWeek])
}

model Booking {
  id                  Int               @id @default(autoincrement())
  clientId            Int
  specialistProfileId Int
  specialistProfile   SpecialistProfile @relation(fields: [specialistProfileId], references: [id], onDelete: Cascade)
  startTime           DateTime          // UTC / Server standard ISO datetime
  endTime             DateTime          // UTC / Server standard ISO datetime
  status              String            @default("CONFIRMED") // CONFIRMED, CANCELLED
  createdAt           DateTime          @default(now())
}
```

---

## 2. Time Slot Generation Algorithm (NestJS)

When a client queries `/specialists/:id/slots?date=YYYY-MM-DD`:
1.  Determine the **day of the week** for the queried date (e.g. 2026-06-15 is a Monday, which matches `dayOfWeek = 1`).
2.  Query `WorkingHours` for that day and specialist. If unavailable or not configured, return an empty array.
3.  Parse `startTime` and `endTime` into minute offsets from midnight (e.g. "09:00" = 540 minutes, "18:00" = 1080 minutes).
4.  Generate potential slots in **30-minute intervals** between the offsets.
    *   Slot 1: `09:00` - `09:30`
    *   Slot 2: `09:30` - `10:00`
    *   ...
5.  Query all active (`status !== "CANCELLED"`) bookings for this specialist on the specified date.
6.  For each generated slot:
    *   Construct the absolute start and end `DateTime` objects for that date.
    *   Check if it overlaps with any queried bookings.
    *   Add metadata: `{ time: "09:00", isBooked: true/false, date: "2026-06-15T09:00:00.000Z" }`.
7.  Return the list of slots.

---

## 3. Page Layouts (Next.js App Router)

### A. Specialist Schedule Dashboard `/dashboard/schedule`
*   **Weekly Grid**: 7 rows (Monday - Sunday) in a Soft UI card.
*   **Controls**:
    *   A toggle switch (styled checkbox) to mark the day available/unavailable.
    *   Two dropdown select inputs (Start Time & End Time) populated with half-hour intervals. Disabled if the day is unavailable.
*   **Action**: "Save Working Hours" updates the schedule in one API request.

### B. Client Public Booking Calendar `/specialists/[id]`
*   **Visual Picker**: Added to the booking sidebar.
    *   **Date Selector**: A list of dates (today and the next 14 days) displayed as clickable cards.
    *   **Time Grid**: Interactive time slot chips.
        *   *Available*: Slate-bordered button with hover blue glow.
        *   *Booked*: Light gray background with strikethrough, disabled.
        *   *Selected*: Solid blue button.
*   **State Management**: Selecting a slot updates a `selectedSlot` state variable on the page.
