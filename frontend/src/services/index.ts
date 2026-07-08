// Main export file for all services
export { studentService } from './studentService';
export { teacherService } from './teacherService';
export { courseService } from './courseService';
export { marksService } from './marksService';
export { graphqlClient, gqlRequest, gql } from './graphqlClient';

// Re-export types
export type { Student } from '../lib/types';
export type { Course, Mark } from '../lib/types';
