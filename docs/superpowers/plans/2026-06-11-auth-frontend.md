# Next.js Authentication Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement user registration, login, and session persistence in Next.js 16/Tailwind v4 using HttpOnly cookies, a Next.js API proxy route, form validations with react-hook-form + zod, and redirect rules.

**Architecture:** We use Next.js Route Handlers as a proxy layer that stores tokens in HTTP-only cookies securely. Client-side components make requests through a custom Axios instance. A global Next.js middleware enforces protection on dashboard routes.

**Tech Stack:** Next.js, Tailwind v4, Axios, React Hook Form, Zod, HTTP-only cookies

---

### Task 1: Install Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install frontend validation and icons packages**

Run: `npm install axios react-hook-form zod @hookform/resolvers lucide-react` in `d:\booking platform\frontend`
Expected: Packages installed successfully.

- [ ] **Step 2: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.

---

### Task 2: Implement Next.js Token Proxy API Handlers

**Files:**
- Create: `frontend/src/app/api/auth/login/route.ts`
- Create: `frontend/src/app/api/auth/register/route.ts`
- Create: `frontend/src/app/api/auth/refresh/route.ts`
- Create: `frontend/src/app/api/auth/logout/route.ts`
- Create: `frontend/src/app/api/auth/me/route.ts`

- [ ] **Step 1: Create Proxy Login Handler**

Create `frontend/src/app/api/auth/login/route.ts` with:
```typescript
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await axios.post('http://localhost:3000/auth/login', body);
    const { accessToken, refreshToken, user } = response.data;

    const res = NextResponse.json({ user });

    // Set accessToken cookie (15 mins)
    res.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    // Set refreshToken cookie (7 days)
    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Login failed' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 2: Create Proxy Register Handler**

Create `frontend/src/app/api/auth/register/route.ts` with:
```typescript
import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await axios.post('http://localhost:3000/auth/register', body);
    return NextResponse.json(response.data);
  } catch (error: any) {
    return NextResponse.json(
      { message: error.response?.data?.message || 'Registration failed' },
      { status: error.response?.status || 500 }
    );
  }
}
```

- [ ] **Step 3: Create Proxy Refresh Handler**

Create `frontend/src/app/api/auth/refresh/route.ts` with:
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import axios from 'axios';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ message: 'No refresh token' }, { status: 401 });
    }

    const response = await axios.post('http://localhost:3000/auth/refresh', {
      refreshToken,
    });
    const { accessToken, refreshToken: newRefreshToken } = response.data;

    const res = NextResponse.json({ accessToken });

    res.cookies.set('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    res.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return res;
  } catch (error: any) {
    const res = NextResponse.json({ message: 'Session expired' }, { status: 401 });
    res.cookies.delete('token');
    res.cookies.delete('refresh_token');
    return res;
  }
}
```

- [ ] **Step 4: Create Proxy Logout Handler**

Create `frontend/src/app/api/auth/logout/route.ts` with:
```typescript
import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ message: 'Logged out' });
  res.cookies.delete('token');
  res.cookies.delete('refresh_token');
  return res;
}
```

- [ ] **Step 5: Create User Identity Handler**

Create `frontend/src/app/api/auth/me/route.ts` with:
```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode'; // Wait, let's just decode it manually to avoid more installs

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    // Decode JWT payload manually
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ user: null });
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return NextResponse.json({
      user: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null });
  }
}
```

- [ ] **Step 6: Commit (if auto_commit enabled)**

---

### Task 3: Implement Axios Client Helper with Auto-Refresh

**Files:**
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: Create Custom Axios Instance**

Create `frontend/src/lib/api.ts` with:
```typescript
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
});

// Response interceptor to handle token refresh automatically
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post('/api/auth/refresh');
        return api(originalRequest);
      } catch (refreshError) {
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);
```

- [ ] **Step 2: Commit (if auto_commit enabled)**

---

### Task 4: Configure Middleware for Protected Routes

**Files:**
- Create: `frontend/src/middleware.ts`

- [ ] **Step 1: Create middleware file**

Create `frontend/src/middleware.ts` with:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

  if (isDashboard && !token && !refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && (token || refreshToken)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
```

- [ ] **Step 2: Commit (if auto_commit enabled)**

---

### Task 5: Build Login Page & Register Page (UI/UX Soft UI style)

**Files:**
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/app/register/page.tsx`

- [ ] **Step 1: Create Login Page component**

Create `frontend/src/app/login/page.tsx` with:
```tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Loader2, Mail, Lock } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', data);
      const user = res.data.user;

      if (user.role === 'SPECIALIST') {
        window.location.href = '/dashboard/schedule';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 text-sm mt-2">Sign in to manage your appointments</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-900 bg-white"
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700">
                Password
              </label>
              <Link href="#" className="text-xs font-semibold text-blue-600 hover:text-blue-500">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-900 bg-white"
                placeholder="••••••••"
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Sign In
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create Register Page component**

Create `frontend/src/app/register/page.tsx` with:
```tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '@/lib/api';
import { Loader2, Mail, Lock, User as UserIcon, Shield, UserCheck } from 'lucide-react';
import Link from 'next/link';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['CLIENT', 'SPECIALIST']),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'CLIENT' },
    mode: 'onBlur',
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register', data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCheck className="text-green-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Registration Successful!</h1>
          <p className="text-slate-500 mt-2">Your account has been created. You can now log in.</p>
          <Link
            href="/login"
            className="mt-6 inline-block w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.03)] rounded-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Account</h1>
          <p className="text-slate-500 text-sm mt-2">Get started with Booking Platform</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-100 rounded-lg p-3 text-sm mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Role selector cards */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Join as a:
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setValue('role', 'CLIENT')}
                className={`flex flex-col items-center p-4 border rounded-xl cursor-pointer text-center hover:scale-[1.01] transition-all duration-200 ${
                  selectedRole === 'CLIENT'
                    ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <UserIcon className={`w-6 h-6 mb-2 ${selectedRole === 'CLIENT' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${selectedRole === 'CLIENT' ? 'text-blue-900' : 'text-slate-700'}`}>
                  Client
                </span>
              </button>

              <button
                type="button"
                onClick={() => setValue('role', 'SPECIALIST')}
                className={`flex flex-col items-center p-4 border rounded-xl cursor-pointer text-center hover:scale-[1.01] transition-all duration-200 ${
                  selectedRole === 'SPECIALIST'
                    ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <Shield className={`w-6 h-6 mb-2 ${selectedRole === 'SPECIALIST' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-sm font-semibold ${selectedRole === 'SPECIALIST' ? 'text-blue-900' : 'text-slate-700'}`}>
                  Specialist
                </span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="name"
                type="text"
                {...register('name')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-900 bg-white"
                placeholder="John Doe"
              />
            </div>
            {errors.name && (
              <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                {...register('email')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-900 bg-white"
                placeholder="you@example.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                id="password"
                type="password"
                {...register('password')}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-slate-900 bg-white"
                placeholder="••••••••"
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
            Sign Up
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit (if auto_commit enabled)**

---

### Task 6: Build Mock Dashboard Pages for verification

**Files:**
- Create: `frontend/src/app/dashboard/page.tsx`
- Create: `frontend/src/app/dashboard/schedule/page.tsx`

- [ ] **Step 1: Create client dashboard mock**

Create `frontend/src/app/dashboard/page.tsx` with:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LogOut, User } from 'lucide-react';

export default function ClientDashboard() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setProfile(res.data.user))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/login';
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Client Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">Welcome back to your scheduling workspace</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {profile ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Signed in as</p>
              <h2 className="text-lg font-bold text-slate-900">{profile.email}</h2>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase">
                {profile.role}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-6">Loading profile...</p>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create specialist dashboard mock**

Create `frontend/src/app/dashboard/schedule/page.tsx` with:
```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LogOut, Calendar } from 'lucide-react';

export default function SpecialistDashboard() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setProfile(res.data.user))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await api.post('/auth/logout');
    window.location.href = '/login';
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto bg-white border border-slate-200 shadow-sm rounded-2xl p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Specialist Schedule</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your appointment requests and time slots</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {profile ? (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Signed in as</p>
              <h2 className="text-lg font-bold text-slate-900">{profile.email}</h2>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full border border-purple-100 uppercase">
                {profile.role}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-6">Loading profile...</p>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Run Next.js build to verify compilation**

Run: `npm run build` in `d:\booking platform\frontend`
Expected: Next.js frontend builds cleanly without TypeScript or static-rendering path errors.

- [ ] **Step 4: Commit (if auto_commit enabled)**
