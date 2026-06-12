# AuraBooking — Premium Specialist Booking Platform

AuraBooking is a modern, responsive web application connecting clients with verified specialists (for therapy, coaching, massage, consulting, etc.).

## 🚀 Architecture Overview
- **Frontend**: Next.js 14 (App Router) with Tailwind CSS, Lucide icons, and Axios API proxy routing.
- **Backend**: NestJS application framework with TypeScript, passport-jwt authorization, and event gateways.
- **Database**: PostgreSQL database indexed and queried via Prisma ORM.
- **Scheduler & Queue**: Bull Queue powered by Redis for delayed job executions (email reminders).
- **Payments**: Stripe Elements API integration.
- **Real-time Messaging**: Socket.io WebSocket connections.

---

## 🛠️ Prerequisites
Ensure you have the following installed on your development machine:
1. **Node.js** (v18 or higher) & **npm**
2. **Docker Desktop** (for running PostgreSQL and Redis)

---

## ⚙️ Environment Configuration

### Backend Setup
1. Navigate to `/backend`.
2. Copy `.env.example` to a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
3. Configure the parameters in `.env`:
   - `DATABASE_URL`: Connection string for your PostgreSQL instance.
   - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`.
   - `REDIS_HOST` & `REDIS_PORT` (default `localhost` and `6379`).
   - `SMTP_*`: Credentials for email triggers (mailtrap, sendgrid, etc.).
   - `CLOUDINARY_*`: Credentials for media/avatars hosting.

### Frontend Setup
1. Navigate to `/frontend`.
2. Copy `.env.example` to `.env` or `.env.local`:
   ```bash
   cp .env.example .env
   ```
3. Configure:
   - `BACKEND_API_URL`: NestJS server URL (default: `http://localhost:3000`).
   - `NEXT_PUBLIC_BACKEND_API_URL`: WebSocket target URL (default: `http://localhost:3000`).

---

## 💻 Local Development Setup

### Step 1: Start Services via Docker
Start the PostgreSQL and Redis containers using the docker-compose file in the root:
```bash
docker-compose up -d
```

### Step 2: Initialize Backend & Database
1. Navigate to `/backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Sync Prisma database schema and generate types client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
4. Start the NestJS development server:
   ```bash
   npm run start:dev
   ```
   The backend will run on [http://localhost:3000](http://localhost:3000).

### Step 3: Initialize Frontend
1. Navigate to `/frontend`:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   The frontend will run on [http://localhost:3001](http://localhost:3001) (or the next available port).

---

## 🧪 Running Verification Tests
To run unit and integration tests inside the NestJS backend:
```bash
cd backend
npm test
```

To verify frontend TypeScript safety:
```bash
cd frontend
npx tsc --noEmit
```
