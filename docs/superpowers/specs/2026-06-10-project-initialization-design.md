# Booking Platform Project Initialization Design Spec

Spec for initializing the Booking Platform workspace, integrating AI agent frameworks, scaffolding the NestJS backend, and configuring database connections.

## Goal

Configure the project workspace to support disciplined AI coding workflows and establish the baseline services for the booking platform.

## Proposed Changes

### Workspace Root (Plugins & AI Frameworks)
We will initialize the workspace-level skills and rules to guide AI assistant behavior.
1. **uipro-cli**: Run `npx uipro-cli init -a antigravity --force` to install the UI/UX Pro Max skill and resources.
2. **agy-superpowers**: Run `npx agy-superpowers init --force` to update or re-initialize the `.agent/` folder with standard agentic workflows.

### NestJS Backend (`/backend`)
We will scaffold a fresh NestJS application using `npm` to serve as our backend API.
1. Run `npx @nestjs/cli@latest new backend --package-manager=npm` to create the codebase in the `backend` directory.
2. Configure environment variables (`.env`) to align with the PostgreSQL credentials specified in `docker-compose.yml`:
   * `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/booking?schema=public"`

### Prisma ORM Integration (`/backend`)
We will set up Prisma ORM inside the `backend` project.
1. Install `prisma` as a devDependency and `@prisma/client` as a production dependency.
2. Initialize Prisma using `npx prisma init`.
3. Set up a simple initial schema (e.g., a `User` model) to verify migrations and database connectivity.

## Verification Plan

### Automated Checks
* **PostgreSQL & Redis check**: Ensure docker containers are up.
* **NestJS build**: Run `npm run build` inside `/backend` to verify compilation.
* **Prisma schema validation**: Run `npx prisma validate` to confirm schema formatting.
* **Prisma connection test**: Run `npx prisma db push` or similar schema sync to ensure database connectivity works.

### Manual Checks
* Verify that the `.agent` folder and rules are populated correctly.
