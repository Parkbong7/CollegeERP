const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const JobRoster = sequelize.define('JobRoster', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    department_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    staff_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    assigned_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    task_title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    task_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    shift: {
      type: DataTypes.STRING,
      defaultValue: 'Full Day (09:00 - 17:00)'
    },
    priority: {
      type: DataTypes.STRING,
      defaultValue: 'medium'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'assigned'
    },
    completion_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'job_rosters',
    timestamps: true,
    underscored: true
  });

  return JobRoster;
};
