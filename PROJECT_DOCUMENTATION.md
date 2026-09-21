# Petroleum & Energy Authority (PEA) — System Architecture & Technical Documentation

## 1. Project Overview & Architecture
The **Petroleum & Energy Authority (PEA) Fleet & Dispatch Monitoring Platform** is an enterprise telematics, dispatch, and fuel tracking system designed to monitor fuel shipments from international transit/ports (e.g., Djibouti) to Ethiopian domestic depots and retail destinations.

### High-Level Architecture
```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|                   React 19 + TypeScript + Vite + Tailwind CSS 4                   |
|                   (Leaflet Maps, Supercluster, TanStack Query)                    |
+------------------------------------------+----------------------------------------+
                                           |
                                           | REST (JSON / Bearer Token)
                                           v
+-----------------------------------------------------------------------------------+
|                             BACKEND API LAYER (Laravel 8)                         |
|                                                                                   |
|  - Routing: Laravel API Routes (`routes/api.php`)                                 |
|  - Authentication: Laravel Sanctum (Bearer Token)                                 |
|  - Controllers: AuthController, DepotController, DispatchController,              |
|                 ZTrackController                                                  |
|  - Services: App\Services\ZTrack\ZTrackService (Telematics Bridge)                |
+----------------------+------------------------------------+-----------------------+
                       |                                    |
          Eloquent ORM |                                    | HTTP / Guzzle
                       v                                    v
+------------------------------+   +------------------------------------------------+
|       PERSISTENCE LAYER      |   |            EXTERNAL TELEMATICS APIS            |
|                              |   |                                                |
|  MySQL (`pea_db`):           |   |  1. Mellatech GPS Server:                      |
|  - `users`                   |   |     `https://mellatech.et/et/api/api.php`      |
|  - `personal_access_tokens`  |   |                                                |
|  - `depots`                  |   |  2. ZTrack Telemetry API:                      |
|  - `dispatches`              |   |     `https://apiappola.ztrackinsight.com/`    |
|  - `delivery_confirmations`  |   +------------------------------------------------+
+------------------------------+
```

---

## 2. Frontend Structure & Tech Stack
* **Framework:** React 19 (`react`, `react-dom`)
* **Build Tool:** Vite 7 with `@vitejs/plugin-react`
* **Language:** TypeScript 5.9
* **Styling:** Tailwind CSS 4 with `@tailwindcss/vite`
* **State & Data Fetching:** TanStack React Query (`@tanstack/react-query` v5)
* **Routing:** React Router DOM v7 (`react-router-dom`)
* **Maps & Telematics Visualization:** 
  * Leaflet (`leaflet` v1.9, `@types/leaflet`)
  * React-Leaflet (`react-leaflet` v5)
  * High-density marker clustering: `supercluster` and `use-supercluster`
* **Icons & UI:** `lucide-react`, `@heroicons/react`, `recharts` for charts

### Frontend Directory Organization
```
frontend/src/
├── api/
│   └── axios.ts              # Axios instance with auth token interceptors & environment detection
├── assets/                   # Images, logos, branding assets
├── components/
│   ├── common/               # UI components (KPI cards, modals, tables, badges)
│   ├── depots/               # Depot modals and forms
│   ├── dispatches/           # Fuel dispatch forms, detail panels, delivery confirm modals
│   ├── layout/               # Header, Sidebar, AppLayout shell
│   ├── map/                  # Leaflet map, cluster markers, vehicle popups, route drawers
│   ├── reports/              # Custom report generators, summary tables, export dialogs
│   ├── tracking/             # Vehicle search, status filters, telemetry inspection panels
│   └── transporters/         # Transporter cards & fleet associations
├── context/
│   └── AuthContext.tsx       # Auth provider, local session restore, role verification
├── data/
│   ├── constants.ts          # Fixed coordinates (Djibouti, Addis Ababa), fuel types, statuses
│   ├── gpsApi.ts             # Telemetry fetch orchestrator (Mellatech direct + ZTrack proxy)
│   ├── mockData.ts           # Fallback reference datasets
│   └── types.ts              # TypeScript interfaces (GpsVehicle, Dispatch, Depot, User, etc.)
└── pages/
    ├── AnalyticsPage.tsx     # Fleet & dispatch metrics, volume delivered, efficiency
    ├── DashboardPage.tsx     # Executive map overview, active in-transit trucks, fuel volumes
    ├── DemoPage.tsx          # Fast interactive demo login selector
    ├── DepotsPage.tsx        # Depot registry, capacities, contact details
    ├── FuelDispatchPage.tsx  # Dispatch lifecycle management & receipt confirmation
    ├── LoginPage.tsx         # Standard credential login form
    ├── OilCompaniesPage.tsx  # Oil company fleet allocations and quota tracking
    ├── ProfilePage.tsx       # User profile details
    ├── ReportsPage.tsx       # Comprehensive vehicle movement & delivery audit reports
    ├── SettingsPage.tsx      # System preferences & notification triggers
    ├── TrackingPage.tsx      # Real-time GPS telematics map, vehicle telemetry inspector
    └── TransportersPage.tsx  # Fleet operators and vehicle rosters
```

---

## 3. Backend Structure & Tech Stack
* **Framework:** Laravel 8.75 (PHP 7.4 / 8.0+)
* **Authentication:** Laravel Sanctum (Token-based API authentication)
* **HTTP Client:** Guzzle 7 (`Illuminate\Support\Facades\Http`)
* **CORS:** Fruitcake Laravel CORS

### Backend Directory Organization
```
backend/
├── app/
│   ├── Console/Commands/
│   │   └── TestZTrack.php              # CLI tool: `php artisan ztrack:test` for diagnostics
│   ├── Exceptions/
│   │   └── ZTrackException.php         # Custom exception for upstream telematics failures
│   ├── Http/Controllers/
│   │   ├── AuthController.php          # Login, current user profile, logout
│   │   ├── DepotController.php         # Depot CRUD operations
│   │   ├── DispatchController.php      # Dispatch creation, filtering, delivery verification
│   │   └── ZTrackController.php        # Telemetry proxy & format standardizer
│   ├── Models/
│   │   ├── DeliveryConfirmation.php    # Delivery receipt proof & discrepancies
│   │   ├── Depot.php                   # Storage depot entities
│   │   ├── Dispatch.php                # Fuel shipment record
│   │   └── User.php                    # System users & roles
│   └── Services/ZTrack/
│       └── ZTrackService.php           # Upstream API authentication, caching, and retries
├── config/
│   ├── cors.php                        # CORS headers and allowed origins
│   ├── sanctum.php                     # Sanctum token configuration
│   └── ztrack.php                      # ZTrack base URL, token, and cache TTL settings
├── database/migrations/                # Relational schema migrations
└── routes/
    └── api.php                         # Application endpoints
```

---

## 4. Database Schema & Models

### Relational Schema Summary
```
+------------------------------------+
|               users                |
+------------------------------------+
| id (PK)                            |
| name, email, password              |
| role (EPA_ADMIN, DEPOT_ADMIN, ...) |
| company_id (string, nullable)      |
| depot_id (FK -> depots.id)         |
+-----------------+------------------+
                  |
                  | 1:N
                  v
+------------------------------------+          1:1          +-------------------------------+
|             dispatches             | --------------------> |     delivery_confirmations    |
+------------------------------------+                       +-------------------------------+
| id (PK)                            |                       | id (PK)                       |
| pea_dispatch_no (unique code)      |                       | dispatch_id (FK -> dispatches)|
| oil_company_id (string)            |                       | received_liters (decimal)     |
| transporter_id (string, nullable)  |                       | status (confirmed/rejected)   |
| vehicle_id (plate number / imei)   |                       | confirmed_by_user_id (FK)     |
| dispatch_location (e.g. Djibouti)  |                       | confirmed_at (timestamp)      |
| destination_depot_id (FK -> depots)|                       | notes, variance               |
| fuel_type (Diesel, Regular, etc.)  |                       +-------------------------------+
| dispatched_liters (decimal)        |
| status (In Transit, Delivered)     |
| dispatch_datetime, eta_datetime    |
+-----------------+------------------+
                  |
                  | N:1
                  v
+------------------------------------+
|               depots               |
+------------------------------------+
| id (PK)                            |
| name, region, city                 |
| capacity_liters                    |
| current_storage_liters             |
| status (ACTIVE / MAINTENANCE)      |
| latitude, longitude                |
+--------------------+
```

---

## 5. API Endpoints Reference

### Public Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Authenticates with `email` + `password`. Returns Sanctum Bearer token and user profile. |

### Protected Endpoints (Requires `Authorization: Bearer <token>`)
| Method | Endpoint | Access Control | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/me` | Any Authenticated | Retrieves profile of currently authenticated user. |
| `POST` | `/api/auth/logout` | Any Authenticated | Revokes current access token. |
| `GET` | `/api/depots` | Any Authenticated | Lists all storage depots with capacity & location. |
| `POST` | `/api/depots` | EPA_ADMIN / SUPER_ADMIN | Creates a new storage depot. |
| `GET` | `/api/depots/{id}` | Any Authenticated | Gets details for a specific depot. |
| `PUT` | `/api/depots/{id}` | EPA_ADMIN / SUPER_ADMIN | Updates depot details and capacity. |
| `DELETE` | `/api/depots/{id}` | EPA_ADMIN / SUPER_ADMIN | Deactivates or removes a depot. |
| `GET` | `/api/dispatches` | Role-Filtered | Lists dispatches filtered by user company/depot scope. |
| `POST` | `/api/dispatches` | EPA / Oil Company Admin | Generates shipment with sequential `PEA-YYYY-XXXX` code. |
| `GET` | `/api/dispatches/{id}` | Role-Filtered | Fetches full shipment details and delivery confirmation. |
| `PUT` | `/api/dispatches/{id}` | Admin | Updates shipment parameters (ETA, volume, transporter). |
| `POST` | `/api/dispatches/{id}/deliver` | DEPOT_ADMIN / EPA_ADMIN | Records delivery receipt, confirmed liters, and notes. |
| `GET` | `/api/ztrack/vehicles` | Any Authenticated | Bypassed vehicle roster endpoint. |
| `GET` | `/api/ztrack/vehicles/status` | Any Authenticated | Proxies upstream ZTrack API to fetch live GPS and tank data. |
| `GET` | `/api/ztrack/vehicles/{unitId}/report` | Any Authenticated | Retrieves historical waypoint telemetry for path replay. |

---

## 6. Authentication, Authorization & User Roles

### Roles & Access Matrix
1. **`EPA_ADMIN` (Petroleum & Energy Authority Admin):**
   * Super-administrator scope across all oil companies, transporters, and depots.
   * Full create, update, and review permissions on all dispatches nationwide.
   * Can create depots, manage users, and inspect national fuel inventories.
2. **`OIL_COMPANY_ADMIN` (e.g. OLA Energy, TotalEnergies, NOC):**
   * Restricted by `company_id`.
   * Can only view dispatches belonging to their company.
   * Can create dispatches for their assigned vehicles and authorized transporters.
3. **`DEPOT_ADMIN` (Destination Terminal Admin, e.g. Sululta, Awash):**
   * Restricted by `depot_id`.
   * Auto-redirected to fuel dispatch delivery confirmation on login.
   * Can only view incoming shipments assigned to their depot.
   * Authorized to execute `/dispatches/{id}/deliver` to verify delivered volume and sign off receipts.

---

## 7. External Telematics & GPS Integrations

The system unifies two independent GPS telemetry providers into a single schema:

### 1. Mellatech Telematics
* **Protocol:** Direct Browser HTTP GET request (`https://mellatech.et/et/api/api.php`)
* **Parameters:** `api=user&ver=1.0&key=<API_KEY>&cmd=USER_GET_OBJECTS`
* **Output Format:** JSON array of vehicle objects tagged with `source: 'mella'`.

### 2. ZTrack Telematics (OLA Fleet)
* **Protocol:** Proxied via Laravel Backend (`App\Services\ZTrack\ZTrackService`)
* **Base URL:** `https://apiappola.ztrackinsight.com/api/thirdparty`
* **Authentication:** Session ID (`sid`) obtained via `/getSidByToken` using server-side `ZTRACK_API_TOKEN`.
* **Caching:** Dynamic `sid` is stored in Laravel Cache for 24 hours (`ztrack.cache_ttl`).
* **Resilience & Auto-Retry:** If a request returns `success: false` or `auth: false`, the backend automatically flushes the cached SID, requests a fresh token, and retries the upstream request.
* **Output Format:** Normalized by `ZTrackController.php` into standard GPS fields tagged with `source: 'ztrack'`.

---

## 8. Data Flow: Fuel Dispatch Lifecycle
```
[ 1. Dispatch Created ]
EPA or Oil Company Admin enters shipment details in React UI:
  - Selects Tanker Truck (Mella or ZTrack GPS unit)
  - Selects Fuel Type (Diesel, Benzene, Kerosene) & Liters
  - Selects Origin (e.g., Djibouti Port) & Destination Depot (e.g., Sululta)
  - Submits to `POST /api/dispatches` -> Sequential code `PEA-2026-0042` generated.
             |
             v
[ 2. Real-Time Tracking & Telematics ]
Frontend queries `fetchGpsVehicles()` every 5 minutes:
  - Mellatech and ZTrack feeds are merged.
  - Truck coordinates update on the Leaflet Map.
  - System checks ETA and in-transit progress along the transit corridor.
             |
             v
[ 3. Arrival at Depot ]
Truck arrives at destination depot:
  - Depot Admin logs in (scoped to their specific depot).
  - Depot Admin opens dispatch details and selects "Confirm Delivery".
  - Submits received liters, discrepancy notes, and physical dip measurements.
  - Backend executes `POST /api/dispatches/{id}/deliver`.
  - Creates `delivery_confirmations` entry, sets status to `DELIVERED`.
```

---

## 9. Deployment Configuration & Environments

### Environment Detection (`frontend/src/api/axios.ts`)
The frontend dynamically configures its target backend based on the browser host:
```typescript
const hostname = window.location.hostname;
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

const dynamicBaseUrl = isLocal
  ? 'http://localhost:8000/api'                     // Local php artisan serve
  : `http://${hostname}/pea/backend/public/api`;     // Deployed Apache/Nginx server
```

### Production Server Specifications
* **Server IP:** `197.156.90.84`
* **Web Server:** Apache with URL rewriting enabled
* **Document Root:** `/pea/backend/public`
* **Database Host:** MySQL on `127.0.0.1:3306`, Database: `pea_db`
* **PHP Configuration:**
  * Memory limit: 256M+
  * Execution timeout: Extended to 120s in telematics controllers (`@set_time_limit(120)`)

---

## 10. Testing & Diagnostics CLI Tool
A dedicated Artisan diagnostic command is available in `backend/app/Console/Commands/TestZTrack.php`:
```bash
# Test ZTrack token authentication
php artisan ztrack:test --auth-only

# Clear cached session and test real-time fleet status
php artisan ztrack:test --clear-cache --status

# Test historical route waypoint report for a specific truck
php artisan ztrack:test --report --unitId=2962
```

---

## 11. Theoretical Knowledge & Computer Science Foundations Applied

This project incorporates fundamental computer science, software engineering, and systems theory across its architecture. Below is an academic and technical mapping of the core concepts applied:

### 1. Distributed Systems & Fault Tolerance
* **Heterogeneous Telematics Integration:** The system functions as an aggregator across distributed nodes (Mellatech and ZTrack telematics servers) operating under independent networks and failure domains.
* **Transient Fault Handling & Retry Patterns:** Applied exponential/bounded retries with jitter and self-healing session recovery in `ZTrackService.php` when dealing with upstream session expiry.
* **Graceful Degradation & Fallback Strategy:** The client architecture enforces localized resilience—if an external upstream service suffers an outage or network timeout, the application degrades gracefully by serving cached state from `localStorage` rather than crashing the interface.
* **Reverse Proxy Pattern:** Using the Laravel backend as a proxy layer shields client applications from upstream API changes, circumvents CORS limitations, and conceals sensitive credentials.

### 2. Software Architecture & Design Patterns
* **Client-Server Architecture (Decoupled SPA / Headless API):** Complete separation of concerns between presentation logic (React SPA) and business/data persistence logic (Laravel REST API).
* **Layered / N-Tier Architecture:** Structured flow across Presentation Layer (React components/pages), Transport/API Layer (Controllers/Routes), Business Logic Layer (Services/Exceptions), and Data Access Layer (Eloquent ORM/Migrations).
* **Adapter / Normalizer Pattern:** In `ZTrackController.php`, disparate third-party data models (different field names like `lon` vs `lng`, nested objects vs arrays) are transformed into a canonical, normalized domain model (`GpsVehicle`) before reaching client consumers.
* **Singleton & Service Container (Dependency Injection):** `ZTrackService` is registered into Laravel's IoC container and injected into controllers and CLI commands, ensuring decoupled unit testability and lifecycle control.

### 3. RESTful API Design & Statelessness
* **Stateless Communication:** Adherence to REST constraints where each HTTP request carries full credentials via Bearer tokens (`Authorization: Bearer <token>`), eliminating server-bound HTTP session dependencies.
* **Resource-Oriented URI Design:** Clean hierarchical endpoints representing nouns (`/api/depots`, `/api/dispatches`, `/api/dispatches/{id}/deliver`) with standard HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`).
* **HTTP Semantics & Proper Status Codes:** Precise status mapping across `200 OK`, `201 Created`, `401 Unauthorized`, `403 Forbidden`, `422 Unprocessable Entity`, and `502 Bad Gateway` (used specifically when third-party upstream providers fail).

### 4. Relational Database Theory & Data Modeling
* **Database Normalization:** Relational schemas structured up to Third Normal Form (3NF) to minimize data redundancy and enforce referential integrity between `users`, `depots`, `dispatches`, and `delivery_confirmations`.
* **Foreign Key Constraints & Cascade Semantics:** Strict schema-level constraints ensuring child records maintain transactional integrity with parent entities.
* **ACID Guarantees:** Transactional lifecycle handling on dispatch updates and delivery confirmations ensuring volume adjustments and audit records commit atomically.

### 5. Authentication, Authorization & Security Engineering
* **Role-Based Access Control (RBAC):** Hierarchical permission model enforcing strict multi-tenant data segmentation (EPA Super-Admin vs Oil Company Tenant vs Depot Terminal Administrator).
* **Token-Based Cryptographic Authentication:** Utilization of Laravel Sanctum generating SHA-256 hashed bearer personal access tokens.
* **Principle of Least Privilege (PoLP):** Oil company administrators are restricted to querying and creating records matching their `company_id`; depot admins are scoped strictly to their `depot_id`.
* **Defense in Depth:** Dual-layer security comprising frontend route guards (`ProtectedRoute.tsx`) for user experience and backend middleware (`auth:sanctum`, policy checks) for authoritative authorization.

### 6. Geospatial Computation & Optimization
* **Spatial Marker Clustering & Spatial Indexing:** Rendering hundreds of live moving vehicles simultaneously on a web browser without DOM degradation requires hierarchical spatial data structures. The system integrates `supercluster` (a modified k-d tree / hierarchical greedy clustering algorithm) to cluster nearby markers dynamically by map viewport bounds and zoom levels ($O(\log N)$ spatial queries).
* **Coordinate Systems & Geographic Projections:** Handling latitude and longitude transformations on Web Mercator (EPSG:3857) map tiles with Leaflet.

### 7. Requirements Engineering & Business Domain Modeling
* **Supply Chain & Chain-of-Custody Tracking:** Modeled after strict regulatory compliance workflows from port customs clearance (Djibouti) to domestic bonded depots.
* **Discrepancy & Loss Detection (Variance Analysis):** Formalized delivery confirmation contracts to record physical dip readings versus digital bill-of-lading volumes, tracking transit losses, evaporation, or pilferage.

