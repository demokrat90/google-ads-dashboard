# System Patterns

## Архитектура (текущая — Express)

```
┌─────────────────────────────────────────────────────────────┐
│                     VPS Hostinger                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Node.js приложение                       │  │
│  │                                                       │  │
│  │  server.js ─────► routes/ ─────► views/ (EJS)        │  │
│  │       │              │                                │  │
│  │       │         services/                             │  │
│  │       │         ├── database.js (SQLite)              │  │
│  │       │         ├── mysql.js (внешняя БД)             │  │
│  │       │         ├── amocrm.js (API)                   │  │
│  │       │         ├── sync.js (cron задачи)             │  │
│  │       │         └── weekHelper.js (сб-пт)             │  │
│  │       │                                               │  │
│  │  node-cron ─── каждый час: sync amoCRM               │  │
│  │             └── каждую ночь: update history           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────┐        ┌───────────┐        ┌──────────┐
   │  Google  │        │  amoCRM   │        │  MySQL   │
   │   Ads    │        │   API     │        │ Hostinger│
   │ Scripts  │        │           │        │          │
   └──────────┘        └───────────┘        └──────────┘
```

---

## Архитектура (планируемая — Next.js + Vercel)

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Next.js 14 (App Router)                  │  │
│  │                                                       │  │
│  │  app/                                                 │  │
│  │  ├── layout.tsx ────► components/                    │  │
│  │  ├── page.tsx                                        │  │
│  │  ├── login/page.tsx                                  │  │
│  │  ├── ads/page.tsx ─────► Server Components           │  │
│  │  ├── developers/page.tsx                             │  │
│  │  └── api/                                            │  │
│  │      ├── auth/[...nextauth]/route.ts                 │  │
│  │      ├── webhook/google-ads/route.ts                 │  │
│  │      └── cron/                                       │  │
│  │          ├── sync-amocrm/route.ts                    │  │
│  │          └── update-history/route.ts                 │  │
│  │                                                       │  │
│  │  lib/                                                │  │
│  │  ├── db-main.ts (застройщики — только чтение)        │  │
│  │  ├── db-dashboard.ts (ads/leads — чтение/запись)     │  │
│  │  ├── amocrm.ts                                       │  │
│  │  └── week-helper.ts                                  │  │
│  │                                                       │  │
│  │  Vercel Cron ─── каждый час: /api/cron/sync-amocrm   │  │
│  │               └── каждую ночь: /api/cron/update-hist │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
   ┌──────────┐        ┌───────────┐        ┌──────────┐
   │  Google  │        │  amoCRM   │        │  MySQL   │
   │   Ads    │        │   API     │        │ Hostinger│
   │ Scripts  │        │           │        │ 2 базы   │
   └──────────┘        └───────────┘        └──────────┘
```

---

## Потоки данных

### Google Ads → Приложение
1. Google Ads Script запускается каждый час
2. Собирает кампании, группы, расход
3. POST на `/webhook/google-ads` (или `/api/webhook/google-ads`)
4. Сохраняется в таблицу `google_ads_daily`

### amoCRM → Приложение
1. Cron каждый час вызывает синхронизацию
2. GET `/api/v4/leads` с фильтром по дате
3. Фильтрует только лиды с UTM-метками
4. Проверяет тег "At work" для квалификации
5. Сохраняется в таблицу `amocrm_leads`

### MySQL → Страница застройщиков
1. Прямой запрос при открытии страницы
2. JOIN projects + units для подсчёта
3. Сортировка по количеству юнитов DESC

---

## Структура недель

- Неделя: суббота 00:00 → пятница 23:59
- Текущая неделя обновляется каждый час
- Последние 8 недель обновляются каждую ночь
- После 8 недель — архив (не обновляется)

---

## Авторизация

### Express (текущая)
- Логин/пароль из .env
- express-session хранит сессию в памяти
- Middleware `requireAuth` проверяет

### Next.js (планируемая)
- NextAuth.js с Credentials Provider
- JWT токены (stateless)
- Middleware защищает роуты /ads и /developers

---

## Паттерны кода

### Express — database.js (sql.js wrapper)
```javascript
db.prepare(sql).all(params)  // SELECT multiple
db.prepare(sql).run(params)  // INSERT/UPDATE
db.prepare(sql).get(params)  // SELECT single row
db.saveDatabase()            // сохранить на диск
```

### Next.js — lib/db-*.ts (mysql2/promise)
```typescript
const conn = await getDashboardConnection();
try {
  const [rows] = await conn.execute(sql, params);
  return rows;
} finally {
  await conn.end();  // всегда закрывать!
}
```

### Express — routes
```javascript
router.get('/', async (req, res) => {
    const data = await getData();
    res.render('page', { data });
});
```

### Next.js — Server Components
```typescript
export default async function Page() {
  const data = await getData();  // прямо в компоненте
  return <div>{/* JSX */}</div>;
}
```
