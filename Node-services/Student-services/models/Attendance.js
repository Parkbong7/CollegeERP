const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    student_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    subject_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    academic_year_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    department_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    staff_id: {
      type: DataTypes.UUID,
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'present'
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'attendances',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['tenant_id', 'student_id', 'subject_id', 'date']
      },
      {
        fields: ['tenant_id', 'academic_year_id', 'department_id', 'subject_id', 'date']
      }
    ]
  });

  return Attendance;
};
