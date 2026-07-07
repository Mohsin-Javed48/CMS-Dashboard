"use client";

import React, { useEffect, useState } from "react";
import type { Mark } from "../lib/types";

function getCourseLabel(course: Mark["courseId"], courseName?: string) {
  if (typeof course === "string") {
    return courseName ?? course;
  }

  return (
    course.courseName ??
    course.courseCode ??
    course._id ??
    course.id ??
    courseName ??
    "Unknown course"
  );
}

function getCourseKey(course: Mark["courseId"]) {
  return typeof course === "string"
    ? course
    : course._id ?? course.id ?? course.courseCode;
}

export default function MarksTable({
  marks,
  editable = false,
  onSave,
}: {
  marks: Mark[];
  editable?: boolean;
  onSave?: (marks: Mark[]) => void;
}) {
  const [local, setLocal] = useState<Mark[]>(marks.map((m) => ({ ...m })));

  useEffect(() => {
    setLocal(marks.map((m) => ({ ...m })));
  }, [marks]);

  function updateMark(
    idx: number,
    field: "marksObtained" | "grade",
    value: string | number,
  ) {
    const copy = local.map((m) => ({ ...m }));
    if (field === "marksObtained") {
      copy[idx].marksObtained = Number(value);
    } else {
      copy[idx].grade = String(value);
    }
    setLocal(copy);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="cms-data-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Marks</th>
            <th>Grade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {local.map((m, i) => (
            <tr
              key={m.id ?? m._id ?? `${m.studentId}-${getCourseKey(m.courseId)}`}
              className="bg-white even:bg-slate-50/60"
            >
              <td className="font-medium text-slate-800">
                {getCourseLabel(m.courseId, m.courseName)}
              </td>
              <td className="text-slate-700">
                {editable ? (
                  <input
                    type="number"
                    value={m.marksObtained}
                    onChange={(e) =>
                      updateMark(i, "marksObtained", Number(e.target.value))
                    }
                    className="cms-input w-28 py-1.5"
                  />
                ) : (
                  <span className="cms-chip">{m.marksObtained}%</span>
                )}
              </td>
              <td className="text-slate-700">
                {editable ? (
                  <input
                    type="text"
                    value={m.grade}
                    onChange={(e) => updateMark(i, "grade", e.target.value)}
                    className="cms-input w-20 py-1.5"
                  />
                ) : (
                  <span className="cms-chip">{m.grade}</span>
                )}
              </td>
              <td className="text-slate-700">
                <span
                  className={
                    m.isActive === false
                      ? "inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                      : "cms-chip"
                  }
                >
                  {m.isActive === false ? "Inactive" : "Active"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <div className="mt-4 px-1 pb-1">
          <button
            onClick={() => onSave && onSave(local)}
            className="cms-button cms-button-primary"
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
