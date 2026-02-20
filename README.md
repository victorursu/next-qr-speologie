# Speologie QR

Next.js app for managing QR codes and assigning redirect URLs. QR codes are stored in Supabase.

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run migrations in order:
   - `supabase/migrations/001_create_speologieqr.sql`
   - `supabase/migrations/002_caves_and_rename.sql`

### 2. Environment

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.example .env.local
```

Get your URL and anon key from: **Supabase Dashboard → Project Settings → API**

### 3. Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

- **List** – View all QR codes at `/qr`
- **Create** – Add new QR codes at `/qr/new` (slug auto-generated, cave lookup by title)
- **Edit** – Update slug and cave at `/qr/[id]/edit`
- **Delete** – Remove QR codes from the list view
- **Cave autocomplete** – Search caves by title (diacritics ignored, e.g. "Petera" matches "Peştera")

## Database

**speologieqr**

| Column     | Type        | Description                    |
|------------|-------------|--------------------------------|
| id         | UUID        | Primary key (auto)             |
| slug       | TEXT        | Unique path, e.g. `speologie/qr/abc123` |
| caves_id   | UUID        | FK to speologiepesteri         |
| created_at | TIMESTAMPTZ | Auto-set on insert             |
| updated_at | TIMESTAMPTZ | Auto-updated on change         |

**speologiepesteri** (caves)

| Column     | Type        | Description    |
|------------|-------------|----------------|
| id         | UUID        | Primary key    |
| title      | TEXT        | Cave name      |

## API

- `GET /api/qr` – List all (includes cave title)
- `POST /api/qr` – Create (body: `{ caves_id }`)
- `GET /api/qr/[id]` – Get one
- `PUT /api/qr/[id]` – Update (body: `{ slug?, caves_id? }`)
- `DELETE /api/qr/[id]` – Delete
- `GET /api/caves?q=...` – Search caves by title (diacritic-insensitive)
