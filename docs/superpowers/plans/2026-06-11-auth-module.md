# Authentication System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete NestJS-based authentication system with user roles, JWT access tokens, refresh token rotation, password hashing, password reset via email, and global route guards using Prisma.

**Architecture:** We will create distinct `UsersModule`, `AuthModule`, and `MailModule`. We use custom decorators and global guards (`JwtAuthGuard`, `RolesGuard`) to enforce role-based route access, and a `RefreshToken` Prisma schema mapping for rotating refresh tokens.

**Tech Stack:** NestJS, Prisma ORM, JWT, Passport, bcrypt, Nodemailer, TypeScript

---

### Task 1: Update Database Schema & Generate Client

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add User Roles, Password columns, and RefreshToken Model**

Replace `backend/prisma/schema.prisma` with:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  CLIENT
  SPECIALIST
}

model User {
  id                Int            @id @default(autoincrement())
  email             String         @unique
  name              String?
  password          String
  role              Role           @default(CLIENT)
  resetToken        String?
  resetTokenExpires DateTime?
  refreshTokens     RefreshToken[]
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
```

- [ ] **Step 2: Validate the updated schema**

Run: `npx prisma validate` in `d:\booking platform\backend`
Expected: Schema validates successfully.

- [ ] **Step 3: Regenerate Prisma Client**

Run: `npx prisma generate` in `d:\booking platform\backend`
Expected: Prisma client compiles with the new types.

- [ ] **Step 4: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting. Since `auto_commit: false`, skip commit.

---

### Task 2: Implement Mail Module & Mail Service

**Files:**
- Create: `backend/src/mail/mail.service.ts`
- Create: `backend/src/mail/mail.module.ts`

- [ ] **Step 1: Install Nodemailer packages**

Run: `npm install nodemailer` in `d:\booking platform\backend`
Run: `npm install -D @types/nodemailer` in `d:\booking platform\backend`
Expected: Packages installed successfully.

- [ ] **Step 2: Create MailService**

Create `backend/src/mail/mail.service.ts` with:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const isConfigured =
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS;

    if (isConfigured) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      this.logger.warn(
        'SMTP connection not fully configured. Emails will be logged to console.',
      );
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetLink = `http://localhost:3000/auth/reset-password?token=${token}`;
    const subject = 'Reset your Booking Platform Password';
    const text = `Click here to reset your password: ${resetLink}`;
    const html = `<p>Click the link below to reset your password:</p><a href="${resetLink}">Reset Password</a>`;

    if (this.transporter) {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Booking Platform" <noreply@booking.com>',
        to: email,
        subject,
        text,
        html,
      });
    } else {
      this.logger.log(`[EMAIL SEND SIMULATION] To: ${email} | Link: ${resetLink}`);
    }
  }
}
```

- [ ] **Step 3: Create MailModule**

Create `backend/src/mail/mail.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
```

- [ ] **Step 4: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.

---

### Task 3: Implement Users Module

**Files:**
- Create: `backend/src/users/users.service.ts`
- Create: `backend/src/users/users.module.ts`

- [ ] **Step 1: Create UsersService**

Create `backend/src/users/users.service.ts` with:
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { User, Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async updateUser(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }
}
```

- [ ] **Step 2: Create UsersModule**

Create `backend/src/users/users.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 3: Write a unit test for UsersService**

Create `backend/src/users/users.service.spec.ts` with:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';

const mockPrismaUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashedpassword',
  role: 'CLIENT',
  resetToken: null,
  resetTokenExpires: null,
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn().mockResolvedValue(mockPrismaUser),
    create: jest.fn().mockResolvedValue(mockPrismaUser),
    update: jest.fn().mockResolvedValue(mockPrismaUser),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should find user by email', async () => {
    const result = await service.findByEmail('test@example.com');
    expect(result).toEqual(mockPrismaUser);
  });
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test src/users/users.service.spec.ts` inside `backend`
Expected: Test passes successfully.

- [ ] **Step 5: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.

---

### Task 4: Implement Guards and Decorators

**Files:**
- Create: `backend/src/auth/decorators/public.decorator.ts`
- Create: `backend/src/auth/decorators/roles.decorator.ts`
- Create: `backend/src/auth/guards/jwt-auth.guard.ts`
- Create: `backend/src/auth/guards/roles.guard.ts`

- [ ] **Step 1: Create @Public decorator**

Create `backend/src/auth/decorators/public.decorator.ts` with:
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 2: Create @Roles decorator**

Create `backend/src/auth/decorators/roles.decorator.ts` with:
```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 3: Create JwtAuthGuard**

Create `backend/src/auth/guards/jwt-auth.guard.ts` with:
```typescript
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
```

- [ ] **Step 4: Create RolesGuard**

Create `backend/src/auth/guards/roles.guard.ts` with:
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      return false;
    }
    return requiredRoles.some((role) => user.role === role);
  }
}
```

- [ ] **Step 5: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.

---

### Task 5: Implement Auth Service and Auth Controller

**Files:**
- Create: `backend/src/auth/jwt.strategy.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/auth.module.ts`

- [ ] **Step 1: Install auth related npm packages**

Run: `npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt` in `d:\booking platform\backend`
Run: `npm install -D @types/bcrypt @types/passport-jwt` in `d:\booking platform\backend`
Expected: Packages installed successfully.

- [ ] **Step 2: Create JWT Strategy**

Create `backend/src/auth/jwt.strategy.ts` with:
```typescript
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret-for-jwt-dev',
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

- [ ] **Step 3: Create AuthService**

Create `backend/src/auth/auth.service.ts` with:
```typescript
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async register(data: any) {
    const existing = await this.usersService.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.createUser({
      email: data.email,
      name: data.name,
      password: hashedPassword,
      role: data.role as Role,
    });
    const { password, ...result } = user;
    return result;
  }

  async login(data: any) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        token: rawRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    const { password, ...userResult } = user;
    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: userResult,
    };
  }

  async refresh(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
      // Security Alert: Potential token theft/reuse
      await this.prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { isRevoked: true },
      });
      throw new UnauthorizedException('Token compromise suspected. Sessions revoked.');
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { isRevoked: true },
    });

    // Create new token pair
    const user = tokenRecord.user;
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const newRawRefreshToken = crypto.randomBytes(40).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        token: newRawRefreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't leak user existence
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await this.usersService.updateUser(user.id, {
      resetToken: token,
      resetTokenExpires: expires,
    });

    await this.mailService.sendPasswordResetEmail(user.email, token);
    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(data: any) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: data.token,
        resetTokenExpires: { gte: new Date() },
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    await this.usersService.updateUser(user.id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpires: null,
    });

    return { message: 'Password updated successfully' };
  }
}
```

- [ ] **Step 4: Create AuthController**

Create `backend/src/auth/auth.controller.ts` with:
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Public()
  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }
}
```

- [ ] **Step 5: Create AuthModule**

Create `backend/src/auth/auth.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret-for-jwt-dev',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService],
})
export class AuthModule {}
```

- [ ] **Step 6: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.

---

### Task 6: Setup Global Guards and AppModule Integration

**Files:**
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Wire all modules and configure global guards**

Replace `backend/src/app.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [UsersModule, AuthModule],
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

- [ ] **Step 2: Run a build of the entire NestJS project**

Run: `npm run build` in `d:\booking platform\backend`
Expected: NestJS backend compiles cleanly.

- [ ] **Step 3: Run the test suite**

Run: `npm test` in `d:\booking platform\backend`
Expected: All tests pass successfully.

- [ ] **Step 4: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting.
