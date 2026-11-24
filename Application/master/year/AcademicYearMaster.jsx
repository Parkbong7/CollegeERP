import React from 'react';

export default function AcademicYearMaster() {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Academic Year & Term Configuration</h3>
        <button className="btn btn-primary">+ Create Academic Year</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Academic Year</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Current Active</th>
            <th>Terms / Semesters</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>2026 - 2027</td>
            <td>01 Jul 2026</td>
            <td>30 Jun 2027</td>
            <td><span className="badge badge-active">Current Session</span></td>
            <td>Odd & Even Semesters</td>
          </tr>
          <tr>
            <td>2025 - 2026</td>
            <td>01 Jul 2025</td>
            <td>30 Jun 2026</td>
            <td><span className="badge badge-inactive">Archived</span></td>
            <td>Completed</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
