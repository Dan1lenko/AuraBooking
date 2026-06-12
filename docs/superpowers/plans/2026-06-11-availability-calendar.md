# Availability & Calendar Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement weekly availability scheduling for specialists, slot generation algorithms, and client date/time slot booking selectors.

**Architecture:** We will create database tables for `WorkingHours` and `Booking`. The backend will compute 30-minute availability intervals dynamically on a given date. The frontend will include scheduling pages and slots select grids.

**Tech Stack:** NestJS, Prisma ORM, Next.js, Tailwind CSS, react-hook-form, zod

---

### Task 1: Update Database Schema & Regenerate Client

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add WorkingHours and Booking models**

Update `backend/prisma/schema.prisma` with `WorkingHours` and `Booking` definitions, and add relation fields on `SpecialistProfile`:
```prisma
datasource db {
  provider = "postgresql"
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  CLIENT
  SPECIALIST
}

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

model RefreshToken {
  id        Int      @id @default(autoincrement())
  token     String   @unique
  userId    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  isRevoked Boolean  @default(false)
  createdAt DateTime @default(now())
}

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
  startTime           DateTime
  endTime             DateTime
  status              String            @default("CONFIRMED")
  createdAt           DateTime          @default(now())
}
```

- [ ] **Step 2: Validate the updated schema**

Run: `npx prisma validate` in `d:\booking platform\backend`
Expected: Schema validates successfully.

- [ ] **Step 3: Regenerate Prisma Client**

Run: `npx prisma generate` in `d:\booking platform\backend`
Expected: Prisma client successfully regenerated with the new schedule and booking types.

- [ ] **Step 4: Commit (if auto_commit enabled)**

---

### Task 2: Implement Availability & Booking CRUD (NestJS)

**Files:**
- Modify: `backend/src/specialists/specialists.service.ts`
- Modify: `backend/src/specialists/specialists.controller.ts`
- Modify: `backend/src/specialists/specialists.service.spec.ts`

- [ ] **Step 1: Add schedule updates and slots calculation to SpecialistsService**

Modify `backend/src/specialists/specialists.service.ts` to implement schedule upserts and 30-minute interval generation logic:
```typescript
// Add imports as needed
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SpecialistsService {
  constructor(private prisma: PrismaService) {}

  // ... (previous functions remain unchanged)

  async findWorkingHours(userId: number) {
    const profile = await this.prisma.specialistProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Specialist profile not found');
    }
    return this.prisma.workingHours.findMany({
      where: { specialistProfileId: profile.id },
    });
  }

  async updateWorkingHours(userId: number, schedule: any[]) {
    const profile = await this.prisma.specialistProfile.findUnique({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException('Specialist profile not found');
    }

    const operations = schedule.map((day) =>
      this.prisma.workingHours.upsert({
        where: {
          specialistProfileId_dayOfWeek: {
            specialistProfileId: profile.id,
            dayOfWeek: day.dayOfWeek,
          },
        },
        update: {
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        },
        create: {
          specialistProfileId: profile.id,
          dayOfWeek: day.dayOfWeek,
          startTime: day.startTime,
          endTime: day.endTime,
          isAvailable: day.isAvailable,
        },
      }),
    );

    return this.prisma.$transaction(operations);
  }

  async createBooking(clientId: number, specialistProfileId: number, data: any) {
    return this.prisma.booking.create({
      data: {
        clientId,
        specialistProfileId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        status: 'CONFIRMED',
      },
    });
  }

  async generateSlots(specialistProfileId: number, dateStr: string) {
    const queryDate = new Date(dateStr);
    const dayOfWeek = queryDate.getUTCDay();

    // 1. Get working hours for this day of week
    const hours = await this.prisma.workingHours.findUnique({
      where: {
        specialistProfileId_dayOfWeek: {
          specialistProfileId,
          dayOfWeek,
        },
      },
    });

    if (!hours || !hours.isAvailable) {
      return [];
    }

    // 2. Fetch existing bookings on this day
    const startOfDay = new Date(dateStr);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const bookings = await this.prisma.booking.findMany({
      where: {
        specialistProfileId,
        status: 'CONFIRMED',
        startTime: { gte: startOfDay, lte: endOfDay },
      },
    });

    // 3. Generate 30min slots
    const slots: any[] = [];
    const [startH, startM] = hours.startTime.split(':').map(Number);
    const [endH, endM] = hours.endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (currentMinutes + 30 <= endMinutes) {
      const sh = Math.floor(currentMinutes / 60);
      const sm = currentMinutes % 60;
      const eh = Math.floor((currentMinutes + 30) / 60);
      const em = (currentMinutes + 30) % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${pad(sh)}:${pad(sm)}`;

      const slotStart = new Date(dateStr);
      slotStart.setUTCHours(sh, sm, 0, 0);

      const slotEnd = new Date(dateStr);
      slotEnd.setUTCHours(eh, em, 0, 0);

      // Check if slot overlaps with any active bookings
      const isBooked = bookings.some(
        (b) =>
          slotStart.getTime() < new Date(b.endTime).getTime() &&
          slotEnd.getTime() > new Date(b.startTime).getTime(),
      );

      slots.push({
        time: timeStr,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        isBooked,
      });

      currentMinutes += 30;
    }

    return slots;
  }
}
```

- [ ] **Step 2: Add Controller endpoints to SpecialistsController**

Modify `backend/src/specialists/specialists.controller.ts` to add schedule configurations and slots endpoints:
```typescript
// Add roles import and mappings
import { SpecialistsService } from './specialists.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
// ... (previous functions remain unchanged)

  @Roles(Role.SPECIALIST)
  @Get('me/schedule')
  async getMySchedule(@Req() req: any) {
    return this.specialistsService.findWorkingHours(req.user.id);
  }

  @Roles(Role.SPECIALIST)
  @Put('me/schedule')
  async updateMySchedule(@Req() req: any, @Body() body: { schedule: any[] }) {
    return this.specialistsService.updateWorkingHours(req.user.id, body.schedule);
  }

  @Public()
  @Get(':id/slots')
  async getSlots(
    @Param('id', ParseIntPipe) id: number,
    @Query('date') date: string,
  ) {
    return this.specialistsService.generateSlots(id, date);
  }

  @Roles(Role.CLIENT)
  @Post(':id/bookings')
  async bookSpecialist(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { startTime: string; endTime: string },
  ) {
    return this.specialistsService.createBooking(req.user.id, id, body);
  }
```

- [ ] **Step 3: Update unit tests in SpecialistsService spec**

Modify `backend/src/specialists/specialists.service.spec.ts` to verify slot calculations:
```typescript
// Add mock queries for workingHours and bookings
const mockWorkingHours = {
  id: 1,
  specialistProfileId: 1,
  dayOfWeek: 1, // Monday
  startTime: '09:00',
  endTime: '11:00',
  isAvailable: true,
};

const mockPrismaService = {
  specialistProfile: {
    findMany: jest.fn().mockResolvedValue([mockProfile]),
    findUnique: jest.fn().mockResolvedValue(mockProfile),
    upsert: jest.fn().mockResolvedValue(mockProfile),
  },
  workingHours: {
    findMany: jest.fn().mockResolvedValue([mockWorkingHours]),
    findUnique: jest.fn().mockResolvedValue(mockWorkingHours),
    upsert: jest.fn(),
  },
  booking: {
    findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
  },
  $transaction: jest.fn(ops => Promise.all(ops)),
};
```

- [ ] **Step 4: Run the test to verify it compiles and passes**

Run: `npm test` inside `backend`
Expected: All backend tests pass successfully.

- [ ] **Step 5: Commit (if auto_commit enabled)**

---

### Task 3: Create Next.js API Proxy Routes for Availability

**Files:**
- Create: `frontend/src/app/api/specialists/[id]/slots/route.ts`
- Create: `frontend/src/app/api/specialists/me/schedule/route.ts`
- Create: `frontend/src/app/api/specialists/[id]/book/route.ts`

- [ ] **Step 1: Create Proxy Slots Route**

Create `frontend/src/app/api/specialists/[id]/slots/route.ts` with:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const response = await axios.get(`http://localhost:3000/specialists/${id}/slots`, {
      params: Object.fromEntries(searchParams.entries()),
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch slots' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 2: Create Proxy Schedule Config Route**

Create `frontend/src/app/api/specialists/me/schedule/route.ts` with:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const response = await axios.get('http://localhost:3000/specialists/me/schedule', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch schedule' },
      { status: error.response?.status || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const body = await request.json();
    const response = await axios.put('http://localhost:3000/specialists/me/schedule', body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to update schedule' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 3: Create Proxy Booking Action Route**

Create `frontend/src/app/api/specialists/[id]/book/route.ts` with:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    const body = await request.json();
    const response = await axios.post(`http://localhost:3000/specialists/${id}/bookings`, body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to make booking' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 4: Commit (if auto_commit enabled)**

---

### Task 4: Build Weekly Availability Settings Dashboard Page

**Files:**
- Create: `frontend/src/app/dashboard/schedule/page.tsx`

- [ ] **Step 1: Create availability config page**

Create `frontend/src/app/dashboard/schedule/page.tsx` with:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Save, Loader2, CalendarRange } from 'lucide-react';

interface DaySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export default function AvailabilityConfigPage() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const daysLabel = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    api.get('/specialists/me/schedule')
      .then((res) => {
        // Initialize default empty schedules if database has none
        const initial = daysLabel.map((_, index) => {
          const matched = res.data.find((d: any) => d.dayOfWeek === index);
          return matched || { dayOfWeek: index, startTime: '09:00', endTime: '17:00', isAvailable: false };
        });
        setSchedule(initial);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = (index: number) => {
    const next = [...schedule];
    next[index].isAvailable = !next[index].isAvailable;
    setSchedule(next);
  };

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const next = [...schedule];
    next[index][field] = value;
    setSchedule(next);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.put('/specialists/me/schedule', { schedule });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save schedule settings.');
    } finally {
      setSaving(false);
    }
  };

  // Generate 30min slot options
  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    const pad = (n: number) => n.toString().padStart(2, '0');
    timeOptions.push(`${pad(h)}:00`, `${pad(h)}:30`);
  }

  if (loading) {
    return <p className="text-slate-400 text-center py-12">Loading schedule details...</p>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
        <header className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-8">
          <CalendarRange className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Manage Availability</h1>
            <p className="text-slate-500 text-sm mt-1">Set your standard weekly operating hours for sessions</p>
          </div>
        </header>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg p-3 text-sm mb-6 text-center">
            Availability settings saved successfully!
          </div>
        )}

        <div className="space-y-6">
          {schedule.map((day, index) => (
            <div
              key={day.dayOfWeek}
              className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-xl gap-4 transition-colors ${
                day.isAvailable ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/50 opacity-60'
              }`}
            >
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id={`toggle-${index}`}
                  checked={day.isAvailable}
                  onChange={() => handleToggle(index)}
                  className="w-5 h-5 accent-blue-600 cursor-pointer"
                />
                <label htmlFor={`toggle-${index}`} className="font-bold text-slate-800 text-base min-w-[100px] cursor-pointer">
                  {daysLabel[day.dayOfWeek]}
                </label>
              </div>

              <div className="flex items-center gap-4">
                <div>
                  <select
                    disabled={!day.isAvailable}
                    value={day.startTime}
                    onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                    className="py-2 px-3 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <span className="text-slate-400 text-sm">to</span>
                <div>
                  <select
                    disabled={!day.isAvailable}
                    value={day.endTime}
                    onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                    className="py-2 px-3 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 text-sm"
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Availability
          </button>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit (if auto_commit enabled)**

---

### Task 5: Integrate Booking Calendar on Public Details View

**Files:**
- Modify: `frontend/src/app/specialists/[id]/page.tsx`

- [ ] **Step 1: Update SpecialistProfilePage component with date and time selectors**

Replace `frontend/src/app/specialists/[id]/page.tsx` to query slots on dates changes and trigger booking submissions:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Star, User, Calendar, ShieldCheck, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function SpecialistProfilePage() {
  const params = useParams();
  const [specialist, setSpecialist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Calendar states
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Generate next 7 days for the picker list
  const [dateList, setDateList] = useState<any[]>([]);

  useEffect(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const isoStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('en-US', { day: 'numeric' });
      list.push({ isoStr, dayName, dayNum });
    }
    setDateList(list);
    setSelectedDate(list[0].isoStr);
  }, []);

  useEffect(() => {
    if (params?.id) {
      api.get(`/specialists/${params.id}`)
        .then(res => setSpecialist(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [params?.id]);

  useEffect(() => {
    if (params?.id && selectedDate) {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setBookingError(null);
      api.get(`/specialists/${params.id}/slots`, { params: { date: selectedDate } })
        .then(res => setSlots(res.data))
        .catch(() => {})
        .finally(() => setLoadingSlots(false));
    }
  }, [params?.id, selectedDate]);

  const handleBookSession = async () => {
    if (!selectedSlot || !params?.id) return;
    setBookingLoading(true);
    setBookingError(null);
    try {
      await api.post(`/specialists/${params.id}/book`, {
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      });
      setBookingSuccess(true);
      // Refresh slots
      const updated = slots.map(s => s.time === selectedSlot.time ? { ...s, isBooked: true } : s);
      setSlots(updated);
      setSelectedSlot(null);
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Please log in to book a session.');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return <p className="text-slate-400 text-center py-12">Loading profile details...</p>;
  }

  if (!specialist) {
    return <p className="text-slate-400 text-center py-12">Specialist profile not found.</p>;
  }

  const mockReviews = [
    { id: 1, name: 'Alice Smith', rating: 5, date: 'May 12, 2026', comment: 'Excellent consultation. Very professional and helpful.' },
    { id: 2, name: 'Bob Jones', rating: 4, date: 'Apr 28, 2026', comment: 'Knowledgeable and structured session. Highly recommended.' }
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 flex flex-col md:flex-row gap-6">
              {specialist.avatarUrl ? (
                <img
                  src={specialist.avatarUrl}
                  alt={specialist.user?.name}
                  className="w-24 h-24 rounded-full object-cover border border-slate-100 self-center md:self-start"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 self-center md:self-start">
                  <User className="w-12 h-12" />
                </div>
              )}

              <div className="flex-1 space-y-3 text-center md:text-left">
                <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase">
                  {specialist.category}
                </span>
                <h1 className="text-2xl font-bold text-slate-900">{specialist.user?.name}</h1>
                <div className="flex items-center justify-center md:justify-start gap-1.5 text-amber-500 text-sm font-semibold">
                  <Star className="w-4 h-4 fill-amber-500" />
                  <span>{specialist.rating.toFixed(1)}</span>
                  <span className="text-slate-400 font-normal">({specialist.reviewsCount} reviews)</span>
                </div>
                <div className="flex flex-wrap gap-4 pt-2 justify-center md:justify-start text-sm text-slate-500">
                  <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-green-500" /> Verified Partner</span>
                  <span>•</span>
                  <span>{specialist.experience} years experience</span>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Biography</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{specialist.bio}</p>
            </section>

            {/* Mock Reviews section */}
            <section className="bg-white border border-slate-200 shadow-sm rounded-2xl p-8 space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Client Reviews</h2>
              <div className="divide-y divide-slate-100">
                {mockReviews.map((rev) => (
                  <div key={rev.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-slate-800">{rev.name}</h4>
                      <span className="text-xs text-slate-400">{rev.date}</span>
                    </div>
                    <div className="flex text-amber-400">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-slate-600 text-sm">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sticky Book Session Sidebar */}
          <div>
            <aside className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sticky top-6 space-y-6 text-center">
              <div>
                <span className="text-slate-400 text-xs font-semibold block uppercase">Session Rate</span>
                <span className="text-3xl font-extrabold text-slate-950">${specialist.price}</span>
                <span className="text-slate-400 text-sm font-semibold">/hour</span>
              </div>

              {bookingSuccess && (
                <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg p-3 text-xs text-center font-semibold">
                  Session booked successfully!
                </div>
              )}

              {bookingError && (
                <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-xs text-center font-semibold">
                  {bookingError}
                </div>
              )}

              {/* Date Card List */}
              <div className="text-left">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Select Date</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {dateList.map((d) => (
                    <button
                      key={d.isoStr}
                      type="button"
                      onClick={() => { setSelectedDate(d.isoStr); setBookingSuccess(false); }}
                      className={`flex flex-col items-center py-2 px-3 border rounded-lg cursor-pointer text-center min-w-[55px] ${
                        selectedDate === d.isoStr
                          ? 'border-blue-500 bg-blue-50/20 text-blue-600 ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">{d.dayName}</span>
                      <span className="text-base font-extrabold mt-0.5">{d.dayNum}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div className="text-left">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Available Time Slots</label>
                {loadingSlots ? (
                  <p className="text-xs text-slate-400 text-center py-4">Fetching time slots...</p>
                ) : slots.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No working hours set for this day.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={slot.isBooked}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 text-center rounded-lg border text-xs font-semibold transition-all duration-200 ${
                          slot.isBooked
                            ? 'bg-slate-100 border-slate-100 text-slate-300 line-through cursor-not-allowed'
                            : selectedSlot?.time === slot.time
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 cursor-pointer'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleBookSession}
                disabled={!selectedSlot || bookingLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bookingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calendar className="w-5 h-5" />}
                Confirm Booking
              </button>

              <p className="text-slate-400 text-xs">Satisfaction guaranteed. Re-schedule anytime up to 24h prior.</p>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run Next.js build to verify compilation**

Run: `npm run build` in `d:\booking platform\frontend`
Expected: Next.js frontend compiles cleanly without errors.

- [ ] **Step 3: Commit (if auto_commit enabled)**
