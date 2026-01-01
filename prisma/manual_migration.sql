-- Manual Migration: Comprehensive Schema Update
-- This migration handles the transition from Role to UserRole enum
-- and adds all new tables while preserving existing data

-- Step 1: Create new UserRole enum with all values including legacy ones
CREATE TYPE "UserRole" AS ENUM (
  'SUPER_ADMIN',
  'PLATFORM_ADMIN',
  'ORG_OWNER',
  'ORG_ADMIN',
  'STATION_OWNER_INDIVIDUAL',
  'STATION_OWNER_ORG',
  'STATION_ADMIN',
  'STATION_ATTENDANT',
  'TECHNICIAN_PUBLIC',
  'TECHNICIAN_ORG',
  'FLEET_MANAGER',
  'FLEET_DRIVER',
  'RIDER_PREMIUM',
  'RIDER_STANDARD',
  'GUEST',
  -- Legacy values for backwards compatibility
  'EVZONE_ADMIN',
  'EVZONE_OPERATOR',
  'EVZONE_OWNER',
  'EVZONE_SITE_OWNER',
  'EVZONE_TECH',
  'EVZONE_DRIVER',
  'EVZONE_FLEET_MANAGER'
);

-- Step 2: Add temporary column with new enum type
ALTER TABLE "User" ADD COLUMN "role_new" "UserRole";

-- Step 3: Map existing roles to new roles
UPDATE "User" SET "role_new" = 
  CASE 
    WHEN role = 'EVZONE_ADMIN' THEN 'EVZONE_ADMIN'::"UserRole"
    WHEN role = 'EVZONE_OPERATOR' THEN 'EVZONE_OPERATOR'::"UserRole"
    WHEN role = 'EVZONE_OWNER' THEN 'EVZONE_OWNER'::"UserRole"
    WHEN role = 'EVZONE_SITE_OWNER' THEN 'EVZONE_SITE_OWNER'::"UserRole"
    WHEN role = 'EVZONE_TECH' THEN 'EVZONE_TECH'::"UserRole"
    WHEN role = 'EVZONE_DRIVER' THEN 'EVZONE_DRIVER'::"UserRole"
    WHEN role = 'EVZONE_FLEET_MANAGER' THEN 'EVZONE_FLEET_MANAGER'::"UserRole"
    ELSE 'EVZONE_OWNER'::"UserRole" -- Default fallback
  END;

-- Step 4: Drop old column and rename new one
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;

-- Step 5: Drop old Role enum
DROP TYPE "Role";

-- Step 6: Add new columns to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "fleetId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "walletId" TEXT;

-- Make email optional (some users may login with phone only)
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Add unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "User_walletId_key" ON "User"("walletId");

-- Step 7: Update Organization table
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'CHARGING_NETWORK';

-- Create OrgType enum
DO $$ BEGIN
  CREATE TYPE "OrgType" AS ENUM ('CHARGING_NETWORK', 'FLEET_OPERATOR', 'PROPERTY_MANAGEMENT', 'MUNICIPALITY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Convert type column to OrgType
ALTER TABLE "Organization" ALTER COLUMN "type" TYPE "OrgType" USING "type"::"OrgType";

-- Step 8: Create Fleet table
CREATE TABLE IF NOT EXISTS "Fleet" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Fleet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Fleet_orgId_idx" ON "Fleet"("orgId");

-- Step 9: Update Booking table
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "connectorId" TEXT;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "queuePosition" INTEGER;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

-- Update BookingStatus enum
DO $$ BEGIN
  ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING';
  ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
  ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CHECKED_IN';
  ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
  ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 10: Update ChargingSession table
ALTER TABLE "ChargingSession" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT;
ALTER TABLE "ChargingSession" ADD COLUMN IF NOT EXISTS "bookingId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ChargingSession_bookingId_key" ON "ChargingSession"("bookingId");

-- Step 11: Create remaining new tables

-- Vehicles
CREATE TABLE IF NOT EXISTS "Vehicle" (
  "id" TEXT NOT NULL,
  "vin" TEXT NOT NULL,
  "make" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "batteryCapacity" DOUBLE PRECISION NOT NULL,
  "userId" TEXT,
  "orgId" TEXT,
  "fleetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Vehicle_vin_key" ON "Vehicle"("vin");
CREATE INDEX IF NOT EXISTS "Vehicle_userId_idx" ON "Vehicle"("userId");
CREATE INDEX IF NOT EXISTS "Vehicle_orgId_idx" ON "Vehicle"("orgId");
CREATE INDEX IF NOT EXISTS "Vehicle_fleetId_idx" ON "Vehicle"("fleetId");

-- OTP Code
CREATE TABLE IF NOT EXISTS "OtpCode" (
  "id" TEXT NOT NULL,
  "identifier" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OtpCode_identifier_type_idx" ON "OtpCode"("identifier", "type");

-- Payment
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'MOBILE_MONEY', 'WALLET', 'CASH', 'BANK_TRANSFER');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED');

CREATE TABLE IF NOT EXISTS "Payment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sessionId" TEXT,
  "bookingId" TEXT,
  "amount" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" NOT NULL,
  "provider" TEXT NOT NULL,
  "providerTxId" TEXT,
  "providerData" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_bookingId_key" ON "Payment"("bookingId");

-- Wallet Transaction
CREATE TABLE IF NOT EXISTS "WalletTransaction" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "balanceBefore" DECIMAL(10,2) NOT NULL,
  "balanceAfter" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- Battery Swap tables
CREATE TYPE "PackStatus" AS ENUM ('AVAILABLE', 'CHARGING', 'ASSIGNED', 'IN_USE', 'MAINTENANCE', 'RESERVED', 'FAULTY');
CREATE TYPE "SwapStatus" AS ENUM ('INITIATED', 'PACK_REMOVED', 'PACK_INSTALLED', 'COMPLETED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS "SwapProvider" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "logo" TEXT,
  "rating" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SwapProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SwapPlan" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "swapsPerMonth" INTEGER NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SwapPlan_pkey" PRIMARY KEY ("id")
);

-- SwapStation update
ALTER TABLE "SwapStation" ADD COLUMN IF NOT EXISTS "providerId" TEXT;

-- Access Control
CREATE TYPE "AccessType" AS ENUM ('OWNER', 'PERMANENT', 'TEMPORARY', 'GUEST_PASS', 'ONE_TIME');

CREATE TABLE IF NOT EXISTS "ChargerAccess" (
  "id" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "userId" TEXT,
  "type" "AccessType" NOT NULL,
  "code" TEXT,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3),
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "maxUsage" INTEGER,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ChargerAccess_pkey" PRIMARY KEY ("id")
);

-- Scheduling
CREATE TYPE "ScheduleType" AS ENUM ('AVAILABILITY', 'PRICING', 'RESTRICTED', 'MAINTENANCE');

CREATE TABLE IF NOT EXISTS "Schedule" (
  "id" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "ScheduleType" NOT NULL,
  "daysOfWeek" INTEGER[],
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "validFrom" TIMESTAMP(3) NOT NULL,
  "validUntil" TIMESTAMP(3),
  "priceOverride" DECIMAL(10,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- Pricing
CREATE TYPE "PricingType" AS ENUM ('FLAT_RATE', 'TIME_BASED', 'ENERGY_BASED', 'TIME_OF_USE', 'DYNAMIC');

CREATE TABLE IF NOT EXISTS "Pricing" (
  "id" TEXT NOT NULL,
  "stationId" TEXT NOT NULL,
  "type" "PricingType" NOT NULL,
  "flatRate" DECIMAL(10,2),
  "perMinute" DECIMAL(10,2),
  "perHour" DECIMAL(10,2),
  "perKwh" DECIMAL(10,2),
  "touEnabled" BOOLEAN NOT NULL DEFAULT false,
  "touRates" JSONB,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Pricing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Pricing_stationId_key" ON "Pricing"("stationId");

-- Notification types
DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'SESSION_STARTED',
    'SESSION_COMPLETED',
    'BOOKING_CONFIRMED',
    'BOOKING_REMINDER',
    'PAYMENT_SUCCESS',
    'PAYMENT_FAILED',
    'MAINTENANCE_DUE',
    'FAULT_DETECTED',
    'WALLET_LOW_BALANCE',
    'SYSTEM_ALERT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "type" "NotificationType";
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "data" JSONB;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "read" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "readAt" TIMESTAMP(3);

-- Add remaining swap tables (Shelf, BatteryPack, SwapSession, etc.)
-- Add remaining vehicle tables (VehicleDiagnostic, Trip, MaintenanceRecord, FaultCode)
-- Add PackInspection table

-- Note: This is a partial migration. Run `npx prisma db push` to complete
-- Or manually add the remaining tables from the schema
