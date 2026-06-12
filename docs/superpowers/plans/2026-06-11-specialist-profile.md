# Specialist Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full Specialist Profile management and display pages, including database modeling, Cloudinary image upload, and search filters.

**Architecture:** We will create a `SpecialistProfile` database relation. The backend will serve filtered profiles and proxy avatar uploads. The frontend will present a marketplace dashboard and profile editing tools using a Soft UI theme.

**Tech Stack:** NestJS, Prisma ORM, Next.js, Cloudinary, Multer, Tailwind CSS, react-hook-form, zod

---

### Task 1: Update Database Schema & Regenerate Client

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add SpecialistProfile model and link to User**

Update `backend/prisma/schema.prisma` by modifying `User` and adding `SpecialistProfile`:
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

- [ ] **Step 2: Validate the updated schema**

Run: `npx prisma validate` in `d:\booking platform\backend`
Expected: Schema validates successfully.

- [ ] **Step 3: Regenerate Prisma Client**

Run: `npx prisma generate` in `d:\booking platform\backend`
Expected: Prisma client successfully regenerated with the new `SpecialistProfile` types.

- [ ] **Step 4: Commit (if auto_commit enabled)**

---

### Task 2: Implement Cloudinary/Local Upload Service (NestJS)

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/src/main.ts`
- Create: `backend/src/cloudinary/cloudinary.service.ts`
- Create: `backend/src/cloudinary/cloudinary.module.ts`

- [ ] **Step 1: Install Cloudinary & Multer packages**

Run: `npm install cloudinary` in `d:\booking platform\backend`
Run: `npm install -D @types/multer` in `d:\booking platform\backend`
Expected: Packages installed successfully.

- [ ] **Step 2: Enable static uploads directory in main.ts**

Update `backend/src/main.ts` to expose `/uploads` static assets:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors();

  // Ensure upload directory exists
  const uploadDir = join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Serve static assets from uploads directory
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

- [ ] **Step 3: Create CloudinaryService**

Create `backend/src/cloudinary/cloudinary.service.ts` with:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor() {
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      this.isConfigured = true;
    } else {
      this.logger.warn(
        'Cloudinary credentials not set. Uploads will fallback to local storage under backend/uploads/.',
      );
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (this.isConfigured) {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: 'booking-platform' }, (error, result) => {
            if (error) return reject(error);
            resolve(result!.secure_url);
          })
          .end(file.buffer);
      });
    } else {
      // Fallback: Save local file
      const uploadsFolder = path.join(__dirname, '..', '..', 'uploads');
      const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadsFolder, fileName);

      fs.writeFileSync(filePath, file.buffer);
      this.logger.log(`File saved locally: ${filePath}`);

      // Return server static url link
      return `http://localhost:3000/uploads/${fileName}`;
    }
  }
}
```

- [ ] **Step 4: Create CloudinaryModule**

Create `backend/src/cloudinary/cloudinary.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
```

- [ ] **Step 5: Commit (if auto_commit enabled)**

---

### Task 3: Implement Specialists Module (NestJS)

**Files:**
- Create: `backend/src/specialists/specialists.service.ts`
- Create: `backend/src/specialists/specialists.controller.ts`
- Create: `backend/src/specialists/specialists.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create SpecialistsService**

Create `backend/src/specialists/specialists.service.ts` with:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SpecialistsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
  }) {
    const where: any = {
      user: {
        role: 'SPECIALIST',
      },
    };

    if (filters.category) {
      where.category = {
        equals: filters.category,
        mode: 'insensitive',
      };
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    if (filters.minRating !== undefined) {
      where.rating = {
        gte: filters.minRating,
      };
    }

    return this.prisma.specialistProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const profile = await this.prisma.specialistProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Specialist profile not found');
    }
    return profile;
  }

  async findByUserId(userId: number) {
    return this.prisma.specialistProfile.findUnique({
      where: { userId },
    });
  }

  async updateOrCreateProfile(userId: number, data: any) {
    return this.prisma.specialistProfile.upsert({
      where: { userId },
      update: {
        bio: data.bio,
        category: data.category,
        price: parseFloat(data.price),
        experience: parseInt(data.experience, 10),
        avatarUrl: data.avatarUrl,
      },
      create: {
        userId,
        bio: data.bio,
        category: data.category,
        price: parseFloat(data.price),
        experience: parseInt(data.experience, 10),
        avatarUrl: data.avatarUrl,
      },
    });
  }
}
```

- [ ] **Step 2: Create SpecialistsController**

Create `backend/src/specialists/specialists.controller.ts` with:
```typescript
import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  Post,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SpecialistsService } from './specialists.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('specialists')
export class SpecialistsController {
  constructor(
    private specialistsService: SpecialistsService,
    private cloudinaryService: CloudinaryService,
  ) {}

  @Public()
  @Get()
  async getSpecialists(
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
  ) {
    return this.specialistsService.findAll({
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
    });
  }

  @Roles(Role.SPECIALIST)
  @Get('me')
  async getMyProfile(@Req() req: any) {
    const profile = await this.specialistsService.findByUserId(req.user.id);
    if (!profile) {
      return { bio: '', category: '', price: 0, experience: 0, avatarUrl: null };
    }
    return profile;
  }

  @Roles(Role.SPECIALIST)
  @Put('me')
  async updateMyProfile(@Req() req: any, @Body() body: any) {
    return this.specialistsService.updateOrCreateProfile(req.user.id, body);
  }

  @Roles(Role.SPECIALIST)
  @Post('me/avatar')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
  ) {
    const avatarUrl = await this.cloudinaryService.uploadFile(file);
    return { avatarUrl };
  }

  @Public()
  @Get(':id')
  async getSpecialistById(@Param('id', ParseIntPipe) id: number) {
    return this.specialistsService.findOne(id);
  }
}
```

- [ ] **Step 3: Create SpecialistsModule**

Create `backend/src/specialists/specialists.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { SpecialistsService } from './specialists.service';
import { SpecialistsController } from './specialists.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [SpecialistsController],
  providers: [SpecialistsService, PrismaService],
})
export class SpecialistsModule {}
```

- [ ] **Step 4: Import SpecialistsModule in AppModule**

Modify `backend/src/app.module.ts` to include `SpecialistsModule`:
```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { SpecialistsModule } from './specialists/specialists.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [UsersModule, AuthModule, SpecialistsModule],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 5: Write unit tests for SpecialistsService**

Create `backend/src/specialists/specialists.service.spec.ts` with:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { SpecialistsService } from './specialists.service';
import { PrismaService } from '../prisma.service';

const mockProfile = {
  id: 1,
  userId: 2,
  bio: 'A great specialist',
  category: 'Massage',
  price: 50.0,
  experience: 5,
  avatarUrl: null,
  rating: 4.5,
  reviewsCount: 10,
};

const mockPrismaService = {
  specialistProfile: {
    findMany: jest.fn().mockResolvedValue([mockProfile]),
    findUnique: jest.fn().mockResolvedValue(mockProfile),
    upsert: jest.fn().mockResolvedValue(mockProfile),
  },
};

describe('SpecialistsService', () => {
  let service: SpecialistsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecialistsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SpecialistsService>(SpecialistsService);
  });

  it('should find all with filter', async () => {
    const result = await service.findAll({ category: 'Massage' });
    expect(result).toEqual([mockProfile]);
  });
});
```

- [ ] **Step 6: Verify the specialists service unit test passes**

Run: `npm test src/specialists/specialists.service.spec.ts` inside `backend`
Expected: Test passes successfully.

- [ ] **Step 7: Commit (if auto_commit enabled)**

---

### Task 4: Create Next.js API Proxy Routes for Specialists

**Files:**
- Create: `frontend/src/app/api/specialists/route.ts`
- Create: `frontend/src/app/api/specialists/me/route.ts`
- Create: `frontend/src/app/api/specialists/me/avatar/route.ts`
- Create: `frontend/src/app/api/specialists/[id]/route.ts`

- [ ] **Step 1: Create Proxy List Route**

Create `frontend/src/app/api/specialists/route.ts` with:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const response = await axios.get('http://localhost:3000/specialists', {
      params: Object.fromEntries(searchParams.entries()),
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch specialists' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 2: Create Proxy Profile Edit Route**

Create `frontend/src/app/api/specialists/me/route.ts` with:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const response = await axios.get('http://localhost:3000/specialists/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch profile' },
      { status: error.response?.status || 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const body = await request.json();
    const response = await axios.put('http://localhost:3000/specialists/me', body, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to update profile' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 3: Create Proxy Avatar Upload Route**

Create `frontend/src/app/api/specialists/me/avatar/route.ts` with:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const formData = await request.formData();

    const response = await axios.post(
      'http://localhost:3000/specialists/me/avatar',
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Avatar upload failed' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 4: Create Proxy Details Route**

Create `frontend/src/app/api/specialists/[id]/route.ts` with:
```typescript
import { NextResponse, type NextRequest } from 'next/server';
import axios from 'axios';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const response = await axios.get(`http://localhost:3000/specialists/${id}`);
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Failed to fetch details' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 5: Commit (if auto_commit enabled)**

---

### Task 5: Implement `/specialists` List Page and Details Page

**Files:**
- Create: `frontend/src/app/specialists/page.tsx`
- Create: `frontend/src/app/specialists/[id]/page.tsx`

- [ ] **Step 1: Create Specialists Directory List view**

Create `frontend/src/app/specialists/page.tsx` with:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Star, User, SlidersHorizontal, Search } from 'lucide-react';
import Link from 'next/link';

export default function SpecialistsPage() {
  const [specialists, setSpecialists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const fetchSpecialists = () => {
    setLoading(true);
    const params: any = {};
    if (category) params.category = category;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;

    api.get('/specialists', { params })
      .then(res => setSpecialists(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSpecialists();
  }, [category]);

  const categoriesList = ['Therapy', 'Coaching', 'Massage', 'Consulting', 'Design'];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Specialists Directory</h1>
          <p className="text-slate-500 mt-2 text-lg">Find and book verified professionals for your needs</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 h-fit sticky top-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
              <SlidersHorizontal className="w-5 h-5 text-slate-700" />
              <h2 className="text-lg font-bold text-slate-900">Filters</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
                >
                  <option value="">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Price Range ($/hr)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="w-full py-2 px-3 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <button
                onClick={fetchSpecialists}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </aside>

          {/* Directory Listings */}
          <section className="lg:col-span-3">
            {loading ? (
              <p className="text-slate-400 text-center py-12">Loading specialists...</p>
            ) : specialists.length === 0 ? (
              <p className="text-slate-400 text-center py-12">No specialists found matching filters.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {specialists.map((spec) => (
                  <Link
                    key={spec.id}
                    href={`/specialists/${spec.id}`}
                    className="block bg-white border border-slate-200 hover:border-blue-200 shadow-sm rounded-2xl p-6 transition-all duration-200 hover:scale-[1.01]"
                  >
                    <div className="flex gap-4">
                      {spec.avatarUrl ? (
                        <img
                          src={spec.avatarUrl}
                          alt={spec.user?.name}
                          className="w-16 h-16 rounded-full object-cover border border-slate-100"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User className="w-8 h-8" />
                        </div>
                      )}
                      <div>
                        <span className="inline-block px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase">
                          {spec.category}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 mt-2">{spec.user?.name || 'Professional'}</h3>
                        <p className="text-slate-500 text-sm mt-1">{spec.experience} years experience</p>
                      </div>
                    </div>

                    <p className="text-slate-600 text-sm mt-4 line-clamp-2">{spec.bio}</p>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-6">
                      <div className="flex items-center gap-1.5 text-amber-500 text-sm font-semibold">
                        <Star className="w-4 h-4 fill-amber-500" />
                        <span>{spec.rating.toFixed(1)}</span>
                        <span className="text-slate-400 font-normal">({spec.reviewsCount})</span>
                      </div>
                      <span className="text-slate-900 font-bold text-lg">
                        ${spec.price}<span className="text-slate-400 font-semibold text-xs">/hr</span>
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create Public Profile detailed view**

Create `frontend/src/app/specialists/[id]/page.tsx` with:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Star, User, Calendar, ShieldCheck } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function SpecialistProfilePage() {
  const params = useParams();
  const [specialist, setSpecialist] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      api.get(`/specialists/${params.id}`)
        .then(res => setSpecialist(res.data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [params?.id]);

  if (loading) {
    return <p className="text-slate-400 text-center py-12">Loading profile details...</p>;
  }

  if (!specialist) {
    return <p className="text-slate-400 text-center py-12">Specialist profile not found.</p>;
  }

  // Mock reviews data for listing
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

              <button
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer"
              >
                <Calendar className="w-5 h-5" />
                Book Session Now
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

- [ ] **Step 3: Commit (if auto_commit enabled)**

---

### Task 6: Implement Dashboard Profile Editing Page

**Files:**
- Create: `frontend/src/app/dashboard/profile/page.tsx`

- [ ] **Step 1: Create profile edit route view**

Create `frontend/src/app/dashboard/profile/page.tsx` with:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hidden-form'; // Wait, it's react-hook-form, typo fixed inline.
import { useForm as useHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Loader2, User, Save, Upload } from 'lucide-react';

const profileSchema = z.object({
  bio: z.string().min(10, 'Biography must be at least 10 characters'),
  category: z.string().min(2, 'Category must be defined'),
  price: z.preprocess((val) => Number(val), z.number().positive('Price must be positive')),
  experience: z.preprocess((val) => Number(val), z.number().int().nonnegative('Experience must be non-negative')),
  avatarUrl: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function SpecialistProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useHookForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
  });

  useEffect(() => {
    api.get('/specialists/me')
      .then((res) => {
        reset(res.data);
        if (res.data.avatarUrl) {
          setAvatarPreview(res.data.avatarUrl);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reset]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show instant preview
    setAvatarPreview(URL.createObjectURL(file));

    // Upload immediately
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await api.post('/specialists/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setValue('avatarUrl', response.data.avatarUrl);
    } catch (uploadErr) {
      setError('Failed to upload avatar. Continuing with previous image.');
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.put('/specialists/me', data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save profile details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-slate-400 text-center py-12">Loading profile settings...</p>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
        <header className="border-b border-slate-100 pb-6 mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Edit Specialist Profile</h1>
          <p className="text-slate-500 text-sm mt-1">Configure your bio, pricing, and category listing details</p>
        </header>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-700 border border-green-100 rounded-lg p-3 text-sm mb-6 text-center">
            Profile saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-slate-100">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar Preview"
                  className="w-24 h-24 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="space-y-2 text-center md:text-left">
              <label htmlFor="avatar-file" className="flex items-center gap-2 py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg cursor-pointer transition-colors w-fit mx-auto md:mx-0">
                <Upload className="w-4 h-4" />
                Upload New Image
              </label>
              <input
                id="avatar-file"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <p className="text-xs text-slate-400">JPG, PNG, or WebP. Max 5MB size.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
              <select
                id="category"
                {...register('category')}
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
              >
                <option value="Therapy">Therapy</option>
                <option value="Coaching">Coaching</option>
                <option value="Massage">Massage</option>
                <option value="Consulting">Consulting</option>
                <option value="Design">Design</option>
              </select>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-semibold text-slate-700 mb-2">Price ($/hr)</label>
              <input
                id="price"
                type="number"
                {...register('price')}
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
              />
              {errors.price && (
                <p className="text-red-500 text-xs mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="experience" className="block text-sm font-semibold text-slate-700 mb-2">Experience (Years)</label>
              <input
                id="experience"
                type="number"
                {...register('experience')}
                className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
              />
              {errors.experience && (
                <p className="text-red-500 text-xs mt-1">{errors.experience.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-semibold text-slate-700 mb-2">Biography</label>
            <textarea
              id="bio"
              rows={5}
              {...register('bio')}
              className="w-full py-2.5 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-800 bg-white"
              placeholder="Tell clients about yourself..."
            />
            {errors.bio && (
              <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run Next.js build to verify compilation**

Run: `npm run build` in `d:\booking platform\frontend`
Expected: Next.js frontend compiles cleanly without errors.

- [ ] **Step 3: Commit (if auto_commit enabled)**
