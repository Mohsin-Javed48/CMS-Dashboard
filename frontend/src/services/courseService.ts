import { gql, gqlRequest } from "./graphqlClient";
import type { Course } from "../lib/types";

const GET_COURSES = gql`
  query GetCourses {
    getCourses {
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

export const courseService = {
  getCourses: async (): Promise<Course[]> => {
    const data = await gqlRequest<{ getCourses: Course[] }>(GET_COURSES);
    return data.getCourses;
  },
};

export default courseService;
