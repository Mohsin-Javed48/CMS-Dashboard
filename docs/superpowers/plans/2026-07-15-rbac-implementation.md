# RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **For a human implementing this themselves to learn:** work through the tasks in order. Each task is self-contained (2-5 minute steps) and ends with something you can run and see work. Don't skip the "why" notes — they explain the non-obvious decisions so you're not just copying code.

**Goal:** Replace the fake, client-side-only login with real authentication (email + password, JWT in an httpOnly cookie) and enforce Student / Teacher / Admin permissions — including ownership rules (a teacher can only touch their own courses/marks) — on the NestJS/GraphQL backend, which is the real security boundary.

**Architecture:** NestJS global guards (`JwtAuthGuard` verifies the cookie, `RolesGuard` checks `@Roles()` metadata) attach the current user to the GraphQL context; resolvers/services add ownership checks on top for anything role-level checks can't express. Prisma gains `User`/`Teacher`/`Role` and a `Course.teacherId` FK. The Next.js frontend calls real GraphQL mutations for login/logout, reads the current user via a `me` query, and uses `middleware.ts` purely for UX-level route redirects (the backend enforces the real rules regardless).

**Tech Stack:** NestJS 10, `@nestjs/graphql` (Apollo), Prisma 7 (driver adapters, custom client output), PostgreSQL, `@nestjs/jwt`, `bcrypt`, `cookie-parser`, Next.js 14 (App Router), `graphql-request`.

## Global Constraints

- Prisma schema changes go through `prisma migrate dev` (not `db push`) — the project already has a real `migrations/` history (`20260602145526_init`).
- Import the Prisma Client from `../../generated/prisma` (adjust `../` depth per file location) — this project uses a custom generator output + `@prisma/adapter-pg`, not the default `@prisma/client` import.
- New backend files use plain relative imports (`../prisma/prisma.service`), matching `CourseService`'s style — not the `@/` path alias used inconsistently by `MarkService`/`StudentService`, which is currently broken under Jest (see Task 1).
- JWT cookie name: `access_token`, httpOnly, ~7-day expiry, no refresh-token rotation (v1 scope).
- Roles: `STUDENT`, `TEACHER`, `ADMIN` — exactly one role per `User`, no multi-role accounts.
- No public signup. Accounts are created via an Admin-only `createUser` mutation.
- Ownership rule: a `TEACHER` may only create/update/delete `Course`/`Mark` rows where `course.teacherId === user.teacherId`. `ADMIN` bypasses ownership checks entirely.
- Backend tests run via `pnpm --filter backend test` (Jest + ts-jest). This is currently broken (Task 1 fixes it) — do that first or every later "run the tests" step will fail for an unrelated reason.
- The frontend has no test runner configured. Frontend tasks are verified manually: `pnpm --filter backend dev` + `pnpm --filter frontend dev`, then exercise the flow in a browser.
- Design reference: `docs/superpowers/specs/2026-07-15-rbac-design.md`.

## File Structure

**Backend — new:**
- `backend/src/auth/models/auth-user.model.ts` — GraphQL `AuthUser` type + registers the `Role` enum for GraphQL.
- `backend/src/auth/dto/login.input.ts`, `backend/src/auth/dto/create-user.input.ts` — GraphQL input DTOs.
- `backend/src/auth/decorators/public.decorator.ts`, `roles.decorator.ts`, `current-user.decorator.ts` — metadata/param decorators.
- `backend/src/auth/types/current-user.type.ts` — shape of the decoded JWT payload attached to `req.user`.
- `backend/src/auth/auth.service.ts` (+ `.spec.ts`) — password hashing, login, user creation.
- `backend/src/auth/auth.module.ts`, `backend/src/auth/auth.resolver.ts` — wiring + `login`/`logout`/`me`/`createUser`.
- `backend/src/auth/guards/jwt-auth.guard.ts` (+ `.spec.ts`), `roles.guard.ts` (+ `.spec.ts`), `gql-context.mock.ts` (shared test helper).
- `backend/prisma/seed.ts` — creates the first Admin account.

**Backend — modified:** `backend/prisma/schema.prisma`, `backend/src/main.ts`, `backend/src/app.module.ts`, `backend/package.json`, `backend/.env` / `.env.example`, `backend/src/course/*`, `backend/src/mark/*`, `backend/src/student/*`.

**Backend — deleted:** `backend/src/auth/auth.guard.ts`, `backend/src/auth/auth.guard.spec.ts` (the no-op stub, superseded by the real guards).

**Frontend — new:** `frontend/src/services/authService.ts`, `frontend/middleware.ts`, `frontend/src/app/admin/page.tsx`.

**Frontend — modified:** `frontend/src/lib/session.ts`, `frontend/src/services/graphqlClient.ts`, `frontend/src/app/login/page.tsx`, `frontend/src/components/LoginForm.tsx`, `frontend/src/app/student/page.tsx`, `frontend/src/app/teacher/page.tsx`, `frontend/.env.example`.

---

### Task 1: Fix the backend's broken Jest configuration

The project's `package.json` has Jest scripts but no Jest config block, so `ts-jest` never gets wired in. Every later task in this plan needs `pnpm test` to give you an honest pass/fail signal, so this goes first.

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Confirm it's actually broken**

Run: `cd backend && npx jest`
Expected: `FAIL src/course/course.service.spec.ts` (and others) with `Jest encountered an unexpected token` — Jest is trying to parse TypeScript/decorators with no transform configured.

- [ ] **Step 2: Add a Jest config block to `backend/package.json`**

Add this key at the top level of the JSON object (as a sibling of `"scripts"` and `"dependencies"`):

```json
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
```

- [ ] **Step 3: Run the suite again and confirm the *real* state**

Run: `npx jest`
Expected: `Test Suites: 3 failed, 3 passed, 6 total`. The 3 failures are **pre-existing bugs unrelated to this plan** — leave them alone:
  - `course/course.service.spec.ts` — `Nest can't resolve dependencies of the CourseService` (the spec never provides `PrismaService`).
  - `mark/mark.service.spec.ts` and `student/student.service.spec.ts` — `Cannot find module '@/prisma/prisma.service'` (their `@/` path-alias import isn't resolvable by ts-jest without a `moduleNameMapper`, which nothing configures).
  - `prisma/prisma.service.spec.ts`, `common/pipes/lower-case/lower-case.pipe.spec.ts`, and `auth/auth.guard.spec.ts` pass.

You now have a working transform. New spec files you add in later tasks will run and report correctly regardless of these three unrelated failures.

- [ ] **Step 4: Commit**

```bash
git add backend/package.json
git commit -m "fix: configure ts-jest transform so backend tests actually run"
```

---

### Task 2: Install auth dependencies and add config

**Files:**
- Modify: `backend/package.json`, `backend/.env`, `backend/.env.example`

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm --filter backend add bcrypt cookie-parser dotenv
```

`@nestjs/jwt`, `passport`, and `passport-jwt` are already installed (currently unused) — `@nestjs/jwt`'s `JwtService` is what we'll use directly; `dotenv` is needed because the Task 9 seed script runs outside Nest's `ConfigModule` and must load `backend/.env` itself.

- [ ] **Step 2: Install type declarations**

```bash
pnpm --filter backend add -D @types/bcrypt @types/cookie-parser
```

- [ ] **Step 3: Add environment variables**

Append to `backend/.env` (this file is gitignored — real local values, not committed):

```
JWT_SECRET=dev-only-change-me-32-chars-minimum
FRONTEND_URL=http://localhost:3000
```

Append to `backend/.env.example` (tracked in git — placeholders only):

```

# Secret used to sign/verify session JWTs. Must be a long random string in
# production (e.g. `openssl rand -base64 48`). Never commit the real value.
JWT_SECRET=CHANGE_ME_LONG_RANDOM_STRING

# Origin allowed to send credentialed (cookie-carrying) requests via CORS.
FRONTEND_URL=http://localhost:3000

# Optional: set to a shared parent domain (e.g. `.mohsin-javed.online`) in
# production if frontend/backend live on different subdomains, so the auth
# cookie is sent across both. Leave unset for local development.
COOKIE_DOMAIN=
```

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/pnpm-lock.yaml backend/.env.example
git commit -m "chore: add bcrypt, cookie-parser, dotenv for auth"
```

(`backend/.env` is gitignored and won't show up in `git status` — that's expected, don't force-add it.)

---

### Task 3: Prisma schema — Role, User, Teacher, Course.teacherId

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Add the enum and new models**

Add near the top of `backend/prisma/schema.prisma` (after the `datasource` block):

```prisma
enum Role {
  STUDENT
  TEACHER
  ADMIN
}

model User {
  id              Int      @id @default(autoincrement())
  email           String   @unique
  passwordHash    String
  name            String
  role            Role
  studentRecordId Int?     @unique
  student         Student? @relation(fields: [studentRecordId], references: [id])
  teacher         Teacher?
  createdAt       DateTime @default(now())

  @@map("user")
}

model Teacher {
  id      Int      @id @default(autoincrement())
  userId  Int      @unique
  user    User     @relation(fields: [userId], references: [id])
  courses Course[]

  @@map("teacher")
}
```

*Why `studentRecordId` and not `studentId`:* `Student.studentId` is the public roll number the whole app already keys off of (`getStudentById`, the frontend URLs, etc.). `User`'s foreign key needs to point at `Student.id` (the internal primary key), which is a *different* number. Naming them the same field name in two places is exactly the kind of mix-up that silently breaks an ownership check later — so the FK gets its own name.

- [ ] **Step 2: Add the ownership FK to `Course`**

Modify the existing `Course` model — add these two fields (anywhere inside the model body):

```prisma
  teacherId Int?
  teacher   Teacher? @relation(fields: [teacherId], references: [id])
```

The full `Course` model should now read:

```prisma
model Course {
  id              Int      @id @default(autoincrement())
  courseCode      String   @unique
  courseName      String
  description     String?
  credits         Int
  schedule        String?
  isActive        Boolean  @default(true)
  teacherId       Int?
  teacher         Teacher? @relation(fields: [teacherId], references: [id])
  enrolledStudents Student[] @relation("StudentCourses")
  marks           Mark[]

  @@map("course")
}
```

- [ ] **Step 3: Run the migration**

```bash
pnpm --filter backend exec prisma migrate dev --name add_users_roles
```

Expected: Prisma prints a new migration folder name under `backend/prisma/migrations/`, applies it, and regenerates the client into `backend/generated/prisma`. All the new fields are nullable/optional, so this is a non-destructive migration — no data-loss prompts.

- [ ] **Step 4: Verify the client picked up the new types**

```bash
pnpm --filter backend exec tsc --noEmit
```

Expected: no errors (nothing references `User`/`Teacher`/`Role` yet, this just confirms the generated client compiles cleanly).

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations
git commit -m "feat(db): add User/Teacher/Role models and Course.teacherId"
```

---

### Task 4: GraphQL types for auth (AuthUser, LoginInput, CreateUserInput, @Public)

Pure type declarations first — the service (Task 5) and resolver (Task 6) both need these shapes to exist.

**Files:**
- Create: `backend/src/auth/models/auth-user.model.ts`
- Create: `backend/src/auth/dto/login.input.ts`
- Create: `backend/src/auth/dto/create-user.input.ts`
- Create: `backend/src/auth/decorators/public.decorator.ts`

- [ ] **Step 1: `backend/src/auth/models/auth-user.model.ts`**

```ts
import { ObjectType, Field, ID, Int, registerEnumType } from '@nestjs/graphql';
import { Role } from '../../../generated/prisma';

registerEnumType(Role, { name: 'Role' });

@ObjectType()
export class AuthUser {
  @Field(() => ID)
  id!: number;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field(() => Role)
  role!: Role;

  @Field(() => Int, { nullable: true })
  teacherId?: number;

  @Field(() => Int, { nullable: true })
  studentId?: number;
}
```

`teacherId`/`studentId` here are the *public* identifiers (the Teacher's row id, and the Student's roll number) — convenient for the frontend, and exactly what gets embedded in the JWT payload in Task 5.

- [ ] **Step 2: `backend/src/auth/dto/login.input.ts`**

```ts
import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(1)
  password!: string;
}
```

- [ ] **Step 3: `backend/src/auth/dto/create-user.input.ts`**

```ts
import { InputType, Field, Int } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma';

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  email!: string;

  @Field()
  @IsString()
  @MinLength(8)
  password!: string;

  @Field()
  @IsString()
  name!: string;

  @Field(() => Role)
  @IsEnum(Role)
  role!: Role;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  studentId?: number;
}
```

`studentId` here is the *public roll number* of an already-existing `Student` row (there's no public signup — an Admin links a login to a student record that was created separately via `createStudent`).

- [ ] **Step 4: `backend/src/auth/decorators/public.decorator.ts`**

```ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

- [ ] **Step 5: Confirm it all compiles**

```bash
pnpm --filter backend exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/auth
git commit -m "feat(auth): add GraphQL types for login/create-user and @Public decorator"
```

---

### Task 5: AuthService — password hashing, login, user creation

**Files:**
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

`backend/src/auth/auth.service.spec.ts`:

```ts
import * as bcrypt from 'bcrypt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '../../generated/prisma';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      student: { findUnique: jest.fn() },
    };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token') };
    service = new AuthService(prisma, jwtService);
  });

  describe('login', () => {
    it('throws UnauthorizedException when no user matches the email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login('nobody@x.com', 'pw')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        name: 'A',
        role: Role.STUDENT,
        passwordHash,
        teacher: null,
        student: { studentId: 1001 },
      });
      await expect(
        service.login('a@b.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns a signed token and user payload on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
        name: 'A',
        role: Role.STUDENT,
        passwordHash,
        teacher: null,
        student: { studentId: 1001 },
      });

      const result = await service.login('a@b.com', 'correct-password');

      expect(result.token).toBe('signed-token');
      expect(result.user).toEqual({
        id: 1,
        email: 'a@b.com',
        name: 'A',
        role: Role.STUDENT,
        teacherId: undefined,
        studentId: 1001,
      });
    });
  });

  describe('createUser', () => {
    it('throws BadRequestException when creating a STUDENT without studentId', async () => {
      await expect(
        service.createUser({
          email: 'x@x.com',
          password: 'password123',
          name: 'X',
          role: Role.STUDENT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the studentId has no matching Student', async () => {
      prisma.student.findUnique.mockResolvedValue(null);
      await expect(
        service.createUser({
          email: 'x@x.com',
          password: 'password123',
          name: 'X',
          role: Role.STUDENT,
          studentId: 9999,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('links a STUDENT user to the matching Student record', async () => {
      prisma.student.findUnique.mockResolvedValue({ id: 42, studentId: 1001 });
      prisma.user.create.mockResolvedValue({
        id: 5,
        email: 'x@x.com',
        name: 'X',
        role: Role.STUDENT,
        teacher: null,
        student: { studentId: 1001 },
      });

      const result = await service.createUser({
        email: 'x@x.com',
        password: 'password123',
        name: 'X',
        role: Role.STUDENT,
        studentId: 1001,
      });

      expect(prisma.student.findUnique).toHaveBeenCalledWith({
        where: { studentId: 1001 },
      });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ studentRecordId: 42 }),
        }),
      );
      expect(result.studentId).toBe(1001);
    });

    it('creates a Teacher row for a TEACHER user', async () => {
      prisma.user.create.mockResolvedValue({
        id: 6,
        email: 't@x.com',
        name: 'T',
        role: Role.TEACHER,
        teacher: { id: 7 },
        student: null,
      });

      const result = await service.createUser({
        email: 't@x.com',
        password: 'password123',
        name: 'T',
        role: Role.TEACHER,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ teacher: { create: {} } }),
        }),
      );
      expect(result.teacherId).toBe(7);
    });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
cd backend && npx jest auth.service.spec.ts
```

Expected: `Cannot find module './auth.service'` — the service doesn't exist yet.

- [ ] **Step 3: Write `backend/src/auth/auth.service.ts`**

```ts
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserInput } from './dto/create-user.input';
import { AuthUser } from './models/auth-user.model';
import { Role } from '../../generated/prisma';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ user: AuthUser; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { teacher: true, student: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teacherId: user.teacher?.id,
      studentId: user.student?.studentId,
    };

    const token = this.jwtService.sign({
      sub: authUser.id,
      email: authUser.email,
      name: authUser.name,
      role: authUser.role,
      teacherId: authUser.teacherId,
      studentId: authUser.studentId,
    });

    return { user: authUser, token };
  }

  async createUser(input: CreateUserInput): Promise<AuthUser> {
    const passwordHash = await bcrypt.hash(input.password, 10);

    let studentRecordId: number | undefined;
    if (input.role === Role.STUDENT) {
      if (input.studentId == null) {
        throw new BadRequestException('studentId is required for STUDENT role');
      }
      const student = await this.prisma.student.findUnique({
        where: { studentId: input.studentId },
      });
      if (!student) {
        throw new BadRequestException(
          `No student record found with studentId ${input.studentId}`,
        );
      }
      studentRecordId = student.id;
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        role: input.role,
        studentRecordId,
        teacher: input.role === Role.TEACHER ? { create: {} } : undefined,
      },
      include: { teacher: true, student: true },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      teacherId: user.teacher?.id,
      studentId: user.student?.studentId,
    };
  }
}
```

- [ ] **Step 4: Run the tests again**

```bash
npx jest auth.service.spec.ts
```

Expected: `Tests: 6 passed, 6 total`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/auth.service.ts backend/src/auth/auth.service.spec.ts
git commit -m "feat(auth): add AuthService with login and createUser logic"
```

---

### Task 6: AuthModule + AuthResolver (login/logout only)

This wires login/logout end-to-end but does **not** turn on global enforcement yet — that's Task 7. After this task, everything else in the API is still wide open; only `login`/`logout` exist and work.

**Files:**
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/auth.resolver.ts`
- Modify: `backend/src/main.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: `backend/src/auth/auth.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, AuthResolver],
  exports: [AuthService],
})
export class AuthModule {}
```

`global: true` makes `JwtService` injectable anywhere in the app (needed by the guard in Task 7, which is registered at the `AppModule` level, not inside `AuthModule`).

- [ ] **Step 2: `backend/src/auth/auth.resolver.ts`**

```ts
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthUser } from './models/auth-user.model';
import { LoginInput } from './dto/login.input';
import { Public } from './decorators/public.decorator';

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Public()
  @Mutation(() => AuthUser)
  async login(
    @Args('input') input: LoginInput,
    @Context() context: { res: Response },
  ): Promise<AuthUser> {
    const { user, token } = await this.authService.login(input.email, input.password);

    context.res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    return user;
  }

  @Public()
  @Mutation(() => Boolean)
  async logout(@Context() context: { res: Response }): Promise<boolean> {
    context.res.clearCookie(COOKIE_NAME, {
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    return true;
  }
}
```

- [ ] **Step 3: Modify `backend/src/main.ts`**

Replace the file with:

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend server running on http://localhost:${port}`);
}
bootstrap();
```

*Why this order matters:* `cookieParser()` must run before any resolver that reads `req.cookies`, and `enableCors({ credentials: true, origin: <specific-origin> })` replaces the previous `enableCors()` default — browsers refuse to send/receive cookies cross-origin if CORS allows `*` with credentials.

- [ ] **Step 4: Modify `backend/src/app.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { resolve } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { StudentModule } from './student/student.module';
import { MarkModule } from './mark/mark.module';
import { CourseModule } from './course/course.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), '..', '.env'),
        resolve(process.cwd(), '.env'),
      ],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: resolve(process.cwd(), 'src/schema.gql'),
      playground: true,
      context: ({ req, res }) => ({ req, res }),
    }),
    PrismaModule,
    AuthModule,
    StudentModule,
    MarkModule,
    CourseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

The only change beyond adding `AuthModule` is `context: ({ req, res }) => ({ req, res })` — without it, resolvers have no way to reach the Express `req`/`res` objects to read/set cookies.

- [ ] **Step 5: Manually verify login works**

```bash
pnpm --filter backend dev
```

In another terminal, once it's running on `:3001`:

```bash
curl -i -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(input: { email: \"nobody@test.com\", password: \"x\" }) { id } }"}'
```

Expected: a `200` response with a GraphQL `errors` array saying `Invalid credentials` (there's no user yet — that's expected and correct; you're confirming the mutation is wired and hits `AuthService`, not that login succeeds). You won't be able to test a *successful* login until Task 9's seed script creates a real user — that's fine, come back to this once that exists.

- [ ] **Step 6: Commit**

```bash
git add backend/src/auth/auth.module.ts backend/src/auth/auth.resolver.ts backend/src/main.ts backend/src/app.module.ts
git commit -m "feat(auth): wire login/logout mutations with httpOnly cookie"
```

---

### Task 7: JwtAuthGuard — the switch that turns on authentication

After this task, **every** resolver except `login`/`logout` requires a valid cookie. This is the biggest behavioral change in the whole plan — read it carefully before running it.

**Files:**
- Create: `backend/src/auth/types/current-user.type.ts`
- Create: `backend/src/auth/decorators/current-user.decorator.ts`
- Create: `backend/src/auth/guards/gql-context.mock.ts`
- Create: `backend/src/auth/guards/jwt-auth.guard.ts`
- Create: `backend/src/auth/guards/jwt-auth.guard.spec.ts`
- Modify: `backend/src/auth/auth.resolver.ts` (add `me` query)
- Modify: `backend/src/app.module.ts` (register the guard globally)
- Delete: `backend/src/auth/auth.guard.ts`, `backend/src/auth/auth.guard.spec.ts`

- [ ] **Step 1: `backend/src/auth/types/current-user.type.ts`**

```ts
import { Role } from '../../../generated/prisma';

export interface CurrentUserPayload {
  sub: number;
  email: string;
  name: string;
  role: Role;
  teacherId?: number;
  studentId?: number;
}
```

This is the shape of the JWT payload signed in `AuthService.login` — it's what ends up on `req.user` once the guard verifies a token.

- [ ] **Step 2: `backend/src/auth/decorators/current-user.decorator.ts`**

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);
```

- [ ] **Step 3: Write the failing guard test first**

`backend/src/auth/guards/gql-context.mock.ts` (shared test helper — builds a fake `ExecutionContext` that `GqlExecutionContext.create()` can unwrap):

```ts
import { ExecutionContext } from '@nestjs/common';

export function createMockGqlContext(
  req: Record<string, any> = {},
  handler: any = jest.fn(),
  classRef: any = jest.fn(),
): ExecutionContext {
  const gqlContext = { req };
  return {
    getHandler: () => handler,
    getClass: () => classRef,
    getArgByIndex: (index: number) => (index === 2 ? gqlContext : undefined),
    getArgs: () => [undefined, undefined, gqlContext, undefined],
    getType: () => 'graphql',
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}
```

`backend/src/auth/guards/jwt-auth.guard.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { createMockGqlContext } from './gql-context.mock';

describe('JwtAuthGuard', () => {
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: Reflector;
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = new Reflector();
    guard = new JwtAuthGuard(jwtService as any, reflector);
  });

  it('allows public routes without a token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockGqlContext({});
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects protected routes with no cookie', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockGqlContext({ cookies: {} });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an invalid or expired token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));
    const context = createMockGqlContext({ cookies: { access_token: 'garbage' } });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('attaches the decoded payload to req.user on a valid token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const payload = { sub: 1, email: 'a@b.com', name: 'A', role: 'STUDENT' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const req: any = { cookies: { access_token: 'good-token' } };
    const context = createMockGqlContext(req);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(req.user).toEqual(payload);
  });
});
```

- [ ] **Step 4: Run it and confirm it fails**

```bash
cd backend && npx jest jwt-auth.guard.spec.ts
```

Expected: `Cannot find module './jwt-auth.guard'`.

- [ ] **Step 5: Write `backend/src/auth/guards/jwt-auth.guard.ts`**

```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CurrentUserPayload } from '../types/current-user.type';

const COOKIE_NAME = 'access_token';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req;
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedException('Not authenticated');
    }

    try {
      const payload = await this.jwtService.verifyAsync<CurrentUserPayload>(token);
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
```

- [ ] **Step 6: Run the guard test again**

```bash
npx jest jwt-auth.guard.spec.ts
```

Expected: `Tests: 4 passed, 4 total`.

- [ ] **Step 7: Add the `me` query to the resolver**

In `backend/src/auth/auth.resolver.ts`, add these imports:

```ts
import { Query } from '@nestjs/graphql';
import { CurrentUser } from './decorators/current-user.decorator';
import { CurrentUserPayload } from './types/current-user.type';
```

and this method inside the `AuthResolver` class:

```ts
  @Query(() => AuthUser)
  me(@CurrentUser() user: CurrentUserPayload): AuthUser {
    return {
      id: user.sub,
      email: user.email,
      name: user.name,
      role: user.role,
      teacherId: user.teacherId,
      studentId: user.studentId,
    };
  }
```

- [ ] **Step 8: Delete the old stub guard**

```bash
rm backend/src/auth/auth.guard.ts backend/src/auth/auth.guard.spec.ts
```

- [ ] **Step 9: Register the guard globally in `backend/src/app.module.ts`**

Add these imports:

```ts
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
```

and change the `providers` array to:

```ts
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
```

- [ ] **Step 10: Manually verify enforcement flipped on**

```bash
pnpm --filter backend dev
```

```bash
curl -i -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ getCourses { id } }"}'
```

Expected: GraphQL `errors` array with `"Not authenticated"` — every resolver is now locked down by default. (You still can't get a *valid* cookie until Task 9 seeds a user — that's the next thing to build.)

- [ ] **Step 11: Run the full backend suite**

```bash
cd backend && npx jest
```

Expected: same as Task 1 (3 pre-existing unrelated failures) plus your new `auth.service.spec.ts` and `jwt-auth.guard.spec.ts` passing.

- [ ] **Step 12: Commit**

```bash
git add backend/src/auth backend/src/app.module.ts
git commit -m "feat(auth): add JwtAuthGuard, wire it globally, add me query"
```

---

### Task 8: RolesGuard — the authorization mechanism (not yet applied anywhere)

This task adds `@Roles()` and its guard, but doesn't put `@Roles()` on any resolver yet — so nothing changes behaviorally. That's deliberate: it lets you verify the mechanism in isolation before applying it module-by-module in Tasks 11-13.

**Files:**
- Create: `backend/src/auth/decorators/roles.decorator.ts`
- Create: `backend/src/auth/guards/roles.guard.ts`
- Create: `backend/src/auth/guards/roles.guard.spec.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: `backend/src/auth/decorators/roles.decorator.ts`**

```ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../../../generated/prisma';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 2: Write the failing test**

`backend/src/auth/guards/roles.guard.spec.ts`:

```ts
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { createMockGqlContext } from './gql-context.mock';
import { Role } from '../../../generated/prisma';

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows access when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockGqlContext({ user: { role: Role.STUDENT } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the user has a required role', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.TEACHER, Role.ADMIN]);
    const context = createMockGqlContext({ user: { role: Role.TEACHER } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the user lacks a required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockGqlContext({ user: { role: Role.STUDENT } });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

```bash
cd backend && npx jest roles.guard.spec.ts
```

Expected: `Cannot find module './roles.guard'`.

- [ ] **Step 4: Write `backend/src/auth/guards/roles.guard.ts`**

```ts
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../../../generated/prisma';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
    return true;
  }
}
```

- [ ] **Step 5: Run the test again**

```bash
npx jest roles.guard.spec.ts
```

Expected: `Tests: 3 passed, 3 total`.

- [ ] **Step 6: Register it globally in `backend/src/app.module.ts`**

Add the import:

```ts
import { RolesGuard } from './auth/guards/roles.guard';
```

and extend `providers`:

```ts
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
```

- [ ] **Step 7: Manually verify nothing changed**

```bash
pnpm --filter backend dev
```

Since no resolver has `@Roles()` yet, `RolesGuard` always takes the "no roles required" branch and returns `true`. Confirm `getCourses` still just says `"Not authenticated"` when called with no cookie (same as Task 7's check) — behavior is unchanged, which is exactly what should happen at this point.

- [ ] **Step 8: Commit**

```bash
git add backend/src/auth backend/src/app.module.ts
git commit -m "feat(auth): add RolesGuard and @Roles() decorator (not yet applied)"
```

---

### Task 9: Seed script — create the first Admin account

**Files:**
- Create: `backend/prisma/seed.ts`
- Modify: `backend/package.json`

- [ ] **Step 1: `backend/prisma/seed.ts`**

```ts
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '../generated/prisma';
import * as bcrypt from 'bcrypt';

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@university.edu';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin user ${email} already exists, skipping.`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  console.log(`Created admin user: ${email} / ${password}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Add the script to `backend/package.json`**

Add to `"scripts"`:

```json
    "db:seed": "ts-node --transpile-only prisma/seed.ts"
```

`--transpile-only` is needed because `prisma/seed.ts` sits outside `tsconfig.json`'s `rootDir: "./src"` — this tells `ts-node` to just transpile the one file instead of type-checking it against the full project config.

- [ ] **Step 3: Run it**

```bash
pnpm --filter backend run db:seed
```

Expected: `Created admin user: admin@university.edu / ChangeMe123!`

- [ ] **Step 4: Verify the full login flow works end-to-end**

With the backend running (`pnpm --filter backend dev`):

```bash
curl -i -c cookies.txt -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(input: { email: \"admin@university.edu\", password: \"ChangeMe123!\" }) { id email role } }"}'
```

Expected: a `Set-Cookie: access_token=...` header and a JSON body with `"role":"ADMIN"`.

```bash
curl -s -b cookies.txt -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ me { id email role } }"}'
```

Expected: `{"data":{"me":{"id":"1","email":"admin@university.edu","role":"ADMIN"}}}`. Clean up: `rm cookies.txt`.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/seed.ts backend/package.json
git commit -m "feat(auth): add seed script for the first Admin account"
```

---

### Task 10: Admin-only `createUser` mutation

**Files:**
- Modify: `backend/src/auth/auth.resolver.ts`

- [ ] **Step 1: Add the mutation**

Add these imports to `backend/src/auth/auth.resolver.ts`:

```ts
import { CreateUserInput } from './dto/create-user.input';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../generated/prisma';
```

and add this method inside `AuthResolver`:

```ts
  @Roles(Role.ADMIN)
  @Mutation(() => AuthUser)
  async createUser(@Args('input') input: CreateUserInput): Promise<AuthUser> {
    return this.authService.createUser(input);
  }
```

- [ ] **Step 2: Manually verify — Admin can create a Teacher**

With the backend running and using the admin cookie from Task 9 (`curl -c cookies.txt ... login ...` again if `cookies.txt` was deleted):

```bash
curl -s -b cookies.txt -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { createUser(input: { email: \"teacher1@test.com\", password: \"password123\", name: \"Teacher One\", role: TEACHER }) { id email role teacherId } }"}'
```

Expected: `{"data":{"createUser":{"id":"2","email":"teacher1@test.com","role":"TEACHER","teacherId":"1"}}}`.

- [ ] **Step 3: Manually verify — a non-Admin is rejected**

Log in as the teacher you just created, then try to create another account with that cookie:

```bash
curl -s -c teacher_cookies.txt -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { login(input: { email: \"teacher1@test.com\", password: \"password123\" }) { id } }"}'

curl -s -b teacher_cookies.txt -X POST http://localhost:3001/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { createUser(input: { email: \"x@test.com\", password: \"password123\", name: \"X\", role: ADMIN }) { id } }"}'
```

Expected: GraphQL `errors` with `"You do not have permission to perform this action"`. Clean up: `rm teacher_cookies.txt`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/auth/auth.resolver.ts
git commit -m "feat(auth): add admin-only createUser mutation"
```

---

### Task 11: Course — ownership checks, role guards, wire up `updateCourse`

`CourseService.updateCourse` already existed but was never wired to a resolver mutation (dead code with an untyped `data: any` parameter) — this task fixes that as part of adding ownership checks.

**Files:**
- Modify: `backend/src/course/dto/create-course.input.ts`
- Modify: `backend/src/course/model/course.model.ts`
- Modify: `backend/src/course/course.service.ts`
- Modify: `backend/src/course/course.resolver.ts`

- [ ] **Step 1: Add `teacherId` to `CreateCourseInput`**

In `backend/src/course/dto/create-course.input.ts`, add (after the existing fields):

```ts
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  teacherId?: number;
```

- [ ] **Step 2: Add `teacherId` to the `Course` GraphQL model**

In `backend/src/course/model/course.model.ts`, add:

```ts
  @Field(() => Int, { nullable: true })
  teacherId?: number;
```

- [ ] **Step 3: Rewrite `backend/src/course/course.service.ts`**

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseInput } from './dto/create-course.input';
import { UpdateCourseInput } from './dto/update-course.input';
import { CurrentUserPayload } from '../auth/types/current-user.type';
import { Role } from '../../generated/prisma';

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.course.findMany({
      include: { enrolledStudents: true },
    });
  }

  async findOne(id: number) {
    return this.prisma.course.findUnique({
      where: { id },
    });
  }

  async createCourse(input: CreateCourseInput) {
    const { enrolledStudents, ...courseData } = input;
    return this.prisma.course.create({
      data: {
        ...courseData,
        enrolledStudents: enrolledStudents
          ? { connect: enrolledStudents.map((id) => ({ id })) }
          : undefined,
      },
    });
  }

  async updateCourse(id: number, input: UpdateCourseInput) {
    const { id: _id, enrolledStudents, ...courseData } = input;
    return this.prisma.course.update({
      where: { id },
      data: {
        ...courseData,
        enrolledStudents: enrolledStudents
          ? { connect: enrolledStudents.map((studentId) => ({ id: studentId })) }
          : undefined,
      },
    });
  }

  async deleteCourse(id: number) {
    return this.prisma.course.delete({
      where: { id },
    });
  }

  async assertCanModify(courseId: number, user: CurrentUserPayload) {
    if (user.role === Role.ADMIN) return;
    const course = await this.findOne(courseId);
    if (!course) throw new NotFoundException('Course not found');
    if (course.teacherId !== user.teacherId) {
      throw new ForbiddenException('You do not own this course');
    }
  }
}
```

- [ ] **Step 4: Rewrite `backend/src/course/course.resolver.ts`**

```ts
import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { CourseService } from './course.service';
import { Course } from './model/course.model';
import { CreateCourseInput } from './dto/create-course.input';
import { UpdateCourseInput } from './dto/update-course.input';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/current-user.type';
import { Role } from '../../generated/prisma';

@Resolver(() => Course)
export class CourseResolver {
  constructor(private courseService: CourseService) {}

  @Query(() => [Course])
  getCourses() {
    return this.courseService.findAll();
  }

  @Query(() => Course, { nullable: true })
  getCourse(@Args('id', { type: () => Int }) id: number) {
    return this.courseService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => Course)
  createCourse(@Args('input') input: CreateCourseInput) {
    return this.courseService.createCourse(input);
  }

  @Roles(Role.ADMIN, Role.TEACHER)
  @Mutation(() => Course)
  async updateCourse(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateCourseInput,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.courseService.assertCanModify(id, user);
    return this.courseService.updateCourse(id, input);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => Course)
  deleteCourse(@Args('id', { type: () => Int }) id: number) {
    return this.courseService.deleteCourse(id);
  }
}
```

`getCourses`/`getCourse` have no `@Roles()` — any authenticated role (student, teacher, or admin) can browse the course catalog. Only mutations are restricted.

- [ ] **Step 2 verification: manually confirm ownership is enforced**

Create a second teacher and assign them a course as Admin, then confirm Teacher A can't edit Teacher B's course:

```bash
# (using the admin cookie from earlier)
curl -s -b cookies.txt -X POST http://localhost:3001/graphql -H "Content-Type: application/json" \
  -d '{"query":"mutation { createCourse(input: { courseCode: \"CS101\", courseName: \"Intro\", credits: 3, teacherId: 1 }) { id teacherId } }"}'
```

Note the returned `id`, then, using `teacher_cookies.txt` from a *different* teacher (or re-create one), try to update it:

```bash
curl -s -b teacher_cookies.txt -X POST http://localhost:3001/graphql -H "Content-Type: application/json" \
  -d '{"query":"mutation { updateCourse(id: 1, input: { id: 1, credits: 4 }) { id } }"}'
```

Expected: `"You do not own this course"`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/course
git commit -m "feat(course): add role/ownership guards, wire updateCourse mutation"
```

---

### Task 12: Mark — ownership checks, role-scoped `getMarks`

Right now `getMarks()` returns *every* mark in the database to *any* caller, and the frontend filters client-side. That's a real gap: a student calling the API directly would see everyone's grades. This task scopes the query server-side by role.

**Files:**
- Modify: `backend/src/mark/mark.service.ts`
- Modify: `backend/src/mark/mark.resolver.ts`

- [ ] **Step 1: Rewrite `backend/src/mark/mark.service.ts`**

```ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarkInput } from './dto/create-mark.input';
import { UpdateMarkInput } from './dto/update-mark.input';
import { CurrentUserPayload } from '../auth/types/current-user.type';
import { Role } from '../../generated/prisma';

@Injectable()
export class MarkService {
  constructor(private prisma: PrismaService) {}

  async createMark(input: CreateMarkInput) {
    return this.prisma.mark.create({
      data: input,
      include: { course: true },
    });
  }

  async findAll() {
    return this.prisma.mark.findMany({
      include: { course: true },
    });
  }

  async findAllForUser(user: CurrentUserPayload) {
    if (user.role === Role.ADMIN) {
      return this.findAll();
    }
    if (user.role === Role.TEACHER) {
      return this.prisma.mark.findMany({
        where: { course: { teacherId: user.teacherId } },
        include: { course: true },
      });
    }
    // STUDENT: Mark.studentId stores the public roll number (a string),
    // same field the frontend already keys marks off of.
    return this.prisma.mark.findMany({
      where: {
        studentId: user.studentId != null ? String(user.studentId) : '__none__',
      },
      include: { course: true },
    });
  }

  async findOne(id: number) {
    return this.prisma.mark.findUnique({
      where: { id },
      include: { course: true },
    });
  }

  async updateMark(id: number, input: UpdateMarkInput) {
    return this.prisma.mark.update({
      where: { id },
      data: input,
      include: { course: true },
    });
  }

  async deleteMark(id: number) {
    return this.prisma.mark.delete({
      where: { id },
      include: { course: true },
    });
  }

  async assertCanModifyCourse(courseId: number, user: CurrentUserPayload) {
    if (user.role === Role.ADMIN) return;
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.teacherId !== user.teacherId) {
      throw new ForbiddenException('You do not teach this course');
    }
  }

  async assertCanModifyMark(markId: number, user: CurrentUserPayload) {
    if (user.role === Role.ADMIN) return;
    const mark = await this.prisma.mark.findUnique({
      where: { id: markId },
      include: { course: true },
    });
    if (!mark) throw new NotFoundException('Mark not found');
    if (mark.course.teacherId !== user.teacherId) {
      throw new ForbiddenException('You do not teach this course');
    }
  }
}
```

- [ ] **Step 2: Rewrite `backend/src/mark/mark.resolver.ts`**

```ts
import { Query, Mutation, Args, Resolver } from '@nestjs/graphql';
import { MarkService } from './mark.service';
import { Mark } from './model/mark.model';
import { CreateMarkInput } from './dto/create-mark.input';
import { UpdateMarkInput } from './dto/update-mark.input';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/current-user.type';
import { Role } from '../../generated/prisma';

@Resolver(() => Mark)
export class MarkResolver {
  constructor(private markService: MarkService) {}

  @Roles(Role.TEACHER, Role.ADMIN)
  @Mutation(() => Mark)
  async createMark(
    @Args('input') input: CreateMarkInput,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.markService.assertCanModifyCourse(input.courseId, user);
    return this.markService.createMark(input);
  }

  @Query(() => [Mark])
  getMarks(@CurrentUser() user: CurrentUserPayload) {
    return this.markService.findAllForUser(user);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Query(() => Mark)
  async getMarksByStudentId(
    @Args('id') id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.markService.assertCanModifyMark(id, user);
    return this.markService.findOne(id);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Mutation(() => Mark)
  async updateMark(
    @Args('id') id: number,
    @Args('input') input: UpdateMarkInput,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.markService.assertCanModifyMark(id, user);
    return this.markService.updateMark(id, input);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Mutation(() => Mark)
  async deleteMark(
    @Args('id') id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    await this.markService.assertCanModifyMark(id, user);
    return this.markService.deleteMark(id);
  }
}
```

(`getMarksByStudentId` is a pre-existing misleading name — despite what it sounds like, it actually looks up a `Mark` by its own `id`, not by a student's id. That's an existing bug unrelated to this plan; not fixing the name here to keep this task scoped to RBAC, but now it's at least properly guarded.)

- [ ] **Step 3: Manually verify a student only sees their own marks**

Create a student login (via `createUser` as admin, linking to an existing `Student` row's `studentId`), log in as that student, and call `getMarks` — confirm the result only contains marks for that student's `studentId`, not everyone's.

- [ ] **Step 4: Commit**

```bash
git add backend/src/mark
git commit -m "feat(mark): add ownership checks and role-scope getMarks by caller"
```

---

### Task 13: Student — role guards, self-only `getStudentById`

**Files:**
- Modify: `backend/src/student/student.service.ts`
- Modify: `backend/src/student/student.resolver.ts`

- [ ] **Step 1: Add an ownership check to `backend/src/student/student.service.ts`**

Add these imports:

```ts
import { ForbiddenException } from '@nestjs/common';
import { CurrentUserPayload } from '../auth/types/current-user.type';
import { Role } from '../../generated/prisma';
```

and this method inside `StudentService`:

```ts
  assertCanView(requestedStudentId: number, user: CurrentUserPayload) {
    if (user.role === Role.STUDENT && user.studentId !== requestedStudentId) {
      throw new ForbiddenException('You can only view your own student record');
    }
  }
```

(`getStudentById`'s `id` argument and `user.studentId` are both the public roll number — see Task 3's note on why the User→Student FK is named differently from this.)

- [ ] **Step 2: Rewrite `backend/src/student/student.resolver.ts`**

```ts
import { ForbiddenException } from '@nestjs/common';
import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { StudentService } from './student.service';
import { Student } from './model/student.model';
import { CreateStudentInput } from './dto/create-student.input';
import { UpdateStudentInput } from './dto/update-student.input';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentUserPayload } from '../auth/types/current-user.type';
import { Role } from '../../generated/prisma';

@Resolver(() => Student)
export class StudentResolver {
  constructor(private readonly studentService: StudentService) {}

  @Roles(Role.ADMIN)
  @Mutation(() => Student)
  async createStudent(@Args('input') input: CreateStudentInput) {
    return this.studentService.create(input);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => Student)
  async updateStudent(
    @Args('id') id: number,
    @Args('input') input: UpdateStudentInput,
  ) {
    return this.studentService.update(id, input);
  }

  @Roles(Role.ADMIN)
  @Mutation(() => Student)
  async deleteStudent(@Args('id') id: number) {
    return this.studentService.remove(id);
  }

  @Roles(Role.STUDENT, Role.ADMIN)
  @Mutation(() => Student)
  async enrollStudentInCourse(
    @Args('studentId') studentId: number,
    @Args('courseId') courseId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.role === Role.STUDENT && user.studentId !== studentId) {
      throw new ForbiddenException('You can only enroll yourself');
    }
    return this.studentService.enrollInCourse(studentId, courseId);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Query(() => [Student])
  async getStudents() {
    return this.studentService.findAll();
  }

  @Query(() => Student)
  async getStudentById(
    @Args('id') id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    this.studentService.assertCanView(id, user);
    return this.studentService.findOne(id);
  }
}
```

*Why `enrollStudentInCourse` allows `STUDENT` (with an ownership check) instead of being Admin-only like the other mutations:* the existing frontend (`frontend/src/app/student/page.tsx`) already has a self-enroll "Add course" button that calls this mutation as the logged-in student. Making it Admin-only would break that feature; the ownership check (`user.studentId !== studentId` → reject) keeps self-service enrollment while still blocking a student from enrolling *someone else*.

- [ ] **Step 3: Manually verify**

- Log in as a student, call `getStudentById` with your own roll number → succeeds.
- Same student, call `getStudentById` with a different roll number → `"You can only view your own student record"`.
- Same student, call `getStudents` → `"You do not have permission to perform this action"`.

- [ ] **Step 4: Commit**

```bash
git add backend/src/student
git commit -m "feat(student): add role guards and self-only getStudentById ownership check"
```

---

### Task 14: Frontend — real session plumbing (graphqlClient, authService, session hook)

From here on, verification is manual (no frontend test runner exists in this project).

**Files:**
- Modify: `frontend/src/services/graphqlClient.ts`
- Create: `frontend/src/services/authService.ts`
- Modify: `frontend/src/lib/session.ts`
- Modify: `frontend/.env.example`

- [ ] **Step 1: Rewrite `frontend/src/services/graphqlClient.ts`**

```ts
import { GraphQLClient, ClientError, gql } from "graphql-request";

const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:3001/graphql";

export const graphqlClient = new GraphQLClient(GRAPHQL_URL, {
  credentials: "include",
});

export async function gqlRequest<T = any>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  try {
    return await graphqlClient.request<T>(document, variables);
  } catch (error) {
    if (error instanceof ClientError) {
      console.error("GraphQL Error:", error.response.status, error.response.errors);
    }
    throw error;
  }
}

export { gql };
```

This drops the old `localStorage`-based `ucms_token` Bearer-header logic (nothing ever wrote that token — it was dead code) in favor of `credentials: "include"`, which makes the browser attach the httpOnly auth cookie automatically.

- [ ] **Step 2: Create `frontend/src/services/authService.ts`**

```ts
import { gql, gqlRequest } from "./graphqlClient";

export type Role = "STUDENT" | "TEACHER" | "ADMIN";

export type CurrentUser = {
  id: number;
  email: string;
  name: string;
  role: Role;
  teacherId?: number;
  studentId?: number;
};

const CURRENT_USER_FIELDS = gql`
  fragment CurrentUserFields on AuthUser {
    id
    email
    name
    role
    teacherId
    studentId
  }
`;

const LOGIN = gql`
  ${CURRENT_USER_FIELDS}
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      ...CurrentUserFields
    }
  }
`;

const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

const ME = gql`
  ${CURRENT_USER_FIELDS}
  query Me {
    me {
      ...CurrentUserFields
    }
  }
`;

const CREATE_USER = gql`
  ${CURRENT_USER_FIELDS}
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      ...CurrentUserFields
    }
  }
`;

export const authService = {
  login: async (email: string, password: string): Promise<CurrentUser> => {
    const data = await gqlRequest<{ login: CurrentUser }>(LOGIN, {
      input: { email, password },
    });
    return data.login;
  },

  logout: async (): Promise<void> => {
    await gqlRequest(LOGOUT);
  },

  me: async (): Promise<CurrentUser | null> => {
    try {
      const data = await gqlRequest<{ me: CurrentUser }>(ME);
      return data.me;
    } catch {
      return null;
    }
  },

  createUser: async (input: {
    email: string;
    password: string;
    name: string;
    role: Role;
    studentId?: number;
  }): Promise<CurrentUser> => {
    const data = await gqlRequest<{ createUser: CurrentUser }>(CREATE_USER, {
      input,
    });
    return data.createUser;
  },
};
```

- [ ] **Step 3: Rewrite `frontend/src/lib/session.ts`**

```ts
"use client";

import { useEffect, useState } from "react";
import { authService, type CurrentUser } from "../services/authService";

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .me()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
```

This replaces the old `localStorage`-based `SessionUser`/`setCurrentUser`/`getCurrentUser`/`clearCurrentUser` — session state now comes from the server (`me` query) instead of trusting whatever's in the browser's `localStorage`.

- [ ] **Step 4: Add the GraphQL URL note to `frontend/.env.example`** (no change needed if `NEXT_PUBLIC_GRAPHQL_URL` is already documented there — verify it is; if not, add):

```
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:3001/graphql
```

- [ ] **Step 5: Confirm the frontend still compiles**

```bash
pnpm --filter frontend exec tsc --noEmit
```

Expected: errors in `login/page.tsx` and `teacher/page.tsx` (they still import the now-deleted `getCurrentUser`/`setCurrentUser`) — that's expected, fixed in the next two tasks. Confirm there are no *other* unexpected errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/services/graphqlClient.ts frontend/src/services/authService.ts frontend/src/lib/session.ts frontend/.env.example
git commit -m "feat(frontend): replace localStorage session with real GraphQL auth"
```

---

### Task 15: Frontend — real login page

**Files:**
- Modify: `frontend/src/app/login/page.tsx`
- Modify: `frontend/src/components/LoginForm.tsx`

- [ ] **Step 1: Rewrite `frontend/src/app/login/page.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "../../components/LoginForm";
import { authService } from "../../services/authService";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleLogin(email: string, password: string) {
    setError("");
    try {
      const user = await authService.login(email, password);
      if (user.role === "TEACHER") {
        router.push("/teacher");
      } else if (user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/student");
      }
    } catch (err) {
      setError("Invalid email or password.");
    }
  }

  return (
    <main className="flex min-h-screen items-center py-6">
      <section className="cms-container grid gap-5 md:grid-cols-[1.1fr_1fr]">
        <article className="cms-card cms-rise p-6 md:p-8">
          <span className="cms-chip mb-4">Secure Sign-In</span>
          <h2 className="cms-heading text-3xl font-bold">
            Access University CMS
          </h2>
          <p className="cms-subtext mt-3 text-sm">
            Sign in to continue with your assigned dashboard experience.
          </p>
          <div className="mt-6">
            <LoginForm onLogin={handleLogin} />
            {error ? (
              <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
            ) : null}
          </div>
        </article>
      </section>
    </main>
  );
}
```

(Drops the "Quick Role Routing" hint panel — it described the old email-heuristic fake login, which no longer exists.)

- [ ] **Step 2: Remove the stale hint from `frontend/src/components/LoginForm.tsx`**

Delete this line:

```tsx
      <div className="text-xs text-slate-500">Tip: use an email containing &quot;teacher&quot; to login as teacher.</div>
```

- [ ] **Step 3: Manually verify end-to-end**

```bash
pnpm --filter backend dev
pnpm --filter frontend dev
```

In a browser at `http://localhost:3000/login`, log in as `admin@university.edu` / `ChangeMe123!` (from Task 9). Confirm:
- You're redirected to `/admin` (which doesn't exist as a page yet until Task 18 — a 404 here is expected and fine for now, this step is only checking that login + redirect logic works).
- DevTools → Application → Cookies → `localhost:3001` (or wherever the backend runs) shows an `access_token` cookie marked `HttpOnly`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/login/page.tsx frontend/src/components/LoginForm.tsx
git commit -m "feat(frontend): wire login page to real authService"
```

---

### Task 16: Frontend — `middleware.ts` route gating

This is UX-only — the backend guards (Tasks 7-8) are the real security boundary regardless of what this file does. It just redirects logged-out or wrong-role users before they see a blank/broken page.

**Files:**
- Create: `frontend/middleware.ts`

- [ ] **Step 1: `frontend/middleware.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "access_token";

const ROUTE_ROLES: Record<string, string> = {
  "/student": "STUDENT",
  "/teacher": "TEACHER",
  "/admin": "ADMIN",
};

function decodeRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json).role ?? null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(ROUTE_ROLES).find((prefix) =>
    pathname.startsWith(prefix),
  );
  if (!matchedPrefix) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = decodeRole(token);
  if (role !== ROUTE_ROLES[matchedPrefix]) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*", "/admin/:path*"],
};
```

*Why this just decodes the JWT payload instead of cryptographically verifying it:* this check only decides whether to *redirect for UX purposes*. The actual security decision happens on the backend (Tasks 7-8), which does verify the signature. A student could hand-craft a fake cookie to get past this middleware, but every GraphQL call would still be rejected server-side — so there's no security value in doing real verification here, only extra complexity (a shared-secret `jose` dependency in the Edge runtime).

- [ ] **Step 2: Manually verify**

With both servers running:
- Visit `http://localhost:3000/teacher` with no login → redirected to `/login`.
- Log in as the admin, then visit `/teacher` directly → redirected to `/login` (wrong role).
- Log in as the teacher account created in Task 10, visit `/teacher` → loads normally.

- [ ] **Step 3: Commit**

```bash
git add frontend/middleware.ts
git commit -m "feat(frontend): add middleware.ts for UX-level route gating"
```

---

### Task 17: Frontend — fix student/teacher pages to use the real session

**Files:**
- Modify: `frontend/src/app/student/page.tsx`
- Modify: `frontend/src/app/teacher/page.tsx`

- [ ] **Step 1: Rewrite `frontend/src/app/student/page.tsx`**

```tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MarksTable from "../../components/MarksTable";
import { studentService } from "../../services/studentService";
import { marksService } from "../../services/marksService";
import { courseService } from "../../services/courseService";
import { useCurrentUser } from "../../lib/session";

import type { Mark, Student } from "../../lib/types";

export default function StudentPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [allCourses, setAllCourses] = useState<
    import("../../lib/types").Course[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;

    if (!user || user.role !== "STUDENT" || user.studentId == null) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      const currentStudent = await studentService.getStudentById(
        user.studentId as number,
      );
      const allMarks = await marksService.getMarks(
        String(currentStudent.studentId),
      );
      try {
        const courses = await courseService.getCourses();
        setAllCourses(courses);
      } catch (err) {
        setAllCourses([]);
      }
      setStudent(currentStudent);
      setMarks(
        allMarks.filter(
          (mark) => String(mark.studentId) === String(currentStudent.studentId),
        ),
      );
      setLoading(false);
    };

    load().catch(() => {
      setStudent(null);
      setMarks([]);
      setLoading(false);
    });
  }, [user, userLoading, router]);

  const enrolledCourses = useMemo(() => student?.courses ?? [], [student]);

  if (userLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="cms-card p-8 text-center">
          <p className="text-slate-700">Loading student profile...</p>
        </div>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="cms-card p-8 text-center">
          <p className="text-slate-700">
            No student found. Please login as a student.
          </p>
        </div>
      </main>
    );
  }

  const total = marks.reduce((acc, item) => acc + item.marksObtained, 0);
  const average = marks.length ? Math.round(total / marks.length) : 0;

  return (
    <main className="py-7">
      <section className="cms-container space-y-5">
        <header className="cms-card cms-rise p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Student Dashboard
              </p>
              <h1 className="cms-heading mt-2 text-2xl font-bold md:text-3xl">
                {student.name}
              </h1>
              <p className="cms-subtext mt-1 text-sm">
                Student ID {student.studentId} • {student.email}
              </p>
            </div>
            <span
              className={
                student.isActive
                  ? "cms-chip"
                  : "inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
              }
            >
              {student.isActive ? "Active Enrollment" : "Inactive"}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                CGPA
              </p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {(student.cgpa ?? 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Courses
              </p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {enrolledCourses.length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Average Marks
              </p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {average}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Phone
              </p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {student.phone}
              </p>
            </div>
          </div>
        </header>

        <section className="cms-card cms-rise-delay p-5 md:p-6">
          <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Profile Details
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Father Name
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {student.fatherName}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    CNIC
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {student.cnic}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Address
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {student.address}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Enrolled Courses
              </p>
              <div className="mt-4 space-y-3">
                {enrolledCourses.map((course) => (
                  <div
                    key={course._id ?? course.id ?? course.courseCode}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {course.courseName}
                        </p>
                        <p className="text-sm text-slate-600">
                          {course.courseCode}
                        </p>
                      </div>
                      <span className="cms-chip">{course.credits} CR</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {course.schedule}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cms-card cms-rise-delay p-3 md:p-4">
          <MarksTable marks={marks} editable={false} />
        </section>

        <section className="cms-card cms-rise-delay p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Available Courses
          </p>
          <div className="mt-4 space-y-3">
            {allCourses.map((course) => {
              const enrolled = enrolledCourses.some(
                (c) =>
                  String(c._id ?? c.id ?? c.courseCode) ===
                  String(course._id ?? course.id ?? course.courseCode),
              );
              return (
                <div
                  key={course._id ?? course.id ?? course.courseCode}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {course.courseName}
                    </p>
                    <p className="text-sm text-slate-600">
                      {course.courseCode}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="cms-chip">{course.credits} CR</span>
                    <button
                      className="cms-button cms-button-primary"
                      disabled={enrolled}
                      onClick={async () => {
                        try {
                          const studentIdentifier =
                            student._id ?? String(student.studentId);
                          await studentService.enrollCourse(
                            course._id ?? course.id ?? course.courseCode,
                            studentIdentifier,
                          );
                          const updated = await studentService.getStudentById(
                            user!.studentId as number,
                          );
                          setStudent(updated);
                          alert("Enrolled successfully");
                        } catch (err) {
                          console.error(err);
                          alert("Failed to enroll");
                        }
                      }}
                    >
                      {enrolled ? "Enrolled" : "Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

// EnrollForm removed — replaced by available courses list UI above.
```

*What changed:* the hardcoded `"1001"` test id is replaced by the actual logged-in student's `studentId` from `useCurrentUser()`, and a redirect-to-login guard was added for the loading/unauthenticated/wrong-role cases (previously this page had **no** auth check at all — any visitor saw student 1001's full profile).

- [ ] **Step 2: Rewrite `frontend/src/app/teacher/page.tsx`**

```tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StudentTable from "../../components/StudentTable";
import { studentService } from "../../services/studentService";
import { useCurrentUser } from "../../lib/session";
import type { Student } from "../../lib/types";

export default function TeacherPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (userLoading) return;

    if (!user || user.role !== "TEACHER") {
      router.replace("/login");
      return;
    }

    studentService
      .getStudents()
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, [user, userLoading, router]);

  if (userLoading || loading) {
    return (
      <main className="py-7">
        <section className="cms-container">
          <div className="cms-card p-8 text-center">
            Loading student records...
          </div>
        </section>
      </main>
    );
  }

  const totalStudents = students.length;
  const activeStudents = students.filter((student) => student.isActive).length;
  const averageCgpa = students.length
    ? (
        students.reduce((sum, student) => sum + (student.cgpa ?? 0), 0) /
        students.length
      ).toFixed(2)
    : "0.00";
  const totalCourses = new Set(
    students.flatMap(
      (student) =>
        student.courses?.map(
          (course) => course._id ?? course.id ?? course.courseCode,
        ) ?? [],
    ),
  ).size;

  return (
    <main className="py-7">
      <section className="cms-container space-y-5">
        <header className="cms-card cms-rise p-5 md:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Teacher Workspace
          </p>
          <h1 className="cms-heading mt-2 text-2xl font-bold md:text-3xl">
            Student Records
          </h1>
          <p className="cms-subtext mt-1 text-sm">
            Open any student profile to review marks, enrollment, and contact
            details.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Total Students
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {totalStudents}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Active
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {activeStudents}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Average CGPA
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {averageCgpa}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Courses
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">
                {totalCourses}
              </p>
            </div>
          </div>
        </header>

        <section className="cms-card cms-rise-delay p-3 md:p-4">
          <StudentTable
            students={students}
            onRowClick={(id) => router.push(`/teacher/${id}`)}
          />
        </section>
      </section>
    </main>
  );
}
```

*What changed:* swapped `getCurrentUser()` (localStorage) for `useCurrentUser()` (real `me` query), and a role mismatch now redirects to `/login` instead of just silently blanking the student list.

- [ ] **Step 3: Manually verify**

Log in as the teacher account, confirm `/teacher` loads the real student list from the backend. Log in as the student account, confirm `/student` shows that student's own profile/marks (not "1001").

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/student/page.tsx frontend/src/app/teacher/page.tsx
git commit -m "fix(frontend): use real session on student/teacher pages instead of hardcoded id"
```

---

### Task 18: Frontend — minimal Admin page for `createUser`

Without this, the only way to provision a Teacher/Student login is `curl`/GraphQL Playground. This gives the Admin a real (if bare-bones) UI for it.

**Files:**
- Create: `frontend/src/app/admin/page.tsx`

- [ ] **Step 1: `frontend/src/app/admin/page.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { authService, type Role } from "../../services/authService";

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("STUDENT");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      await authService.createUser({
        email,
        password,
        name,
        role,
        studentId: role === "STUDENT" ? Number(studentId) : undefined,
      });
      setMessage(`Account created for ${email}.`);
      setEmail("");
      setPassword("");
      setName("");
      setStudentId("");
    } catch (err) {
      setMessage("Failed to create account.");
    }
  }

  return (
    <main className="py-7">
      <section className="cms-container">
        <div className="cms-card p-6 md:p-8 max-w-lg">
          <h1 className="cms-heading text-2xl font-bold">
            Create Login Account
          </h1>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="cms-input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="cms-input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                className="cms-input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="cms-input mt-1"
              >
                <option value="STUDENT">Student</option>
                <option value="TEACHER">Teacher</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {role === "STUDENT" ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700">
                  Student ID (roll number, must already exist)
                </label>
                <input
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  type="number"
                  required
                  className="cms-input mt-1"
                />
              </div>
            ) : null}
            <button className="cms-button cms-button-primary w-full">
              Create Account
            </button>
            {message ? (
              <p className="mt-2 text-sm text-slate-700">{message}</p>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Manually verify the full loop**

Log in as `admin@university.edu`, land on `/admin` (this is the page that previously 404'd in Task 15 — confirm it now loads), create a Teacher account, log out, log back in as that teacher, confirm you land on `/teacher` with real data.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/admin
git commit -m "feat(frontend): add minimal admin page for creating login accounts"
```

---

## Done — what you've built

- Real password-based login, JWT in an httpOnly cookie, no more fake email-heuristic auth.
- Global authentication (`JwtAuthGuard`) and authorization (`RolesGuard` + `@Roles()`) enforced on every resolver by default.
- Ownership rules: a Teacher can only touch their own courses/marks; a Student can only view their own record/marks; Admin bypasses ownership.
- Admin-only account provisioning (no public signup).
- Frontend session backed by the server (`me` query) instead of trustable `localStorage`, plus UX-level route gating.

**Not covered (intentionally out of scope — see the design spec's "Out of scope" section):** public self-signup, refresh-token rotation, multi-role accounts, CASL/attribute-based access control.
