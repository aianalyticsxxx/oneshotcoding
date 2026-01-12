# VibeCode Social Network

BeReal-style social network where users share one photo per day during a random "VibeCheck" window.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Monorepo** | pnpm workspaces + Turborepo |
| **Backend** | Fastify 5, PostgreSQL (raw SQL), JWT |
| **Frontend** | Next.js 14 (app router), React 18, React Query |
| **Styling** | TailwindCSS, Framer Motion |
| **Storage** | S3/R2 for images |
| **Deploy** | Docker, Railway, Kubernetes configs |

## Project Structure

```
vibecode/
├── apps/
│   ├── api/                    # Fastify backend
│   │   └── src/
│   │       ├── server.ts       # Entry point
│   │       ├── app.ts          # Fastify app builder
│   │       ├── plugins/        # DB, auth, S3 decorators
│   │       ├── routes/         # HTTP endpoints
│   │       ├── services/       # Business logic
│   │       ├── schemas/        # Request validation
│   │       └── db/migrations/  # SQL migrations
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # App router pages
│           ├── components/     # React components
│           ├── hooks/          # Custom hooks
│           ├── lib/            # API client, utils
│           └── contexts/       # React contexts
├── packages/shared/            # Shared types
└── infra/                      # K8s, Docker configs
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | GitHub OAuth accounts (username, avatar, bio) |
| `vibes` | Daily photo posts - **one per user per day** (UNIQUE constraint) |
| `reactions` | Sparkles + photo reactions (one per type per user per vibe) |
| `daily_vibechecks` | Random daily trigger times (9 AM - 9 PM UTC) |
| `user_streaks` | Consecutive posting tracker with milestones |
| `refresh_tokens` | JWT refresh token revocation |

**Critical**: Database uses `snake_case` columns. Services map to `camelCase` via `mapXxxRow()` methods.

## API Patterns

### Route → Service Architecture
Routes handle HTTP concerns. Services handle business logic and DB queries.

```typescript
// routes/vibes/index.ts - HTTP handling only
fastify.get('/', { preHandler: [fastify.optionalAuth] }, async (request, reply) => {
  const vibes = await vibeService.getFeed(cursor, limit, request.user?.userId);
  return { vibes, nextCursor, hasMore };
});

// services/vibe.service.ts - Business logic + DB
async getFeed(cursor, limit, currentUserId) {
  const result = await this.fastify.db.query(sql, params);
  return result.rows.map(row => this.mapVibeRow(row, currentUserId));
}
```

### Authentication Decorators

| Decorator | Use When |
|-----------|----------|
| `fastify.authenticate` | Route requires auth (401 if missing) |
| `fastify.optionalAuth` | Auth optional, sets `request.user` if present |

Access user ID via `request.user.userId` after authentication.

### Error Responses
```typescript
reply.status(404).send({ error: 'Vibe not found' });
reply.status(401).send({ error: 'Authentication required' });
```

### Cursor Pagination
Uses `created_at` timestamps. Fetch `limit + 1` to detect `hasMore`.
```typescript
const { cursor, limit = 20 } = request.query;
// WHERE created_at < cursor ORDER BY created_at DESC LIMIT limit + 1
```

## Frontend Patterns

### Custom Hooks (in `src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useAuth()` | Current user, login/logout |
| `useVibes()` | Feed with cursor pagination |
| `useDiscoveryFeed()` | Global feed with sort options |
| `useDailyVibe()` | Check/create today's vibe |
| `useVibecheck()` | Today's vibecheck status + countdown |
| `useStreak()` | User's streak info |
| `useCamera()` | Camera access + capture |

### API Client (`lib/api.ts`)
```typescript
const { data, error } = await api.getFeed(cursor);
const { data, error } = await api.createVibe(file, caption);
const { data, error } = await api.sparkleVibe(vibeId);
```

### React Query
All data fetching uses `@tanstack/react-query` for caching and deduplication.

## Authentication Flow

1. User clicks GitHub login → `GET /auth/github`
2. Redirect to GitHub OAuth with state token
3. GitHub callback → `GET /auth/github/callback`
4. Verify state, exchange code for token, upsert user
5. Generate JWT tokens: access (15m) + refresh (7d)
6. Set httpOnly cookies, redirect to frontend

Tokens stored in secure httpOnly cookies. Refresh via `POST /auth/refresh`.

## Business Logic

### Vibes
- **One per day**: `UNIQUE(user_id, vibe_date)` constraint
- **Upsert**: POST replaces today's existing vibe
- **Late tracking**: Compared against vibecheck trigger time

### VibeCheck (BeReal-style)
- Random trigger time generated daily (9 AM - 9 PM UTC)
- **2-hour window** for on-time posting
- **Late posting** allowed until midnight (marked as late)
- Status: `waiting` → `active` → `late` → `closed`

### Streaks
- Increments for consecutive days posting
- Breaks after >1 day gap
- Milestones: 7 (🔥), 14 (💪), 30 (⭐), 50 (🌟), 100 (💯), 365 (👑)

### Reactions
- **Sparkle**: Simple like (toggle)
- **Photo**: Selfie reaction (one per user, updatable)

## Quick Reference

### Commands
```bash
pnpm install              # Install all dependencies
pnpm dev                  # Run all apps in dev mode
pnpm build                # Build all packages
pnpm lint                 # Lint all packages
pnpm test                 # Run tests
pnpm --filter api dev     # Run API only
pnpm --filter web dev     # Run web only
pnpm db:migrate           # Run database migrations
pnpm db:seed              # Seed test data
```

### Environment Variables

**API** (`apps/api/.env`):
```
DATABASE_URL=postgresql://...
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
JWT_SECRET=xxx
S3_BUCKET=xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
FRONTEND_URL=http://localhost:3000
```

**Web** (`apps/web/.env`):
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Project Rules

1. **Service layer for DB**: Never query database directly in routes
2. **Field mapping**: Convert `snake_case` → `camelCase` in service `mapXxxRow()` methods
3. **Cursor pagination**: Use `created_at` cursors, not offset
4. **Auth decorators**: Use `authenticate`/`optionalAuth`, not manual JWT checks
5. **One vibe per day**: Respect the unique constraint, use upsert pattern
6. **Error format**: Always `{ error: string }` for consistency
