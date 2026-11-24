const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HODAssignment = sequelize.define('HODAssignment', {
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
    start_date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'hod_assignments',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['tenant_id', 'department_id', 'is_active']
      }
    ]
  });

  return HODAssignment;
};
