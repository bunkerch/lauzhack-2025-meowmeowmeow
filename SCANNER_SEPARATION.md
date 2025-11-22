# Scanner Frontend Separation

This document explains the separation of the scanner functionality into a dedicated internal staff frontend.

## 🎯 Overview

The `/scanner` endpoint has been separated into a **standalone frontend application** (`@cff/scanner-frontend`) designed exclusively for internal CFF staff use.

## 📦 Architecture

### Before

```
packages/
├── backend/        # Backend API
├── frontend/       # Public customer frontend (with scanner)
└── circuits/       # ZK circuits
```

The public frontend included both customer-facing ticket purchase pages **and** the staff scanner functionality.

### After

```
packages/
├── backend/            # Backend API (with staff auth middleware)
├── frontend/           # Public customer frontend only
├── scanner-frontend/   # Internal staff scanner (separate app)
└── circuits/           # ZK circuits
```

The scanner is now a completely separate application with its own:
- Authentication system
- UI/UX optimized for staff
- Deployment configuration
- Security controls

## 🔒 Security Features

### Frontend Authentication

**Login Page** (`/`)
- Password-protected access
- Default password: `cff-staff-2024` (change in production!)
- Session-based authentication (sessionStorage)

**Protected Routes**
- All scanner routes require authentication
- Automatic redirect to login if not authenticated
- Logout functionality clears session

### Backend Authentication

**API Middleware** (`src/middleware/auth.ts`)
- Bearer token authentication for `/api/verify/scan` endpoint
- API key: `cff-staff-api-key-2024` (change in production!)
- Returns 401/403 for unauthorized requests

**CORS Configuration**
- Updated to allow both frontends:
  - Public: `http://localhost:5173`
  - Scanner: `http://localhost:5174`

## 🚀 Running the Applications

### Public Frontend (Customers)
```bash
# Port 5173
pnpm frontend
```

### Scanner Frontend (Staff)
```bash
# Port 5174
pnpm scanner
```

### All Services
```bash
# Backend + Public Frontend + Scanner Frontend
pnpm dev:all
```

## 📁 Package Structure

### Scanner Frontend (`packages/scanner-frontend/`)

```
scanner-frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # Shared UI components
│   │   └── ProtectedRoute.tsx     # Route protection
│   ├── config/
│   │   └── auth.ts                # API key configuration
│   ├── contexts/
│   │   └── AuthContext.tsx        # Auth state management
│   ├── pages/
│   │   ├── LoginPage.tsx          # Staff login
│   │   └── ScannerPage.tsx        # Scanner interface
│   ├── utils/
│   │   └── zkVerifier.ts          # ZK proof verification
│   └── schemas/
│       └── validation.ts          # Zod schemas
├── package.json                   # Dependencies
├── vite.config.ts                 # Vite config (port 5174)
├── tailwind.config.js             # Tailwind config
└── README.md                      # Scanner-specific docs
```

## 🔑 Authentication Flow

### Frontend Flow

1. User visits `http://localhost:5174`
2. `AuthContext` checks `sessionStorage` for auth status
3. If not authenticated → redirect to `/` (LoginPage)
4. User enters staff password
5. On success → `sessionStorage.setItem('cff_scanner_auth', 'true')`
6. Redirect to `/scanner` (ScannerPage)
7. `ProtectedRoute` wrapper validates auth before rendering

### API Flow

1. Scanner frontend makes request to `/api/verify/scan`
2. Request includes `Authorization: Bearer cff-staff-api-key-2024` header
3. Backend `authenticateStaff` middleware validates token
4. If valid → process request
5. If invalid → return 401/403

## 🛡️ Security Best Practices

### For Development (Current)
- ✅ Separate frontend application
- ✅ Password-protected access
- ✅ API key authentication
- ✅ Session-based auth state
- ✅ CORS restrictions

### For Production (Recommended)

#### Authentication
- 🔐 **OAuth 2.0 / OIDC** (e.g., Azure AD, Okta)
- 🔐 **JWT tokens** with expiration/refresh
- 🔐 **MFA (Multi-Factor Authentication)**
- 🔐 **Role-Based Access Control (RBAC)**

#### Network Security
- 🌐 **Separate domain** (e.g., `staff-scanner.cff.ch`)
- 🌐 **VPN requirement** for access
- 🌐 **IP whitelisting** for staff networks
- 🌐 **Not publicly accessible**

#### Application Security
- 🔒 **Environment variables** for secrets
- 🔒 **HTTPS only** (TLS 1.3+)
- 🔒 **Content Security Policy (CSP)**
- 🔒 **Rate limiting** on auth endpoints
- 🔒 **Audit logging** for all scans
- 🔒 **Security headers** (HSTS, X-Frame-Options, etc.)

#### Deployment
- 📦 **Separate infrastructure** from public frontend
- 📦 **Private container registry**
- 📦 **Network segmentation**
- 📦 **WAF (Web Application Firewall)**

## 📝 Configuration

### Environment Variables

**Scanner Frontend** (`.env`):
```env
VITE_STAFF_API_KEY=your-secure-api-key-here
```

**Backend** (`.env`):
```env
STAFF_API_KEY=your-secure-api-key-here
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

### Changing Default Credentials

**Frontend Password**:
Edit `packages/scanner-frontend/src/contexts/AuthContext.tsx`:
```typescript
const STAFF_PASSWORD = 'your-new-password';
```

**API Key**:
Edit both:
- `packages/scanner-frontend/src/config/auth.ts`
- `packages/backend/src/middleware/auth.ts`

## 🧪 Testing

1. **Start backend**:
   ```bash
   pnpm backend
   ```

2. **Start public frontend**:
   ```bash
   pnpm frontend
   ```

3. **Purchase a ticket** at `http://localhost:5173/purchase`

4. **Copy QR code** from ticket page

5. **Start scanner frontend**:
   ```bash
   pnpm scanner
   ```

6. **Login** at `http://localhost:5174`
   - Password: `cff-staff-2024`

7. **Scan ticket**:
   - Paste QR code JSON
   - Choose verification mode (offline/online)
   - Verify ticket validity

## 🚢 Deployment Strategy

### Public Frontend
- **URL**: `https://tickets.cff.ch`
- **Access**: Public internet
- **CDN**: CloudFlare/Akamai
- **Hosting**: Vercel/Netlify/AWS S3+CloudFront

### Scanner Frontend
- **URL**: `https://staff-scanner.internal.cff.ch`
- **Access**: Internal network only (VPN required)
- **Hosting**: Private cloud/on-premises
- **Authentication**: SSO with corporate IdP

### Backend
- **URL**: `https://api.cff.ch`
- **Access**: 
  - `/api/tickets/*` - Public
  - `/api/routes/*` - Public
  - `/api/verify/*` - Public
  - `/api/verify/scan` - Staff only (API key required)

## 📊 Benefits of Separation

### Security
✅ Internal scanner not exposed to public
✅ Separate authentication/authorization
✅ Independent security policies
✅ Reduced attack surface

### Deployment
✅ Deploy scanner independently
✅ Different release cycles
✅ No downtime for customers when updating scanner
✅ Network isolation

### Development
✅ Clear separation of concerns
✅ Staff-optimized UI/UX
✅ Independent testing
✅ Easier to maintain

### Compliance
✅ Easier to audit staff actions
✅ Access control logs
✅ Role-based permissions
✅ Internal-only data handling

## 🔄 Migration Notes

### What Changed

**Removed from `@cff/frontend`**:
- `src/pages/ScannerPage.tsx` (moved to scanner-frontend)
- Scanner route from `App.tsx`
- Scanner navigation link

**Added to project**:
- `@cff/scanner-frontend` package
- `src/middleware/auth.ts` in backend
- Authentication on `/api/verify/scan` endpoint
- New scripts: `pnpm scanner`, `pnpm dev:all`

### Breaking Changes

**API Endpoint**:
- `/api/verify/scan` now requires `Authorization: Bearer <token>` header
- Unauthenticated requests will receive 401 Unauthorized

**Frontend**:
- Scanner no longer accessible from public frontend
- Staff must use separate application at port 5174

## 📚 Additional Resources

- [Scanner Frontend README](./packages/scanner-frontend/README.md)
- [Backend Authentication Middleware](./packages/backend/src/middleware/auth.ts)
- [Auth Context Implementation](./packages/scanner-frontend/src/contexts/AuthContext.tsx)

## 🤔 FAQ

**Q: Why separate the scanner?**
A: Security, isolation, and better control over who can scan tickets.

**Q: Can customers still verify their own tickets?**
A: Yes! The public frontend still has the ticket display page with QR code. Customers can screenshot/save their tickets.

**Q: How do I add more staff users?**
A: For production, integrate with your corporate SSO/IdP (Azure AD, Okta, etc.).

**Q: Can scanner work offline?**
A: Yes! The scanner has "Offline (Browser)" mode that verifies ZK proofs entirely in the browser.

**Q: What if the backend is down?**
A: Scanner automatically falls back to offline verification, though it can't check if ticket was already used.

---

**Last Updated**: 2024-11-22
**Version**: 1.0.0

