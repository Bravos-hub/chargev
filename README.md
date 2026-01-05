# EVzone Platform

A comprehensive Electric Vehicle (EV) charging and battery swap ecosystem platform supporting public charging networks, private chargers, fleet management, and battery swap services.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Applications](#applications)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

EVzone is a multi-tenant EV infrastructure management platform consisting of:

- **8 Frontend Applications** - Serving different user personas (admins, drivers, fleet managers, attendants)
- **NestJS Backend API** - RESTful API with real-time WebSocket support
- **CSMS Engine** - OCPP-compliant Charging Station Management System
- **PostgreSQL Database** - Primary data store with Prisma ORM
- **Redis** - Caching, session management, and pub/sub
- **Kafka** - Event streaming for OCPP messages and analytics

### Key Features

| Feature | Description |
|---------|-------------|
| Multi-tenant Architecture | Support for multiple organizations with isolated data |
| Public Charging | Station discovery, booking, and charging sessions |
| Private Charging | Home/business charger management with access control |
| Battery Swap | Swap station operations with pack inventory management |
| Fleet Management | Vehicle tracking, driver management, trips, and payouts |
| OCPP Support | OCPP 1.6/2.0 WebSocket gateway for charger communication |
| Smart Charging | Load management and demand response capabilities |
| Wallet System | In-app payments with top-up and transaction history |
| Real-time Updates | WebSocket-based live status updates |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT APPLICATIONS                             │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────────────┤
│ CPMS Admin  │ Public App  │ Private App │ Fleet App   │ Attendant Apps      │
│ Portal      │ (Charging)  │ (Chargers)  │ (Partner)   │ (Charging/Swap)     │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
│                    (Authentication, Rate Limiting, CORS)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
│    MAIN API         │ │   CSMS ENGINE       │ │   REALTIME          │
│    (NestJS)         │ │   (OCPP Gateway)    │ │   (Socket.io)       │
│                     │ │                     │ │                     │
│ • Auth              │ │ • OCPP 1.6/2.0      │ │ • Live Updates      │
│ • Users             │ │ • Boot Notification │ │ • Session Events    │
│ • Stations          │ │ • Heartbeat         │ │ • Status Changes    │
│ • Sessions          │ │ • Transactions      │ │                     │
│ • Bookings          │ │ • Meter Values      │ │                     │
│ • Payments          │ │                     │ │                     │
│ • Swap              │ │                     │ │                     │
│ • Fleets            │ │                     │ │                     │
│ • Analytics         │ │                     │ │                     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE                                     │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│     PostgreSQL      │       Redis         │           Kafka                 │
│   (Primary DB)      │  (Cache/PubSub)     │    (Event Streaming)            │
└─────────────────────┴─────────────────────┴─────────────────────────────────┘
```

---

## Applications

### 1. CPMS Admin Portal (`/src`)

**Purpose:** Central management dashboard for platform administrators, operators, and station owners.

**Users:** EVzone Admins, Operators, Station Owners, Site Owners, Technicians

**Key Features:**
- Dashboard with real-time KPIs and analytics
- Station and charge point management
- User and organization management
- Booking and session monitoring
- Billing, invoices, and settlements
- Incident management and job dispatch
- OCPI roaming partner management
- Smart charging policy configuration

**Tech:** React 18 + Vite + TypeScript + TailwindCSS

---

### 2. Public Charging App (`/evzone-public-charging-vite`)

**Purpose:** Consumer-facing mobile-first PWA for EV drivers to find and use public charging stations.

**Users:** EV Drivers (Riders)

**Key Features:**
- Station discovery with map view
- Real-time availability status
- Booking and reservations
- QR code scanning to start sessions
- Live charging session monitoring
- Payment processing
- Wallet management
- Favorites and charging history

**Tech:** React 18 + Vite + TypeScript + TailwindCSS + PWA

---

### 3. Private Charger App (`/evzone-private-charge`)

**Purpose:** Management app for private charger owners (home/business) to control access and monetize their chargers.

**Users:** Home Charger Owners, Business Charger Owners

**Key Features:**
- Charger registration and OCPP connection
- Access control (permanent, temporary, guest passes)
- Scheduling and availability
- Pricing and tariff configuration
- Session history and analytics
- Energy analytics and CO2 savings
- Operator marketplace integration

**Tech:** React 18 + Create React App + JavaScript

---

### 4. Swap Client (`/evz-swap-client`)

**Purpose:** Consumer app for battery swap services, primarily for e-motorcycle riders.

**Users:** E-Motorcycle Riders

**Key Features:**
- Swap station discovery
- Provider selection (GoGo, Spira, etc.)
- Battery reservation and booking
- Swap session flow
- Wallet and payments
- Swap history
- Battery health tracking

**Tech:** React 18 + Create React App + JavaScript

---

### 5. Fleet Partner App (`/FleetPartnerAPP`)

**Purpose:** Comprehensive fleet management platform for transport operators.

**Users:** Fleet Managers, Fleet Admins, Dispatchers

**Key Features:**
- Vehicle fleet management
- Driver management and ratings
- Trip tracking and history
- Earnings and driver payouts
- School shuttle service management
- Tour booking management
- Vehicle rental service
- Compliance and incident management
- Multi-branch support

**Tech:** React 18 + Vite + TypeScript + TailwindCSS

---

### 6. Charging Attendant App (`/ev-charging-attendant`)

**Purpose:** Operational app for station attendants managing charging operations.

**Users:** Station Attendants (Fixed and Mobile)

**Key Features:**
- Port status monitoring
- Booking queue management
- Check-in/check-out flow
- Cash and mobile payment collection
- Transaction history
- Offline support

**Tech:** React 18 + Vite + TypeScript + TailwindCSS

---

### 7. Swap Attendant App (`/evzone-swap-attendant`)

**Purpose:** Operational app for swap station attendants managing battery inventory.

**Users:** Swap Station Attendants

**Key Features:**
- Pack inventory management
- Shelf and locker status
- Battery inspection workflow
- Pack assignment
- Swap session facilitation
- Handover signatures
- Incident logging

**Tech:** React 18 + Vite + TypeScript + TailwindCSS

---

### 8. My Vehicles App (`/My-vehicles/My-vehicles`)

**Purpose:** Vehicle management and diagnostics app for EV owners.

**Users:** EV Owners, Fleet Drivers

**Key Features:**
- Vehicle garage management
- Battery health monitoring
- Live diagnostics
- Trip history and efficiency
- Charging session history
- Route planning with charging stops
- Maintenance reminders

**Tech:** React 18 + Vite + TypeScript + TailwindCSS

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Framework |
| TypeScript | 5.x | Type Safety |
| Vite | 5.x | Build Tool |
| TailwindCSS | 3.x | Styling |
| React Router | 6.x | Routing |
| TanStack Query | 5.x | Data Fetching |
| Zustand | 4.x | State Management |
| Socket.io Client | 4.x | Real-time |
| Recharts | 2.x | Charts |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| NestJS | 10.x | Framework |
| TypeScript | 5.x | Type Safety |
| Prisma | 5.x | ORM |
| PostgreSQL | 15.x | Database |
| Redis | 7.x | Cache/PubSub |
| Kafka | 3.x | Event Streaming |
| Socket.io | 4.x | WebSocket |
| Passport | 0.7.x | Authentication |
| JWT | - | Token Auth |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Kubernetes | Orchestration (Production) |
| Nginx | Reverse Proxy |
| Let's Encrypt | SSL Certificates |

---

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- pnpm 8.x (recommended) or npm 10.x
- PostgreSQL 15.x
- Redis 7.x
- Docker & Docker Compose (optional)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/evzone/evzone-portal.git
cd evzone-portal

# Start infrastructure services
cd backend
docker-compose up -d

# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma migrate dev

# Seed database
npm run prisma:seed

# Start backend
npm run start:dev
```

### Manual Setup

#### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# DATABASE_URL, REDIS_URL, JWT_SECRET, etc.

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run prisma:seed

# Start development server
npm run start:dev
```

#### 2. Frontend Setup (Main Portal)

```bash
# From project root
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

#### 3. Other Frontend Apps

Each frontend app can be started independently:

```bash
# Public Charging App
cd evzone-public-charging-vite
npm install
npm run dev

# Fleet Partner App
cd FleetPartnerAPP
npm install
npm run dev

# Private Charger App
cd evzone-private-charge
npm install
npm start

# Swap Client
cd evz-swap-client
npm install
npm start
```

---

## Project Structure

```
evzone-portal/
├── backend/                      # NestJS Backend
│   ├── apps/
│   │   ├── api/                  # Main REST API
│   │   │   └── src/
│   │   │       ├── auth/         # Authentication
│   │   │       ├── users/        # User management
│   │   │       ├── bookings/     # Booking service
│   │   │       ├── sessions/     # Session management
│   │   │       ├── swap/         # Battery swap
│   │   │       ├── fleets/       # Fleet management
│   │   │       ├── vehicles/     # Vehicle service
│   │   │       ├── wallet/       # Wallet service
│   │   │       ├── payments/     # Payment processing
│   │   │       ├── analytics/    # Analytics service
│   │   │       ├── notifications/# Notifications
│   │   │       ├── support/      # Support tickets
│   │   │       ├── realtime/     # WebSocket gateway
│   │   │       └── integrations/ # Redis, Kafka
│   │   └── csms-engine/          # OCPP Gateway
│   │       └── src/
│   │           ├── ocpp/         # OCPP protocol
│   │           └── kafka/        # Event streaming
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   ├── migrations/           # DB migrations
│   │   └── seed.ts               # Seed data
│   └── docker-compose.yml        # Infrastructure
│
├── src/                          # CPMS Admin Portal
│   ├── app/                      # App shell & routing
│   ├── core/                     # Auth, config, types
│   ├── features/                 # Feature components
│   ├── ui/                       # UI components
│   └── data/                     # Data layer
│
├── evzone-public-charging-vite/  # Public Charging App
│   └── src/
│       ├── app/                  # App screens
│       ├── core/                 # SDK, types
│       ├── features/             # Feature modules
│       └── shared/               # Shared components
│
├── evzone-private-charge/        # Private Charger App
│   └── src/
│       ├── screens/              # App screens
│       ├── components/           # UI components
│       └── services/             # API services
│
├── evz-swap-client/              # Swap Client App
│   └── src/
│       ├── screens/              # App screens
│       ├── shared/               # Shared utilities
│       └── layout/               # Layout components
│
├── FleetPartnerAPP/              # Fleet Partner App
│   └── src/
│       ├── pages/                # Page components
│       ├── components/           # UI components
│       └── context/              # React contexts
│
├── ev-charging-attendant/        # Charging Attendant
│   └── src/
│       └── components/           # App components
│
├── evzone-swap-attendant/        # Swap Attendant
│   └── src/
│       └── pages/                # App pages
│
└── My-vehicles/My-vehicles/      # My Vehicles App
    └── src/
        ├── vehicles/             # Vehicle management
        ├── diagnostics/          # Diagnostics
        └── routeplanner/         # Route planning
```

---

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/evzone"

# Redis
REDIS_URL="redis://localhost:6379"

# Kafka (optional)
KAFKA_BROKERS="localhost:9092"
KAFKA_CLIENT_ID="evzone-api"

# JWT
JWT_SECRET="your-super-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_EXPIRATION="15m"

# OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
APPLE_CLIENT_ID="your-apple-client-id"

# Payments
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# SMS/Email - OTP Delivery (optional)
# Mailgun for Email
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="your-mailgun-domain.com"
MAILGUN_FROM_EMAIL="noreply@your-domain.com"

# Twilio for SMS (International)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# AfricasTalking for SMS (Africa-focused)
AFRICASTALKING_API_KEY="your-africastalking-api-key"
AFRICASTALKING_USERNAME="your-africastalking-username"
AFRICASTALKING_SENDER_ID="your-sender-id"

# OTP Provider Preferences (optional)
# Set to 'true' to prefer a specific provider, otherwise auto-selects based on phone number region
OTP_PREFER_AFRICASTALKING="false"
OTP_PREFER_TWILIO="false"
```

### Frontend (.env.local)

```env
# API URL
VITE_API_URL="http://localhost:3000"

# WebSocket URL
VITE_WS_URL="ws://localhost:3000"

# Google Maps (for station discovery)
VITE_GOOGLE_MAPS_API_KEY="..."

# Feature Flags
VITE_ENABLE_SWAP=true
VITE_ENABLE_FLEET=true
```

---

## Development

### Running Tests

```bash
# Backend unit tests
cd backend
npm run test

# Backend e2e tests
npm run test:e2e

# Frontend tests
npm run test
```

### Database Management

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset
```

### Code Quality

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npm run type-check
```

---

## API Documentation

The API follows RESTful conventions with the following base structure:

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - Email/phone login
- `POST /auth/otp/send` - Send OTP
- `POST /auth/otp/verify` - Verify OTP
- `POST /auth/refresh` - Refresh tokens
- `POST /auth/social` - Social login (Google/Apple)

### Stations
- `GET /stations` - List stations
- `GET /stations/:id` - Get station details
- `POST /stations` - Create station
- `PATCH /stations/:id` - Update station
- `DELETE /stations/:id` - Delete station

### Bookings
- `GET /bookings` - List user bookings
- `POST /bookings` - Create booking
- `PATCH /bookings/:id/status` - Update booking status
- `DELETE /bookings/:id` - Cancel booking

### Sessions
- `GET /sessions` - List sessions
- `GET /sessions/active` - Get active sessions
- `POST /sessions/start` - Start session
- `POST /sessions/:id/stop` - Stop session

### Wallet
- `GET /wallet` - Get wallet balance
- `GET /wallet/transactions` - Transaction history
- `POST /wallet/topup` - Top up wallet

### Swap
- `GET /swap/stations` - List swap stations
- `POST /swap/initiate` - Start swap session
- `POST /swap/:id/complete` - Complete swap

### Vehicles
- `GET /vehicles` - List user vehicles
- `POST /vehicles` - Add vehicle
- `GET /vehicles/:id/diagnostics` - Get diagnostics
- `GET /vehicles/:id/trips` - Get trip history

Full API documentation is available via Swagger at `/api/docs` when running the backend.

---

## Deployment

### Docker Deployment

```bash
# Build images
docker build -t evzone-api ./backend
docker build -t evzone-portal .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Environment-specific Builds

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

### Health Checks

- API Health: `GET /health`
- Database: `GET /health/db`
- Redis: `GET /health/redis`

---

## User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `SUPER_ADMIN` | Platform super administrator | Full access |
| `PLATFORM_ADMIN` | Platform administrator | Full access (no system config) |
| `ORG_OWNER` | Organization owner | Organization-wide access |
| `ORG_ADMIN` | Organization administrator | Organization management |
| `STATION_OWNER_INDIVIDUAL` | Individual station owner | Own stations |
| `STATION_OWNER_ORG` | Organizational station owner | Org stations |
| `STATION_ADMIN` | Station administrator | Station management |
| `STATION_ATTENDANT` | Station attendant | Operational tasks |
| `FLEET_MANAGER` | Fleet manager | Fleet operations |
| `FLEET_DRIVER` | Fleet driver | Driver operations |
| `TECHNICIAN_PUBLIC` | Public technician | Maintenance jobs |
| `TECHNICIAN_ORG` | Organization technician | Org maintenance |
| `RIDER_PREMIUM` | Premium rider | All rider features |
| `RIDER_STANDARD` | Standard rider | Basic rider features |
| `GUEST` | Guest user | Limited access |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

---

## License

This project is proprietary software. All rights reserved.

---

## Support

For support, contact:
- Email: delta@evzone.com
- Documentation: https://docs.evzone.com
- Issues: https://github.com/evzone/evzone-portal/issues
