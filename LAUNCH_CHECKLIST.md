# Launch Checklist - Coming Soon System

**Current Date**: February 24, 2026  
**Launch Date**: March 15, 2026  
**Days Until Launch**: 19 days

## ✅ Completed Tasks

### Implementation (Complete)
- [x] Drip email templates (3 emails)
- [x] Analytics tracking system
- [x] Referral code generation
- [x] Social preview cards (OG/Twitter)
- [x] Coming-soon page with countdown
- [x] Email subscription endpoint
- [x] Referral attribution tracking
- [x] Admin analytics dashboard
- [x] TypeScript validation ✓
- [x] Production build (352 pages) ✓

### Cron Jobs (Complete)
- [x] Day 7 email endpoint (`/api/cron/coming-soon-day7`)
- [x] 48-hour email endpoint (`/api/cron/coming-soon-day48h`)
- [x] GitHub Actions workflow files
- [x] Launch email endpoint setup

### Documentation (Complete)
- [x] `COMING_SOON_SYSTEM.md` - Full implementation guide
- [x] `CRON_SETUP.md` - Cron configuration guide
- [x] API endpoint documentation
- [x] Email template details

## 📋 Pre-Launch Checklist (Action Required)

### 1. GitHub Secrets Configuration
**Status**: ⏳ TODO  
**Time Estimate**: 5 minutes

- [ ] Go to GitHub Repository → Settings → Secrets and variables → Actions
- [ ] Add repository secret:
  - **Name**: `CRON_SECRET`
  - **Value**: `03728e6a0f4933afc9969b06299f5dbb9d8235fb12525c427d3bd4a29d7bd891`
- [ ] Verify workflow files exist:
  - `.github/workflows/coming-soon-day7.yml`
  - `.github/workflows/coming-soon-day48h.yml`

### 2. Production Deployment
**Status**: ⏳ TODO  
**Time Estimate**: 15 minutes

- [ ] Deploy latest code to production:
  ```bash
  git add .
  git commit -m "Add coming-soon cron jobs"
  git push
  ```
- [ ] Verify deployment succeeded on Render
- [ ] Test production endpoints:
  ```bash
  # Day 7 endpoint
  curl -X POST \
    -H "Authorization: Bearer YOUR_CRON_SECRET" \
    https://fashionmarketplace.store/api/cron/coming-soon-day7
  
  # 48-hour endpoint
  curl -X POST \
    -H "Authorization: Bearer YOUR_CRON_SECRET" \
    https://fashionmarketplace.store/api/cron/coming-soon-day48h
  ```

### 3. SendGrid Verification
**Status**: ⏳ TODO  
**Time Estimate**: 10 minutes

- [ ] Verify SendGrid API key is valid
- [ ] Check email template rendering
- [ ] Test subscription email:
  - [ ] Sign up on coming-soon page
  - [ ] Verify welcome email received
  - [ ] Verify referral code generated
  - [ ] Verify share link works

### 4. Database Health Check
**Status**: ⏳ TODO  
**Time Estimate**: 5 minutes

- [ ] Verify MongoDB connection working
- [ ] Check ComingSoonEmail collection exists
- [ ] Check ComingSoonAnalytics collection exists
- [ ] Verify indexes are created

### 5. Analytics Dashboard Test
**Status**: ⏳ TODO  
**Time Estimate**: 5 minutes

- [ ] Test analytics API:
  ```bash
  curl -X GET \
    -H "Authorization: Bearer YOUR_CRON_SECRET" \
    https://fashionmarketplace.store/api/coming-soon/analytics
  ```
- [ ] Verify response includes:
  - totalPageViews
  - totalSignups
  - signupConversionRate
  - topReferrers

## 📅 Email Campaign Schedule

| Date | Campaign | Time (UTC) | Action |
|------|----------|-----------|--------|
| **Mar 8** | Day 7 Teaser | 09:00 | Automated via GitHub Actions |
| **Mar 13** | 48-Hour Urgency | 09:00 | Automated via GitHub Actions |
| **Mar 15** | Launch Notification | 09:00 | Automated via GitHub Actions |

### Manual Trigger (If Needed)
To manually trigger campaigns:
1. Go to GitHub Actions tab
2. Select workflow (e.g., "Send Day 7 Teaser Email Campaign")
3. Click "Run workflow" → "Run workflow"

## 🔍 Testing Checklist

### Coming-Soon Page
- [ ] Page loads without errors
- [ ] Countdown timer shows correct time remaining
- [ ] Email input field works
- [ ] Subscribe button submits form
- [ ] Success message appears after subscribe
- [ ] Referral URL is displayed
- [ ] Copy button copies URL to clipboard
- [ ] Social share buttons work (Twitter, Facebook, Email)
- [ ] Page is mobile responsive
- [ ] OG image appears in social preview

### Email Sending
- [ ] Day 1: Welcome email sent
- [ ] Day 7: Teaser email sent (test on March 8)
- [ ] Day 48h: Urgency email sent (test on March 13)
- [ ] Launch: Final email sent (test on March 15)

### Referral System
- [ ] New subscriber gets unique code
- [ ] Referral URL includes ?ref= parameter
- [ ] Referral link tracks in analytics
- [ ] Top referrers show in admin dashboard

### Analytics
- [ ] Page views tracked (silent)
- [ ] Signups tracked with conversion rate
- [ ] Referrals tracked and ranked
- [ ] Admin dashboard accessible with Bearer token

## 🚨 Rollback Plan

If you need to cancel/pause campaigns before launch:

1. **Disable workflows**:
   ```bash
   # In GitHub Actions, disable the workflow from running
   git rm .github/workflows/coming-soon-day7.yml
   git rm .github/workflows/coming-soon-day48h.yml
   git commit -m "Disable coming-soon campaigns"
   git push
   ```

2. **Stop accepting signups**:
   - Modify subscribe endpoint to return error
   - Or set coming-soon page to redirect

3. **Cancel scheduled emails**:
   - GitHub Actions → Disable workflows
   - Or delete workflow files

## 📊 Post-Launch Tasks

### Day of Launch (March 15)
- [ ] Monitor email delivery in SendGrid
- [ ] Check analytics dashboard for signup surge
- [ ] Verify payment system activation
- [ ] Monitor site performance

### After Launch (March 16+)
- [ ] Archive coming-soon endpoints
- [ ] Move analytics data for historical reference
- [ ] Delete coming-soon lambda/cron jobs
- [ ] Capture launch metrics for reporting

## 🎯 Success Metrics to Track

- **Total Signups**: Target 200+ by launch
- **Referral Rate**: Track % who use ?ref= link
- **Email Open Rates**: Monitor via SendGrid dashboard
- **Page-to-Signup Conversion**: Track in analytics
- **Top Referrers**: Identify brand ambassadors

## ✉️ Key Contacts

- **SendGrid Support**: support@sendgrid.com
- **MongoDB Support**: support.mongodb.com
- **GitHub Actions Issues**: Via GitHub Issues
- **Render Deployment**: dashboard.render.com

## 📝 Notes

- CRON_SECRET should NOT be committed to repository
- All timestamps use UTC (adjust for your timezone)
- SendGrid API key must be verified sender
- Database URLs must be production-grade connections
- Monitor API rate limits during high-traffic moments

---

**Last Updated**: February 24, 2026  
**Status**: Ready for deployment ✅  
**Next Steps**: Follow pre-launch checklist above
