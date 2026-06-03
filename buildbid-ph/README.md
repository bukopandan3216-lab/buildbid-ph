# 🏗️ BuildBid PH
## Community-Based Construction Bidding System

A full-stack web platform connecting **Clients**, **Contractors**, and **Admins** for construction project bidding, contract management, and payment tracking across the Philippines.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start (Local Dev)](#quick-start-local-dev)
- [Docker Setup](#docker-setup)
- [Demo Accounts](#demo-accounts)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Environment Variables](#environment-variables)

---

## ✨ Features

### 👷 For Clients
- Post construction projects with budget, deadline, location
- Receive and compare contractor bids side-by-side
- Accept or reject bids, auto-generate digital contracts
- Sign contracts digitally, track payment milestones
- Real-time chat with contractors
- Dashboard with project analytics

### 🔨 For Contractors
- Register and upload verification documents (NBI, PCAB, IDs)
- Get verified by admin to unlock bidding
- Browse open projects, submit detailed bids
- Manage active contracts and payment tracking
- Real-time notifications for bid updates

### 🛡️ For Admins
- Verify contractor documents and approve/reject accounts
- Monitor all platform activity
- Approve contracts, verify payments
- User management with suspend/activate
- Full analytics dashboard

### ⚡ Real-Time Features
- Live notifications via Socket.io
- Real-time messaging between users
- Bid status updates pushed instantly
- Typing indicators in chat

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, Recharts, Lucide Icons |
| Backend | Node.js, Express.js |
| Database | MySQL 8.0, Prisma ORM |
| Auth | JWT, bcryptjs |
| Real-time | Socket.io |
| File Upload | Multer |
| Deployment | Docker, Docker Compose |

---

## 📁 Project Structure

```
buildbid-ph/
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        # Main dashboard with all widgets
│   │   │   ├── Projects.jsx         # Project listing + creation
│   │   │   ├── Bids.jsx             # Bid management + comparison
│   │   │   ├── Contracts.jsx        # Contract signing workflow
│   │   │   ├── Payments.jsx         # Payment tracking
│   │   │   ├── Messages.jsx         # Real-time chat
│   │   │   ├── Notifications.jsx    # Notification center
│   │   │   ├── Analytics.jsx        # Charts + insights
│   │   │   ├── AdminPanel.jsx       # Admin management
│   │   │   ├── Settings.jsx         # Profile + verification docs
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx           # Sidebar + top nav
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # JWT auth state
│   │   │   └── NotificationContext.jsx  # Socket.io notifications
│   │   ├── App.jsx                  # Router + protected routes
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── backend/
│   ├── routes/
│   │   ├── auth.js          # Login, register, /me
│   │   ├── users.js         # Profile, contractors, dashboard stats
│   │   ├── projects.js      # CRUD + search + filters
│   │   ├── bids.js          # Submit, accept, reject bids
│   │   ├── contracts.js     # Contract signing workflow
│   │   ├── payments.js      # Payment tracking + verification
│   │   ├── messages.js      # Conversations + send
│   │   ├── notifications.js # CRUD + mark read
│   │   ├── admin.js         # Admin dashboard + verifications
│   │   └── uploads.js       # Multer document/image upload
│   ├── middleware/
│   │   ├── auth.js          # JWT authenticate + authorize
│   │   └── errorHandler.js  # Global error handler + logger
│   ├── validators/
│   │   └── auth.js          # express-validator rules
│   ├── prisma/
│   │   ├── schema.prisma    # Full DB schema
│   │   └── seed.js          # Demo seed data
│   ├── socket.js            # Socket.io setup
│   ├── server.js            # Express app entry
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js 18+
- MySQL 8.0 running locally
- npm or yarn

### 1. Clone and install

```bash
git clone <repo-url>
cd buildbid-ph
```

### 2. Backend setup

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET

npm install

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Seed demo data
node prisma/seed.js

# Start dev server
npm run dev
```

Backend runs at: **http://localhost:5000**

### 3. Frontend setup

```bash
cd ../frontend
cp .env.example .env

npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🐳 Docker Setup

The easiest way to run the full stack:

```bash
# From the project root
cp backend/.env.example backend/.env
# Edit backend/.env — change JWT_SECRET at minimum

docker-compose up --build
```

Services started:
- **MySQL** → `localhost:3306`
- **Backend API** → `http://localhost:5000`
- **Frontend** → `http://localhost:5173`

The backend container automatically runs `prisma db push` and seeds demo data on first start.

---

## 👤 Demo Accounts

After seeding, use these credentials to log in:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@buildbid.ph | admin123 |
| Client | client@buildbid.ph | client123 |
| Contractor | contractor@buildbid.ph | contractor123 |

---

## 📡 API Reference

All endpoints are prefixed with `/api`.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Logout (audit log) |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | List projects (with filters) |
| GET | `/projects/:id` | Get project details + bids |
| POST | `/projects` | Create project (client) |
| PUT | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Remove project |

### Bids
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/bids/project/:id` | Get bids for a project |
| GET | `/bids/my` | Contractor's submitted bids |
| POST | `/bids` | Submit a bid (contractor) |
| PUT | `/bids/:id/accept` | Accept bid (client) |
| PUT | `/bids/:id/reject` | Reject bid (client) |

### Contracts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contracts` | List my contracts |
| GET | `/contracts/:id` | Contract details |
| PUT | `/contracts/:id/sign` | Sign contract |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payments` | List payments |
| GET | `/payments/summary` | Payment totals |
| PUT | `/payments/:id/proof` | Upload payment proof |
| PUT | `/payments/:id/verify` | Admin: verify payment |

### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/messages/conversations` | List conversations |
| GET | `/messages/:userId` | Messages with a user |
| POST | `/messages` | Send message |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | Platform stats |
| GET | `/admin/contractors` | List contractors |
| PUT | `/admin/contractors/:id/verify` | Approve/reject contractor |
| GET | `/admin/users` | All users |
| PUT | `/admin/users/:id/toggle` | Suspend/activate user |
| GET | `/admin/contracts` | All contracts |
| PUT | `/admin/contracts/:id/approve` | Approve contract |

---

## 🗄️ Database Schema

Key tables and relationships:

```
users ─┬─ clients ──── projects ──┬─ bids ───── contractors
       │                          ├─ contract ──┘
       ├─ contractors             └─ payments
       └─ admin

users ──── messages (sender/receiver)
users ──── notifications
```

All tables include `createdAt`, `updatedAt` timestamps. Cascading deletes are set on user-owned records.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API server port | `5000` |
| `DATABASE_URL` | MySQL connection string | — |
| `JWT_SECRET` | Secret for signing JWTs | — |
| `JWT_EXPIRES_IN` | Token expiry | `7d` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend URL | `http://localhost:5000` |

---

## 🔐 Security Features

- JWT authentication with expiry
- bcrypt password hashing (cost factor 12)
- Helmet.js HTTP security headers
- CORS restricted to frontend origin
- Rate limiting (200 req/15min global, 20 req/15min on auth)
- Input validation with express-validator
- Role-based access control (CLIENT / CONTRACTOR / ADMIN)
- Contractor verification gate before bidding
- SQL injection prevention via Prisma ORM parameterized queries

---

## 📱 Responsive Design

Fully responsive across:
- **Desktop** (1280px+) — full sidebar + grid layouts
- **Tablet** (768–1279px) — compact sidebar + 2-col grids
- **Mobile** (<768px) — collapsible sidebar, stacked layout

---

## 🏗️ Built for Philippine Construction Industry

- Currency formatted in Philippine Peso (₱)
- Location fields include city/province (Philippine addresses)
- References PCAB (Philippine Contractors Accreditation Board) licensing
- CIAC (Construction Industry Arbitration Commission) dispute clause in contracts
- NBI Clearance, DTI/SEC, BIR document types specific to PH requirements

---

*BuildBid PH — Connecting builders and builders of tomorrow.*
