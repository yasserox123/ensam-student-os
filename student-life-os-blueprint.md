# Student Life OS — ENSAM Edition · Developer Blueprint

## 1. PROJECT STRUCTURE

```
student-life-os/
├── apps/
│   ├── web/                          # Next.js 14 App Router
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx        # sidebar + nav shell
│   │   │   │   ├── page.tsx          # /dashboard (home)
│   │   │   │   ├── timetable/page.tsx
│   │   │   │   ├── courses/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── tasks/page.tsx
│   │   │   │   ├── notes/page.tsx
│   │   │   │   └── analytics/page.tsx
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/route.ts
│   │   │   │   │   ├── logout/route.ts
│   │   │   │   │   └── refresh/route.ts
│   │   │   │   ├── timetable/route.ts
│   │   │   │   ├── courses/route.ts
│   │   │   │   ├── tasks/route.ts
│   │   │   │   ├── notes/route.ts
│   │   │   │   └── sync/route.ts     # manual trigger
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # primitives (button, badge, card)
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── QuickActions.tsx
│   │   │   ├── timetable/
│   │   │   │   ├── TimetableGrid.tsx
│   │   │   │   ├── TimetableCell.tsx
│   │   │   │   └── WeekNavigator.tsx
│   │   │   ├── courses/
│   │   │   │   ├── CourseCard.tsx
│   │   │   │   └── CourseProgress.tsx
│   │   │   ├── tasks/
│   │   │   │   ├── TaskManager.tsx
│   │   │   │   ├── TaskRow.tsx
│   │   │   │   └── PomodoroTimer.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── RadarChart.tsx
│   │   │   │   └── WorkloadBar.tsx
│   │   │   └── dashboard/
│   │   │       ├── MiniTodo.tsx
│   │   │       ├── ReminderPanel.tsx
│   │   │       └── GoalTracker.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts         # typed fetch wrappers
│   │   │   ├── auth.ts               # session helpers (iron-session)
│   │   │   └── date.ts               # timetable date utils
│   │   ├── hooks/
│   │   │   ├── useTimetable.ts
│   │   │   ├── useTasks.ts
│   │   │   └── useSync.ts
│   │   └── store/
│   │       └── useAppStore.ts        # Zustand global state
│   │
│   └── worker/                       # Background job process
│       ├── index.ts                  # BullMQ worker entrypoint
│       ├── jobs/
│       │   ├── syncTimetable.ts
│       │   ├── syncCourses.ts
│       │   └── refreshSession.ts
│       └── queue.ts                  # queue definitions
│
├── packages/
│   ├── db/                           # Prisma
│   │   ├── prisma/schema.prisma
│   │   ├── migrations/
│   │   └── index.ts                  # db client export
│   ├── ensam/                        # ENSAM integration layer
│   │   ├── auth.ts                   # login, session acquire
│   │   ├── timetable.ts              # timetable fetch + parse
│   │   ├── courses.ts                # course/module fetch
│   │   ├── parser.ts                 # HTML → structured data
│   │   ├── session.ts                # session cookie mgmt
│   │   └── playwright.ts             # headless fallback
│   └── crypto/
│       └── index.ts                  # AES-256-GCM encrypt/decrypt
│
├── docker-compose.yml                # postgres + redis local
├── .env.example
├── turbo.json                        # Turborepo
└── package.json
```

---

## 2. DATABASE SCHEMA (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String       @id @default(cuid())
  email             String       @unique
  ensamLogin        String       @unique              // ENSAM username
  encryptedPassword String                            // AES-256-GCM ciphertext
  passwordIv        String                            // IV for decryption
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  sessions          EnsamSession[]
  courses           Course[]
  timetableSlots    TimetableSlot[]
  assignments       Assignment[]
  tasks             Task[]
  notes             Note[]
  pomodoroSessions  PomodoroSession[]

  @@index([email])
}

model EnsamSession {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  cookieData   String    // encrypted session cookie blob
  expiresAt    DateTime
  platform     String    // "lise" | "savoir"
  createdAt    DateTime  @default(now())

  @@index([userId, platform])
}

model Course {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  ensamId      String                               // ID from ENSAM platform
  name         String
  code         String
  color        String    @default("#1D9E75")        // UI color
  professor    String?
  credits      Int?
  semester     String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  assignments  Assignment[]
  timetableSlots TimetableSlot[]
  notes        Note[]

  @@unique([userId, ensamId])
  @@index([userId])
}

model TimetableSlot {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId   String?
  course     Course?   @relation(fields: [courseId], references: [id])
  dayOfWeek  Int                                    // 1=Mon, 5=Fri
  startTime  String                                 // "08:00"
  endTime    String                                 // "10:00"
  room       String?
  type       String    @default("LECTURE")          // LECTURE | TD | TP
  weekDate   DateTime                               // specific week start date
  createdAt  DateTime  @default(now())

  @@index([userId, weekDate])
}

model Assignment {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId    String
  course      Course    @relation(fields: [courseId], references: [id])
  title       String
  description String?
  dueDate     DateTime?
  status      String    @default("NOT_STARTED")    // NOT_STARTED | IN_PROGRESS | COMPLETED
  priority    String    @default("MEDIUM")          // LOW | MEDIUM | HIGH
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([userId, status])
  @@index([userId, dueDate])
}

model Task {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId    String?
  title       String
  completed   Boolean   @default(false)
  dueDate     DateTime?
  priority    String    @default("MEDIUM")
  isRelated   Boolean   @default(false)             // linked to course?
  createdAt   DateTime  @default(now())

  @@index([userId, completed])
}

model Note {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId  String?
  course    Course?  @relation(fields: [courseId], references: [id])
  title     String
  content   String                                   // markdown
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, courseId])
}

model PomodoroSession {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  courseId  String?
  duration  Int                                       // minutes
  completed Boolean  @default(false)
  startedAt DateTime @default(now())

  @@index([userId, startedAt])
}

model SyncLog {
  id        String   @id @default(cuid())
  userId    String
  platform  String                                    // "lise" | "savoir"
  type      String                                    // "timetable" | "courses"
  status    String                                    // "SUCCESS" | "FAILED" | "PARTIAL"
  error     String?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}
```

---

## 3. AUTH + ENSAM INTEGRATION

### Flow (text diagram)

```
USER                    APP SERVER              ENSAM PLATFORM
 |                          |                        |
 |-- POST /auth/login ----→ |                        |
 |   { login, password }    |                        |
 |                          |-- POST lise/login ---→ |
 |                          |   (form submit)         |
 |                          |← session cookie --------|
 |                          |                        |
 |                          | encrypt(password, KEY+userId)
 |                          | store ciphertext in DB
 |                          | store encrypted cookie in DB
 |                          | issue iron-session JWT to browser
 |                          |
 |← Set-Cookie: app_sess --|
 |   (iron-session, httpOnly, sameSite=strict)
 |
 |-- GET /api/timetable --> |
 |                          | read EnsamSession from DB
 |                          | decrypt cookie
 |                          |-- GET lise/timetable --> |
 |                          |← HTML timetable ---------|
 |                          | parse → TimetableSlot[]
 |← JSON timetable --------|
```

### Credential handling rules
- **Raw password lives in memory only during the login request** — extracted, used, discarded
- **Ciphertext stored**: `AES-256-GCM(password, key=SHA256(APP_SECRET + userId), iv=random16bytes)`
- **Why store it**: needed to re-authenticate when ENSAM session expires (no refresh token)
- **ENSAM session cookie**: also encrypted before DB storage (same scheme)
- **App session**: `iron-session` — signs+encrypts a JWT stored in httpOnly cookie, contains only `{ userId }`

### Pseudocode

```ts
// packages/crypto/index.ts
export function encrypt(plaintext: string, userId: string): { ciphertext: string; iv: string } {
  const key = crypto.createHash('sha256')
    .update(process.env.APP_SECRET + userId).digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: Buffer.concat([encrypted, tag]).toString('base64'),
    iv: iv.toString('base64')
  }
}

// packages/ensam/auth.ts
export async function ensamLogin(login: string, password: string): Promise<string> {
  // Strategy 1: direct POST to form endpoint (check with DevTools)
  const res = await fetch('https://lise.ensam.eu/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: login, password }),
    redirect: 'manual'
  })
  if (res.status === 302 && res.headers.get('set-cookie')) {
    return res.headers.get('set-cookie')! // raw cookie string
  }
  // Strategy 2: Playwright fallback
  return playwrightLogin(login, password)
}

// apps/web/app/api/auth/login/route.ts
export async function POST(req: Request) {
  const { login, password } = await req.json()
  
  // 1. Authenticate against ENSAM
  const rawCookie = await ensamLogin(login, password) // throws on failure
  
  // 2. Fetch initial data while we have fresh auth
  const timetable = await fetchTimetable(rawCookie)
  const courses = await fetchCourses(rawCookie)
  
  // 3. Persist user
  const user = await db.user.upsert({
    where: { ensamLogin: login },
    create: {
      email: `${login}@ensam.eu`,
      ensamLogin: login,
      ...encrypt(password, login), // encryptedPassword + passwordIv
    },
    update: { ...encrypt(password, login) }
  })
  
  // 4. Store encrypted ENSAM session
  await db.ensamSession.create({
    data: {
      userId: user.id,
      cookieData: encrypt(rawCookie, user.id).ciphertext,
      expiresAt: addHours(new Date(), 12),
      platform: 'lise'
    }
  })
  
  // 5. Seed DB with initial sync
  await upsertTimetable(user.id, timetable)
  await upsertCourses(user.id, courses)
  
  // 6. Issue app session (iron-session)
  const session = await getIronSession(req, res, sessionConfig)
  session.userId = user.id
  await session.save()
  
  return Response.json({ ok: true })
}
```

### Session refresh logic

```ts
// packages/ensam/session.ts
export async function getValidSession(userId: string, platform: string) {
  const stored = await db.ensamSession.findFirst({
    where: { userId, platform, expiresAt: { gt: new Date() } }
  })
  if (stored) return decrypt(stored.cookieData, userId)
  
  // Session expired → re-auth with stored credentials
  const user = await db.user.findUnique({ where: { id: userId } })
  const password = decrypt(user.encryptedPassword, userId, user.passwordIv)
  const freshCookie = await ensamLogin(user.ensamLogin, password)
  
  await db.ensamSession.upsert({
    where: { userId_platform: { userId, platform } },
    create: { userId, cookieData: encrypt(freshCookie, userId).ciphertext, expiresAt: addHours(new Date(), 12), platform },
    update: { cookieData: encrypt(freshCookie, userId).ciphertext, expiresAt: addHours(new Date(), 12) }
  })
  return freshCookie
}
```

---

## 4. TIMETABLE SYNC ENGINE

### Fetch strategy

```ts
// packages/ensam/timetable.ts
export async function fetchTimetable(cookie: string, weekOffset = 0): Promise<Slot[]> {
  const weekStart = getWeekStart(weekOffset) // Monday of target week
  const url = `https://lise.ensam.eu/planning?semaine=${weekStart.toISOString()}`
  
  const html = await fetch(url, {
    headers: { Cookie: cookie, 'User-Agent': 'Mozilla/5.0...' }
  }).then(r => r.text())
  
  if (html.includes('login') || html.includes('session expired')) {
    throw new SessionExpiredError()
  }
  return parseENSAMTimetable(html) // packages/ensam/parser.ts
}

// parser.ts — adapt selectors to real ENSAM HTML
export function parseENSAMTimetable(html: string): Slot[] {
  const $ = cheerio.load(html)
  const slots: Slot[] = []
  $('td.cours, .event-block').each((_, el) => {
    slots.push({
      courseName: $(el).find('.course-name').text().trim(),
      room:       $(el).find('.room').text().trim(),
      dayOfWeek:  parseDayIndex($(el).attr('data-day')),
      startTime:  $(el).attr('data-start'),
      endTime:    $(el).attr('data-end'),
    })
  })
  return slots
}
```

### BullMQ background jobs

```ts
// apps/worker/queue.ts
export const syncQueue = new Queue('ensam-sync', { connection: redis })

// apps/worker/jobs/syncTimetable.ts
export const timetableWorker = new Worker('ensam-sync', async (job) => {
  const { userId } = job.data
  try {
    const cookie = await getValidSession(userId, 'lise')
    // Fetch current week + next 2 weeks
    const slots = await Promise.all(
      [0, 1, 2].map(offset => fetchTimetable(cookie, offset))
    )
    await upsertTimetable(userId, slots.flat())
    await db.syncLog.create({ data: { userId, platform: 'lise', type: 'timetable', status: 'SUCCESS' } })
  } catch (err) {
    await db.syncLog.create({ data: { userId, platform: 'lise', type: 'timetable', status: 'FAILED', error: err.message } })
    if (err instanceof SessionExpiredError) {
      job.retry() // BullMQ will retry after backoff
    }
  }
}, { connection: redis, concurrency: 5 })

// Schedule: every 6h for all users
cron.schedule('0 */6 * * *', async () => {
  const users = await db.user.findMany({ select: { id: true } })
  for (const user of users) {
    await syncQueue.add('sync', { userId: user.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 }
    })
  }
})
```

---

## 5. API DESIGN

| Method | Route | Auth | Body / Query | Response |
|--------|-------|------|--------------|----------|
| POST | `/api/auth/login` | ✗ | `{ login, password }` | `{ ok, user }` |
| POST | `/api/auth/logout` | ✓ | — | `{ ok }` |
| GET | `/api/timetable` | ✓ | `?week=2025-05-12` | `TimetableSlot[]` |
| POST | `/api/timetable/sync` | ✓ | — | `{ jobId }` |
| GET | `/api/courses` | ✓ | — | `Course[]` |
| GET | `/api/courses/:id` | ✓ | — | `Course + assignments + notes` |
| GET | `/api/tasks` | ✓ | `?status=&courseId=` | `Task[]` |
| POST | `/api/tasks` | ✓ | `{ title, courseId, dueDate, priority }` | `Task` |
| PATCH | `/api/tasks/:id` | ✓ | `{ completed?, priority? }` | `Task` |
| DELETE | `/api/tasks/:id` | ✓ | — | `{ ok }` |
| GET | `/api/assignments` | ✓ | `?status=&courseId=` | `Assignment[]` |
| POST | `/api/assignments` | ✓ | `{ courseId, title, dueDate }` | `Assignment` |
| PATCH | `/api/assignments/:id` | ✓ | `{ status?, description? }` | `Assignment` |
| GET | `/api/notes` | ✓ | `?courseId=` | `Note[]` |
| POST | `/api/notes` | ✓ | `{ courseId, title, content }` | `Note` |
| PATCH | `/api/notes/:id` | ✓ | `{ title?, content? }` | `Note` |
| GET | `/api/analytics/workload` | ✓ | `?period=week` | `{ courseId, hours, completion }[]` |
| POST | `/api/pomodoro` | ✓ | `{ courseId, duration }` | `PomodoroSession` |

All routes return `{ error: string }` with appropriate HTTP status on failure.
Auth middleware: read iron-session → inject `req.userId` → 401 if missing.

---

## 6. FRONTEND STRUCTURE

### Pages + responsibility

```
/login              → LoginForm (credential input, loading state, error)
/dashboard          → aggregate view: clock, course cards, mini-todo,
                      reminders, goal tracker, pomodoro, radar chart
/timetable          → full weekly grid + WeekNavigator + sync status
/courses            → CourseCard grid
/courses/[id]       → assignments list, notes, progress, exam dates
/tasks              → TaskManager + priority board + unrelated tasks
/notes              → notes per course, markdown editor
/analytics          → radar chart, workload bars, completion rate
```

### Key components (interfaces)

```tsx
// TimetableGrid.tsx
interface TimetableGridProps {
  slots: TimetableSlot[]
  weekStart: Date
  onSlotClick: (slot: TimetableSlot) => void
}
// Renders Mon–Fri × 08:00–20:00 grid
// Each cell = absolute-positioned div based on time offset

// CourseCard.tsx
interface CourseCardProps {
  course: Course & {
    _count: { assignments: number }
    completedCount: number
  }
}
// Shows: name, completion%, upcoming exams, assignment badge

// TaskRow.tsx
interface TaskRowProps {
  task: Task
  onToggle: (id: string) => void
  onPriorityChange: (id: string, priority: string) => void
}

// Sidebar.tsx
// Static nav links + Academy-Life / Personal-Life / Future-Plan sections
// Uses Next.js <Link>, active state via usePathname()
```

### State management (Zustand)

```ts
// store/useAppStore.ts
interface AppStore {
  currentWeek: Date
  setWeek: (date: Date) => void
  syncStatus: 'idle' | 'syncing' | 'error'
  setSyncStatus: (s: AppStore['syncStatus']) => void
  selectedCourse: string | null
  setSelectedCourse: (id: string | null) => void
}
```

### Data fetching pattern

- **Server Components** for initial page loads (direct Prisma calls, skip API layer)
- **SWR** for client-side mutations and real-time updates
- `useSWR('/api/timetable?week=...', fetcher, { refreshInterval: 0 })`
- Optimistic updates on task toggle: mutate locally → PATCH → revalidate

---

## 7. MVP BUILD ORDER

```
Step 1 — Infrastructure (Day 1–2)
  ├── docker-compose up (postgres + redis)
  ├── Prisma schema + first migration
  ├── iron-session config
  └── ENV setup + crypto package

Step 2 — ENSAM Auth (Day 3–5) ← HIGHEST RISK
  ├── Manually test lise.ensam.eu with DevTools
  ├── Determine: REST API or form POST or Playwright
  ├── packages/ensam/auth.ts
  ├── packages/ensam/session.ts
  └── POST /api/auth/login working end-to-end

Step 3 — Timetable fetch + parse (Day 6–8)
  ├── packages/ensam/timetable.ts + parser.ts
  ├── Test with real HTML (save locally, iterate parser)
  ├── upsertTimetable to DB
  └── GET /api/timetable returning real data

Step 4 — Basic UI shell (Day 9–12)
  ├── Sidebar + layout component
  ├── Login page (form → POST /api/auth/login)
  ├── Dashboard skeleton (no data yet)
  └── TimetableGrid with hardcoded data first

Step 5 — Wire data to UI (Day 13–16)
  ├── TimetableGrid ← /api/timetable
  ├── CourseCard grid ← /api/courses
  └── Dashboard clock + quick actions

Step 6 — Task system (Day 17–20)
  ├── POST/PATCH/DELETE /api/tasks
  ├── TaskManager component
  ├── Assignment CRUD
  └── Link tasks ↔ courses

Step 7 — Background sync (Day 21–23)
  ├── BullMQ worker setup
  ├── Cron schedule (every 6h)
  ├── SyncLog write + display in UI
  └── Manual sync trigger button

Step 8 — Polish + deploy (Day 24–26)
  ├── Notes (markdown textarea, save on blur)
  ├── Pomodoro timer (pure client state)
  ├── Error boundaries + loading states
  └── Deploy: Vercel (web) + Railway (worker + DB)
```

**Dependency chain:**
```
[DB schema] → [ENSAM auth] → [timetable fetch] → [API routes] → [UI components] → [sync worker]
```
Do NOT build UI before the API works. Do NOT build the sync worker before the fetch is validated.

**What to test at each step:**
- Step 2: `curl -X POST /api/auth/login -d '{"login":"x","password":"y"}'` → DB row created
- Step 3: `node -e "require('./packages/ensam/timetable').fetchTimetable(cookie)"` → array logged
- Step 5: Hard-refresh dashboard → data visible without console errors
- Step 7: `bull-board` UI at `/admin/queues` → jobs succeeding

---

## 8. NEXT STEPS (POST-MVP)

### Implement after MVP ships

```
Priority 1 (Week 11–13)
  ├── AI study plan — Claude API with structured course context
  └── Radar chart — recharts, data from PomodoroSession + Assignments

Priority 2 (Week 14–16)
  ├── Habit tracker + goal tracker
  ├── Academic calendar view
  └── savoir.ensam.eu integration (course resources, grades)

Priority 3 (Week 17–19)
  ├── PWA (service worker + offline IndexedDB cache)
  ├── Push notifications (Web Push API)
  └── Google/Apple calendar export (iCal format)

Priority 4 (Week 20+)
  ├── GDPR export endpoint + consent flow
  ├── Rate limiting (upstash/ratelimit)
  └── Drag-to-reorder dashboard widgets
```

### What will break (risks)

```
ENSAM platform changes HTML structure → parser silently returns []
  Fix: add assertion on slot count; alert if <5 slots returned

Session expiry < 12h (some CAS systems expire in 2h)
  Fix: detect 302/401 on any timetable fetch → immediate re-auth

Playwright blocks (bot detection on lise.ensam.eu)
  Fix: add realistic User-Agent, random delay 200–800ms between actions,
       use stealth plugin (playwright-extra)

DB connection pool exhaustion under load
  Fix: pgbouncer in docker-compose from day 1, even for dev

Prisma migration drift in production
  Fix: never use db push in prod; always generate + apply migrations
```

### Improve later

```
- Move to edge runtime for API routes (Vercel Edge Functions)
- Add Redis caching for timetable (TTL = 1h, invalidate on sync)
- Replace Playwright with a proper ENSAM API when/if it becomes available
- Add end-to-end type safety with tRPC (replace raw fetch routes)
- Implement row-level security in PostgreSQL for multi-tenant safety
- Add Sentry for error tracking from week 1, not as an afterthought
```

