# Next Sprint Planning - CSRF & Advanced Security

**Planned**: Sprint starting [DATE - TBD]  
**Duration**: 2-3 weeks  
**Team**: [assign team members]  
**Status**: Backlog (not started)

---

## Overview

This sprint focuses on integrating CSRF token validation on all state-changing endpoints and completing rate limiting hardening across the platform. Both features have foundational code ready from the previous sprint.

**Completion Criteria**:
- [ ] CSRF tokens generated and validated on all POST/PUT/DELETE endpoints
- [ ] Rate limiting enforced with proper 429 responses
- [ ] No legitimate user actions blocked
- [ ] At least 90% code coverage for new validation logic
- [ ] Performance monitoring in place

---

## Backlog Items

### 🔐 CSRF Token Integration (8-10 hours)

#### Task 1: Add CSRF Middleware (2 hours)
**Objective**: Integrate CSRF validation into request pipeline

**Implementation**:
- Create middleware that:
  1. Extracts CSRF token from request headers (`x-csrf-token`)
  2. Compares with cookie token (`_csrf_token`)
  3. Rejects on mismatch with 403 Forbidden
  4. Allows exemptions for webhooks, health checks
- File: [src/lib/csrf.ts](src/lib/csrf.ts) already exists
- New: Create [middleware-csrf.ts](middleware-csrf.ts) to call it

**Acceptance Criteria**:
- POST/PUT/DELETE requests without valid CSRF token return 403
- Webhook endpoints bypass CSRF check
- API endpoints support CSRF validation
- Response includes `X-CSRF-Token` header for clients

**Tests**:
```typescript
// Valid CSRF should succeed
POST /api/designs with valid token → 200

// Missing CSRF should fail
POST /api/designs without token → 403

// Mismatched CSRF should fail
POST /api/designs with wrong token → 403

// Webhooks should not require CSRF
POST /api/webhooks/stripe (no token) → 200
```

---

#### Task 2: Update Form Pages (3 hours)
**Objective**: Add CSRF token generation to all forms

**Affected Pages**:
1. **Design Upload** ([src/components/upload/DesignUpload.tsx](src/components/upload/DesignUpload.tsx))
   - Get CSRF token from form page
   - Include in form submission
   - Handle CSRF refresh on error

2. **Checkout** ([src/components/checkout/CheckoutForm.tsx](src/components/checkout/CheckoutForm.tsx))
   - Generate token client-side
   - Send with checkout POST request
   - Retry with fresh token if 403

3. **Admin Forms** ([src/app/admin/*](src/app/admin))
   - User management
   - Design approval
   - Settings updates
   - Bulk operations

4. **Seller Dashboard** ([src/app/seller/*](src/app/seller))
   - Shop settings
   - Design management
   - Promotion creation
   - Payout requests

**Implementation Method**:
```typescript
// Pattern to use everywhere:
const [csrfToken, setCsrfToken] = useState(null)

useEffect(() => {
  // Get token from page meta or API
  const token = document.querySelector('[name="csrf-token"]')?.content
  setCsrfToken(token)
}, [])

// Include in submission
const handleSubmit = async (data) => {
  const response = await fetch('/api/...', {
    method: 'POST',
    headers: {
      'x-csrf-token': csrfToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
}
```

**Acceptance Criteria**:
- All forms submit with valid CSRF token
- Token automatically refreshed when expired
- Error handling for 403 responses
- Mobile/SPA compatible

**Tests**:
```bash
# Test upload form
form_submit /upload → includes CSRF token ✓

# Test checkout form
form_submit /checkout → includes CSRF token ✓

# Test admin forms
form_submit /admin/users → includes CSRF token ✓
```

---

#### Task 3: API Endpoint Integration (3 hours)
**Objective**: Enforce CSRF on all state-changing API routes

**Routes to Protect** (50+ endpoints):

**Admin Routes** (`/api/admin/*`):
- POST /api/admin/designs/approve - design approval
- POST /api/admin/featured-items - manage featured items
- DELETE /api/admin/users/:id - user management
- POST /api/admin/orders/:id/refund - refund processing

**Seller Routes** (`/api/seller/*`):
- PUT /api/seller/settings - update settings
- POST /api/seller/designs/:id - create/update
- DELETE /api/seller/designs/:id - delete

**User Routes**:
- POST /api/refunds - request refund
- PUT /api/profile - update profile
- POST /api/cart - manage cart

**Pattern to Implement**:
```typescript
// In each route handler
import { validateCsrfToken, getCsrfTokenFromRequest, getCsrfTokenFromCookie } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  // CSRF validation
  const headerToken = getCsrfTokenFromRequest(request.headers)
  const cookieToken = getCsrfTokenFromCookie(request.headers.get('cookie'))
  
  if (!validateCsrfToken(headerToken, cookieToken)) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    )
  }
  
  // ... rest of logic
}
```

**Exemptions**:
- All webhook endpoints `/api/webhooks/*`
- Health check `/api/health`
- Status endpoint `/api/status`
- GET requests (read-only)

**Acceptance Criteria**:
- All POST/PUT/DELETE endpoints validate CSRF
- Webhooks work without CSRF
- Clear error messages on CSRF failure
- Performance impact < 2ms per request

**Tests**:
```bash
# Validate all admin endpoints
for route in /api/admin/*; do
  curl -X POST $route (no token) → 403 ✓
  curl -X POST $route (with token) → 200 ✓
done
```

---

### 🛡️ Advanced Rate Limiting (5-7 hours)

#### Task 4: Enhanced Rate Limiting Configuration (2 hours)
**Objective**: Fine-tune rate limits by endpoint

**Current Limits** (from previous sprint):
- Admin: 30 req/min per user
- Seller: 60 req/min per user
- Public: 60 req/min per IP

**Proposed Refinements**:

| Endpoint | Current | Proposed | Reason |
|----------|---------|----------|--------|
| `/api/admin/users` | 30/min | 20/min | List users (enumeration risk) |
| `/api/designs` | 60/min | 120/min | GET is read-only, high volume |
| `/api/checkout` | 60/min | 30/min | Payment risk, prevent spam |
| `/api/refunds` | 60/min | 20/min | Financial transaction |
| `/api/search` | 60/min | 120/min | GET, aggregation query |
| `/api/export` | 60/min | 10/min | Resource intensive |

**Implementation**:
```typescript
// In middleware.ts, add endpoint-specific limits
const RATE_LIMITS = {
  admin: { requests: 30, window: 60 * 1000 },
  seller: { requests: 60, window: 60 * 1000 },
  public: { requests: 60, window: 60 * 1000 },
  // Specific overrides:
  '/api/checkout': { requests: 30, window: 60 * 1000 },
  '/api/refunds': { requests: 20, window: 60 * 1000 },
  '/api/admin/users': { requests: 20, window: 60 * 1000 },
}

function getEndpointLimit(pathname: string) {
  // Check specific overrides first
  if (RATE_LIMITS[pathname]) return RATE_LIMITS[pathname]
  
  // Fall back to category
  if (pathname.startsWith('/api/admin/')) return RATE_LIMITS.admin
  if (pathname.startsWith('/api/seller/')) return RATE_LIMITS.seller
  return RATE_LIMITS.public
}
```

**Acceptance Criteria**:
- Refined limits deployed
- No legitimate user complaints
- Monitoring shows < 0.1% of requests hitting limits

---

#### Task 5: Rate Limit Response Improvements (1 hour)
**Objective**: Better UX when rate limits are hit

**Current Response**:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

**Enhanced Response**:
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60,
  "limit": 30,
  "window": "1 minute",
  "resetAt": "2026-02-24T15:32:00Z",
  "contactUrl": "https://support.example.com/rate-limits"
}
```

**Implementation**:
```typescript
// Return more info in response
return NextResponse.json(
  {
    error: 'Rate limit exceeded',
    limit: limits.requests,
    window: Math.ceil(limits.window / 1000) + ' seconds',
    resetAt: new Date(Date.now() + limits.window).toISOString(),
    help: 'https://docs.example.com/api/rate-limits'
  },
  {
    status: 429,
    headers: {
      'Retry-After': String(Math.ceil(limits.window / 1000)),
      'X-RateLimit-Limit': String(limits.requests),
      'X-RateLimit-Window': String(limits.window),
      'X-RateLimit-Reset': new Date(Date.now() + limits.window).toISOString()
    }
  }
)
```

**Acceptance Criteria**:
- Clear error messages
- Standard HTTP headers included
- Client libraries can parse response
- Documentation updated

---

#### Task 6: Redis Integration for Distributed Rate Limiting (2-3 hours)
**Objective**: Enable Redis-backed rate limiting for production scale

**Current**: In-memory only (works for single server, fails at scale)  
**Target**: Redis with fallback to memory

**Implementation**:
```typescript
// Already has Redis support skeleton, needs completion
import { createClient } from 'redis'

const redis = process.env.REDIS_URL 
  ? createClient({ url: process.env.REDIS_URL })
  : null

async function checkRedisRateLimit(key, limit, window) {
  if (!redis) return checkMemoryRateLimit(key, limit, window)
  
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.expire(key, Math.ceil(window / 1000))
  }
  return count <= limit
}
```

**Acceptance Criteria**:
- Works with Redis when `REDIS_URL` set
- Falls back to memory when Redis unavailable
- No performance regression
- Handles Redis connection failures gracefully

**Dependencies**:
```bash
npm install redis
# Then in production set REDIS_URL env var
```

**Tests**:
```bash
# Test with Redis
REDIS_URL=redis://localhost:6379 npm run dev
# Make 35 requests to /api/admin → last 5 return 429 ✓

# Test without Redis (fallback)
npm run dev
# Same test → in-memory limit works ✓
```

---

### 📊 Monitoring & Testing (3-4 hours)

#### Task 7: CSRF & Rate Limit Dashboard (2 hours)
**Objective**: Monitor CSRF violations and rate limit hits

**Metrics to Track**:
- CSRF token validation rate (% of requests validating)
- CSRF rejections per endpoint (403 responses)
- Rate limit hits per user/IP
- Rate limit hit trend (spike detection)

**Dashboard Endpoints**:
```typescript
// GET /api/admin/security/metrics
{
  csrf: {
    totalValidations: 15234,
    failures: 23,
    failureRate: 0.15,
    topFailedEndpoints: ['/api/checkout', '/api/admin/users'],
    recentRejections: [...]
  },
  rateLimit: {
    totalRequests: 124567,
    limitHits: 42,
    topHitEndpoints: ['/api/designs', '/api/search'],
    topHitUsers: [...],
    distributionByStatus: {...}
  }
}
```

**UI Page**: [src/app/admin/security](src/app/admin/security)
- Real-time metrics
- Hourly trends
- Alert thresholds

---

#### Task 8: Comprehensive Testing (1-2 hours)
**Objective**: Validate CSRF and rate limiting work correctly

**Test Cases**:

1. **CSRF Token Lifecycle**
   - [ ] Token generated on form page
   - [ ] Token valid for session duration
   - [ ] Token expired after timeout
   - [ ] Token refreshed on demand
   - [ ] Mismatched tokens rejected

2. **Rate Limiting Accuracy**
   - [ ] Requests within limit succeed
   - [ ] Requests exceeding limit return 429
   - [ ] Different users have separate counts
   - [ ] Different IPs have separate counts
   - [ ] Window resets properly

3. **Integration Tests**
   - [ ] CSRF + rate limit together
   - [ ] Form submission with CSRF
   - [ ] API retry with new CSRF token
   - [ ] Admin operations protected

4. **Edge Cases**
   - [ ] Missing CSRF token → 403
   - [ ] Empty CSRF token → 403
   - [ ] Expired CSRF token → 403
   - [ ] Rate limit window edge
   - [ ] Concurrent requests near limit

**Running Tests**:
```bash
# Unit tests
npm test -- csrf.test.ts
npm test -- rate-limit.test.ts

# Integration tests
npm run test:integration -- csrf
npm run test:integration -- rate-limit

# e2e tests
npm run test:e2e -- csrf-form-submission
npm run test:e2e -- rate-limit-429-response
```

---

## Dependencies & Blockers

| Dependency | Status | Notes |
|-----------|--------|-------|
| CSRF utilities ([csrf.ts](src/lib/csrf.ts)) | ✅ Ready | Already created |
| Rate limit middleware | ✅ Ready | Already created |
| Prisma IdempotencyKey model | ✅ Ready | Already added to schema |
| Authentication system | ✅ Ready | NextAuth already in place |
| Redis (optional) | ⚠️ Optional | Not critical, works without |

**No blockers identified** - all dependencies ready

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| CSRF token coverage | 100% of forms | 0% (not yet integrated) |
| Validation error rate | < 0.1% of requests | Monitor post-deploy |
| Rate limit false positives | < 0.01% | Monitor post-deploy |
| API response time (w/ validation) | < 2ms overhead | TBD after implementation |
| Code coverage (CSRF) | > 90% | TBD |
| Code coverage (rate limiting) | > 90% | TBD |

---

## Timeline Estimate

| Task | Estimate | Owner | Status |
|------|----------|-------|--------|
| CSRF Middleware | 2 hours | TBD | Backlog |
| Form Integration | 3 hours | TBD | Backlog |
| API Endpoints | 3 hours | TBD | Backlog |
| Rate Limit Config | 2 hours | TBD | Backlog |
| Rate Limit Responses | 1 hour | TBD | Backlog |
| Redis Integration | 2-3 hours | TBD | Backlog |
| Dashboard | 2 hours | TBD | Backlog |
| Testing | 1-2 hours | TBD | Backlog |
| **Total** | **17-20 hours** | - | **Backlog** |

**Recommendation**: Split into 2 sprints
- **Sprint 1** (1 week): CSRF (8 hours) + Rate Limit Config (5 hours)
- **Sprint 2** (1 week): Redis (3 hours) + Dashboard (2 hours) + Testing (2 hours)

---

## Review Checkpoints

Before sprint completion, verify:
- [ ] All 50+ state-changing endpoints have CSRF validation
- [ ] No false positives from CSRF or rate limiting
- [ ] Performance benchmarks met (< 2ms overhead)
- [ ] Proper error messages on all failures
- [ ] Documentation updated
- [ ] Team trained on new validation patterns
- [ ] Monitoring dashboards functional
- [ ] Tests passing (unit + integration + e2e)

---

## Post-Deploy Monitoring

**Week 1 After Deploy**:
- Monitor CSRF token generation/validation rates
- Track any 403 (CSRF) or 429 (rate limit) spikes
- Alert on unusual patterns
- Document any edge cases encountered

**Metrics to Watch**:
```
CSRF Tokens:
  - Generated per hour
  - Validation success rate (should be > 99%)
  - Failures per endpoint
  - Geographic distribution of failures

Rate Limiting:
  - Hit rate by endpoint
  - Hit rate by user/IP
  - Response time impact
  - Redis connection stability (if enabled)
```

---

## References

- [OWASP CSRF Prevention](https://owasp.org/www-community/attacks/csrf)
- [Rate Limiting Best Practices](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)
- [Redis Rate Limiting Implementation](https://redis.io/commands/incr)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

## Sign-Off

**Product Owner**: [NAME]  
**Tech Lead**: [NAME]  
**Date Planned**: [DATE TBD]

*This sprint plan is ready to schedule. Awaiting prioritization and team assignment.*
