const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClassSchedule = sequelize.define('ClassSchedule', {
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
    academic_year_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    semester: {
      type: DataTypes.STRING,
      allowNull: false
    },
    day_of_week: {
      type: DataTypes.STRING,
      allowNull: false
    },
    period_number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    start_time: {
      type: DataTypes.STRING,
      allowNull: false
    },
    end_time: {
      type: DataTypes.STRING,
      allowNull: false
    },
    subject_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    subject_code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    subject_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    staff_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    staff_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    room_number: {
      type: DataTypes.STRING,
      defaultValue: 'Lecture Hall 101'
    },
    schedule_type: {
      type: DataTypes.STRING,
      defaultValue: 'Lecture'
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'published'
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'class_schedules',
    timestamps: true,
    underscored: true
  });

  return ClassSchedule;
};
