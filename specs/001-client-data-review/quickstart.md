# Quickstart: SCCT — Dynamic Client Data Collection & Admin Review

## Prerequisites

- **Node.js** v20+ (LTS)
- **MongoDB** Atlas account or local instance (v7+)
- **Cloudinary** account (free tier works for development)
- **Upstash Redis** account (free tier works for development)
- **Git** (v2.40+)

---

## 1. Clone & Install

```bash
git clone <repo-url> SCCT
cd SCCT
npm install
```

## 2. Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# MongoDB
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/scct?retryWrites=true&w=majority

# Auth.js (NextAuth v5)
AUTH_SECRET=<generate with: npx auth secret>
AUTH_URL=http://localhost:3000

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=scct-submissions

# Upstash Redis
UPSTASH_REDIS_REST_URL=<your-upstash-url>
UPSTASH_REDIS_REST_TOKEN=<your-upstash-token>
```

## 3. Cloudinary Setup

1. Log into Cloudinary Console → Settings → Upload
2. Create an upload preset named `scct-submissions`:
   - **Signing Mode**: Signed
   - **Folder**: `submissions/`
   - **Max file size**: 10 MB
   - **Allowed formats**: `jpg, jpeg, png, gif, webp, pdf, doc, docx`
3. Enable the "Auto-tagging" and "Quality optimization" options (optional)

## 4. Seed Admin User

```bash
npm run seed:admin
```

This creates a default admin user:
- **Email**: `admin@local.com`
- **Password**: `changeme` (change immediately after first login)

## 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Available Routes

| Route | Description |
|-------|-------------|
| `/` | Landing / redirect |
| `/admin/login` | Admin login page |
| `/admin/dashboard` | Submission review dashboard |
| `/admin/forms` | Form template management |
| `/admin/forms/{id}/fields` | Field definition builder |
| `/submit/{accessToken}` | Client submission form |

## 6. First-Time Workflow

1. **Login** at `/admin/login` with seeded credentials
2. **Create a form template** at `/admin/forms` → "New Form"
3. **Add fields** to the form (text, number, image, date, dropdown)
4. **Generate a submission link** → Copy the link
5. **Open the link** in an incognito window to test client submission
6. **Review the submission** in the admin dashboard

## 7. Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# All tests with coverage
npm run test:coverage
```

## 8. Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```text
SCCT/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── [locale]/               # Locale-based routing (en, ar)
│   │   │   ├── admin/              # Admin pages (protected)
│   │   │   │   ├── dashboard/      # Submission review
│   │   │   │   ├── forms/          # Form builder
│   │   │   │   └── login/          # Admin login
│   │   │   └── submit/             # Client submission pages
│   │   │       └── [token]/        # Dynamic token route
│   │   └── api/                    # API routes
│   │       ├── admin/              # Admin API endpoints
│   │       ├── auth/               # Auth.js handlers
│   │       ├── cloudinary/         # Cloudinary signing
│   │       └── submissions/        # Client submission API
│   ├── domain/                     # Domain layer (no framework imports)
│   │   ├── entities/               # Entity types & interfaces
│   │   ├── repositories/           # Repository interfaces
│   │   └── use-cases/              # Business logic use cases
│   ├── data/                       # Data layer (infrastructure)
│   │   ├── models/                 # Mongoose schemas & models
│   │   ├── repositories/           # Repository implementations
│   │   └── services/               # Cloudinary, Redis services
│   ├── presentation/               # Presentation layer
│   │   ├── components/             # Shared UI components (ShadCN)
│   │   ├── view-models/            # ViewModel hooks
│   │   └── providers/              # Context providers
│   ├── lib/                        # Shared utilities
│   │   ├── db.ts                   # MongoDB connection
│   │   ├── redis.ts                # Upstash Redis client
│   │   ├── auth.ts                 # Auth.js configuration
│   │   └── validations.ts          # Zod schemas
│   └── messages/                   # i18n translation files
│       ├── en.json                 # English translations
│       └── ar.json                 # Arabic translations
├── tests/
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── e2e/                        # End-to-end tests
├── specs/                          # Spec Kit feature specs
├── .specify/                       # Spec Kit configuration
├── .env.example                    # Environment template
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind (ShadCN dependency)
├── components.json                 # ShadCN UI configuration
└── package.json
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` | React framework (App Router) |
| `react`, `react-dom` | UI library |
| `mongoose` | MongoDB ODM |
| `next-auth` | Authentication (v5 / Auth.js) |
| `@auth/mongodb-adapter` | MongoDB session adapter |
| `next-cloudinary` | Cloudinary upload widget |
| `cloudinary` | Server-side Cloudinary SDK |
| `@upstash/redis` | Serverless Redis client |
| `@upstash/ratelimit` | Rate limiting middleware |
| `next-intl` | Internationalization (AR/EN) |
| `next-themes` | Dark/light theme switching |
| `@dnd-kit/core` | Drag-and-drop for form builder |
| `zod` | Schema validation |
| `uuid` | Access token generation |
| `lucide-react` | Icon library (ShadCN default) |
