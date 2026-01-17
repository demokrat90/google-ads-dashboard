# Google Ads Dashboard

Dashboard для отслеживания расходов Google Ads и лидов из amoCRM.

## Production

**URL:** https://ads-dashboard-next.vercel.app

## Stack

- Next.js 16 + TypeScript
- Vercel (hosting, cron jobs)
- MySQL (Hostinger)
- amoCRM API
- NextAuth (authentication)

## Features

- Google Ads costs tracking (via webhook)
- amoCRM leads sync (hourly cron)
- Campaign-level analytics with CPL/CPQL
- Week navigation (Sat-Fri weeks)
- Developers page with favorites

## Data Flow

```
Google Ads Script → POST /api/webhook/google-ads → MySQL
amoCRM API ← Vercel Cron hourly → MySQL
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/api/sync-now` | Manual sync current week |
| `/api/sync-week?start=YYYY-MM-DD&end=YYYY-MM-DD` | Sync custom period |
| `/api/cron/sync-amocrm` | Cron: hourly amoCRM sync |
| `/api/webhook/google-ads` | Google Ads Script webhook |

## Environment Variables

```env
# Main DB (read-only)
MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE

# Dashboard DB (read/write)
DASHBOARD_MYSQL_HOST, DASHBOARD_MYSQL_USER, DASHBOARD_MYSQL_PASSWORD, DASHBOARD_MYSQL_DATABASE

# amoCRM
AMOCRM_DOMAIN, AMOCRM_ACCESS_TOKEN, AMOCRM_QUALIFIED_TAG

# Auth
NEXTAUTH_SECRET, NEXTAUTH_URL, USERS

# Webhooks
GOOGLE_ADS_WEBHOOK_SECRET, CRON_SECRET
```

## Development

```bash
npm install
npm run dev
```

## Deploy

```bash
vercel --prod
```
