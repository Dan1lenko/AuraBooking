# Reviews & Ratings Design Specification

This specification defines the architecture, database schema, API endpoints, and frontend user experience for Task 11: Reviews & Ratings.

## 1. Database Schema Design

We will add a `Review` model to `schema.prisma` mapping directly to the PostgreSQL database.

```prisma
model Review {
  id                  Int               @id @default(autoincrement())
  bookingId           Int               @unique
  booking             Booking           @relation(fields: [bookingId], references: [id], onDelete: Cascade)
  clientId            Int
  client              User              @relation(fields: [clientId], references: [id], onDelete: Cascade)
  specialistProfileId Int
  specialistProfile   SpecialistProfile @relation(fields: [specialistProfileId], references: [id], onDelete: Cascade)
  rating              Int               // 1 to 5 integer constraint
  comment             String            @db.Text
  createdAt           DateTime          @default(now())
}
```

### Relations Updates
- **User**: Add `reviews Review[]` relation.
- **SpecialistProfile**: Add `reviews Review[]` relation.
- **Booking**: Add `review Review?` relation.

---

## 2. Backend Architecture (NestJS)

We will create a `ReviewsModule` containing `ReviewsController` and `ReviewsService`.

### POST /reviews
- **Validation**:
  - Requires `bookingId`, `rating` (integer 1-5), and `comment` (string).
  - Verifies the `Booking` exists, its status is `COMPLETED`, and its `clientId` matches the current authenticated client user ID.
  - Verifies no review already exists for this `bookingId` (unique constraint check).
- **Recalculation Transaction**:
  Executing inside `prisma.$transaction`:
  1. Create the `Review` record.
  2. Perform an aggregate query on `Review` filtering by `specialistProfileId` to calculate:
     - `_avg: { rating: true }`
     - `_count: { rating: true }`
  3. Update the `SpecialistProfile` table's `rating` (float average) and `reviewsCount` (integer total).
- **Response**: The newly created review object.

### GET /reviews/:specialistId
- Queries the `Review` table filtering by `specialistProfileId`.
- Includes `client` details (`name`, `email`) for the reviewers.
- Sorted by `createdAt desc`.

---

## 3. Frontend Architecture (Next.js 14)

### Client Dashboard (/dashboard)
- Update the completed bookings renderer.
- If the booking status is `COMPLETED` and `booking.review` is null:
  - Render a "Leave a Review" button.
- Clicking the button opens a shadcn `Dialog` displaying:
  - A 1-to-5 interactive star selection list (hover transitions, active color styling).
  - A validation-guarded textarea for the text comment.
  - A submit button with loading state support.
- Upon successful submission, close the Dialog, trigger a toast notification, and refetch dashboard bookings (preventing duplicate reviews by hiding the button).

### Specialist Profile (/specialists/[id])
- Display the average rating stars (emerald/gold theme) and review counts next to the specialist's name/title.
- Query `GET /reviews/:specialistId` on load to render a lists panel of all client reviews (including client initials/avatars, rating stars, comment text, and readable dates).

### Specialist Card (Homepage/Directory)
- Render the average rating (e.g. `★ 4.8 (12 reviews)`) under the specialist's avatar/category.
