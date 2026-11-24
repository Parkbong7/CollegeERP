import React from 'react';

export default function DepartmentMaster() {
  return (
    <div className="card">
      <div className="card-header">
        <h3>Department Master Configuration</h3>
        <button className="btn btn-primary">+ Add New Department</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Dept Code</th>
            <th>Department Name</th>
            <th>Annual Intake</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>CSE</td>
            <td>Computer Science & Engineering</td>
            <td>120</td>
            <td><span className="badge badge-active">Active</span></td>
            <td><button className="btn btn-sm">Edit</button></td>
          </tr>
          <tr>
            <td>ECE</td>
            <td>Electronics & Communication Engineering</td>
            <td>120</td>
            <td><span className="badge badge-active">Active</span></td>
            <td><button className="btn btn-sm">Edit</button></td>
          </tr>
          <tr>
            <td>MECH</td>
            <td>Mechanical Engineering</td>
            <td>60</td>
            <td><span className="badge badge-active">Active</span></td>
            <td><button className="btn btn-sm">Edit</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
