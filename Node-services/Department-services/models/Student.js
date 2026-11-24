const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Student = sequelize.define('Student', {
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
    roll_number: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING
    },
    phone: {
      type: DataTypes.STRING
    },
    semester: {
      type: DataTypes.STRING,
      defaultValue: 'Semester 1'
    },
    cgpa: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'graduated'),
      defaultValue: 'active'
    }
  }, {
    tableName: 'students',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['tenant_id', 'roll_number']
      }
    ]
  });

  return Student;
};
