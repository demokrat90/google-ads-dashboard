# Codebase Structure

## Текущий проект (Express)

```
D:\google ads\
│
├── server.js                 # Главный файл сервера
├── package.json              # Зависимости npm
├── .env                      # Конфигурация (секреты!)
├── .env.example              # Пример конфигурации
├── google-ads-script.js      # Скрипт для Google Ads (копировать туда)
│
├── routes/
│   ├── auth.js               # /login, /logout
│   ├── ads.js                # /ads - страница Google Ads
│   ├── developers.js         # /developers - застройщики
│   └── webhook.js            # /webhook/google-ads - приём данных
│
├── services/
│   ├── database.js           # SQLite (sql.js) - локальный кеш
│   ├── mysql.js              # MySQL - застройщики/проекты
│   ├── amocrm.js             # amoCRM API - лиды
│   ├── sync.js               # Cron синхронизация
│   └── weekHelper.js         # Работа с неделями (сб-пт)
│
├── views/
│   ├── login.ejs             # Страница входа
│   ├── ads.ejs               # Таблица кампаний
│   ├── developers.ejs        # Таблица застройщиков
│   └── layout.ejs            # Общий layout (не используется)
│
├── public/
│   └── css/
│       └── style.css         # Все стили
│
├── data/
│   └── dashboard.db          # SQLite база (создаётся автоматически)
│
└── docs/
    ├── MIGRATION_NEXTJS_VERCEL.md  # План миграции с кодом
    ├── plans/
    │   └── 2026-01-16-ads-dashboard-design.md
    └── memory-bank/
        ├── projectbrief.md
        ├── techContext.md
        ├── systemPatterns.md
        ├── progress.md
        ├── activeContext.md
        └── codebaseStructure.md (этот файл)
```

---

## Планируемый проект (Next.js)

```
D:\google ads\ads-dashboard-next\
│
├── app/
│   ├── globals.css           # Глобальные стили
│   ├── layout.tsx            # Главный layout
│   ├── page.tsx              # Редирект на /ads
│   ├── login/
│   │   └── page.tsx          # Страница входа
│   ├── ads/
│   │   └── page.tsx          # Google Ads + amoCRM
│   ├── developers/
│   │   └── page.tsx          # Застройщики
│   └── api/
│       ├── auth/[...nextauth]/
│       │   └── route.ts      # NextAuth API
│       ├── webhook/google-ads/
│       │   └── route.ts      # Webhook для скрипта
│       ├── developers/favorites/
│       │   └── route.ts      # Сохранить избранных
│       └── cron/
│           ├── sync-amocrm/
│           │   └── route.ts  # Cron: синхронизация
│           └── update-history/
│               └── route.ts  # Cron: история
│
├── lib/
│   ├── db-main.ts            # MySQL основная (только чтение)
│   ├── db-dashboard.ts       # MySQL dashboard (чтение/запись)
│   ├── amocrm.ts             # amoCRM API
│   └── week-helper.ts        # Хелперы недель
│
├── components/
│   ├── Header.tsx            # Шапка сайта
│   └── AuthProvider.tsx      # Обёртка NextAuth
│
├── middleware.ts             # Защита роутов
├── vercel.json               # Конфиг Vercel + Cron
├── .env.local                # Переменные окружения
├── package.json
└── tsconfig.json
```

---

## Ключевые файлы (Express)

### server.js
- Инициализация Express
- Подключение routes
- Cron задачи (каждый час, каждую ночь)
- Запуск сервера

### services/database.js
- Обёртка над sql.js для совместимости с better-sqlite3 API
- Методы: prepare(), run(), get(), all(), saveDatabase()
- Таблицы: google_ads_daily, amocrm_leads, weeks_history, favorite_developers

### services/mysql.js
- getAllDevelopers() - список застройщиков
- getProjectsByDeveloper(id) - проекты с подсчётом юнитов
- Сортировка по units_count DESC

### services/amocrm.js
- getProcessedLeads(from, to) - лиды с UTM за период
- extractUtmFromLead() - парсинг UTM из кастомных полей
- isQualified() - проверка тега

### google-ads-script.js
- Для копирования в Google Ads
- main() - сбор и отправка данных
- testWebhook() - тестовая функция

---

## Ключевые файлы (Next.js)

### lib/db-main.ts
- getMainConnection() - подключение к основной БД
- getAllDevelopers() - список застройщиков
- getProjectsByDeveloper(id) - проекты

### lib/db-dashboard.ts
- getDashboardConnection() - подключение к dashboard БД
- getAdsDataForWeek() - данные Google Ads
- getLeadsForWeek() - лиды amoCRM
- saveGoogleAdsData() - сохранить данные webhook
- saveAmoCRMLead() - сохранить лид
- getFavoriteDevelopers() / saveFavoriteDevelopers()

### lib/amocrm.ts
- getProcessedLeads(from, to) - лиды с UTM

### lib/week-helper.ts
- getCurrentWeekInfo() - текущая неделя
- getPreviousWeeks(count) - предыдущие недели
- formatWeekRange() - форматирование

### app/api/auth/[...nextauth]/route.ts
- NextAuth конфигурация
- Credentials Provider

### middleware.ts
- Защита /ads и /developers
