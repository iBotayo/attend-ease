# Attend Ease — Multi-Facility Attendance Management System

> **Enterprise-grade attendance made simple, resilient, and verifiable.**

Attend Ease is a modern, responsive facility attendance management frontend designed for organizations requiring multi-facility employee check-in/check-out, geofence verification, camera-driven biometric authentication, offline attendance queueing with IndexedDB, supervisor reconciliation, role-based multi-tenant organization administration, and compliance audit reporting.

Built with **Next.js 14 (App Router)**, **React 18**, **TypeScript**, and **Tailwind CSS**.

---

## 1. Visual Design & Brand Palette

The user interface follows a tailored, accessible aesthetic strictly preserving the brand tokens:

| Role / Token | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Primary Deep Teal** | `#123C3A` | Brand identity, navigation sidebars, major headings, key CTA buttons |
| **Secondary Teal** | `#2C7770` | Active navigation links, interactive accents, focus rings |
| **Soft Mint** | `#D6F5E8` | Subtle highlight pills, badge accents, demo toolbar highlights |
| **Warm Ivory** | `#FAF8F2` | Page background, modal headers, table alternating rows |
| **Surface White** | `#FFFFFF` | Cards, modals, dialog surfaces, inputs |
| **Success Green** | `#23865B` | Verified on-site status, matched geofence, present badges |
| **Warning Amber** | `#A86412` | Late arrival notices, pending sync badges, offline state alerts |
| **Muted Red** | `#B83B45` | Rejections, revoked devices, perimeter anomaly alerts |

---

## 2. Implemented Routes & Feature Matrix

### Onboarding & Registration
- [`/register`](src/app/register/page.tsx) — Organization registration with legal name, display name, administrator credentials, password complexity enforcement, and terms acceptance.
- [`/verify-email`](src/app/verify-email/page.tsx) — Server-issued single-use verification token validation (with simulated demo token helper).
- [`/setup-organization`](src/app/setup-organization/page.tsx) — 6-step guided setup wizard:
  1. Organization Profile & Timezone
  2. Primary Facility & GPS Geofence (with real browser GPS detection)
  3. Attendance Policies (Biometrics, Offline queueing, Grace periods)
  4. Work Shifts & Active Days
  5. Initial Team Invitations (Supervisors, Employees, Facility Admins)
  6. Review & Provisioning Confirmation
- [`/register/success`](src/app/register/success/page.tsx) — Activation confirmation and administrative receipt with direct links to the Administrator Portal.

### Authentication Portal
- [`/login`](src/app/login/page.tsx) — Employee & Admin authentication with one-click demo presets (Sarah Lin as Employee, Marcus Vance as System Admin).
- [`/forgot-password`](src/app/forgot-password/page.tsx) — Account recovery and password reset dispatch.
- [`/`](src/app/page.tsx) — Automatic role-based gateway redirection.

### Employee Portal
- [`/employee/dashboard`](src/app/(employee)/employee/dashboard/page.tsx) — Today's shift status, primary one-touch action card, facility connectivity indicators, and recent attendance ledger.
- [`/employee/attendance`](src/app/(employee)/employee/attendance/page.tsx) — 3-step interactive verification workflow:
  1. Account & Shift Confirmation
  2. Geofence & Facial Camera verification (with real-time camera stream, fallback preview, and simulated outcome controls for pass, biometric failure, geofence boundary deviation, and permission denials)
  3. Confirmation with local IndexedDB buffering when offline.
- [`/employee/history`](src/app/(employee)/employee/history/page.tsx) — Personal attendance history with timestamps, verification modes, and sync status badges.
- [`/employee/profile`](src/app/(employee)/employee/profile/page.tsx) — Personal information, enrolled biometric status, assigned campus, registered mobile device, and privacy safeguards.

### Administration Portal
- [`/admin/dashboard`](src/app/(admin)/admin/dashboard/page.tsx) — Multi-facility KPI statistics, department attendance distributions, verification exceptions, and live activity stream.
- [`/admin/employees`](src/app/(admin)/admin/employees/page.tsx) — Directory table with fuzzy search, department/facility filters, account activation toggles, and new employee enrollment modal.
- [`/admin/employees/[id]`](src/app/(admin)/admin/employees/[id]/page.tsx) — Individual employee profile editor, biometric status, and historical logs.
- [`/admin/facilities`](src/app/(admin)/admin/facilities/page.tsx) — Facility site cards, GPS geofence radius visualizers, allowed Wi-Fi SSID subnet policies, offline tolerance rules, and facility parameter configuration modal.
- [`/admin/attendance`](src/app/(admin)/admin/attendance/page.tsx) — Full Attendance Register with multi-dimensional filtering (facility, department, status, date), CSV export, and supervisor correction ledger with mandatory justification.
- [`/admin/offline-records`](src/app/(admin)/admin/offline-records/page.tsx) — Dedicated supervisor review portal for IndexedDB-queued events. Inspects confidence scores and perimeter distances, allows manual authorization/sign-off or formal rejection, test record seeding, and simulated batch synchronization.
- [`/admin/shifts`](src/app/(admin)/admin/shifts/page.tsx) — Work shift schedules, operational hours, grace margins, assigned days of week, and shift creation/editing drawer.
- [`/admin/reports`](src/app/(admin)/admin/reports/page.tsx) — Executive compliance analytics, punctuality rates, distribution breakdown bar, and formula-injection-safe CSV export.
- [`/admin/devices`](src/app/(admin)/admin/devices/page.tsx) — Authorized mobile terminals and tablet kiosks, hardware attestation fingerprints, sync timestamps, and certificate revocation dialog.
- [`/admin/audit-logs`](src/app/(admin)/admin/audit-logs/page.tsx) — Audit trail documenting administrative corrections, credential modifications, and policy revisions with CSV export.
- [`/admin/settings`](src/app/(admin)/admin/settings/page.tsx) — System-wide configuration interface spanning Organization Profile, Attendance Rules, Geofence Boundaries, Offline Retention Buffers, Security & Biometrics Privacy, and Notification Alerts.

### Progressive Web App (PWA)
- [`/offline`](src/app/offline/page.tsx) — Offline fallback screen when network is unavailable.
- [`/manifest.webmanifest`](src/app/manifest.ts) — PWA application manifest with brand colors, display configuration, and icons.
- [`/sw.js`](public/sw.js) — Service worker caching safe static shell assets while strictly excluding API requests, credentials, and biometric data.

---

## 3. Architecture & Service Layer Abstraction

The project adheres to a clean separation of concerns: presentation components never hardcode static mock data. The service layer is typed to allow transparent drop-in replacement by a Go REST backend:

```
src/
├── types/          # Shared TypeScript models (Organization, User, Facility, Attendance, Shift, Device, Audit, Offline, API)
├── lib/
│   ├── api/        # ApiClient (fetch wrapper, authorization headers, X-Organization-Id, endpoints catalog)
│   ├── offline/    # IndexedDB persistence manager (via idb with SSR fallback)
│   └── utils/      # Safe CSV generator (formula injection protection) & date formatters
├── mocks/          # In-memory mock store and seed data
├── services/       # Service layer abstractions (Auth, Organization, Attendance, Employee, Facility, Device, Shift, Audit, Report, Settings, Sync)
├── context/        # React contexts (AuthContext, OrganizationContext, OfflineContext)
└── components/     # Reusable UI component library
```

### Go Backend Endpoints Catalog

Configured in [`src/lib/api/endpoints.ts`](src/lib/api/endpoints.ts):
- **Auth**: `POST /auth/login`, `POST /auth/logout`, `POST /auth/forgot-password`, `GET /auth/me`
- **Organizations**: `POST /organizations/register`, `POST /organizations/verify-email`, `POST /organizations/setup`, `GET /organizations/current`
- **Attendance**: `POST /attendance/check-in`, `POST /attendance/check-out`, `GET /attendance/today`, `GET /attendance/history`, `POST /attendance/:id/correct`
- **Employees**: `GET /employees`, `POST /employees`, `PUT /employees/:id`, `PATCH /employees/:id/status`
- **Facilities**: `GET /facilities`, `POST /facilities`, `PUT /facilities/:id`
- **Shifts**: `GET /shifts`, `POST /shifts`, `PUT /shifts/:id`
- **Devices**: `GET /devices`, `POST /devices/:id/revoke`
- **Reports**: `GET /reports/summary`, `GET /reports/attendance`, `GET /reports/export/csv`
- **Offline Sync**: `POST /sync/offline-batch`, `GET /sync/status`
- **Audit & Settings**: `GET /audit-logs`, `GET /settings`, `PUT /settings`

---

## 4. Multi-Tenant Architecture & Security Boundaries

1. **Multi-Tenant Isolation**:
   Every organization has an isolated tenant UUID (`organizationId`). The `apiClient` automatically sends `X-Organization-Id` and `Authorization: Bearer <token>` on all requests. Administrators cannot view or manipulate data belonging to other organizations. Note: Genuine multi-tenant isolation requires database row-level security (RLS) or tenant schema separation enforced server-side by the backend.

2. **Biometric Privacy & Simulated Verification**:
   Raw facial images and biometric vectors are **never** stored in client-accessible browser storage or transmitted unencrypted. Biometric vector calculation and liveness anti-spoofing are marked as simulated demonstrations that must be fulfilled by a trusted backend verification provider.

3. **Offline Attendance & Reconciliation**:
   - Offline records are stored in client IndexedDB (`attend_ease_offline_db`) with status `pending`.
   - On network reconnection, records transition `pending` → `syncing` → `synced` / `rejected` / `review_required`.
   - On network failure, records revert to `pending` with `retryCount` incremented; pending records are **never silently deleted**.
   - Client storage, local timestamps, or client-reported GPS do not prove physical presence; server-side reconciliation verifies timestamps and geofence margins.

4. **Spreadsheet Formula Injection Defense**:
   All CSV exports sanitize cells beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` (prefixing with `'`) to prevent CSV injection vulnerabilities in Excel and Google Sheets.

5. **Hardware Attestation**:
   Device identification uses SHA-256 fingerprint hashes without exposing client device secrets.

---

## 5. Getting Started & Development

### Installation

```bash
npm install
```

### Automated Testing

Runs the built-in Node 18 test suite across authentication, organization registration, geofence calculations, offline sync state machines, and formula injection defenses:

```bash
npm test
```

### Type Checking & Linting

```bash
npx tsc --noEmit
npm run lint
```

### Production Build

```bash
npm run build
```

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 6. Demo Mode Controls

The application includes an unobtrusive development demo toolbar at the top of the interface:
- **Simulate Offline Mode**: Toggles network disconnection simulation to test IndexedDB queueing, offline banners, and batch synchronization.
- **Switch Role**: Instantly switches active demo user between Employees (e.g. Sarah Lin, Tariq O’Connor) and Administrators (e.g. Marcus Vance, Elena Rostova).
