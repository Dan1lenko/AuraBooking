# Project Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the project plugins (`uipro-cli` and `agy-superpowers`), scaffold the NestJS backend, and integrate Prisma ORM with PostgreSQL.

**Architecture:** Initialize CLI-based agent skills at the workspace root, scaffold the NestJS backend in a `/backend` directory, and configure Prisma ORM connecting to the PostgreSQL container running in Docker.

**Tech Stack:** uipro-cli, agy-superpowers, NestJS, Prisma ORM, PostgreSQL, npm

---

### Task 1: Initialize Workspace Plugins

**Files:**
- Create/Modify: `.agent/` configuration files and directories

- [ ] **Step 1: Initialize UI/UX Pro Max plugin**

Run: `npx uipro-cli init -a antigravity --force` in `d:\booking platform`
Expected: Command exits with 0 and creates `.agent/rules/` or updates visual configurations.

- [ ] **Step 2: Initialize Superpowers framework**

Run: `npx agy-superpowers init --force` in `d:\booking platform`
Expected: Command exits with 0 and updates `.agent/` folder configuration files.

- [ ] **Step 3: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting. Since `auto_commit: false`, skip commit and staging. Print: "Skipping commit (auto_commit: false)."

---

### Task 2: Scaffold NestJS Backend

**Files:**
- Create: `backend/` directory and NestJS boilerplate files.

- [ ] **Step 1: Run NestJS CLI to scaffold application**

Run: `npx -y @nestjs/cli@latest new backend --package-manager=npm --skip-git` in `d:\booking platform`
Expected: Command succeeds and initializes NestJS structure in `d:\booking platform\backend`.

- [ ] **Step 2: Verify NestJS app starts**

Run: `npm run start -- --dry-run` or `npm run build` in `d:\booking platform\backend`
Expected: Successful build execution.

- [ ] **Step 3: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting. Since `auto_commit: false`, skip commit and staging. Print: "Skipping commit (auto_commit: false)."

---

### Task 3: Configure NestJS Environment Variables and Docker connection

**Files:**
- Create: `backend/.env`

- [ ] **Step 1: Create backend .env file**

Create `backend/.env` with the following content:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/booking?schema=public"
```

- [ ] **Step 2: Verify docker services are running**

Run: `docker ps` in `d:\booking platform`
Expected: Verification that postgres container is running on port 5432.

- [ ] **Step 3: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting. Since `auto_commit: false`, skip commit and staging. Print: "Skipping commit (auto_commit: false)."

---

### Task 4: Integrate Prisma ORM

**Files:**
- Modify: `backend/package.json`
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Install Prisma dependencies**

Run: `npm install @prisma/client` in `d:\booking platform\backend`
Run: `npm install -D prisma` in `d:\booking platform\backend`
Expected: Dependencies are added to `backend/package.json`.

- [ ] **Step 2: Initialize Prisma**

Run: `npx prisma init` in `d:\booking platform\backend`
Expected: Creates `backend/prisma/schema.prisma` and updates/creates `backend/.env`.

- [ ] **Step 3: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting. Since `auto_commit: false`, skip commit and staging. Print: "Skipping commit (auto_commit: false)."

---

### Task 5: Define Prisma Schema and Generate Client

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Update Prisma schema with User model**

Replace `backend/prisma/schema.prisma` with:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id    Int     @id @default(autoincrement())
  email String  @unique
  name  String?
}
```

- [ ] **Step 2: Run schema validation**

Run: `npx prisma validate` in `d:\booking platform\backend`
Expected: Validation passes without errors.

- [ ] **Step 3: Push schema to local PostgreSQL database**

Run: `npx prisma db push` in `d:\booking platform\backend`
Expected: Successful sync with database.

- [ ] **Step 4: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting. Since `auto_commit: false`, skip commit and staging. Print: "Skipping commit (auto_commit: false)."

---

### Task 6: Setup Prisma Service in NestJS

**Files:**
- Create: `backend/src/prisma.service.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create PrismaService**

Create `backend/src/prisma.service.ts` with:
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

- [ ] **Step 2: Add PrismaService to AppModule**

Modify `backend/src/app.module.ts` to include `PrismaService`:
```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
```

- [ ] **Step 3: Verify NestJS backend builds successfully**

Run: `npm run build` in `d:\booking platform\backend`
Expected: NestJS compiles without issues.

- [ ] **Step 4: Commit (if auto_commit enabled)**

Check `.agent/config.yml` for `auto_commit` setting. Since `auto_commit: false`, skip commit and staging. Print: "Skipping commit (auto_commit: false)."
