# Cron Jobs Configuration Guide

## Overview

The coming-soon system uses automated cron jobs to send drip emails on specific dates. The system is configured to run on GitHub Actions.

## Schedule

| Date | Campaign | Time (UTC) | Email Template |
|------|----------|-----------|-----------------|
| March 8, 2026 | Day 7 Teaser | 09:00 | `sendDripEmail7Days` |
| March 13, 2026 | 48-Hour Urgency | 09:00 | `sendDripEmail48Hours` |
| March 15, 2026 | Launch Notification | 09:00 | `sendLaunchNotification` |

## GitHub Actions Setup

### 1. Add CRON_SECRET to GitHub Secrets

The workflows reference `${{ secrets.CRON_SECRET }}`. This needs to be configured in your GitHub repository:

1. Go to **GitHub Repository → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. **Name**: `CRON_SECRET`
4. **Value**: (Copy from your `.env` file)
   ```
   03728e6a0f4933afc9969b06299f5dbb9d8235fb12525c427d3bd4a29d7bd891
   ```
5. Click **Add secret**

### 2. Verify Workflow Files

The following workflow files have been created:
- `.github/workflows/coming-soon-day7.yml` - Day 7 campaign
- `.github/workflows/coming-soon-day48h.yml` - 48-hour campaign

The existing launch email workflow triggers on March 15.

### 3. Test Workflows (Optional)

You can manually trigger workflows for testing:

```bash
# Manually trigger Day 7 campaign
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://fashionmarketplace.store/api/cron/coming-soon-day7

# Manually trigger 48-hour campaign
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://fashionmarketplace.store/api/cron/coming-soon-day48h
```

Or using the GitHub Actions UI:
1. Go to **Actions** tab
2. Select the workflow
3. Click **Run workflow** → **Run workflow**

## Email Endpoints

### POST `/api/cron/coming-soon-day7`
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://fashionmarketplace.store/api/cron/coming-soon-day7
```

**Response**:
```json
{
  "message": "Day 7 campaign executed",
  "sent": 42,
  "failed": 0,
  "total": 42
}
```

### POST `/api/cron/coming-soon-day48h`
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://fashionmarketplace.store/api/cron/coming-soon-day48h
```

**Response**:
```json
{
  "message": "48-hour campaign executed",
  "sent": 42,
  "failed": 0,
  "total": 42
}
```

## Timezone Considerations

The cron schedules use **UTC time** (9 AM). Adjust as needed for your preferred timezone:

### Common Timezones (9 AM UTC equivalent):
- **EST (UTC-5)**: 4 AM
- **CST (UTC-6)**: 3 AM
- **PST (UTC-8)**: 1 AM
- **GMT (UTC+0)**: 9 AM
- **CET (UTC+1)**: 10 AM
- **EAT (UTC+3)**: 12 PM (noon)
- **WAT (UTC+1)**: 10 AM

To modify the cron time, edit the workflow files:
```yaml
on:
  schedule:
    - cron: '0 9 8 3 *'  # Change '0 9' for different time
```

Cron format: `minute hour day month day-of-week`

## Monitoring

### View Workflow Runs
1. Go to **Actions** tab in GitHub
2. Select the workflow you want to check
3. View run history and logs

### Check Email Logs in SendGrid
1. Go to SendGrid Dashboard
2. Email activity → check delivery status
3. Filter by status: "Delivered", "Bounced", "Failed"

### Manual Verification
Check if emails were sent by querying your database:

```bash
# Check ComingSoonEmail records
db.coming_soon_emails.find({ status: "ACTIVE" })

# Check ComingSoonAnalytics for email events
db.coming_soon_analytics.find({ action: "subscribe" })
```

## Alternative: Render Cron Jobs

If you prefer not to use GitHub Actions, Render provides built-in cron job support:

1. Go to **Render Dashboard**
2. **Create** → **Cron Job**
3. **Command**: 
   ```bash
   curl -X POST \
     -H "Authorization: Bearer $CRON_SECRET" \
     https://fashionmarketplace.store/api/cron/coming-soon-day7
   ```
4. **Schedule**: Set frequency (e.g., "Every day at 9:00 AM UTC")
5. **Add Environment Variables**: Add `CRON_SECRET`

## Troubleshooting

### Workflow Not Triggering
- **Check**: GitHub Actions are enabled in repository settings
- **Check**: Workflows have correct cron syntax
- **Check**: CRON_SECRET is set correctly in GitHub Secrets

### Emails Not Being Sent
- **Check**: SendGrid API key is valid (`SENDGRID_API_KEY`)
- **Check**: Email template is being rendered correctly
- **Check**: Subscribers exist in database (`status: "ACTIVE"`)
- **Check**: Workflow run logs show successful HTTP 200 response

### Rate Limiting Issues
If sending to many subscribers at once and hitting limits:
1. Batch emails in chunks (modify endpoint logic)
2. Add delays between sends
3. Increase SendGrid API rate limit tier

## Rollback Plan

If you need to stop campaigns:
1. Disable workflows in GitHub Actions
2. Or delete the workflow files
3. Or set workflow to `if: false`

## Post-Launch

After March 15, 2026, you can:
1. Delete the workflow files
2. Archive the coming-soon endpoints
3. Keep analytics data for future reference

---

**Last Updated**: February 24, 2026  
**Launch Date**: March 15, 2026  
**Status**: ✅ Ready for deployment
