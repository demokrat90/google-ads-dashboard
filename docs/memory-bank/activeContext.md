# Active Context

## Текущее состояние

**Next.js версия** — продакшен на Vercel: https://ads-dashboard-next.vercel.app

**Express версия** — legacy, можно удалить

**Статус:** ✅ Всё работает!

---

## Как запустить

### Next.js (продакшен)

```bash
cd "D:\google ads\ads-dashboard-next"
npm run dev      # локально
npx vercel --prod  # деплой
```

Логин: admin / admin123

---

## Структура Next.js проекта

```
ads-dashboard-next/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx              # → redirect /ads
│   ├── login/page.tsx
│   ├── ads/
│   │   ├── page.tsx          # Server component (данные)
│   │   └── AdsTable.tsx      # Client component (интерактив)
│   ├── developers/
│   │   ├── page.tsx          # Server component
│   │   └── DevelopersClient.tsx  # Client component
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── webhook/google-ads/route.ts
│       ├── developers/favorites/route.ts
│       ├── sync-now/route.ts     # Ручная синхронизация
│       ├── sync-week/route.ts    # Синхронизация периода
│       └── cron/
│           ├── sync-amocrm/route.ts
│           └── update-history/route.ts
├── components/
│   ├── AuthProvider.tsx
│   └── Header.tsx
├── lib/
│   ├── db-main.ts            # Застройщики (SELECT only)
│   ├── db-dashboard.ts       # Dashboard (CRUD)
│   ├── amocrm.ts             # amoCRM API (GET only)
│   └── week-helper.ts        # Неделя сб-пт
├── middleware.ts
├── vercel.json
└── .env.local
```

---

## Компонент AdsTable.tsx

Клиентский компонент с интерактивностью:

**Режимы отображения:**
- "Все" — кампании с группами объявлений (сворачиваемые)
- "Только кампании" — итоги по кампаниям

**Функции:**
- Переключатель режимов
- Кнопки "Развернуть все / Свернуть все"
- Сворачивание кампаний (▼/▶)
- Кампания + первая группа в одной строке
- Лиды показываются на уровне групп объявлений

---

## Google Ads Script

Файл: `google-ads-script.js`

**Логика:**
1. Вычисляет текущую неделю (суббота - пятница)
2. Собирает данные за всю неделю (формат YYYYMMDD для API)
3. Отправляет на webhook с weekStart/weekEnd (формат yyyy-MM-dd)
4. Рекомендуемое расписание: **раз в день**

**Webhook логика:**
1. Удаляет все данные за период weekStart - weekEnd
2. Записывает только группы объявлений (не кампании отдельно)
3. Расход кампании = сумма её групп (вычисляется на лету)

---

## Endpoints

| URL | Метод | Назначение |
|-----|-------|-----------|
| `/login` | GET | Страница входа |
| `/ads` | GET | Google Ads + amoCRM (валюта AED) |
| `/developers` | GET | Застройщики |
| `/api/auth/*` | * | NextAuth |
| `/api/webhook/google-ads` | POST | Webhook (weekStart, weekEnd, campaigns) |
| `/api/developers/favorites` | POST | Сохранить избранных |
| `/api/sync-now` | GET | Ручная синхронизация amoCRM |
| `/api/sync-week` | GET | Синхронизация за период (?start=&end=) |
| `/api/cron/sync-amocrm` | GET | Cron: ежечасная синхронизация лидов |
| `/api/cron/update-history` | GET | Cron: история недель (3:00 UTC) |

---

## Архитектура баз данных

```
┌──────────────────────────────────────────────────────────────┐
│                      MySQL Hostinger                          │
│                                                              │
│  ┌─────────────────────────┐    ┌─────────────────────────┐  │
│  │  u416850077_geniemap    │    │  u416850077_google_ads  │  │
│  │  (только чтение)        │    │  (чтение/запись)        │  │
│  │                         │    │                         │  │
│  │  - developers           │    │  - google_ads_daily     │  │
│  │  - projects             │    │  - amocrm_leads         │  │
│  │  - units                │    │  - tilda_leads          │  │
│  │                         │    │  - weeks_history        │  │
│  │                         │    │  - favorite_developers  │  │
│  └─────────────────────────┘    └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**amocrm_leads** — лиды с UTM-метками:
- campaign_id, adgroup_id — извлекаются из UTM
- Группируются по adgroup_id для отображения лидов групп

**tilda_leads** — лиды Tilda без UTM-меток

**google_ads_daily** — хранит только группы объявлений:
- Кампания без групп → одна строка с adgroup_id = NULL
- Кампания с группами → только строки групп (adgroup_id != NULL)
- Расход кампании вычисляется как SUM(cost) её групп

---

## Гарантии безопасности

| Система | Доступ | Подтверждено |
|---------|--------|--------------|
| amoCRM | Только GET | ✅ В коде только `axios.get` |
| Застройщики БД | Только SELECT | ✅ В `db-main.ts` только SELECT |
| Dashboard БД | CRUD | ✅ Все изменения только здесь |

---

## Следующие задачи

1. **Сопоставление кампаний с застройщиками** — связать названия кампаний Google Ads с застройщиками/проектами из БД
2. Авторизация через Telegram
3. Мобильная адаптация
