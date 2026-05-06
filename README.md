# FlowLedger Backend Guide

FlowLedger is a high-performance, modular expense management backend built with **Node.js**, **Express**, and **TypeScript**. It follows a strictly decoupled, feature-based architecture designed for scalability and maintainability.

---

## 🚀 Project Overview

The backend handles core functionalities for an expense tracking application, including secure user authentication, profile management, and system health monitoring.

### Key Features:
- **Modular Architecture**: Code is organized into self-contained features (Auth, User, Health).
- **Type Safety**: Built with TypeScript in strict mode.
- **Validation**: Environment and request validation using **Zod**.
- **ORM**: Database management via **Prisma** with PostgreSQL.
- **Security**: JWT-based authentication (Access/Refresh tokens) and Bcrypt password hashing.
- **Storage**: User avatars stored in **Firebase Storage**.
- **Email**: OTP-based account verification and password reset via **Nodemailer**.

---

## 🛠️ Technology Stack

| Technology | Purpose |
| :--- | :--- |
| **Express** | Web framework |
| **TypeScript** | Type-safe programming |
| **Prisma** | Database ORM |
| **PostgreSQL** | Primary database |
| **Firebase SDK** | Cloud storage for images |
| **Nodemailer** | Email delivery |
| **Zod** | Schema validation |
| **tsx** | Fast dev runtime & path alias support |

---

## 📂 Project Structure

```text
src/
├── app/            # Express app factory & global middleware
├── config/         # Central configuration & ENV validation (Zod)
├── features/       # Self-contained business modules
│   ├── auth/       # Login, Signup, OTP, Tokens
│   ├── user/       # Profile management, Avatar uploads
│   └── health/     # System status check
├── lib/            # Shared internal libraries (Singletons)
│   ├── database/   # Prisma client setup
│   ├── firebase/   # Firebase Storage wrapper
│   ├── mailer/     # SMTP mailer service
│   ├── middleware/ # Global error & logger middlewares
│   └── utils/      # Shared helpers (OTP generator, etc.)
└── index.ts        # Server entry point
```

---

## ⚙️ Setup & Configuration

### 1. Environment Variables
Create a `.env` file in the root directory based on `.env.example`:

```env
PORT=8000
DATABASE_URL=postgresql://user:password@localhost:5432/flowledger

JWT_ACCESS_SECRET=your_super_secret_access_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your_email@gmail.com
MAIL_PASS=your_gmail_app_password

FIREBASE_API_KEY=xxx
FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
FIREBASE_PROJECT_ID=xxx
FIREBASE_STORAGE_BUCKET=xxx.appspot.com
FIREBASE_MESSAGING_SENDER_ID=xxx
FIREBASE_APP_ID=xxx
```

### 2. Database Setup
Ensure PostgreSQL is running, then initialize Prisma:

```bash
# Generate Prisma Client
npm run prisma:generate

# Run Migrations
npm run prisma:migrate
```

### 3. Mailer Setup (Gmail Example)
- Enable **2-Step Verification** on your Google Account.
- Generate an **App Password** (Security > 2-Step Verification > App Passwords).
- Use this password in `MAIL_PASS`.

### 4. Firebase Setup
- Go to [Firebase Console](https://console.firebase.google.com/).
- Create a project and add a "Web App".
- Copy the `firebaseConfig` values to your `.env`.
- Enable **Storage** in the Firebase console and set appropriate security rules.

---

## 🏃‍♂️ How to Run

### Development Mode
Uses `tsx` for near-instant restarts and automatic path alias resolution (`@/*`).
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

### Auth
- `POST /v1/auth/signup`: Create account (triggers OTP email).
- `POST /v1/auth/login`: Get Access & Refresh tokens.
- `GET /v1/auth/verify/:email?vc=1234`: Verify account with OTP.
- `GET /v1/auth/forgot-password/:email`: Request password reset OTP.

### User
- `PATCH /v1/user/profile/avatar`: Update profile picture (requires Auth header).

### Health
- `GET /v1/health`: Check server uptime and status.

---

## 💡 Technical Notes for Further Development
- **Error Handling**: Use `HttpException` from `@/lib/middleware/error.middleware`. The global error handler catches all errors and returns a consistent JSON structure.
- **Authentication**: Use `authMiddleware` from `@/features/auth/middlewares/auth.middleware` to protect routes. User data will be available in `res.locals.user`.
- **Validation**: Always use **Zod** to validate request bodies in controllers before passing data to services.
- **Path Aliases**: Use `@/` to import from the `src` directory (configured in `tsconfig.json`).
