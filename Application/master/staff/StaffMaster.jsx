import React from 'react';

export default function StaffMaster() {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Staff & Faculty Master Directory</h3>
        <button className="btn btn-primary">+ Add Faculty Member</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Employee Code</th>
            <th>Faculty Name</th>
            <th>Designation</th>
            <th>Department</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>STF-0101</td>
            <td>Dr. Ramesh Sharma</td>
            <td>Professor & HOD</td>
            <td>Computer Science & Eng.</td>
            <td>ramesh@college.edu</td>
          </tr>
          <tr>
            <td>STF-0205</td>
            <td>Dr. Sunita Rao</td>
            <td>Associate Professor</td>
            <td>Electronics & Comm.</td>
            <td>sunita@college.edu</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
