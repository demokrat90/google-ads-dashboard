# Technical Context

## Стек

### Next.js (основной)

| Технология | Версия | Назначение |
|------------|--------|------------|
| Next.js | 16.1.2 | App Router, Server Components |
| React | 19 | UI |
| TypeScript | 5 | Типизация |
| NextAuth | 4 | Авторизация (JWT) |
| mysql2 | 3 | MySQL драйвер |
| axios | 1 | HTTP клиент для amoCRM |

### Express (legacy, можно удалить)

| Технология | Назначение |
|------------|------------|
| Express | Веб-сервер |
| EJS | Шаблоны |
| sql.js | SQLite (локальный кеш) |
| node-cron | Планировщик |

---

## Базы данных

### MySQL на Hostinger

**Host:** `srv2072.hstgr.io`

| База | Пользователь | Назначение | Статус |
|------|--------------|------------|--------|
| `u416850077_geniemap` | `u416850077_demokrat90` | Застройщики (RO) | ✅ Работает |
| `u416850077_google_ads` | `u416850077_admin` | Dashboard (RW) | ✅ Работает |

### Таблицы u416850077_geniemap (только чтение)

```sql
developers (496 записей)
  - id, name

projects (2291 записей)
  - id, name, developer_id, status

units (35211 записей)
  - id, project_id, status, price, area
```

### Таблицы u416850077_google_ads (чтение/запись)

```sql
google_ads_daily
  - date              # Дата начала недели (weekStart)
  - campaign_id, campaign_name
  - adgroup_id, adgroup_name  # NULL если кампания без групп
  - language
  - cost, impressions, clicks

amocrm_leads
  - lead_id, created_date
  - campaign_id, adgroup_id    # Извлекаются из UTM
  - utm_source, utm_medium, utm_campaign, utm_content, utm_term
  - is_qualified

tilda_leads
  - lead_id, created_date
  - utm_source, utm_medium, utm_campaign, utm_content, utm_term
  - is_qualified
  # Для лидов Tilda без UTM-меток

weeks_history
  - week_start, week_end
  - total_cost, total_leads, total_qualified

favorite_developers
  - developer_id
```

**Важно:**
- В `google_ads_daily` хранятся только группы объявлений. Расход кампании = SUM(cost) её групп.
- В `amocrm_leads` campaign_id и adgroup_id извлекаются из UTM-меток

---

## Извлечение ID из UTM

**utm_campaign:** `cid|21491555171|search`
- Формат: `cid|CAMPAIGN_ID|type`
- Regex: `/cid\|(\d+)\|/`

**utm_content:** `gid|165892365100|aid|706432861320|placement|`
- Формат: `gid|ADGROUP_ID|aid|AD_ID|placement|`
- Regex: `/gid\|(\d+)\|/`

---

## Интеграции

### Google Ads Scripts

- **Не API!** Developer Token не получен
- Скрипт в Google Ads отправляет POST на webhook
- Файл: `google-ads-script.js`
- Webhook: `/api/webhook/google-ads`
- Расписание: **раз в день**

**Формат данных:**
```javascript
{
  weekStart: "2026-01-11",  // суббота
  weekEnd: "2026-01-17",    // пятница
  campaigns: [
    {
      id: "123",
      name: "Campaign Name",
      language: "EN",
      cost: 1000.50,
      impressions: 5000,
      clicks: 150,
      adGroups: [
        { id: "456", name: "Ad Group", cost: 500, ... }
      ]
    }
  ]
}
```

**Два формата даты в скрипте:**
- `YYYYMMDD` — для Google Ads API (`getStatsFor`)
- `yyyy-MM-dd` — для webhook и БД

### amoCRM API

- OAuth 2.0, долгосрочный токен (до 5 лет)
- Домен: `metrikarealestatebrokerage.amocrm.ru`
- **Только GET запросы** — чтение лидов
- Квалифицированные по тегу "At work"
- Синхронизация: **ежечасно**

**Источники лидов:**
- `Tilda Publishing` — лиды с сайта (могут быть с/без UTM)
- `Albato` — интеграции (обычно без UTM)

---

## Environment Variables

### .env.local (Next.js)

```env
# Основная БД (только чтение)
MYSQL_HOST=srv2072.hstgr.io
MYSQL_USER=u416850077_demokrat90
MYSQL_PASSWORD=***
MYSQL_DATABASE=u416850077_geniemap

# Dashboard БД (чтение/запись)
DASHBOARD_MYSQL_HOST=srv2072.hstgr.io
DASHBOARD_MYSQL_USER=u416850077_admin
DASHBOARD_MYSQL_PASSWORD=***
DASHBOARD_MYSQL_DATABASE=u416850077_google_ads

# amoCRM
AMOCRM_DOMAIN=metrikarealestatebrokerage.amocrm.ru
AMOCRM_ACCESS_TOKEN=***
AMOCRM_QUALIFIED_TAG=At work

# Auth
NEXTAUTH_SECRET=***
NEXTAUTH_URL=http://localhost:3000
USERS=admin:admin123

# Webhooks
GOOGLE_ADS_WEBHOOK_SECRET=gads_wh_8kT4mN2xR7vL9pQ3
CRON_SECRET=cron_9xR2mK5pL7tW4vN8
```

---

## Vercel Cron Jobs

Файл: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-amocrm",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/update-history",
      "schedule": "0 3 * * *"
    }
  ]
}
```

- `sync-amocrm` — **каждый час**, синхронизация лидов
- `update-history` — в 3:00 UTC, обновление истории недель

---

## Особенности

### Неделя

Бизнес-неделя: **суббота 00:00 → пятница 23:59**
- Реализация в Next.js: `lib/week-helper.ts`
- Реализация в Google Ads Script: функция `getCurrentWeek()`

### Валюта

**AED (дирхамы ОАЭ)** — используется везде в интерфейсе.
Google Ads кабинет в дирхамах, конвертация не требуется.

### Хранение данных Google Ads

- Хранятся **только группы объявлений** (не кампании отдельно)
- Расход кампании вычисляется как сумма её групп
- При каждом запуске скрипта данные за неделю **перезаписываются**
- Это позволяет видеть актуальные данные при ежедневном обновлении

### Компонентная архитектура /ads

- `page.tsx` — Server Component (загрузка данных из БД)
- `AdsTable.tsx` — Client Component (интерактивность)
- Данные передаются через props

### Windows

- Порт 3000 может зависнуть: `npx kill-port 3000`
- better-sqlite3 заменён на sql.js (в legacy Express)

### Vercel

- Serverless — нет постоянного процесса
- Сессии через JWT (stateless)
- MySQL без пула (новое соединение на каждый запрос)
- Деплой: `npx vercel --prod`

### Next.js 16

- Предупреждение о middleware deprecation — не критично
- App Router + Server Components
- `export const dynamic = 'force-dynamic'` для SSR страниц
