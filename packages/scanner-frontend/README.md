# CFF Staff Scanner Frontend

This is a **separate, internal-use-only frontend** for CFF staff to scan and verify tickets using zero-knowledge proofs.

## 🔒 Security Features

- **Password-protected access**: Staff must authenticate before accessing the scanner
- **API authentication**: All backend requests include staff API keys
- **Session-based auth**: Authentication state stored in sessionStorage (cleared on browser close)
- **Separate deployment**: Runs on different port (5174) from public frontend

## 🚀 Getting Started

### Installation

```bash
# From the root directory
pnpm install

# Or from this package directory
pnpm install
```

### Development

```bash
# Run only the scanner frontend (requires backend running)
pnpm dev

# Or from root directory
pnpm scanner

# Run all services (backend + public frontend + scanner frontend)
pnpm dev:all
```

The scanner frontend will be available at:
- **http://localhost:5174**

### Default Credentials

**Staff Password**: `cff-staff-2024`

⚠️ **Important**: Change this password in production! Update in:
- `src/contexts/AuthContext.tsx` (frontend)
- Backend middleware if using JWT/OAuth

## 📋 Features

### Ticket Verification Modes

1. **Offline (Browser) Mode** ⚡
   - Verifies ZK proofs entirely in the browser
   - No backend communication
   - Works completely offline
   - Cannot check if ticket was already used

2. **Online Mode** 🌐
   - Verifies ZK proof on server
   - Checks if ticket was already used
   - Gets full route information
   - Most secure option

### Protected Endpoints

The following backend endpoints require staff authentication:
- `POST /api/verify/scan` - Staff-only ticket scanner endpoint

## 🏗️ Architecture

```
scanner-frontend/
├── src/
│   ├── components/
│   │   ├── ui/           # Shared UI components (copied from main frontend)
│   │   └── ProtectedRoute.tsx  # Route protection wrapper
│   ├── config/
│   │   └── auth.ts       # Authentication configuration
│   ├── contexts/
│   │   └── AuthContext.tsx  # Authentication context & state
│   ├── pages/
│   │   ├── LoginPage.tsx     # Staff login page
│   │   └── ScannerPage.tsx   # Main scanner interface
│   ├── utils/
│   │   └── zkVerifier.ts     # Zero-knowledge proof verification
│   └── schemas/
│       └── validation.ts     # Zod validation schemas
```

## 🔑 Authentication Flow

1. Staff member visits scanner frontend
2. Redirected to login page if not authenticated
3. Enters staff password
4. On success, sessionStorage stores auth state
5. Protected routes become accessible
6. All API calls include Bearer token
7. Backend validates token before processing

## 🛡️ Security Considerations

### For Development
- Simple password-based authentication
- API key stored in code (for demo purposes)
- SessionStorage for auth state

### For Production
You should implement:
- **OAuth 2.0 / OpenID Connect** for staff authentication
- **JWT tokens** with expiration and refresh
- **Environment variables** for secrets (never commit)
- **HTTPS only** for all communications
- **Rate limiting** on authentication endpoints
- **Audit logging** for all scanner activities
- **IP whitelisting** for staff networks
- **MFA (Multi-Factor Authentication)** for staff accounts

## 📦 Deployment

### Separate Deployment Strategy

The scanner frontend should be deployed separately from the public frontend:

1. **Different subdomain/domain**
   - Public: `tickets.cff.ch`
   - Staff: `staff-scanner.cff.ch` (behind VPN/firewall)

2. **Network isolation**
   - Deploy behind corporate VPN
   - IP whitelist for staff networks only
   - Not publicly accessible

3. **Build for production**
   ```bash
   pnpm build
   # Outputs to dist/
   ```

## 🧪 Testing

1. Start the backend:
   ```bash
   pnpm backend
   ```

2. Start the scanner frontend:
   ```bash
   pnpm scanner
   ```

3. Visit http://localhost:5174
4. Login with password: `cff-staff-2024`
5. Test scanning a ticket from the public frontend

## 📝 Environment Variables

Create a `.env` file (see `.env.example`):

```env
VITE_STAFF_API_KEY=your-secure-api-key-here
```

## 🤝 Related Packages

- `@cff/backend` - Backend API server
- `@cff/frontend` - Public customer-facing frontend
- `@cff/circuits` - Zero-knowledge proof circuits

## 📄 License

Internal use only - Not for public distribution

