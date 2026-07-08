import { gql, gqlRequest } from "./graphqlClient";
import type { Mark } from "../lib/types";

const MARK_FIELDS = gql`
  fragment MarkFields on Mark {
    id
    studentId
    courseId
    marksObtained
    grade
    isActive
    course {
      courseName
      courseCode
    }
  }
`;

const GET_MARKS = gql`
  ${MARK_FIELDS}
  query GetMarks {
    getMarks {
      ...MarkFields
    }
  }
`;

const CREATE_MARK = gql`
  ${MARK_FIELDS}
  mutation CreateMark($input: CreateMarkInput!) {
    createMark(input: $input) {
      ...MarkFields
    }
  }
`;

const UPDATE_MARK = gql`
  ${MARK_FIELDS}
  mutation UpdateMark($id: Float!, $input: UpdateMarkInput!) {
    updateMark(id: $id, input: $input) {
      ...MarkFields
    }
  }
`;

type RawMark = Mark & { course?: { courseName?: string; courseCode?: string } };

function toMark(raw: RawMark): Mark {
  const { course, ...rest } = raw;
  return { ...rest, courseName: course?.courseName ?? course?.courseCode };
}

export const marksService = {
  getMarks: async (studentId: string): Promise<Mark[]> => {
    const data = await gqlRequest<{ getMarks: RawMark[] }>(GET_MARKS);
    return data.getMarks
      .filter((mark) => String(mark.studentId) === String(studentId))
      .map(toMark);
  },

  createMark: async (data: Partial<Mark>): Promise<Mark> => {
    const result = await gqlRequest<{ createMark: RawMark }>(CREATE_MARK, {
      input: data,
    });
    return toMark(result.createMark);
  },

  updateMark: async (id: string, data: Partial<Mark>): Promise<Mark> => {
    const numericId = Number(id);
    const result = await gqlRequest<{ updateMark: RawMark }>(UPDATE_MARK, {
      id: numericId,
      input: { ...data, id: numericId },
    });
    return toMark(result.updateMark);
  },
};
