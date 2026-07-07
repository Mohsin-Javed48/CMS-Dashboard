"use client";

import React from "react";
import type { Student } from "../lib/types";

export default function StudentTable({
  students,
  onRowClick,
}: {
  students: Student[];
  onRowClick?: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="cms-data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Student ID</th>
            <th>CGPA</th>
            <th>Phone</th>
            <th>Courses</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr
              key={s._id ?? s.id ?? s.studentId}
              className="cursor-pointer bg-white transition-colors hover:bg-teal-50/45"
              onClick={() => onRowClick && onRowClick(String(s.studentId))}
            >
              <td className="font-medium text-slate-800">{s.name}</td>
              <td className="text-slate-600">{s.studentId}</td>
              <td className="text-slate-600">{(s.cgpa ?? 0).toFixed(2)}</td>
              <td className="text-slate-600">{s.phone}</td>
              <td className="text-slate-600">{s.courses?.length ?? 0}</td>
              <td>
                <span
                  className={
                    s.isActive
                      ? "cms-chip"
                      : "inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                  }
                >
                  {s.isActive ? "Active" : "Inactive"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
