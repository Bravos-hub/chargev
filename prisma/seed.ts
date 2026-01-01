import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clean existing data (optional - comment out if you want to keep existing data)
  // await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`

  // ============================================================================
  // TENANTS & ORGANIZATIONS
  // ============================================================================

  console.log('Creating tenants and organizations...')

  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-1' },
    update: {},
    create: {
      id: 'tenant-1',
      name: 'EVzone Platform',
    },
  })

  const chargingOrg = await prisma.organization.upsert({
    where: { id: 'org-charging-1' },
    update: {},
    create: {
      id: 'org-charging-1',
      tenantId: tenant.id,
      name: 'EVzone Charging Network',
      type: 'CHARGING_NETWORK',
    },
  })

  const fleetOrg = await prisma.organization.upsert({
    where: { id: 'org-fleet-1' },
    update: {},
    create: {
      id: 'org-fleet-1',
      tenantId: tenant.id,
      name: 'Green Fleet Solutions',
      type: 'FLEET_OPERATOR',
    },
  })

  // ============================================================================
  // FLEETS
  // ============================================================================

  console.log('Creating fleets...')

  const fleet1 = await prisma.fleet.upsert({
    where: { id: 'fleet-delivery-1' },
    update: {},
    create: {
      id: 'fleet-delivery-1',
      name: 'Delivery Fleet Alpha',
      orgId: fleetOrg.id,
    },
  })

  // ============================================================================
  // USERS
  // ============================================================================

  console.log('Creating users...')

  const hashedPassword = await bcrypt.hash('password123', 10)

  // Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { id: 'user-superadmin' },
    update: {},
    create: {
      id: 'user-superadmin',
      email: 'admin@evzone.com',
      phone: '+254700000001',
      passwordHash: hashedPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
      verified: true,
    },
  })

  // Station Owner (Individual)
  const stationOwner = await prisma.user.upsert({
    where: { id: 'user-owner-1' },
    update: {},
    create: {
      id: 'user-owner-1',
      email: 'owner@example.com',
      phone: '+254700000002',
      passwordHash: hashedPassword,
      name: 'John Doe',
      role: 'STATION_OWNER_INDIVIDUAL',
      tenantId: tenant.id,
      verified: true,
    },
  })

  // Station Owner (Org)
  const orgOwner = await prisma.user.upsert({
    where: { id: 'user-org-owner-1' },
    update: {},
    create: {
      id: 'user-org-owner-1',
      email: 'orgowner@evzone.com',
      phone: '+254700000003',
      passwordHash: hashedPassword,
      name: 'Jane Smith',
      role: 'STATION_OWNER_ORG',
      tenantId: tenant.id,
      orgId: chargingOrg.id,
      verified: true,
    },
  })

  // Station Attendant
  const attendant = await prisma.user.upsert({
    where: { id: 'user-attendant-1' },
    update: {},
    create: {
      id: 'user-attendant-1',
      email: 'attendant@evzone.com',
      phone: '+254700000004',
      passwordHash: hashedPassword,
      name: 'Mike Johnson',
      role: 'STATION_ATTENDANT',
      tenantId: tenant.id,
      orgId: chargingOrg.id,
      verified: true,
    },
  })

  // Fleet Manager
  const fleetManager = await prisma.user.upsert({
    where: { id: 'user-fleet-manager-1' },
    update: {},
    create: {
      id: 'user-fleet-manager-1',
      email: 'fleetmanager@greenfleet.com',
      phone: '+254700000005',
      passwordHash: hashedPassword,
      name: 'Sarah Williams',
      role: 'FLEET_MANAGER',
      tenantId: tenant.id,
      orgId: fleetOrg.id,
      fleetId: fleet1.id,
      verified: true,
    },
  })

  // Fleet Driver
  const fleetDriver = await prisma.user.upsert({
    where: { id: 'user-fleet-driver-1' },
    update: {},
    create: {
      id: 'user-fleet-driver-1',
      email: 'driver@greenfleet.com',
      phone: '+254700000006',
      passwordHash: hashedPassword,
      name: 'David Brown',
      role: 'FLEET_DRIVER',
      tenantId: tenant.id,
      orgId: fleetOrg.id,
      fleetId: fleet1.id,
      verified: true,
    },
  })

  // Regular Riders
  const rider1 = await prisma.user.upsert({
    where: { id: 'user-rider-1' },
    update: {},
    create: {
      id: 'user-rider-1',
      email: 'rider@example.com',
      phone: '+254700000007',
      passwordHash: hashedPassword,
      name: 'Alice Cooper',
      role: 'RIDER_STANDARD',
      tenantId: tenant.id,
      verified: true,
    },
  })

  const rider2 = await prisma.user.upsert({
    where: { id: 'user-rider-2' },
    update: {},
    create: {
      id: 'user-rider-2',
      email: 'premium@example.com',
      phone: '+254700000008',
      passwordHash: hashedPassword,
      name: 'Bob Premium',
      role: 'RIDER_PREMIUM',
      tenantId: tenant.id,
      verified: true,
    },
  })

  // Technician
  const technician = await prisma.user.upsert({
    where: { id: 'user-tech-1' },
    update: {},
    create: {
      id: 'user-tech-1',
      email: 'tech@evzone.com',
      phone: '+254700000009',
      passwordHash: hashedPassword,
      name: 'Tom Technician',
      role: 'TECHNICIAN_ORG',
      tenantId: tenant.id,
      orgId: chargingOrg.id,
      verified: true,
    },
  })

  // ============================================================================
  // WALLETS
  // ============================================================================

  console.log('Creating wallets...')

  await prisma.wallet.upsert({
    where: { userId: rider1.id },
    update: {},
    create: {
      userId: rider1.id,
      balance: 100.00,
      currency: 'USD',
    },
  })

  await prisma.wallet.upsert({
    where: { userId: rider2.id },
    update: {},
    create: {
      userId: rider2.id,
      balance: 500.00,
      currency: 'USD',
    },
  })

  // ============================================================================
  // VEHICLES
  // ============================================================================

  console.log('Creating vehicles...')

  // Individual owner vehicle
  const vehicle1 = await prisma.vehicle.upsert({
    where: { id: 'vehicle-1' },
    update: {},
    create: {
      id: 'vehicle-1',
      vin: 'VIN001234567890ABC',
      make: 'Tesla',
      model: 'Model 3',
      year: 2023,
      batteryCapacity: 75,
      userId: rider1.id,
    },
  })

  // Fleet vehicle
  const vehicle2 = await prisma.vehicle.upsert({
    where: { id: 'vehicle-2' },
    update: {},
    create: {
      id: 'vehicle-2',
      vin: 'VIN001234567890DEF',
      make: 'Nissan',
      model: 'Leaf',
      year: 2022,
      batteryCapacity: 40,
      orgId: fleetOrg.id,
      fleetId: fleet1.id,
    },
  })

  const vehicle3 = await prisma.vehicle.upsert({
    where: { id: 'vehicle-3' },
    update: {},
    create: {
      id: 'vehicle-3',
      vin: 'VIN001234567890GHI',
      make: 'BMW',
      model: 'i3',
      year: 2023,
      batteryCapacity: 42,
      userId: rider2.id,
    },
  })

  // ============================================================================
  // STATIONS
  // ============================================================================

  console.log('Creating stations...')

  const station1 = await prisma.station.upsert({
    where: { id: 'station-1' },
    update: {},
    create: {
      id: 'station-1',
      code: 'EVZ-NBI-001',
      name: 'Westlands Charging Hub',
      region: 'Nairobi',
      country: 'Kenya',
      address: 'Waiyaki Way, Westlands, Nairobi',
      lat: -1.2638,
      lng: 36.8050,
      orgId: chargingOrg.id,
      type: 'CHARGE',
      status: 'ONLINE',
      connectors: 4,
      maxKw: 150,
    },
  })

  const station2 = await prisma.station.upsert({
    where: { id: 'station-2' },
    update: {},
    create: {
      id: 'station-2',
      code: 'EVZ-NBI-002',
      name: 'CBD Fast Charge',
      region: 'Nairobi',
      country: 'Kenya',
      address: 'Kenyatta Avenue, CBD, Nairobi',
      lat: -1.2864,
      lng: 36.8172,
      orgId: chargingOrg.id,
      type: 'CHARGE',
      status: 'ONLINE',
      connectors: 6,
      maxKw: 150,
    },
  })

  const swapStation1 = await prisma.station.upsert({
    where: { id: 'station-swap-1' },
    update: {},
    create: {
      id: 'station-swap-1',
      code: 'EVZ-SWAP-001',
      name: 'Kilimani Battery Swap',
      region: 'Nairobi',
      country: 'Kenya',
      address: 'Ngong Road, Kilimani, Nairobi',
      lat: -1.2930,
      lng: 36.7820,
      orgId: chargingOrg.id,
      type: 'SWAP',
      status: 'ONLINE',
      swapBays: 3,
    },
  })

  // ============================================================================
  // CHARGE POINTS
  // ============================================================================

  console.log('Creating charge points...')

  await prisma.chargePoint.create({
    data: {
      stationId: station1.id,
      vendor: 'ABB',
      model: 'Terra 184',
      status: 'ONLINE',
      maxKw: 150,
      connectors: 2,
    },
  })

  await prisma.chargePoint.create({
    data: {
      stationId: station2.id,
      vendor: 'ChargePoint',
      model: 'Express 250',
      status: 'ONLINE',
      maxKw: 62,
      connectors: 2,
    },
  })

  // ============================================================================
  // SWAP INFRASTRUCTURE
  // ============================================================================

  console.log('Creating swap infrastructure...')

  // Swap Providers
  const swapProvider1 = await prisma.swapProvider.upsert({
    where: { id: 'provider-gogo' },
    update: {},
    create: {
      id: 'provider-gogo',
      name: 'GoGo Swap',
      rating: 4.8,
    },
  })

  const swapProvider2 = await prisma.swapProvider.upsert({
    where: { id: 'provider-zembo' },
    update: {},
    create: {
      id: 'provider-zembo',
      name: 'Zembo',
      rating: 4.5,
    },
  })

  // Swap Plans
  await prisma.swapPlan.create({
    data: {
      providerId: swapProvider1.id,
      name: 'Basic Plan',
      price: 50.00,
      swapsPerMonth: 30,
      description: '1 swap per day',
    },
  })

  await prisma.swapPlan.create({
    data: {
      providerId: swapProvider1.id,
      name: 'Premium Plan',
      price: 100.00,
      swapsPerMonth: 60,
      description: 'Unlimited swaps',
    },
  })

  // Swap Station
  const swapStationEntity = await prisma.swapStation.create({
    data: {
      stationId: swapStation1.id,
      providerId: swapProvider1.id,
      bays: 3,
    },
  })

  // Shelves
  const shelf1 = await prisma.shelf.create({
    data: {
      stationId: swapStationEntity.id,
      position: 'A1',
      capacity: 5,
    },
  })

  const shelf2 = await prisma.shelf.create({
    data: {
      stationId: swapStationEntity.id,
      position: 'A2',
      capacity: 5,
    },
  })

  // Battery Packs
  for (let i = 1; i <= 8; i++) {
    await prisma.batteryPack.create({
      data: {
        serialNumber: `PACK-${String(i).padStart(4, '0')}`,
        model: 'LFP-5kWh',
        capacity: 5.0,
        soc: 85 + (i % 15),
        soh: 95 + (i % 5),
        stationId: swapStationEntity.id,
        shelfId: i <= 5 ? shelf1.id : shelf2.id,
        status: i === 8 ? 'CHARGING' : 'AVAILABLE',
        temperature: 25 + (i % 5),
        voltage: 48.0,
        cycles: i * 100,
      },
    })
  }

  // ============================================================================
  // BOOKINGS
  // ============================================================================

  console.log('Creating bookings...')

  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  await prisma.booking.create({
    data: {
      userId: rider1.id,
      stationId: station1.id,
      startTime: tomorrow,
      endTime: new Date(tomorrow.getTime() + 2 * 60 * 60 * 1000),
      status: 'CONFIRMED',
      amount: 15.00,
      paymentStatus: 'paid',
    },
  })

  await prisma.booking.create({
    data: {
      userId: rider2.id,
      stationId: station2.id,
      startTime: now,
      endTime: new Date(now.getTime() + 1 * 60 * 60 * 1000),
      status: 'CHECKED_IN',
      amount: 20.00,
      paymentStatus: 'paid',
    },
  })

  // ============================================================================
  // CHARGING SESSIONS
  // ============================================================================

  console.log('Creating charging sessions...')

  await prisma.chargingSession.create({
    data: {
      stationId: station1.id,
      userId: rider1.id,
      vehicleId: vehicle1.id,
      status: 'COMPLETED',
      startedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      endedAt: new Date(now.getTime() - 30 * 60 * 1000),
      kwh: 45.5,
      amount: 13.65,
      currency: 'USD',
    },
  })

  const activeSession = await prisma.chargingSession.create({
    data: {
      stationId: station2.id,
      userId: fleetDriver.id,
      vehicleId: vehicle2.id,
      status: 'ACTIVE',
      startedAt: new Date(now.getTime() - 15 * 60 * 1000),
      kwh: 8.5,
      amount: 2.55,
      currency: 'USD',
    },
  })

  // Add meter values for active session
  await prisma.meterValue.createMany({
    data: [
      {
        sessionId: activeSession.id,
        recordedAt: new Date(now.getTime() - 10 * 60 * 1000),
        kwh: 3.2,
        powerKw: 50.0,
        voltage: 400,
        current: 125,
      },
      {
        sessionId: activeSession.id,
        recordedAt: new Date(now.getTime() - 5 * 60 * 1000),
        kwh: 6.1,
        powerKw: 50.0,
        voltage: 400,
        current: 125,
      },
    ],
  })

  // ============================================================================
  // PRICING & SCHEDULES
  // ============================================================================

  console.log('Creating pricing and schedules...')

  await prisma.pricing.create({
    data: {
      stationId: station1.id,
      type: 'ENERGY_BASED',
      perKwh: 0.30,
      currency: 'USD',
    },
  })

  await prisma.schedule.create({
    data: {
      stationId: station1.id,
      name: 'Peak Hours Pricing',
      type: 'PRICING',
      daysOfWeek: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '17:00',
      endTime: '21:00',
      validFrom: now,
      priceOverride: 0.35,
      active: true,
    },
  })

  // ============================================================================
  // ACCESS CONTROL
  // ============================================================================

  console.log('Creating access control...')

  await prisma.chargerAccess.create({
    data: {
      stationId: station1.id,
      userId: rider1.id,
      type: 'PERMANENT',
      validFrom: now,
      active: true,
    },
  })

  await prisma.chargerAccess.create({
    data: {
      stationId: station1.id,
      type: 'GUEST_PASS',
      code: 'GUEST-' + Math.random().toString(36).substring(7).toUpperCase(),
      validFrom: now,
      validUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      maxUsage: 3,
      active: true,
    },
  })

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  console.log('Creating notifications...')

  await prisma.notification.createMany({
    data: [
      {
        userId: rider1.id,
        type: 'SESSION_COMPLETED',
        title: 'Charging Complete',
        body: 'Your charging session has completed. Total: $13.65',
        channel: 'IN_APP',
        read: false,
      },
      {
        userId: rider2.id,
        type: 'BOOKING_CONFIRMED',
        title: 'Booking Confirmed',
        body: 'Your booking at CBD Fast Charge is confirmed for today at 3:00 PM',
        channel: 'IN_APP',
        read: false,
      },
      {
        userId: fleetDriver.id,
        type: 'SESSION_STARTED',
        title: 'Charging Started',
        body: 'Your charging session has started at CBD Fast Charge',
        channel: 'PUSH',
        read: false,
      },
    ],
  })

  // ============================================================================
  // TRIPS & DIAGNOSTICS
  // ============================================================================

  console.log('Creating trips and diagnostics...')

  await prisma.trip.create({
    data: {
      vehicleId: vehicle1.id,
      startLocation: 'Westlands, Nairobi',
      endLocation: 'CBD, Nairobi',
      distance: 12.5,
      duration: 35,
      energyUsed: 3.2,
      efficiency: 256,
      startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
      endedAt: new Date(now.getTime() - 2.5 * 60 * 60 * 1000),
    },
  })

  await prisma.vehicleDiagnostic.create({
    data: {
      vehicleId: vehicle1.id,
      soc: 72,
      range: 180,
      batteryTemp: 28,
      odometer: 15420,
      efficiency: 250,
      timestamp: now,
    },
  })

  // ============================================================================
  // MAINTENANCE
  // ============================================================================

  console.log('Creating maintenance records...')

  await prisma.maintenanceRecord.create({
    data: {
      vehicleId: vehicle1.id,
      type: 'scheduled',
      description: 'Annual service and battery check',
      cost: 150.00,
      status: 'pending',
      scheduledAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    },
  })

  console.log('✅ Seed completed successfully!')
  console.log('\n📊 Summary:')
  console.log('- 1 Tenant')
  console.log('- 2 Organizations')
  console.log('- 1 Fleet')
  console.log('- 9 Users (various roles)')
  console.log('- 2 Wallets')
  console.log('- 3 Vehicles')
  console.log('- 3 Stations (2 charging, 1 swap)')
  console.log('- 2 Swap Providers')
  console.log('- 2 Swap Plans')
  console.log('- 2 Shelves')
  console.log('- 8 Battery Packs')
  console.log('- 2 Bookings')
  console.log('- 2 Charging Sessions')
  console.log('- 2 Meter Values')
  console.log('- 1 Pricing Config')
  console.log('- 1 Schedule')
  console.log('- 2 Access Controls')
  console.log('- 3 Notifications')
  console.log('- 1 Trip')
  console.log('- 1 Vehicle Diagnostic')
  console.log('- 1 Maintenance Record')
  console.log('\n🔑 Test Credentials:')
  console.log('Email: admin@evzone.com | Password: password123 (Super Admin)')
  console.log('Email: owner@example.com | Password: password123 (Station Owner)')
  console.log('Email: attendant@evzone.com | Password: password123 (Attendant)')
  console.log('Email: fleetmanager@greenfleet.com | Password: password123 (Fleet Manager)')
  console.log('Email: driver@greenfleet.com | Password: password123 (Fleet Driver)')
  console.log('Email: rider@example.com | Password: password123 (Rider)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
