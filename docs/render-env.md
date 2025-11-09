# Render deployment: environment variables checklist

Add these environment variables to your Render service (Web Service / Static + API) or the managed environment you use.

Required environment variables
- DATABASE_URL — your MongoDB connection string
- NEXTAUTH_URL — your app base URL (e.g. https://your-app.onrender.com)
- NEXTAUTH_SECRET — next-auth secret
- REDIS_URL — Redis connection string (example: redis://:<PASSWORD>@your-redis-host:6379 or redis://localhost:6379 for local)
- SENDGRID_API_KEY — SendGrid API key (or leave empty if using SMTP fallback)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS — SMTP fallback credentials (optional)
- STRIPE_SECRET_KEY — Stripe secret key
- PAYSTACK_SECRET_KEY — Paystack secret key
- CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET — Cloudinary creds

Optional / recommended
- SENTRY_DSN — Sentry DSN for error reporting
- NODE_ENV — production

Notes
- For Render, set REDIS_URL to the Redis instance URL provided by your Redis add-on or external provider. Example formats:
  - Unauthenticated local/dev: redis://localhost:6379
  - With password: redis://:password@redis.example.com:6379

- Do NOT commit real secrets to the repository `.env`; use Render's dashboard or secret manager to set these values.
