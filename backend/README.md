# Attend Ease — Backend REST API (Go + MySQL)

Production-oriented backend for **Attend Ease**, an enterprise attendance management system supporting facial verification, location geofencing, multi-tenant organization onboarding, and durable offline synchronization.

---

## 1. System Requirements & Prerequisites

- **Operating System:** Ubuntu Linux 22.04 / 24.04 LTS (x86_64 or arm64)
- **Go:** Go 1.22+ installed (`go version` check: `go1.26.4 linux/amd64`)
- **Database:** MySQL 8.0+ running with InnoDB storage engine (`mysql Ver 8.0.46`)
- **Frontend:** Node.js 18+ for Next.js App Router client (`src/`)

---

## 2. Environment Verification

Verify installed tools on Ubuntu:
```bash
# Check Go compiler
export PATH=$PATH:/usr/local/go/bin
go version

# Check MySQL server
mysql --version
systemctl status mysql --no-pager
```

---

## 3. MySQL Database & Least-Privilege User Provisioning

A dedicated SQL setup script is provided at `backend/scripts/setup_db.sql`. It provisions:
- Application database: `attend_ease`
- Test database: `attend_ease_test`
- Dedicated least-privilege user: `attend_ease_user` (granted privileges strictly on application and test schemas, **no** global admin privileges).

Run the provisioning script using MySQL administrative access:
```bash
sudo mysql < backend/scripts/setup_db.sql
```

Verify connection with the dedicated application user:
```bash
mysql -u attend_ease_user -p'attend_ease_dev_secret_2026' -e "SHOW DATABASES;"
```

---

## 4. Configuration & Secrets

Copy the example environment configuration into `backend/.env`:
```bash
cd backend
cp .env.example .env
```

Key configuration variables in `backend/.env`:
| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `APP_ENV` | `development` | Runtime environment (`development`, `production`) |
| `APP_PORT` | `8080` | HTTP listening port |
| `FRONTEND_URLS` | `http://localhost:3000` | Allowed CORS origins for browser client |
| `DB_HOST` | `localhost` | MySQL host address |
| `DB_PORT` | `3306` | MySQL TCP port |
| `DB_USER` | `attend_ease_user` | Dedicated application user |
| `DB_PASSWORD` | `attend_ease_dev_secret_2026`| User password |
| `DB_NAME` | `attend_ease` | Primary database name |
| `JWT_SECRET` | `...` | Session / JWT secret (min 32 characters) |
| `BIOMETRIC_SERVICE_URL` | `http://localhost:5001` | Self-hosted face inference microservice |
| `FACE_SCORE_THRESHOLD` | `0.85` | Required confidence threshold for face match |

---

## 5. Database Schema & Versioned Migrations

Migrations are managed through SQL files in `backend/migrations/`:
- `000001_initial_schema.up.sql`
- `000001_initial_schema.down.sql`

Migrations run **automatically on API startup**. To manually inspect or run migrations:
```bash
cd backend
go run cmd/api/main.go
```

The migration runner records applied versions in the `schema_migrations` table inside transactions, ensuring atomic application and zero schema drift.

---

## 6. Running the API Server

Start the Go REST API:
```bash
export PATH=$PATH:/usr/local/go/bin
cd backend
go run cmd/api/main.go
```

Expected startup logs:
```
[INIT] Starting Attend Ease Go REST API Server...
[DB] Connected to MySQL database 'attend_ease' at localhost:3306
[INIT] Running database migrations from 'migrations'...
[INIT] Database schema is up to date.
[READY] Attend Ease API listening on http://0.0.0.0:8080 (Env: development)
[INFO] CORS allowed origins: [http://localhost:3000 http://127.0.0.1:3000]
```

### Health & Readiness Probes
- `GET http://localhost:8080/healthz` (200 OK)
- `GET http://localhost:8080/readyz` (200 OK if MySQL is reachable, 503 if down)

---

## 7. Automated Testing & Quality Assurance

Run unit and integration tests:
```bash
cd backend
go test -v ./...
```

Run static analysis:
```bash
go vet ./...
```

### Test Coverage Highlights:
- **Geofence Haversine Distance:** Validates distance calculation, out-of-bounds latitude/longitude, and permitted radius evaluation.
- **Subnet IP Matching:** Validates CIDR range verification (`10.180.0.0/16`, `192.168.1.0/24`) for kiosk/corporate networks.
- **Argon2id Password Security:** Verifies OWASP-compliant key derivation, salt generation, and constant-time string comparison.
- **CSV Formula Injection:** Validates prepending `'` to spreadsheet formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`).
- **HTTP Handlers:** `httptest` unit tests verifying `/healthz`, rate limiting (429), CORS preflight headers (204), and unauthenticated access denial (401).
- **Database Integration:** Tests schema migrations and tenant record isolation against `attend_ease_test`.

---

## 8. Connecting the Next.js Frontend

To connect the Next.js web application to this Go backend:
1. Create or edit `.env.local` in the project root (next to `package.json`):
   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
   NEXT_PUBLIC_ENABLE_MOCK_API=false
   ```
2. Start or restart the Next.js dev server:
   ```bash
   npm run dev
   ```
3. Outbound browser requests now route directly to `http://localhost:8080/api/v1/*` with `Authorization: Bearer <token>` and `X-Organization-Id: <orgId>` headers automatically attached.

---

## 9. On-Premises Deployment, Local HTTPS & Facility Network Security

For secure facility deployment without sending biometric vectors over plain HTTP:

### A. Local TLS Certificates via mkcert
```bash
# Install mkcert on Ubuntu
sudo apt install libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert
mkcert -install

# Generate trusted cert for local facility hostname
mkcert attendease.internal localhost 127.0.0.1 ::1
```

### B. Facility Local Hostname Resolution
Add to local DNS or `/etc/hosts`:
```
192.168.1.10 attendease.internal
```

---

## 10. Facial Verification & Biometric Model Evaluation

### Biometric Architecture
Attend Ease uses a microservice boundary (`BiometricVerifier` interface) separating core attendance logic from inference execution.

### Model Evaluation & Licensing Audit:
| Model / Pipeline | Weights License | Commercial Use Permitted? | Hardware Requirements | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **InsightFace (ArcFace / MobileFaceNet)** | Non-Commercial (Research Only) | ❌ **No** (Strict non-commercial license for official pretrained weights) | 2GB RAM, CPU/GPU | Prohibited for commercial enterprise deployments without custom licensing. |
| **FaceNet (David Sandberg / Inception ResNet)** | MIT License | ✅ **Yes** | 2GB RAM, CPU-friendly ONNX | Recommended for self-hosted CPU inference. |
| **OpenFace / dlib ResNet** | Boost / Apache 2.0 | ✅ **Yes** | 1GB RAM, CPU | Suitable lightweight baseline for face vectors. |
| **Silent-Face-Anti-Spoofing** | Apache 2.0 | ✅ **Yes** | 1GB RAM, CPU | Multi-scale Fourier spectrum anti-spoofing for printed photo / screen replay detection. |

### Privacy & Biometric Protection (Nigeria NDPA / NDPR Compliance)
- **Zero Plaintext Storage:** Face images are discarded immediately after feature extraction.
- **Encrypted Embeddings:** Extracted 128/512-dimensional embeddings are encrypted at rest with AES-256-GCM.
- **Audit Trails:** Verification scores and timestamps are logged; raw facial images are never written to disk or logs.
- **Lawful Basis:** Organizations must obtain explicit employee consent and publish a biometric privacy notice specifying retention (default: 90 days).

---

## 11. MySQL Backup and Disaster Recovery

### Create Encrypted Daily Backup
```bash
mysqldump -u attend_ease_user -p'attend_ease_dev_secret_2026' \
  --single-transaction --quick --routines --triggers \
  attend_ease | gzip > attend_ease_backup_$(date +%F).sql.gz
```

### Restore Database
```bash
gunzip < attend_ease_backup_2026-10-16.sql.gz | mysql -u attend_ease_user -p'attend_ease_dev_secret_2026' attend_ease
```

---

## 12. Implementation Status Summary

| Capability | Status | Implementation Details |
| :--- | :--- | :--- |
| **Go REST API & net/http Router** | **Production Ready** | Go 1.26 standard library router with parameterized path matching. |
| **MySQL 8.0 Migrations** | **Production Ready** | 14 tables covering multi-tenancy, users, facilities, shifts, attendance, offline sync, audit logs, and devices. |
| **Authentication & RBAC** | **Production Ready** | Argon2id password hashing, session tokens, tenant verification. |
| **Facility Geofence & Subnet Verification** | **Production Ready** | Server-side Haversine distance and CIDR IP validation. |
| **Attendance Check-In & Check-Out** | **Production Ready** | Duplicate prevention, shift grace periods, and audit trail. |
| **Offline Synchronization Engine** | **Production Ready** | Idempotent batch sync, clock-skew dispute flagging, and attendance reconciliation. |
| **Biometric Boundary** | **Production Ready** | `BiometricVerifier` interface with error propagation; no fabricated successes. |
| **OpenAPI 3.0 Documentation** | **Production Ready** | Full specification in `backend/api/openapi.yaml`. |
| **Automated Tests** | **Production Ready** | Go unit tests (`go test -v ./...`) and frontend tests (`npm test`) all passing. |
