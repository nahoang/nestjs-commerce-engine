# NestJS Commerce Engine

> High-performance E-Commerce Backend engineered with **Clean Architecture** and **Domain-Driven Design (DDD)** adhering to a **Module-First Modular Monolith** pattern, powered by **NestJS 11**, **TypeScript (Strict Mode)**, **PostgreSQL 16**, and **Prisma ORM**.

---

## 🏛️ 1. Architecture Overview

This project strictly follows the principles of **Clean Architecture (Hexagonal / Ports & Adapters)** and **Domain-Driven Design (DDD)**:

```
                      ┌────────────────────────────────────────┐
                      │               API Layer                │
                      │  Controllers, DTOs, Envelopes, Filters │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │           Application Layer            │
                      │   Use Cases, DTOs, Repository Ports    │
                      └──────────────────┬─────────────────────┘
                                         │
                                         ▼
                      ┌────────────────────────────────────────┐
                      │              Domain Layer              │
                      │  Entities, Value Objects, Invariants   │
                      │     (Pure TypeScript - Zero Deps)      │
                      └────────────────────────────────────────┘
                                         ▲
                                         │ (Dependency Inversion)
                      ┌──────────────────┴─────────────────────┐
                      │          Infrastructure Layer          │
                      │    Prisma ORM, Repositories, Mappers   │
                      └────────────────────────────────────────┘
```

### The 4 Architectural Layers in Each Bounded Context:

1. **`domain/` (Core Business Logic)**:
   - Contains Domain Entities, Aggregate Roots, Value Objects, Domain Exceptions, and Invariants.
   - **Characteristics**: Pure TypeScript with zero third-party dependencies (no `@nestjs/*`, `@prisma/*`, `class-validator`, or `class-transformer`). The only permissible external library is precision arithmetic (e.g., `decimal.js`).
   - **Enforcement**: Strictly guaranteed by ESLint `no-restricted-imports` linting rules.

2. **`application/` (Orchestration & Use Cases)**:
   - Houses Use Cases and Application Services coordinating business workflows.
   - Defines abstract repository contracts (Ports / Abstractions via `abstract class` tokens for NestJS DI).
   - May use NestJS decorators (such as `@Injectable()`), but is strictly forbidden from importing `@prisma/*` or referencing the `infrastructure`/`api` layers.

3. **`infrastructure/` (Technical Implementations & Persistence)**:
   - Implements the Application Repository Contracts using Prisma ORM.
   - Handles bidirectional data mapping: Domain Entity ↔ Database Record (Prisma Client).
   - Isolates all database access logic and ORM-specific types from the rest of the application.

4. **`api/` (Presentation & HTTP Adapters)**:
   - Hosts NestJS Controllers, Request/Response DTOs, and serialization mappers.
   - Validates incoming HTTP requests via global `ValidationPipe`, encapsulates standard API responses (`ApiResponse`, `PaginatedResponse`), and delegates execution to Application Use Cases.

---

## 📂 2. Project Directory Structure

The codebase is organized as a **Module-First Modular Monolith** separating the **Shared Kernel** from the **Bounded Contexts**:

```text
nestjs-commerce-engine/
├── docker/                             # Docker configuration & DB init scripts
│   └── postgres/
│       └── init.sql                    # Initializes 'commerce' (dev) & 'commerce_test' (test) DBs
├── docker-compose.yml                  # PostgreSQL 16 service definition (Port 5432)
├── prisma/                             # Prisma ORM schema & migrations
│   └── schema.prisma                   # PostgreSQL database schema
├── src/
│   ├── app.controller.ts               # Root application controller
│   ├── app.module.ts                   # Root application module
│   ├── app.setup.ts                    # Unified application pipeline configuration (main.ts & E2E)
│   ├── main.ts                         # Application bootstrap entrypoint
│   │
│   ├── health/                         # System health check module
│   │   ├── health.controller.ts        # GET /health (active database ping via SELECT 1)
│   │   └── health.module.ts
│   │
│   ├── shared/                         # Shared Kernel (Cross-cutting infrastructure & domains)
│   │   ├── domain/                     # BaseEntity, shared Domain Exceptions
│   │   ├── application/                # Generic Repository interfaces & common ports
│   │   ├── infrastructure/             # PrismaService, PrismaModule, dynamic ConfigService
│   │   └── api/                        # API Envelopes, Exception Filters, Interceptors, DTOs
│   │
│   └── modules/                        # 8 Core Bounded Contexts
│       ├── catalog/                    # Categories, Products, Variants, Channel Pricing
│       │   ├── domain/
│       │   ├── application/
│       │   ├── infrastructure/
│       │   └── api/
│       ├── account/                    # User Accounts, Role-based Access Control, JWT Auth
│       │   ├── domain/
│       │   ├── application/
│       │   ├── infrastructure/
│       │   └── api/
│       ├── cart/                       # Shopping Carts & Cart Line Items
│       │   ├── domain/
│       │   ├── application/
│       │   ├── infrastructure/
│       │   └── api/
│       ├── inventory/                  # Stock Management, Reservation TTL, Pessimistic Locking
│       │   ├── domain/
│       │   ├── application/
│       │   ├── infrastructure/
│       │   └── api/
│       ├── discount/                   # Promotions, Vouchers, Atomic Claims
│       │   ├── domain/
│       │   ├── application/
│       │   ├── infrastructure/
│       │   └── api/
│       ├── order/                      # Order Placement & Order State Machine
│       │   ├── domain/
│       │   ├── application/
│       │   ├── infrastructure/
│       │   └── api/
│       ├── payment/                    # Payment Processing, Transaction Ledgers, HMAC Webhooks
│       │   ├── domain/
│       │   ├── application/
│       │   ├── infrastructure/
│       │   └── api/
│       └── shipping/                   # Address Book, Shipping Methods, Tax Calculation
│           ├── domain/
│           ├── application/
│           ├── infrastructure/
│           └── api/
│
├── test/                               # Comprehensive Automated Test Suite
│   ├── helpers/                        # Test harness helpers
│   │   ├── db.ts                       # truncateAll (TRUNCATE CASCADE isolation)
│   │   └── test-app.ts                 # createTestApp (boots test module with configureApp)
│   ├── catalog/                        # E2E & integration tests for Catalog context
│   ├── account/                        # E2E & integration tests for Account context
│   ├── cart/                           # E2E & integration tests for Cart context
│   ├── inventory/                      # E2E & integration tests for Inventory context
│   ├── discount/                       # E2E & integration tests for Discount context
│   ├── order/                          # E2E & integration tests for Order context
│   ├── payment/                        # E2E & integration tests for Payment context
│   ├── shipping/                       # E2E & integration tests for Shipping context
│   ├── concurrency/                    # Concurrency tests (Locks, Race Conditions, FOR UPDATE)
│   ├── global-setup.ts                 # E2E global setup (auto-sync schema to test database)
│   ├── jest-e2e.json                   # Jest E2E configuration (--runInBand)
│   └── setup-env.ts                    # Test environment loader (.env.test)
│
├── .env.example                        # Template environment variables
├── eslint.config.mjs                   # ESLint Flat Config with architectural boundary guards
├── package.json                        # Dependency management & build scripts (pnpm)
└── tsconfig.json                       # TypeScript compiler options (strict) & Path Aliases
```

---

## 🛡️ 3. Architectural Boundary Enforcement & Path Aliases

### Unified Path Aliases
Clean and expressive module import paths configured consistently across `tsconfig.json` and `jest`:
- `@shared/*` → `src/shared/*`
- `@modules/*` → `src/modules/*`

### Automated ESLint Layer Protection (`eslint.config.mjs`)
1. **Domain Layer Guards (`src/**/domain/**`)**:
   - ❌ **Prohibited imports**: `@nestjs/*`, `@prisma/*`, `class-validator`, `class-transformer`.
   - ❌ **Prohibited paths**: Any import referencing `infrastructure` or `api`.
   - ✅ **Permitted**: Pure TypeScript constructs, domain sibling files, and precision math utilities (`decimal.js`).
2. **Application Layer Guards (`src/**/application/**`)**:
   - ❌ **Prohibited imports**: `@prisma/*`, and any path referencing `infrastructure` or `api`.
   - ✅ **Permitted**: `@nestjs/*` (for DI providers) and domain models via `@shared/domain` / `@modules/*/domain`.

---

## 🚀 4. Getting Started

### Prerequisites
- **Node.js**: v22 LTS (recommended `22.x`)
- **Package Manager**: `pnpm` (>= 9.x)
- **Docker & Docker Compose**: For running PostgreSQL 16

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start PostgreSQL Database
```bash
docker compose up -d db
```
This initializes two isolated databases:
- `commerce`: Local development database (`dev`).
- `commerce_test`: Automated E2E testing database (`test`).

### 3. Configure Environment Variables
Copy the template configuration:
```bash
cp .env.example .env
```

### 4. Run the Application
```bash
# Development mode with hot-reload
pnpm start:dev

# Build for production
pnpm build
```

---

## 🧪 5. Testing & Quality Assurance

```bash
# Run ESLint to enforce formatting and architectural layer boundaries
pnpm lint

# Run Unit Tests (mocked providers, zero database dependency)
pnpm test

# Run E2E Tests (sequential execution on real PostgreSQL commerce_test database)
pnpm test:e2e

# Generate test coverage report
pnpm test:cov
```


