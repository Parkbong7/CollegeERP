import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { 
  GraduationCap, 
  Lock, 
  Building, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Mail, 
  UserCheck, 
  Shield
} from 'lucide-react';
import Button from '../../components/common/Button';
import Input from '../../components/forms/Input';
import FormField from '../../components/forms/FormField';

const DEPARTMENTS = [
  { code: 'CSE', name: 'Computer Science & Engineering' },
  { code: 'ECE', name: 'Electronics & Communication Engineering' },
  { code: 'MECH', name: 'Mechanical Engineering' },
  { code: 'CIVIL', name: 'Civil Engineering' },
  { code: 'AIDS', name: 'Artificial Intelligence & Data Science' }
];

const ROLE_CONFIGS = [
  { id: 'Student', label: 'Student', icon: GraduationCap, color: '#C66B45', desc: 'Personal attendance & enrolled curriculum' },
  { id: 'Staff', label: 'Staff / Faculty', icon: UserCheck, color: '#2563EB', desc: 'Student module & mark attendance' },
  { id: 'HOD', label: 'HOD', icon: Building, color: '#7C3AED', desc: 'Department-wide view-only inspection' },
  { id: 'Super Admin', label: 'Super Admin', icon: Shield, color: '#059669', desc: 'Full institutional management' }
];

export default function LoginPage() {
  const { tenantName } = useParams();
  const currentTenant = (tenantName || 'ABC').toUpperCase();

  const [activeRole, setActiveRole] = useState('Student');
  const [mailId, setMailId] = useState('aarav.p@student.abccollege.edu');
  const [department, setDepartment] = useState('CSE');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const collegeDisplayName = currentTenant === 'ABC' 
    ? 'ABC College of Engineering' 
    : `${currentTenant} College of Engineering`;

  // Switch role tab
  const handleSelectRole = (roleId) => {
    setActiveRole(roleId);
    if (roleId === 'Student') {
      setMailId('aarav.p@student.abccollege.edu');
      setDepartment('CSE');
    } else if (roleId === 'Staff') {
      setMailId('staff.arun@abccollege.edu');
      setDepartment('CSE');
    } else if (roleId === 'HOD') {
      setMailId('hod.cse@abccollege.edu');
      setDepartment('CSE');
    } else if (roleId === 'Super Admin') {
      setMailId('admin@abccollege.edu');
      setDepartment('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mailId || !password) {
      showError('Please enter your Mail ID and Password');
      return;
    }

    setLoading(true);
    try {
      const data = await login(mailId, password, currentTenant, {
        departmentCode: activeRole !== 'Super Admin' ? department : undefined,
        department: activeRole !== 'Super Admin' ? department : undefined,
        role: activeRole
      });

      const userRole = data.user?.role || activeRole;
      const deptCode = activeRole !== 'Super Admin' ? (data.user?.department?.code || department) : null;
      const roll = data.user?.student?.rollNumber || data.user?.rollNumber;

      showSuccess(
        `Welcome, ${data.user?.name || 'User'}! Authenticated as ${userRole}${deptCode ? ` [${deptCode}]` : ''}${roll ? ` (${roll})` : ''}.`
      );

      // Role-specific landing destinations
      if (userRole === 'Student') {
        navigate('/attendance');
      } else if (userRole === 'Staff') {
        navigate('/department/job-roster');
      } else {
        navigate('/');
      }
    } catch (err) {
      showError(err.message || 'Authentication failed. Please check your credentials and department.');
    } finally {
      setLoading(false);
    }
  };

  const currentRoleObj = ROLE_CONFIGS.find((r) => r.id === activeRole) || ROLE_CONFIGS[0];

  return (
    <div className="min-h-screen bg-[#FFF8F1] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-xl w-full bg-[#FFF8F1] border border-[#EBD9CB] rounded-3xl shadow-xl overflow-hidden">
        {/* Brand Header */}
        <div className="bg-[#FCE6D8] p-7 text-center border-b border-[#EBD9CB] relative">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#C66B45] text-white flex items-center justify-center shadow-md mb-2.5">
            <GraduationCap className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FFF8F1] text-[#C66B45] border border-[#EBD9CB] shadow-2xs mb-1.5">
            <Sparkles className="w-3 h-3" /> Institutional Portal ({currentTenant})
          </span>
          <h2 className="text-xl font-bold text-[#553729]">{collegeDisplayName}</h2>
          <p className="text-xs text-[#929071] font-medium mt-0.5">
            Role-Based Portal Authentication & Academic Management
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="bg-[#FFF8F1] border-b border-[#EBD9CB] p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#929071] block text-center mb-2">
            Select Role to Sign In
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROLE_CONFIGS.map((r) => {
              const Icon = r.icon;
              const isActive = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectRole(r.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition-all ${
                    isActive
                      ? 'border-[#C66B45] bg-[#FCE6D8] text-[#C66B45] font-bold shadow-xs ring-2 ring-[#C66B45]/20'
                      : 'border-[#EBD9CB] bg-white text-[#553729] hover:bg-[#FCE6D8]/30'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-[#C66B45]' : 'text-[#929071]'}`} />
                  <span className="text-xs font-bold">{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Active Role Notice */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-[#553729]">
            <ShieldCheck className="w-5 h-5 text-[#C66B45] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#553729]">
                {currentRoleObj.label} Portal
              </p>
              <p className="text-[#929071] mt-0.5">
                {currentRoleObj.desc}. {activeRole === 'Super Admin' ? 'Please enter your Administrator credentials below.' : 'Please enter your Mail ID and Department below.'}
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={activeRole === 'Super Admin' ? 'space-y-4' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
              {/* Mail ID */}
              <FormField 
                label={
                  activeRole === 'Student' 
                    ? 'Student Mail ID' 
                    : activeRole === 'Staff' 
                    ? 'Staff Mail ID' 
                    : activeRole === 'HOD' 
                    ? 'HOD Mail ID' 
                    : 'Administrator Mail / Username'
                } 
                required 
                hint={activeRole === 'Super Admin' ? 'Institutional administrator identifier' : 'Institutional email address'}
              >
                <Input
                  type="text"
                  name="mailId"
                  value={mailId}
                  onChange={(e) => setMailId(e.target.value)}
                  placeholder={
                    activeRole === 'Student'
                      ? 'aarav.p@student.abccollege.edu'
                      : activeRole === 'Staff'
                      ? 'staff.arun@abccollege.edu'
                      : activeRole === 'HOD'
                      ? 'hod.cse@abccollege.edu'
                      : 'admin@abccollege.edu'
                  }
                  icon={Mail}
                  required
                />
              </FormField>

              {/* Department - Only shown for Student, Staff, and HOD */}
              {activeRole !== 'Super Admin' && (
                <FormField 
                  label={
                    activeRole === 'Student' 
                      ? 'Student Department' 
                      : activeRole === 'Staff' 
                      ? 'Staff Department' 
                      : 'HOD Department'
                  } 
                  required
                  hint="Assigned academic department"
                >
                  <div className="relative">
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#EBD9CB] bg-white text-sm text-[#553729] focus:outline-none focus:ring-2 focus:ring-[#C66B45]/30 focus:border-[#C66B45] transition-all font-medium"
                      required
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} - {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormField>
              )}
            </div>

            {/* Password */}
            <FormField label="Password" required hint="Institutional account password">
              <Input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={Lock}
                required
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2 font-bold py-3 text-base shadow-sm"
            >
              <span>Sign In as {activeRole}</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
