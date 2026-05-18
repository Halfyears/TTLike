# TTLike - AI TikTok Viral Intelligence

> Find viral TikTok products before they blow up. AI-powered intelligence for dropshippers and UGC creators.

[![Beta Phase](https://img.shields.io/badge/Phase-Beta%20(100%25%20Free)-pink)](https://ttlike.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://typescriptlang.org)

## Features

- **Viral Product Intelligence** — AI tracks 10,000+ TikTok videos to find breakout products
- **Hook Pattern Analysis** — 7 hook types with templates and real examples
- **AI Script Generator** — Generate 5 UGC script variations with Claude AI
- **Trending Dashboard** — Real-time trending topics and growing products
- **Admin Panel** — Full backend management with KPI tracking
- **Blog System** — SEO-optimized blog with Markdown support
- **Auth System** — Supabase Auth with Email + Google OAuth

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 + React 19 |
| Styling | Tailwind CSS v4 |
| Language | TypeScript |
| Auth | Supabase Auth |
| Database | Supabase (PostgreSQL) + Prisma ORM |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Payments | Stripe + PayPal (disabled in Beta) |
| Deployment | Vercel |

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Halfyears/TTLike.git
cd TTLike
npm install
```

### 2. Configure Environment

```bash
cp .env.local.example .env.local
# Edit .env.local with your credentials
```

Required for basic dev:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY` (for AI scripts)

### 3. Set Up Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
TTLike/
├── app/
│   ├── (main)/          # Public pages (Navbar + Footer)
│   │   ├── page.tsx     # Home
│   │   ├── products/    # Product database
│   │   ├── hooks/       # Hook library
│   │   ├── trending/    # Trending
│   │   ├── pricing/     # Pricing
│   │   └── blog/        # Blog
│   ├── auth/            # Login, Signup, Reset
│   ├── dashboard/       # Protected user area
│   │   └── ai-scripts/  # AI Script Generator
│   ├── admin/           # Admin panel
│   └── api/             # API routes
├── components/
│   ├── layout/          # Navbar, Footer
│   └── ui/              # Button, Card, Input, Badge...
├── lib/
│   ├── supabase/        # Client + Server + Proxy helpers
│   ├── anthropic.ts     # Claude AI
│   ├── prisma.ts        # Prisma client
│   ├── stripe.ts        # Stripe (beta-disabled)
│   └── constants.ts     # IS_BETA_PHASE, PAYMENT_ENABLED
├── prisma/schema.prisma # 9 database models
└── proxy.ts             # Auth middleware (Next.js 16)
```

## Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Home + hero + trending |
| `/products` | Public | Product database with search |
| `/products/[id]` | Public | Product detail + AI breakdown |
| `/hooks` | Public | Hook pattern library |
| `/trending` | Public | Trending topics + products |
| `/pricing` | Public | Pricing (all free in beta) |
| `/blog` | Public | Blog listing |
| `/blog/[slug]` | Public | Blog post |
| `/auth/login` | Public | Sign in |
| `/auth/signup` | Public | Create account |
| `/dashboard` | User | Overview + quick actions |
| `/dashboard/ai-scripts` | User | AI script generator |
| `/admin` | Admin | KPI dashboard |
| `/admin/users` | Admin | User management |
| `/admin/videos` | Admin | Video management |
| `/admin/blog` | Admin | Blog management |
| `/admin/affiliates` | Admin | Affiliate tracking |

## Beta Mode

```typescript
// lib/constants.ts
export const IS_BETA_PHASE = true   // Show beta banner, all free
export const PAYMENT_ENABLED = false // Stripe/PayPal code ready but inactive
```

To activate payments: set both to `true` and add Stripe env vars.

## Admin Setup

Set `ADMIN_EMAIL=your@email.com` in `.env.local`, or update DB:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your@email.com';
```

## Vercel Deployment

1. Import repo on [vercel.com](https://vercel.com)
2. Add all env vars from `.env.local.example`
3. Set `NEXT_PUBLIC_SITE_URL=https://your-domain.com`
4. Deploy → run `npx prisma db push` via Vercel CLI or Supabase dashboard

### Post-deployment checklist
- [ ] Supabase Site URL updated to your domain
- [ ] Google OAuth callback URL added in Supabase
- [ ] `ADMIN_EMAIL` env var set
- [ ] Database schema pushed

## API Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/ai/scripts` | POST | User | Generate 5 AI scripts |
| `/api/admin/check` | GET | User | Check admin status |
| `/api/auth/signout` | POST | User | Sign out |
| `/api/webhooks/stripe` | POST | Stripe | Payment webhooks |
| `/auth/callback` | GET | — | OAuth callback |

## Database Models

`users` · `user_subscriptions` · `tiktok_videos` · `ai_breakdowns` · `hook_patterns` · `trending_topics` · `blog_posts` · `user_analytics` · `affiliate_links`

See [prisma/schema.prisma](prisma/schema.prisma) for full schema.

---

Built with Next.js 16, Supabase, Prisma, and Claude AI. MIT License.
