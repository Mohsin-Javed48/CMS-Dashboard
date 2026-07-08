import { gql, gqlRequest } from "./graphqlClient";
import type { Student } from "../lib/types";

const STUDENT_FIELDS = gql`
  fragment StudentFields on Student {
    id
    studentId
    name
    fatherName
    email
    address
    cnic
    phone
    cgpa
    courses {
      id
      courseCode
      courseName
      description
      credits
      schedule
      isActive
    }
  }
`;

const GET_STUDENTS = gql`
  ${STUDENT_FIELDS}
  query GetStudents {
    getStudents {
      ...StudentFields
    }
  }
`;

const GET_STUDENT_BY_ID = gql`
  ${STUDENT_FIELDS}
  query GetStudentById($id: Float!) {
    getStudentById(id: $id) {
      ...StudentFields
    }
  }
`;

const CREATE_STUDENT = gql`
  ${STUDENT_FIELDS}
  mutation CreateStudent($input: CreateStudentInput!) {
    createStudent(input: $input) {
      ...StudentFields
    }
  }
`;

const ENROLL_STUDENT_IN_COURSE = gql`
  ${STUDENT_FIELDS}
  mutation EnrollStudentInCourse($studentId: Float!, $courseId: Float!) {
    enrollStudentInCourse(studentId: $studentId, courseId: $courseId) {
      ...StudentFields
    }
  }
`;

export const studentService = {
  getStudents: async (): Promise<Student[]> => {
    const data = await gqlRequest<{ getStudents: Student[] }>(GET_STUDENTS);
    return data.getStudents;
  },

  getStudentById: async (studentId: string | number): Promise<Student> => {
    const data = await gqlRequest<{ getStudentById: Student }>(
      GET_STUDENT_BY_ID,
      { id: Number(studentId) },
    );
    return data.getStudentById;
  },

  createStudent: async (data: Partial<Student>): Promise<Student> => {
    const result = await gqlRequest<{ createStudent: Student }>(
      CREATE_STUDENT,
      { input: data },
    );
    return result.createStudent;
  },

  enrollCourse: async (
    courseId: string | number,
    studentId: string | number,
  ): Promise<Student> => {
    const data = await gqlRequest<{ enrollStudentInCourse: Student }>(
      ENROLL_STUDENT_IN_COURSE,
      { studentId: Number(studentId), courseId: Number(courseId) },
    );
    return data.enrollStudentInCourse;
  },
};
