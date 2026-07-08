# Services Folder - GraphQL Integration

This folder contains service modules that encapsulate all GraphQL calls to the NestJS/Apollo backend.

## Structure

- **graphqlClient.ts** - Base GraphQL client (`graphql-request`), attaches the auth token from `localStorage` to every request and clears it on a 401 response
- **studentService.ts** - Student queries/mutations (list, get by student ID, create, enroll in a course)
- **courseService.ts** - Course queries (list all courses)
- **marksService.ts** - Marks queries/mutations (list by student, create, update)
- **teacherService.ts** - Thin wrapper over `studentService` for teacher-facing views
- **index.ts** - Central export file for all services

There is no auth service: the backend has no auth resolver yet, and the app's current login flow
(`src/app/login/page.tsx`) resolves the session locally by matching an email against `getStudents()`
rather than calling a login endpoint.

## Usage Examples

### Students

```typescript
import { studentService } from '@/services';

const students = await studentService.getStudents();
const student = await studentService.getStudentById(1001); // looked up by business studentId
await studentService.enrollCourse(courseId, studentId);
```

### Courses

```typescript
import { courseService } from '@/services';

const courses = await courseService.getCourses();
```

### Marks

```typescript
import { marksService } from '@/services';

const marks = await marksService.getMarks(studentId); // fetches all marks, filters client-side
await marksService.updateMark(markId, { marksObtained: 85, grade: 'A' });
```

### Raw GraphQL requests

For queries/mutations not covered by a service, use `gqlRequest` directly:

```typescript
import { gql, gqlRequest } from '@/services';

const data = await gqlRequest(gql`
  query GetCourse($id: Int!) {
    getCourse(id: $id) {
      courseName
    }
  }
`, { id: 3 });
```

## Configuration

Set `NEXT_PUBLIC_GRAPHQL_URL` to point at the backend's GraphQL endpoint (defaults to
`http://localhost:3001/graphql`).

## Features

- **Automatic Authorization**: Auth token (if present) is attached as a Bearer header on every request
- **Error Handling**: `gqlRequest` logs GraphQL errors and clears stored auth on a 401
- **Type Safety**: TypeScript interfaces for all query/mutation results, shared with the rest of the app via `lib/types`

## Future Enhancements

- Add a real auth resolver on the backend and wire up `login`/`logout`/`me`
- Add caching (Apollo Client or React Query) instead of one-off `gqlRequest` calls
- Add optimistic updates for mark edits
