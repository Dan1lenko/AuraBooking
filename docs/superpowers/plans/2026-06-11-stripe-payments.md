# Stripe Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Stripe payments into the booking flow so that clients pay to confirm appointment bookings. Updates booking statuses to confirmed upon signature-verified webhook signals.

**Architecture:** We will create a `Payment` database table, implement backend controllers for payment configuration endpoints, handle payment verification logic within Stripe webhook handlers, configure API proxies to handle webhook raw requests, and mount Stripe Elements in Next.js.

**Tech Stack:** Stripe SDK, @stripe/react-stripe-js, NestJS, Next.js 14, Tailwind CSS

---

### Task 1: Update Database Schema & Regenerate Client

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add Payment model and link User and Booking**

Modify `backend/prisma/schema.prisma` to add:
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

- [ ] **Step 2: Validate the updated schema**

Run: `npx prisma validate` in `backend`
Expected: Schema validates successfully.

- [ ] **Step 3: Regenerate Prisma Client**

Run: `npx prisma generate` in `backend`
Expected: Prisma Client generated successfully.

- [ ] **Step 4: Commit (if auto_commit enabled)**

---

### Task 2: Install Dependencies & Configure Stripe Keys

**Files:**
- Modify: `backend/package.json` (via install)
- Modify: `frontend/package.json` (via install)
- Modify: `backend/.env`

- [ ] **Step 1: Install stripe package in backend**

Run: `npm install stripe` in `backend`
Expected: package installs successfully.

- [ ] **Step 2: Install Stripe packages in frontend**

Run: `npm install @stripe/stripe-js @stripe/react-stripe-js` in `frontend`
Expected: packages install successfully.

- [ ] **Step 3: Add test environment keys to backend env**

Modify `backend/.env` and append test keys:
```env
STRIPE_SECRET_KEY="sk_test_51O..."
STRIPE_PUBLISHABLE_KEY="pk_test_51O..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

- [ ] **Step 4: Commit (if auto_commit enabled)**

---

### Task 3: Create Payments Module & Service (NestJS)

**Files:**
- Create: `backend/src/payments/payments.service.ts`
- Create: `backend/src/payments/payments.controller.ts`
- Create: `backend/src/payments/payments.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create the PaymentsService**

Create `backend/src/payments/payments.service.ts` to load publishable key, list history, and verify webhooks:
```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  getPublishableKey() {
    return { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder' };
  }

  async findForUser(userId: number) {
    return this.prisma.payment.findMany({
      where: { clientId: userId },
      include: {
        booking: {
          include: {
            specialistProfile: {
              include: { user: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder',
      );
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = pi.id;

      const payment = await this.prisma.payment.findUnique({
        where: { paymentIntentId },
      });

      if (payment) {
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'SUCCEEDED' },
          }),
          this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED' },
          }),
        ]);
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const paymentIntentId = pi.id;

      const payment = await this.prisma.payment.findUnique({
        where: { paymentIntentId },
      });

      if (payment) {
        await this.prisma.$transaction([
          this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          }),
          this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CANCELLED' },
          }),
        ]);
      }
    }

    return { received: true };
  }

  // Helper method to create a payment intent when a booking is created
  async createPaymentIntent(bookingId: number, clientId: number, amount: number) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // convert to cents
      currency: 'usd',
      metadata: { bookingId: bookingId.toString(), clientId: clientId.toString() },
    });

    await this.prisma.payment.create({
      data: {
        bookingId,
        clientId,
        amount,
        paymentIntentId: paymentIntent.id,
        status: 'PENDING',
      },
    });

    return { clientSecret: paymentIntent.client_secret };
  }
}
```

- [ ] **Step 2: Create the PaymentsController**

Create `backend/src/payments/payments.controller.ts` with webhook support for raw bodies:
```typescript
import { Controller, Get, Post, Req, Headers, BadRequestException, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get('config')
  getPublishableKey() {
    return this.paymentsService.getPublishableKey();
  }

  @Get('me')
  async getMyPayments(@Req() req: any) {
    return this.paymentsService.findForUser(req.user.id);
  }

  @Public()
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    return this.paymentsService.handleWebhook(req.rawBody!, signature);
  }
}
```

- [ ] **Step 3: Enable rawBody parsing in main.ts**

Modify `backend/src/main.ts` to allow rawBody support (needed for Stripe webhook verification):
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
...
```

- [ ] **Step 4: Create the PaymentsModule**

Create `backend/src/payments/payments.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

- [ ] **Step 5: Register PaymentsModule in AppModule**

Import and add `PaymentsModule` to imports list in `backend/src/app.module.ts`:
```typescript
import { PaymentsModule } from './payments/payments.module';

// Add to imports array:
imports: [UsersModule, AuthModule, SpecialistsModule, BookingsModule, PaymentsModule]
```

- [ ] **Step 6: Update BookingsService to trigger createPaymentIntent**

Modify `backend/src/bookings/bookings.service.ts` to import `PaymentsService`, inject it, trigger the payment intent creation, and return the clientSecret to the caller:
```typescript
// Add import at the top
import { PaymentsService } from '../payments/payments.service';

// Inject in constructor
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private paymentsService: PaymentsService,
  ) {}

// Modify create method:
    const booking = await this.prisma.booking.create({
      data: {
        clientId,
        specialistProfileId: data.specialistProfileId,
        startTime: start,
        endTime: end,
        status: 'PENDING',
      },
      include: {
        client: true,
        specialistProfile: { include: { user: true } },
      },
    });

    const amount = specialist.price; // rate per hour
    const { clientSecret } = await this.paymentsService.createPaymentIntent(booking.id, clientId, amount);

    this.mailService.sendBookingConfirmation(
      client.email,
      specialist.user.email,
      specialist.user.name || 'Specialist',
      start,
    ).catch(() => {});

    return { booking, clientSecret };
```

- [ ] **Step 7: Commit (if auto_commit enabled)**

---

### Task 4: Next.js API Proxy Routes for Payments

**Files:**
- Create: `frontend/src/app/api/payments/config/route.ts`
- Create: `frontend/src/app/api/payments/me/route.ts`
- Create: `frontend/src/app/api/payments/webhook/route.ts`

- [ ] **Step 1: Create Proxy Route for publishable key**

Create `frontend/src/app/api/payments/config/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const response = await axios.get('http://localhost:3000/payments/config');
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch config' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 2: Create Proxy Route for client payments history**

Create `frontend/src/app/api/payments/me/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const response = await axios.get('http://localhost:3000/payments/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch payments' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 3: Create Proxy Route for webhooks handling raw bodies**

Create `frontend/src/app/api/payments/webhook/route.ts`:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    const response = await axios.post('http://localhost:3000/payments/webhook', rawBody, {
      headers: {
        'stripe-signature': signature,
        'Content-Type': 'application/json',
      },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Webhook proxy failed' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 4: Commit (if auto_commit enabled)**

---

### Task 5: Implement Stripe Elements Checkout on Specialist Public View

**Files:**
- Modify: `frontend/src/app/specialists/[id]/page.tsx`

- [ ] **Step 1: Integrate Stripe Elements form**

Modify `frontend/src/app/specialists/[id]/page.tsx` to initialize loadStripe dynamically, mount Card fields after booking initialization, and handle payment confirmations:

```tsx
// Add imports at top
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Create a CardForm sub-component at bottom of file or inline:
function CheckoutForm({ clientSecret, onSuccess, onCancel }: { clientSecret: string, onSuccess: () => void, onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const card = elements.getElement(CardElement);
    if (!card) return;

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (result.error) {
      setError(result.error.message || 'Payment failed');
      setLoading(false);
    } else {
      if (result.paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="p-3.5 border border-slate-200 rounded-xl bg-slate-50 shadow-inner">
        <CardElement options={{ style: { base: { fontSize: '14px', color: '#1e293b' } } }} />
      </div>
      {error && <p className="text-xs text-red-500 text-center font-bold">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-xs font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Pay & Confirm'}
        </button>
      </div>
    </form>
  );
}
```

And update the sidebar checkout state logic in `SpecialistProfilePage`:
```tsx
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<any>(null);

  useEffect(() => {
    api.get('/payments/config').then((res) => {
      setStripePromise(loadStripe(res.data.publishableKey));
    });
  }, []);

  const handleBookSession = async () => {
    if (!selectedSlot || !params?.id) return;
    setBookingLoading(true);
    setBookingError(null);
    setBookingSuccess(false);
    try {
      const response = await api.post(`/bookings`, {
        specialistProfileId: parseInt(params.id as string, 10),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
      setClientSecret(response.data.clientSecret);
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Please log in to book a session.');
      setBookingLoading(false);
    }
  };
```

Mount Elements inside the booking sidebar:
```tsx
              {clientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm
                    clientSecret={clientSecret}
                    onSuccess={() => {
                      setBookingSuccess(true);
                      setClientSecret(null);
                      setBookingLoading(false);
                    }}
                    onCancel={() => {
                      setClientSecret(null);
                      setBookingLoading(false);
                    }}
                  />
                </Elements>
              )}
```

- [ ] **Step 2: Commit (if auto_commit enabled)**

---

### Task 6: Implement Redirect Success and Cancel Pages

**Files:**
- Create: `frontend/src/app/booking/success/page.tsx`
- Create: `frontend/src/app/booking/cancel/page.tsx`

- [ ] **Step 1: Create Success page**

Create `frontend/src/app/booking/success/page.tsx`:
```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Calendar } from 'lucide-react';

export default function BookingSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Payment Successful!</h1>
          <p className="text-slate-500 text-sm">Your booking has been requested, and payment has processed successfully.</p>
        </div>
        <footer className="flex flex-col gap-2 pt-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            <Calendar className="w-5 h-5" />
            View My Sessions
          </Link>
        </footer>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create Cancel page**

Create `frontend/src/app/booking/cancel/page.tsx`:
```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function BookingCancelPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Payment Cancelled</h1>
          <p className="text-slate-500 text-sm">The checkout session was cancelled. No charges were made.</p>
        </div>
        <footer className="flex flex-col gap-2 pt-2">
          <Link
            href="/specialists"
            className="flex items-center justify-center gap-2 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Specialists
          </Link>
        </footer>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit (if auto_commit enabled)**

---

### Task 7: Update Dashboards to Show Payment status

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`
- Modify: `frontend/src/app/dashboard/bookings/page.tsx`

- [ ] **Step 1: Show Payment status on Client Dashboard**

Modify `frontend/src/app/dashboard/page.tsx` to query payment association and display `Paid` status tags:
```tsx
  // In getStatusBadge helper or rendering line:
  const getPaymentBadge = (booking: any) => {
    if (booking.payment?.status === 'SUCCEEDED') {
      return <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100 uppercase">Paid</span>;
    }
    return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full border border-slate-200 uppercase">Unpaid</span>;
  };
```

- [ ] **Step 2: Show Payment status on Specialist Dashboard**

Modify `frontend/src/app/dashboard/bookings/page.tsx` similarly to display the paid status tags for the specialist view.

- [ ] **Step 3: Run Next.js build to verify frontend compilation**

Run: `npm run build` in `frontend`
Expected: Frontend builds successfully without errors.

- [ ] **Step 4: Commit (if auto_commit enabled)**
