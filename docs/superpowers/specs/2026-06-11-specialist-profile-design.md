# Specialist Profile Design Spec

This specification defines the backend and frontend components for managing and viewing Specialist Profiles on the Booking Platform.

## 1. Database Model (Prisma)

We will create a `SpecialistProfile` model and relate it one-to-one with the `User` model.

### Changes to `backend/prisma/schema.prisma`:
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
}

model SpecialistProfile {
  id           Int      @id @default(autoincrement())
  bio          String   @db.Text
  category     String
  price        Float
  experience   Int
  avatarUrl    String?
  rating       Float    @default(0.0)
  reviewsCount Int      @default(0)
  userId       Int      @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 2. Backend Architecture (NestJS)

### Specialist Module & Controllers
We will create a `SpecialistsModule` providing CRUD routes.

1.  `GET /specialists` (Public)
    *   **Query Params**: `category` (string), `minPrice` (number), `maxPrice` (number), `minRating` (number)
    *   **Returns**: Array of Specialists with user details.
2.  `GET /specialists/:id` (Public)
    *   **Returns**: Public profile of a specialist.
3.  `GET /specialists/me` (Protected - SPECIALIST only)
    *   **Returns**: Current specialist's own profile.
4.  `PUT /specialists/me` (Protected - SPECIALIST only)
    *   **Body**: `{ bio, category, price, experience, avatarUrl }`
    *   **Returns**: Updated profile.
5.  `POST /specialists/me/avatar` (Protected - SPECIALIST only)
    *   **Body**: `multipart/form-data` file.
    *   **Returns**: `{ avatarUrl }`

### Cloudinary Service
*   Module: `CloudinaryService` inside `backend/src/cloudinary/`
*   If `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are present, uploads the file buffer directly to Cloudinary.
*   Otherwise, saves the file locally to `backend/uploads/` and returns the local static asset URL (e.g. `/uploads/filename`).

---

## 3. Frontend Pages (Next.js)

We will use the **Soft UI Evolution** style, combining clean card containers, soft border lines, and subtle shadows.

### A. Specialists List `/specialists`
*   **Layout**: 2-Column Desktop layout.
    *   Left side (1/4 width): Sticky filter panel (category dropdown, price range slider, rating selector).
    *   Right side (3/4 width): Grid of specialist cards.
*   **Card Design**: Soft shadows, rounded borders (`rounded-2xl`), category badge, price, experience, rating star icon.

### B. Public Profile `/specialists/[id]`
*   **Layout**: 2-Column Desktop layout.
    *   Left side: Public profile overview (avatar, bio, experience, reviews).
    *   Right side: Sticky Booking Card (Call to Action: "Book Session").
*   **Reviews Mockup**: Standard customer review cards with name, date, comment, and 5-star rating stars.

### C. Dashboard Profile Editor `/dashboard/profile`
*   **Forms**: Uses `react-hook-form` + `zod` schema validation.
*   **Avatar Upload Box**: Interactive upload container. Drag & drop file, shows preview of image immediately before initiating upload.

---

## 4. Verification Plan

### Automated Checks
*   **NestJS Tests**: Unit tests in `specialists.service.spec.ts` verifying filtering queries and CRUD logic.
*   **Next.js Build**: Successful production build compilation.

### Manual Checks
*   Upload file and verify mock/real url generation.
*   Filter grid by categories/prices and verify database query outcomes.
