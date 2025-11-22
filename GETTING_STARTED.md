# Getting Started with CFF Ticket ZK

Welcome! This guide will help you get the CFF Ticket ZK platform up and running in minutes.

## 🚀 Quick Start (3 commands)

```bash
# 1. Start PostgreSQL
pnpm db:up

# 2. Start the application
pnpm dev
```

That's it! The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## 📋 Prerequisites

Make sure you have these installed:
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (Run: `npm install -g pnpm`)
- **Docker** (Optional, for easy PostgreSQL setup)

All dependencies are already installed via `pnpm install` ✅

## 🎯 First Time Setup

### Step 1: Start the Database

#### Option A: Using Docker (Easiest)
```bash
pnpm db:up
```

This starts PostgreSQL in a Docker container with all the right settings.

#### Option B: Using Local PostgreSQL
If you have PostgreSQL installed:
```bash
createdb cff_tickets
```

Then make sure your credentials in `packages/backend/.env` match your local setup.

### Step 2: Start the Application
```bash
pnpm dev
```

This starts both the frontend and backend servers.

Wait for:
```
✅ Database initialized
🚀 Backend server running on http://localhost:3000
```

And:
```
VITE ready in XXX ms
➜ Local: http://localhost:5173/
```

## 🎫 Using the Platform

### Buy a Ticket

1. Open http://localhost:5173 in your browser
2. Click **"Buy Tickets Now"**
3. Select a route (e.g., "Zürich HB → Bern")
4. Choose a ticket type:
   - **Single Journey**: Valid for 24 hours
   - **Day Pass**: Valid for 1 day
   - **Return Ticket**: Valid for 30 days
5. Select travel date
6. Click **"Confirm Purchase (POC)"**

You'll see a ticket with:
- ✅ Route details
- ✅ QR code for verification
- ✅ Zero-knowledge proof data
- ✅ Ticket ID

### Verify a Ticket

1. Navigate to http://localhost:5173/scanner
2. Copy the Ticket ID from your ticket
3. Paste it in the scanner
4. Click **"Verify Ticket"**

The system will:
- ✅ Check if ticket exists
- ✅ Verify it hasn't been used
- ✅ Confirm validity period
- ✅ Validate zero-knowledge proof
- ❌ Without accessing any personal data!

## 🔧 Useful Commands

### Development
```bash
pnpm dev          # Start both frontend & backend
pnpm frontend     # Start only frontend
pnpm backend      # Start only backend
```

### Database
```bash
pnpm db:up        # Start PostgreSQL
pnpm db:down      # Stop PostgreSQL
```

### Building
```bash
pnpm build        # Build all packages
pnpm clean        # Clean build artifacts
```

## 📁 Project Structure

```
cff-ticket-frfr/
├── packages/
│   ├── backend/          # API server
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── database/ # PostgreSQL setup
│   │   │   └── zk/       # Zero-knowledge proofs
│   │   └── .env          # Configuration
│   │
│   └── frontend/         # React app
│       └── src/
│           └── pages/    # UI pages
│
├── scripts/              # Helper scripts
├── docker-compose.yml    # PostgreSQL setup
├── README.md             # Project overview
├── SETUP.md              # Detailed setup guide
├── ARCHITECTURE.md       # Technical architecture
└── package.json          # Monorepo config
```

## 🔒 Understanding Zero-Knowledge Proofs

### What Happens When You Buy a Ticket?

1. **You provide**: Route, ticket type, date
2. **System generates**: 
   - Unique ticket ID
   - Cryptographic proof (ZK proof)
   - Public verification data
3. **System stores**:
   - ✅ Ticket ID
   - ✅ Route reference
   - ✅ Validity period
   - ✅ Zero-knowledge proof
   - ❌ NO personal information!

### What's in the Proof?

The ZK proof proves:
- ✅ You have a valid ticket
- ✅ It's for the correct route
- ✅ It's valid for the time period
- ✅ It was legitimately purchased

**Without revealing**:
- ❌ Your identity
- ❌ Payment details
- ❌ Any personal information

### How Verification Works

When scanned:
1. Scanner reads ticket ID and proof
2. System checks:
   - Ticket exists? ✅
   - Not used before? ✅
   - Within valid period? ✅
   - Proof valid? ✅
3. Returns: Valid ✅ or Invalid ❌

**Zero personal data accessed!**

## 🎨 Available Routes

The system comes pre-loaded with Swiss train routes:

| From | To | Price (CHF) | Duration |
|------|-----|-------------|----------|
| Zürich HB | Bern | 51.00 | 57 min |
| Zürich HB | Geneva | 88.00 | 177 min |
| Bern | Geneva | 52.00 | 102 min |
| Lausanne | Zürich HB | 79.00 | 134 min |
| Basel SBB | Lugano | 98.00 | 213 min |
| Zürich HB | Luzern | 26.00 | 49 min |

## 🐛 Troubleshooting

### Database Connection Error

**Problem**: Backend can't connect to PostgreSQL

**Solution**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart it
pnpm db:down
pnpm db:up

# Wait a few seconds for it to start
```

### Port Already in Use

**Problem**: `Error: Port 3000 already in use`

**Solution**:
```bash
# Find what's using the port
lsof -i :3000

# Kill it (replace PID with actual number)
kill -9 <PID>

# Or use a different port in packages/backend/.env
PORT=3001
```

### Frontend Not Loading Routes

**Problem**: Routes don't appear in the purchase page

**Solution**:
1. Check backend is running: http://localhost:3000/health
2. Should return: `{"status":"ok","timestamp":"..."}`
3. Check database: Routes are created automatically on first start
4. Restart backend: `pnpm backend`

### "Failed to purchase ticket"

**Problem**: Purchase fails

**Solution**:
1. Open browser console (F12)
2. Check for error messages
3. Verify backend logs
4. Ensure database is initialized properly

## 🔐 Security Note

⚠️ **This is a Proof of Concept**

For demonstration purposes only. Not production-ready.

**What's implemented**:
- ✅ Privacy-preserving architecture
- ✅ ZK proof structure
- ✅ No personal data storage

**What's NOT implemented**:
- ❌ Real payment processing
- ❌ Authentication
- ❌ Production-grade ZK circuits
- ❌ Security hardening

For production use, see ARCHITECTURE.md for required enhancements.

## 📚 Learn More

- **SETUP.md** - Detailed setup instructions
- **ARCHITECTURE.md** - Technical deep dive
- **README.md** - Project overview

## 🎯 Next Steps

Try these features:
1. ✅ Purchase different ticket types
2. ✅ Scan and verify tickets
3. ✅ Check the ZK proof data (technical view on ticket page)
4. ✅ Try to use a ticket twice (it will be rejected!)
5. ✅ Experiment with expired tickets

## 💡 Tips

- **QR Code**: The QR code contains the complete ticket proof
- **Ticket ID**: Can be manually copied for verification
- **Proof Data**: Click "View Proof Data" to see the cryptographic proof
- **Scanner**: Works without accessing any personal information
- **Privacy**: No user accounts needed, no tracking

## 🤝 Need Help?

Check the documentation:
- **Quick issues**: See "Troubleshooting" above
- **Setup problems**: Read SETUP.md
- **Technical questions**: Read ARCHITECTURE.md
- **General info**: Read README.md

## 🎉 Enjoy!

You're now ready to explore zero-knowledge proof-based train ticketing!

The privacy-preserving future of e-commerce starts here. 🚂🔒

