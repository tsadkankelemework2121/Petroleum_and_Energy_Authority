export type UserRole = 'EPA_ADMIN' | 'OIL_COMPANY_ADMIN' | 'DEPOT_ADMIN' | 'DRIVER'

export type User = {
  email: string
  role: UserRole
  companyId?: string // if role is OIL_COMPANY_ADMIN
  depotId?: string   // if role is DEPOT_ADMIN
  vehiclePlateNumber?: string // if role is DRIVER
  phoneNumber?: string
  transporterName?: string
  name?: string
}

export type Driver = {
  id: number
  name: string
  email: string
  vehicle_plate_number: string | null
  phone_number: string | null
  transporter_name: string | null
  plain_password?: string | null
  created_at?: string
}

export type FuelType = 'Benzine' | 'Diesel' | 'Jet Fuel'

export type DispatchStatus =
  | 'On transit'
  | 'Delivered'
  | 'Exceeded ETA'
  | 'GPS Offline >24h'
  | 'Stopped >5h'

export type ContactInfo = {
  person1?: string
  person2?: string
  phone1?: string
  phone2?: string
  email1?: string
  email2?: string
}

export type Location = {
  region: string
  city: string
  address: string
}

export type LatLng = {
  lat: number
  lng: number
}

export type OilCompany = {
  id: string
  name: string
  contacts: ContactInfo
}

export type Vehicle = {
  id: string
  plateRegNo: string
  trailerRegNo: string
  manufacturer: string
  model: string
  yearOfManufacture: number
  sideNo: string
  driverName: string
  driverPhone: string
  oilCompany?: string | null
}

export type Transporter = {
  id: string
  name: string
  contacts: ContactInfo
  location: Location
  vehicles: Vehicle[]
  oilCompanyId?: string // If created/owned by an oil company
}

export type Depot = {
  id: string
  name: string
  contacts: ContactInfo
  location: Location
  mapLocation?: LatLng
  mapLink?: string
  oilCompanyId?: string // If created/owned by an oil company
  hasDispatches?: boolean // Whether this depot has dispatches assigned
}

export type DeliveryConfirmation = {
  id: number
  dispatch_id: number
  depot_id: number
  confirmed_by: number
  image_path: string
  latitude: number | null
  longitude: number | null
  vehicle_status: string | null
  confirmed_at: string
  confirmed_by_user?: { name: string; email: string }
}

export type GpsPoint = {
  position: LatLng
  timestamp: string
}

export type DispatchTask = {
  peaDispatchNo: string
  oilCompanyId: string
  transporterId: string
  vehicleId: string

  dispatchDateTime: string
  dispatchLocation: string

  destinationDepotId: string
  etaDateTime: string

  fuelType: FuelType
  dispatchedLiters: number

  dropOffDateTime?: string
  dropOffLocation?: string

  status: DispatchStatus
  lastGpsPoint?: GpsPoint
  confirmation?: DeliveryConfirmation | null
}


export type RegionFuelSummary = {
  region: string
  weekLabel: string
  benzineM3: number
  dieselM3: number
  jetFuelM3: number
}

export type GpsVehicle = {
  imei: string
  name: string
  group: string | null
  odometer: string
  engine: 'on' | 'off'
  status: string
  dt_server: string
  dt_tracker: string
  lat: string
  lng: string
  altitude: string
  angle: string
  speed: string
  fuel_1: string
  fuel_2: string
  fuel_can_level_percent: number | null
  fuel_can_level_value: number | null
  custom_fields: unknown | null
  source?: 'ztrack' | 'mella'
}

export function mapDepot(d: any): Depot {
  return {
    ...d,
    id: d.id.toString(),
    oilCompanyId: d.oil_company_id || d.oilCompanyId || '',
    location: {
      region: d.region || '—',
      city: d.city || '—',
      address: d.address || '—',
    },
    contacts: {
      person1: d.person1 || undefined,
      person2: d.person2 || undefined,
      phone1: d.phone1 || undefined,
      phone2: d.phone2 || undefined,
      email1: d.email1 || undefined,
      email2: d.email2 || undefined,
    },
    mapLocation: d.lat && d.lng ? { lat: Number(d.lat), lng: Number(d.lng) } : undefined,
    mapLink: d.map_link || undefined,
    hasDispatches: d.has_dispatches ?? false,
  }
}

