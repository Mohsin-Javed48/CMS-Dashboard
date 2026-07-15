# Role-Based Access Control (RBAC) — Design

## Goal

Replace the current fake, client-side-only login (`frontend/src/lib/session.ts` +
the email-heuristic in `frontend/src/app/login/page.tsx`) with real authentication
(email + password, JWT-based sessions) and enforce Student / Teacher / Admin
permissions — including ownership rules — on the backend, which is the actual
security boundary.

## Context / constraints

- Monorepo: NestJS backend (GraphQL via Apollo, Prisma → PostgreSQL) + Next.js
  frontend.
- `backend/src/auth/auth.guard.ts` exists today but is a no-op stub
  (`canActivate()` always returns `true`).
- No `User` model exists in `schema.prisma` today — only `Student`, `Course`,
  `Mark`. `Course` has no owning teacher.
- `@nestjs/jwt`, `passport`, `passport-jwt` are already installed but unused. No
  password-hashing library (e.g. bcrypt) is installed yet.
- The frontend login page currently does no backend auth call at all: it routes to
  `/teacher` if the typed email contains "teacher", otherwise looks up a
  `Student` record by email and routes to `/student`. There is no password check.
- No public signup: an Admin provisions every Student/Teacher login account.

## Roles

- `STUDENT` — one per `Student` record (nullable 1:1 link).
- `TEACHER` — new `Teacher` entity; owns zero or more `Course`s.
- `ADMIN` — no extra profile table; provisions users, manages courses globally.

Each `User` has exactly one role (no multi-role accounts).

## Data model (Prisma)

```prisma
enum Role {
  STUDENT
  TEACHER
  ADMIN
}

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique
  passwordHash String
  role         Role
  name         String
  student      Student? @relation(fields: [studentId], references: [id])
  studentId    Int?     @unique
  teacher      Teacher?
  createdAt    DateTime @default(now())

  @@map("user")
}

model Teacher {
  id      Int      @id @default(autoincrement())
  user    User     @relation(fields: [userId], references: [id])
  userId  Int      @unique
  courses Course[]

  @@map("teacher")
}
```

- `Course` gains `teacherId Int?` and a relation to `Teacher` — this is the
  ownership anchor for "can this teacher edit this course / its marks?" checks.
  It doesn't exist today.
- `Student` gains an implicit back-reference from `User.studentId` (a student's
  login links to their existing `Student` record; `Student` itself is
  unchanged).
- Admin accounts are seeded via a Prisma seed script (or a one-off CLI script),
  not created through the app.

## Auth flow

1. `login(email, password)` GraphQL mutation: looks up `User` by email, verifies
   the password with `bcrypt.compare`, signs a JWT (claims: `sub`, `role`, and
   `teacherId`/`studentId` when applicable) via `@nestjs/jwt`, and sets it as an
   httpOnly, `Secure`, `SameSite=Lax` cookie on the GraphQL response.
2. `logout` mutation clears the cookie.
3. `me` query decodes the JWT from the cookie and returns the current user; the
   frontend uses this to hydrate session state on load instead of trusting
   `localStorage`.
4. Single JWT, ~7-day expiry, no refresh-token rotation for v1 — re-login after
   expiry. Refresh tokens can be added later if needed (YAGNI for now).
5. There is no public signup endpoint. New users are created via an
   Admin-only `createUser` mutation.

## Backend enforcement

- `JwtAuthGuard`, registered globally via `APP_GUARD`, replaces the stub in
  `auth.guard.ts`. It reads the JWT from the request cookie (via
  `GqlExecutionContext` to reach the underlying HTTP request in GraphQL
  resolvers), verifies it, and attaches `{ id, role, teacherId?, studentId? }` to
  the GraphQL context as `context.user`. Fails closed: any resolver without an
  explicit `@Public()` decorator requires a valid JWT. `login` is the only
  `@Public()` resolver.
- `RolesGuard`, also global, paired with a `@Roles(Role.ADMIN, ...)` decorator
  read via `Reflector`, checks `context.user.role` against the resolver's
  required roles.
- **Ownership checks** are NOT part of the guards — they live in the
  resolver/service methods that need them, since they require loading the
  actual record:
  - `MarkService` mutations: load the `Mark`'s `Course`, require
    `course.teacherId === context.user.teacherId` (unless `role === ADMIN`),
    else throw `ForbiddenException`.
  - `CourseService` mutations: same ownership check against `teacherId`.
  - Student-facing queries (e.g. a future `myMarks`): scope results to
    `context.user.studentId` server-side — never trust a client-supplied
    student id for "my own data" queries.
- CORS on the NestJS side needs `credentials: true` with an explicit allowed
  origin (not `*`), since the frontend and backend run on different
  origins/ports and the cookie must be sent cross-origin.

## Frontend

- Remove the email-heuristic mock entirely from `login/page.tsx`; call a real
  `login` GraphQL mutation. The httpOnly cookie is set automatically by the
  browser — no client-side token handling.
- Replace `frontend/src/lib/session.ts`'s `localStorage`-based
  `SessionUser`/`setCurrentUser`/`getCurrentUser` with a `me` query run on app
  load (e.g. in the root layout or a small session hook/context).
- Add `middleware.ts` at the Next.js root for route gating (`/student/*`,
  `/teacher/*`, and a new `/admin/*`) — this is a UX convenience only. The
  backend GraphQL guards remain the actual security boundary, since a client
  could otherwise call the GraphQL API directly, bypassing any frontend check.
- `graphqlClient.ts`'s Apollo/fetch client needs `credentials: 'include'` so the
  auth cookie is sent with every GraphQL request.

## Testing

- Replace the trivial `auth.guard.spec.ts` with real unit tests for
  `JwtAuthGuard` (valid/missing/expired/tampered token) and `RolesGuard`
  (allowed role, disallowed role, `@Public()` bypass).
- Unit tests per ownership branch: teacher owns the course (allowed), teacher
  does not own it (denied), admin bypasses ownership (allowed), student reads
  only their own data.
- Integration test hitting the GraphQL endpoint as each role to confirm 403s
  land exactly where expected (e.g. Teacher A cannot edit Teacher B's course
  marks).

## Rollout order

Each step is independently shippable and testable:

1. Prisma migration: `Role` enum, `User`, `Teacher`, `Course.teacherId`.
2. `AuthModule`: password hashing, `login` / `logout` / `me` resolvers, JWT
   signing/verification.
3. Seed script for the first Admin account.
4. `JwtAuthGuard` + `RolesGuard` + `@Roles()` / `@Public()` decorators wired
   globally, replacing the stub `AuthGuard`.
5. Ownership checks added to existing `Course`/`Mark`/`Student` resolvers.
6. Admin-only `createUser` mutation (provisions Teacher/Student logins).
7. Frontend: real login, `me`-based session, `middleware.ts` route gating,
   Apollo client `credentials: 'include'`.

## Out of scope (for now)

- Public self-signup.
- Refresh-token rotation / multi-device session revocation.
- Multi-role accounts.
- CASL or any external authorization library — plain NestJS guards/decorators
  are sufficient at the current scale (3 protected resource types); revisit if
  the permission matrix grows significantly.
