const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StaffSubjectAssignment = sequelize.define('StaffSubjectAssignment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    staff_id: {
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
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'staff_subject_assignments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['tenant_id', 'staff_id', 'subject_id', 'academic_year_id']
      }
    ]
  });

  return StaffSubjectAssignment;
};
