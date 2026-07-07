# Services Folder - API Integration

This folder contains service modules that encapsulate all API calls to the backend.

## Structure

- **http.ts** - Base HTTP client with axios interceptors, request/response handling, and auth token management
- **authService.ts** - Authentication endpoints (login, logout, refresh token)
- **studentService.ts** - Student-specific endpoints (profile, marks, courses, attendance)
- **teacherService.ts** - Teacher-specific endpoints (manage students, update marks, reports)
- **index.ts** - Central export file for all services

## Usage Examples

### Authentication

```typescript
import { authService } from '@/services';

// Login
const response = await authService.login({
  email: 'student@univ.edu',
  password: 'password123'
});

// Logout
await authService.logout();

// Get current user
const user = await authService.getCurrentUser();
```

### Student Operations

```typescript
import { studentService } from '@/services';

// Get student profile
const profile = await studentService.getProfile();

// Get marks
const marks = await studentService.getMarks();

// Get enrolled courses
const courses = await studentService.getEnrolledCourses();

// Download transcript
const transcript = await studentService.downloadTranscript();
```

### Teacher Operations

```typescript
import { teacherService } from '@/services';

// Get all students
const students = await teacherService.getAllStudents();

// Get specific student
const student = await teacherService.getStudent('student-id');

// Update student marks
await teacherService.updateStudentMarks('student-id', [
  { subject: 'Mathematics', marks: 85 },
  { subject: 'Physics', marks: 90 }
]);

// Bulk update marks
await teacherService.bulkUpdateMarks([
  {
    studentId: 's1',
    marks: [
      { subject: 'Math', marks: 85 },
      { subject: 'Physics', marks: 90 }
    ]
  }
]);

// Export marks
const csv = await teacherService.exportMarksCSV();

// Generate report card
const reportCard = await teacherService.generateReportCard('student-id');
```

### Error Handling

All services throw errors when API calls fail. Use try-catch blocks:

```typescript
try {
  const data = await studentService.getMarks();
} catch (error) {
  console.error('Failed to fetch marks:', error);
}
```

### HTTP Client

For custom requests not covered by services, use the HTTP client:

```typescript
import { http } from '@/services';

// GET request
const data = await http.get('/custom-endpoint');

// POST request
const result = await http.post('/custom-endpoint', { data: 'value' });

// PUT request
await http.put('/custom-endpoint', { data: 'updated' });

// DELETE request
await http.delete('/custom-endpoint');
```

## Features

- **Automatic Authorization**: Auth token is automatically included in requests
- **Token Management**: Tokens stored in localStorage and automatically attached to headers
- **Error Handling**: Response interceptor handles 401 errors and clears auth data
- **Type Safety**: TypeScript interfaces for all request/response types
- **Centralized Config**: All API configuration in one place

## Backend Endpoint Reference (Template)

The services expect the following backend API structure:

```
POST   /auth/login              - User login
POST   /auth/logout             - User logout
POST   /auth/refresh            - Refresh token
GET    /auth/me                 - Get current user
POST   /auth/verify             - Verify token

GET    /students/profile        - Get student profile
GET    /students/marks          - Get student marks
GET    /students/{id}/marks     - Get specific student marks
GET    /students/courses        - Get enrolled courses
PUT    /students/profile        - Update profile
GET    /students/attendance     - Get attendance

GET    /teachers/students       - Get all students
GET    /teachers/students/{id}  - Get student details
GET    /teachers/students/{id}/marks       - Get marks
PUT    /teachers/students/{id}/marks       - Update marks
POST   /teachers/marks/bulk-update         - Bulk update marks
GET    /teachers/students/{id}/statistics  - Get statistics
GET    /teachers/students/{id}/report-card - Generate report
```

## Future Enhancements

- Add caching layer (React Query / SWR)
- Add request debouncing/throttling
- Add offline support with Service Workers
- Add comprehensive error types
- Add request/response logging middleware
- Add retry logic for failed requests
