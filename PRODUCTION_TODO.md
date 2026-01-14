# Production Readiness - Remaining Tasks

## Status
- ✅ Infrastructure (Railway + Vercel + PostgreSQL)
- ✅ Security hardening (JWT validation, rate limiting, CSRF)
- ✅ S3/R2 storage configured
- ❌ Content moderation
- ❌ Account deletion (GDPR)
- ❌ Terms/Privacy pages

---

## 1. Content Moderation System

**Goal**: Allow users to report inappropriate content and give admins tools to review/remove it.

### Database Schema
```sql
-- New migration: 008_content_moderation.sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_shot_id UUID REFERENCES shots(id) ON DELETE CASCADE,
  reported_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, actioned, dismissed
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken VARCHAR(50), -- none, warning, content_removed, user_banned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (reported_user_id IS NOT NULL OR reported_shot_id IS NOT NULL OR reported_comment_id IS NOT NULL)
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
```

### API Endpoints
```
POST /reports              - Submit a report (auth required)
GET  /reports              - List reports (admin only)
PATCH /reports/:id         - Update report status (admin only)
```

### Files to Create/Modify
- `apps/api/src/db/migrations/008_content_moderation.sql`
- `apps/api/src/services/report.service.ts`
- `apps/api/src/routes/reports/index.ts`
- `apps/api/src/schemas/report.schemas.ts`
- `apps/api/src/app.ts` - Register routes
- `apps/web/src/components/ReportButton.tsx`
- `apps/web/src/components/ReportModal.tsx`

### Report Reasons (enum)
- `spam` - Spam or advertising
- `harassment` - Harassment or bullying
- `inappropriate` - Inappropriate content
- `impersonation` - Impersonating someone
- `other` - Other (requires details)

---

## 2. Account Deletion (GDPR Compliance)

**Goal**: Allow users to delete their account and all associated data.

### API Endpoint
```
DELETE /users/me           - Delete own account (auth required)
```

### Implementation
1. Soft delete user (set `deleted_at` timestamp)
2. Anonymize PII (username → "deleted_user_xxx", clear email, avatar)
3. Keep shots/comments for 30 days then hard delete via cron
4. Revoke all refresh tokens
5. Clear cookies and redirect to home

### Database Changes
```sql
-- Add to users table
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN deletion_scheduled_at TIMESTAMPTZ;
```

### Files to Create/Modify
- `apps/api/src/db/migrations/009_account_deletion.sql`
- `apps/api/src/services/user.service.ts` - Add `deleteAccount()` method
- `apps/api/src/routes/users/index.ts` - Add DELETE endpoint
- `apps/web/src/app/(main)/settings/page.tsx` - Add delete account button
- `apps/web/src/components/DeleteAccountModal.tsx`

### User Flow
1. User goes to Settings → "Delete Account"
2. Modal explains what will be deleted
3. User types "DELETE" to confirm
4. Account is soft-deleted, user logged out
5. Email confirmation sent (if email service exists)

---

## 3. Terms of Service & Privacy Policy Pages

**Goal**: Add legal pages required for production app.

### Pages to Create
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy

### Files to Create
- `apps/web/src/app/terms/page.tsx`
- `apps/web/src/app/privacy/page.tsx`

### Content Sections

**Terms of Service**:
- Acceptance of terms
- User responsibilities
- Content ownership & license
- Prohibited content
- Account termination
- Limitation of liability
- Dispute resolution
- Changes to terms

**Privacy Policy**:
- Data we collect (GitHub profile, posts, usage data)
- How we use data
- Data sharing (none, except as required by law)
- Data retention
- Your rights (access, deletion, export)
- Cookies
- Contact information

### Footer Links
Add links to Terms and Privacy in:
- `apps/web/src/components/layout/Footer.tsx`
- Login page
- Signup flow

---

## Implementation Order

1. **Terms/Privacy** (easiest, ~30 min)
   - Static pages, no backend changes
   - Required before launching to public

2. **Account Deletion** (~2 hours)
   - Critical for GDPR compliance
   - Database migration + API + UI

3. **Content Moderation** (~3-4 hours)
   - Most complex, requires admin UI
   - Can launch with basic report submission first

---

## Quick Commands

```bash
# Run migration after creating SQL file
cd vibecode/apps/api && npm run migrate

# Typecheck both apps
cd vibecode && npm run typecheck

# Run both apps locally
cd vibecode && npm run dev
```
