# Student Life OS - Web Dashboard

Next.js 14 + Tailwind + React frontend for the Student Life OS timetable system.

## Structure

```
web/
├── app/
│   ├── api/
│   │   ├── timetable/
│   │   │   ├── route.ts      # GET /api/timetable
│   │   │   └── sync/
│   │   │       └── route.ts  # POST /api/timetable/sync
│   ├── page.tsx              # Dashboard page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── Dashboard.tsx         # Main layout
│   ├── Timetable.tsx         # Weekly timetable view
│   ├── QuickActions.tsx      # Action buttons
│   └── MiniTodo.tsx          # Task list
├── lib/
│   └── prisma.ts             # Prisma client
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Setup

```bash
cd web
npm install
```

Create `.env.local`:
```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/ensam_lise?schema=public"
```

## Run

```bash
npm run dev
```

Dashboard: http://localhost:3001
