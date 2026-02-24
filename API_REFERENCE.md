# Coming Soon API Reference

## Base URL
```
https://fashionmarketplace.store
```

## Subscription Endpoint

### POST `/api/coming-soon/subscribe`
**Purpose**: Handle email subscription with referral tracking  
**Authentication**: None required  
**Rate Limit**: 60/min per IP

#### Request
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "country": "US",
  "referralCode": "ABC1234"  // Optional - if coming from ?ref= link
}
```

#### Success Response (201)
```json
{
  "message": "Successfully subscribed",
  "referralUrl": "https://fashionmarketplace.store/coming-soon?ref=JOH1A2B",
  "referralCode": "JOH1A2B"
}
```

#### Error Response
```json
{
  "error": "Email already subscribed"
}
```

---

## Analytics Endpoints

### POST `/api/coming-soon/analytics`
**Purpose**: Track page views, signups, and shares (silent)  
**Authentication**: None required  
**Rate Limit**: 1000/min per IP

#### Request
```json
{
  "action": "view",  // "view", "subscribe", or "share"
  "email": "user@example.com",  // Optional - only if subscribed
  "referralCode": "ABC1234"  // Optional - if coming from ?ref= link
}
```

#### Response (200)
```json
{
  "message": "Event tracked"
}
```

### GET `/api/coming-soon/analytics`
**Purpose**: View campaign analytics dashboard  
**Authentication**: Bearer token (CRON_SECRET)  
**Rate Limit**: 10/min per token

#### Request
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://fashionmarketplace.store/api/coming-soon/analytics
```

#### Response (200)
```json
{
  "summary": {
    "totalPageViews": 1250,
    "totalSignups": 320,
    "signupConversionRate": "25.60%",
    "referralSignups": 85,
    "referralConversionRate": "26.56%",
    "topReferrers": [
      {
        "email": "ambassador@example.com",
        "name": "Sarah",
        "code": "SAR1A2B",
        "referrals": 12
      },
      {
        "email": "influencer@example.com",
        "name": "Mike",
        "code": "MIK3C4D",
        "referrals": 8
      }
    ]
  }
}
```

---

## Cron Endpoints

### POST `/api/cron/coming-soon-day7`
**Purpose**: Send Day 7 teaser email campaign  
**Authentication**: Bearer token (CRON_SECRET) **Required**  
**Triggered**: March 8, 2026 at 09:00 UTC (automated)

#### Request
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://fashionmarketplace.store/api/cron/coming-soon-day7
```

#### Response (200)
```json
{
  "message": "Day 7 campaign executed",
  "sent": 320,
  "failed": 2,
  "total": 322
}
```

#### Error Response (401)
```json
{
  "error": "Unauthorized"
}
```

### POST `/api/cron/coming-soon-day48h`
**Purpose**: Send 48-hour urgency email campaign  
**Authentication**: Bearer token (CRON_SECRET) **Required**  
**Triggered**: March 13, 2026 at 09:00 UTC (automated)

#### Request
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://fashionmarketplace.store/api/cron/coming-soon-day48h
```

#### Response (200)
```json
{
  "message": "48-hour campaign executed",
  "sent": 320,
  "failed": 2,
  "total": 322
}
```

---

## Email Endpoints (Existing)

### POST `/api/admin/coming-soon/send-launch-emails` (Admin Only)
**Purpose**: Send launch notification emails  
**Authentication**: NextAuth session + ADMIN role

#### Request
```json
{
  "daysUntilLaunch": 0
}
```

#### Response
```json
{
  "message": "Launch emails sent",
  "sent": 320,
  "failed": 0
}
```

---

## Reference URLs

### Coming-Soon Page
```
https://fashionmarketplace.store/coming-soon
```

### Referral Link Format
```
https://fashionmarketplace.store/coming-soon?ref=ABC1234
```

### Email Template Attributes
- **Dynamic firstName**: Personalized greeting
- **Dynamic daysUntilLaunch**: Countdown emphasis
- **Dynamic referralUrl**: Shareable link

---

## Error Codes

| Status | Error | Meaning |
|--------|-------|---------|
| 200 | OK | Successful request |
| 201 | Created | Resource created (subscription) |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid CRON_SECRET |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Database temporarily unavailable |

---

## Testing Examples

### Test Subscription Flow
```bash
# 1. Subscribe without referral
curl -X POST https://fashionmarketplace.store/api/coming-soon/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test"
  }'

# 2. Subscribe with referral
curl -X POST https://fashionmarketplace.store/api/coming-soon/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "referred@example.com",
    "firstName": "John",
    "referralCode": "TEST1A2B"
  }'

# 3. Check analytics
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://fashionmarketplace.store/api/coming-soon/analytics

# 4. Trigger Day 7 campaign
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://fashionmarketplace.store/api/cron/coming-soon-day7
```

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/subscribe` | 60 | 1 minute per IP |
| `/analytics` (POST) | 1000 | 1 minute per IP |
| `/analytics` (GET) | 10 | 1 minute per token |
| `/cron/*` | 1 | No limit (auth-required) |

---

## Implementation Notes

- All timestamps stored in UTC
- Email addresses stored lowercase and trimmed
- Referral codes are 7 alphanumeric characters
- Conversion rates calculated from available data
- Silent tracking (no user interaction required)
- Analytics data never exposed to non-admin users

---

**Last Updated**: February 24, 2026  
**API Version**: v1.0  
**Status**: Production Ready ✅
