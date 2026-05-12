# FlowLedger API — Backend

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)
![Supabase](https://img.shields.io/badge/Storage-Supabase-3ECF8E?logo=supabase&logoColor=white)

> *FlowLedger API is a high-performance, modular backend engine that powers personal finance tracking and group expense splitting. It simplifies complex financial data management with a focus on type-safety, scalability, and secure multi-user collaboration.*

This is the Node.js/Express server for FlowLedger. The mobile frontend lives in the [FlowLedger Mobile repo](https://github.com/abhishekjmd/FlowLedger-mobile).

---

## 🚀 Key Features

- **Enterprise-Grade Auth**: Secure user sessions and identity management via **Clerk**.
- **Modular Architecture**: Feature-based directory structure for high maintainability.
- **Group Expense Splitting**: Robust logic for shared costs, member balances, and settlements.
- **Smart Analytics**: Automated spending trends, category breakdowns, and financial insights.
- **Reliable Storage**: Scalable avatar and file management using **Supabase Storage**.
- **Type-Safe Development**: End-to-end TypeScript implementation with **Zod** schema validation.
- **Automated Workflows**: Recurring expense tracking and system health monitoring.

---

## 🛠️ Technology Stack

| Technology | Purpose | Why this choice |
| :--- | :--- | :--- |
| **Express** | Web Framework | Minimalist and flexible foundation for RESTful APIs. |
| **TypeScript** | Language | Ensures strict type safety and reduces runtime errors. |
| **Clerk** | Authentication | Offloads auth complexity while providing secure mobile/web sessions. |
| **Prisma** | ORM | Provides a type-safe database client and easy migration management. |
| **PostgreSQL** | Database | Relational consistency for complex expense and group relationships. |
| **Supabase** | Cloud Storage | High-performance CDN-backed storage for user assets. |
| **Zod** | Validation | Schema-first validation for environment variables and API requests. |

---

## 📂 Project Structure

```text
src/
├── app/            # Express app factory, global middleware, & routing
├── config/         # Environment configuration & Zod-backed ENV validation
├── features/       # Self-contained business modules
│   ├── analytics/  # Spending trends, insights, and report logic
│   ├── auth/       # Clerk user synchronization & auth helpers
│   ├── expense/    # Personal/Group expenses, Categories, & Settlements
│   ├── health/     # System status and uptime checks
│   └── user/       # Profile management & Supabase avatar uploads
├── lib/            # Shared internal singletons (Prisma, Supabase, Cron)
├── middleware/     # Global security, logging, and error handlers
├── types/          # Shared TypeScript interfaces & declarations
└── utils/          # Domain-agnostic helpers (Formatters, Generators)
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=8000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/flowledger?schema=public"

# Clerk Auth
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase Storage
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
```

---

## 🛠️ Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Initialization
Ensure PostgreSQL is running, then generate the client and run migrations:
```bash
npm run prisma:generate
npm run prisma:migrate
```

### 3. Service Configuration
- **Clerk**: Create a project at [clerk.com](https://clerk.com) and obtain your API keys.
- **Supabase**: Create a project and a storage bucket named `avatars` at [supabase.com](https://supabase.com).

---

## 🏃‍♂️ How to Run

### Development Mode
Uses `tsx` for near-instant restarts and automatic path alias resolution.
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

---

## 🛡️ API Endpoints (v1)

### Authentication
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| POST | `/v1/auth/sync` | Sync Clerk user with local database | Required |

### User Profile
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/v1/user/me` | Get current user details | Required |
| PATCH | `/v1/user/profile` | Update profile information | Required |
| PATCH | `/v1/user/avatar` | Upload profile picture to Supabase | Required |

### Expenses & Groups
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| POST | `/v1/expenses` | Create a new expense | Required |
| GET | `/v1/expenses` | List user expenses (paginated) | Required |
| GET | `/v1/expenses/categories` | List available expense categories | Required |
| POST | `/v1/expenses/groups` | Create a new expense group | Required |
| GET | `/v1/expenses/groups/:id` | Get group details and balances | Required |
| POST | `/v1/expenses/groups/:id/settle` | Record a debt settlement | Required |

### Analytics
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/v1/analytics/monthly` | Monthly spending breakdown | Required |
| GET | `/v1/analytics/trends` | Spending trend analysis | Required |
| GET | `/v1/analytics/insights` | AI-driven financial insights | Required |

### Health
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| GET | `/v1/health` | Check server uptime and status | Public |

---

## 💡 Technical Notes

- **Clerk Middleware**: All protected routes use `requireAuth` which injects the Clerk session into the request context.
- **Error Handling**: Centralized error boundary in `src/middleware/error.middleware.ts` ensures consistent JSON error responses.
- **Validation**: Every request body is validated against Zod schemas before reaching the service layer.
- **Path Aliases**: Uses `@/` for clean imports from the `src` root (configured in `tsconfig.json`).
