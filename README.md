# Сколько стоят деньги

PWA для личного финансового учета. Эта версия пересобрана на React, Vite, TypeScript и Supabase вместо Google Sheets / Apps Script.

## Стек

- React + Vite + TypeScript
- Supabase Auth, Postgres, RLS
- Mobile-first CSS без UI-фреймворка, чтобы сохранить плотный Apple-like интерфейс
- PWA manifest + service worker для offline shell
- Local cache и pending mutations queue в `localStorage`

## Установка

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase

1. Создайте проект в Supabase.
2. Включите Email Auth. Можно использовать email/password или magic link.
3. Примените миграцию из `supabase/migrations/202605060001_initial_schema.sql` через SQL Editor или Supabase CLI.
4. Добавьте переменные окружения:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Миграция создает таблицы `profiles`, `operations`, `categories`, `accounts`, `goals`, индексы, `updated_at` triggers и RLS policies. Пользователь может читать и менять только записи со своим `user_id`.

## Локальный запуск

```bash
npm run dev
```

Откройте URL из терминала, обычно `http://localhost:5173`.

## Сборка

```bash
npm run build
```

## Деплой на Vercel

1. Импортируйте репозиторий в Vercel.
2. Framework preset: Vite.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Добавьте `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` в Environment Variables.

## Миграция старых данных

Старые данные из Google Sheets можно экспортировать в CSV и привести к полям:

- операции: `type`, `amount`, `category_name`, `account_name`, `date`, `comment`
- цели: `name`, `target`, `current`

Категории и счета создаются автоматически при первом входе пользователя, если их еще нет.

## Offline-first

Приложение сначала показывает локальный кеш, затем синхронизируется с Supabase. Новые операции, категории и цели появляются в UI мгновенно. Если сети нет, мутация остается в локальной очереди и отправляется при восстановлении соединения.
