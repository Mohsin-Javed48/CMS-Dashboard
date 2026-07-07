import { http } from "./http";
import type { Course } from "../lib/types";

export const courseService = {
  getCourses: async (): Promise<Course[]> => {
    return http.get<Course[]>("/course");
  },
};

export default courseService;
