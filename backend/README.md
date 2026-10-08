# CampusFind — Backend & API Layer

Node.js, Express, and TypeScript backend API service for **CampusFind**, providing lost & found report management, AI-assisted matching pipeline integration, server-side ownership verification workflow, role-based access control, and IDOR protection.

---

## Architecture Overview

```text
backend/
├── src/
│   ├── config/             # Environment configuration & validation
│   ├── types/              # TypeScript definitions & API contracts
│   ├── models/             # Database repository models
│   ├── validators/         # Zod input & AI output schemas
│   ├── middleware/         # Auth, Role, Validation, RateLimiter, ErrorHandler
│   ├── services/           # Business logic (Item, Match, Claim, AI, Auth, Notification, Admin, DB)
│   ├── controllers/        # Express route controllers
│   ├── routes/             # REST API routes (/auth, /items, /matches, /claims, /notifications, /admin)
│   ├── utils/              # Logger, standard response helpers
│   ├── app.ts              # Express application setup
│   └── server.ts           # Server bootstrap & graceful shutdown
├── migrations/             # PostgreSQL / Supabase SQL migrations
├── tests/                  # Automated test suite (Vitest + Supertest)
└── package.json
```

---

## API Documentation

### Base URL
`/api`

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a student or staff account
- `POST /api/auth/login` — Authenticate and receive JWT
- `GET /api/auth/me` — Retrieve current authenticated user profile

### 2. Lost & Found Items (`/api/items`)
- `POST /api/items/lost` — Report a lost item (title, category, color, features, location, date, contact info)
- `POST /api/items/found` — Report a found item (title, category, location, storage location)
- `GET /api/items` — Discover reported items (with privacy masking: contact details are hidden for unauthorized users)
- `GET /api/items/my` — Get user's own reports (unmasked)
- `GET /api/items/:id` — View details of a specific item
- `PATCH /api/items/:id` — Update report (Protected: only owner or admin can update; enforces state machine rules)
- `DELETE /api/items/:id` — Cancel report (Protected: only owner or admin)
- `POST /api/items/:id/cancel` — Cancel report

### 3. AI Matches (`/api/matches`)
- `GET /api/matches` — Get potential matches for items owned by the authenticated user
- `GET /api/matches/:id` — Get detailed match information and AI explanation
- `POST /api/matches/:id/dismiss` — Dismiss an irrelevant match
- `POST /api/matches/evaluate` — Evaluate compatibility between any lost and found item (used by frontend preview and AI pipeline)

### 4. Ownership Verification & Claims (`/api/claims`)
> **Important:** AI similarity alone does NOT establish ownership. Server-side verification is strictly enforced.
- `POST /api/claims` — Submit an ownership claim with private proof (unique identifiers, secret details, photos)
- `GET /api/claims` — List claims (Claimants see their own claims; Finders see claims for their found item; Admins see all)
- `GET /api/claims/:id` — Get specific claim details (IDOR protected)
- `PATCH /api/claims/:id/review` — Review claim (`approved` or `rejected`) by finder or admin. Approving automatically transitions item to `confirmed_match` and notifies claimant.

### 5. Notifications (`/api/notifications`)
- `GET /api/notifications` — Retrieve alerts (new potential matches, claim submissions, claim reviews)
- `PATCH /api/notifications/:id/read` — Mark notification as read

### 6. Administration (`/api/admin`)
- `GET /api/admin/stats` — High-level platform statistics (total reports, active matches, resolved counts)
- `GET /api/admin/items` — View all items with full administrative details
- `PATCH /api/admin/items/:id/status` — Override status with audit logging
- `GET /api/admin/audit-logs` — Security audit trail

---

## Security & Protection Measures

1. **Authentication & Authorization:**
   - Stateless JWT tokens + Supabase integration.
   - Separation of authentication from authorization: every endpoint verifies whether the user owns the resource or has admin privileges before mutation.
2. **IDOR (Insecure Direct Object Reference) Prevention:**
   - User A cannot modify or cancel User B's reports.
   - User A cannot view User B's private contact details or claim details.
   - Claimants cannot review or approve their own claims.
3. **Item Lifecycle Integrity:**
   - Enforces valid status transitions:
     `reported` → `potential_match` → `verification_pending` → `confirmed_match` → `returned` → `closed`.
   - Normal users cannot arbitrarily set protected statuses like `confirmed_match` or `returned` without completing the verification workflow.
4. **Untrusted AI Output Validation:**
   - All AI matching responses are treated as untrusted input and validated via Zod schemas before being used or stored.
5. **Rate Limiting & Safe Error Handling:**
   - Sensitive endpoints (auth, claims) are rate-limited to avoid brute-forcing.
   - Error messages returned to clients never leak stack traces, database credentials, or internal filesystem paths.

---

## Running Locally

### Prerequisites
- Node.js (>= 18)
- npm (>= 9)

### Setup & Run
```bash
cd backend
npm install
npm run dev
```

### Running Tests
```bash
npm run test
```

### Typecheck & Build
```bash
npm run typecheck
npm run build
```
