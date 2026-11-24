const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AcademicYear = sequelize.define('AcademicYear', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    start_date: {
      type: DataTypes.DATEONLY
    },
    end_date: {
      type: DataTypes.DATEONLY
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'archived'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'academic_years',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['tenant_id', 'code']
      }
    ]
  });

  return AcademicYear;
};
