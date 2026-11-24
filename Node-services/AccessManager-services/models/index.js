const sequelize = require('../config/db.config');

const TenantModel = require('./Tenant');
const RoleModel = require('./Role');
const PermissionModel = require('./Permission');
const UserModel = require('./User');
const DepartmentModel = require('./Department');
const AcademicYearModel = require('./AcademicYear');
const SubjectModel = require('./Subject');
const StaffModel = require('./Staff');
const StudentModel = require('./Student');
const HODAssignmentModel = require('./HODAssignment');
const StaffSubjectAssignmentModel = require('./StaffSubjectAssignment');

const models = {
  Tenant: TenantModel(sequelize),
  Role: RoleModel(sequelize),
  Permission: PermissionModel(sequelize),
  User: UserModel(sequelize),
  Department: DepartmentModel(sequelize),
  AcademicYear: AcademicYearModel(sequelize),
  Subject: SubjectModel(sequelize),
  Staff: StaffModel(sequelize),
  Student: StudentModel(sequelize),
  HODAssignment: HODAssignmentModel(sequelize),
  StaffSubjectAssignment: StaffSubjectAssignmentModel(sequelize)
};

// Associations

// Tenant scoping
models.Tenant.hasMany(models.Department, { foreignKey: 'tenant_id' });
models.Department.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });

models.Tenant.hasMany(models.AcademicYear, { foreignKey: 'tenant_id' });
models.AcademicYear.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });

models.Tenant.hasMany(models.Subject, { foreignKey: 'tenant_id' });
models.Subject.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });

models.Tenant.hasMany(models.Staff, { foreignKey: 'tenant_id' });
models.Staff.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });

models.Tenant.hasMany(models.User, { foreignKey: 'tenant_id' });
models.User.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });

models.Tenant.hasMany(models.Student, { foreignKey: 'tenant_id' });
models.Student.belongsTo(models.Tenant, { foreignKey: 'tenant_id' });

// Role & Permission & User
models.Role.hasMany(models.User, { foreignKey: 'role_id' });
models.User.belongsTo(models.Role, { foreignKey: 'role_id' });

// Department associations
models.Department.hasMany(models.Subject, { foreignKey: 'department_id' });
models.Subject.belongsTo(models.Department, { foreignKey: 'department_id' });

models.Department.hasMany(models.Staff, { foreignKey: 'department_id' });
models.Staff.belongsTo(models.Department, { foreignKey: 'department_id' });

models.Department.hasMany(models.Student, { foreignKey: 'department_id' });
models.Student.belongsTo(models.Department, { foreignKey: 'department_id' });

models.Department.hasMany(models.User, { foreignKey: 'department_id' });
models.User.belongsTo(models.Department, { foreignKey: 'department_id' });

models.Department.hasOne(models.HODAssignment, { foreignKey: 'department_id' });
models.HODAssignment.belongsTo(models.Department, { foreignKey: 'department_id' });

// AcademicYear associations
models.AcademicYear.hasMany(models.Subject, { foreignKey: 'academic_year_id' });
models.Subject.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id' });

models.AcademicYear.hasMany(models.Student, { foreignKey: 'academic_year_id' });
models.Student.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id' });

// Staff associations
models.Staff.hasOne(models.User, { foreignKey: 'staff_id' });
models.User.belongsTo(models.Staff, { foreignKey: 'staff_id' });

// Student associations
models.Student.hasOne(models.User, { foreignKey: 'student_id' });
models.User.belongsTo(models.Student, { foreignKey: 'student_id' });

models.Staff.hasMany(models.HODAssignment, { foreignKey: 'staff_id' });
models.HODAssignment.belongsTo(models.Staff, { foreignKey: 'staff_id' });

models.Staff.hasMany(models.StaffSubjectAssignment, { foreignKey: 'staff_id' });
models.StaffSubjectAssignment.belongsTo(models.Staff, { foreignKey: 'staff_id' });

// Staff Subject Assignment
models.Subject.hasMany(models.StaffSubjectAssignment, { foreignKey: 'subject_id' });
models.StaffSubjectAssignment.belongsTo(models.Subject, { foreignKey: 'subject_id' });

models.AcademicYear.hasMany(models.StaffSubjectAssignment, { foreignKey: 'academic_year_id' });
models.StaffSubjectAssignment.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id' });

models.Department.hasMany(models.StaffSubjectAssignment, { foreignKey: 'department_id' });
models.StaffSubjectAssignment.belongsTo(models.Department, { foreignKey: 'department_id' });

models.sequelize = sequelize;
module.exports = models;
