import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  Database,
  Building2,
  Users,
  LogOut,
  ChevronLeft,
  Calendar,
  UserCheck,
  Search,
  BookOpen,
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  CalendarDays
} from 'lucide-react';

// Dynamic modules generator based on User Role (Super Admin, HOD, Staff, Student)
const getModulesForRole = (role) => {
  const isSuperAdmin = role === 'Super Admin' || role === 'Tenant Administrator';
  const isHOD = role === 'HOD';
  const isStaff = role === 'Staff';
  const isStudent = role === 'Student';

  const list = [];

  // 1. Home / Dashboard (Super Admin & HOD)
  if (isSuperAdmin || isHOD) {
    list.push({
      id: 'home',
      name: 'Home',
      parentTitle: 'Home',
      subtitle: isHOD ? 'Institutional Overview (View Only)' : 'Institutional Overview',
      icon: Home,
      defaultPath: '/',
      matchPrefix: (pathname) => pathname === '/',
      pages: [
        {
          path: '/',
          name: 'Dashboard Overview',
          icon: LayoutDashboard,
          hint: 'Key statistics & system metrics'
        }
      ]
    });
  }

  // 2. Master Module:
  // - Super Admin & HOD see Year, Staff, Department
  // - Staff & Student ONLY see Year Module!
  const masterPages = [
    {
      path: '/master/year',
      name: 'Year Master',
      icon: Calendar,
      hint: isHOD || isStaff || isStudent ? 'Academic cohorts & curriculum (View Only)' : 'Academic cohorts & curriculum'
    }
  ];

  if (isSuperAdmin || isHOD) {
    masterPages.push(
      {
        path: '/master/staff',
        name: 'Staff Master',
        icon: UserCheck,
        hint: isHOD ? 'Faculty registry (View Only)' : 'Faculty registry & assignments'
      },
      {
        path: '/master/department',
        name: 'Department Master',
        icon: Building2,
        hint: isHOD ? 'Academic departments (View Only)' : 'Academic departments & HODs'
      }
    );
  }

  list.push({
    id: 'master',
    name: isStaff || isStudent ? 'Year Module' : 'Master',
    parentTitle: isStaff || isStudent ? 'Year Module' : 'Master',
    subtitle: isStaff || isStudent ? 'Curriculum & Academic Cohorts' : isHOD ? 'Master Configuration (View Only)' : 'Master Configuration',
    icon: isStaff || isStudent ? Calendar : Database,
    defaultPath: '/master/year',
    matchPrefix: (pathname) => pathname.startsWith('/master'),
    pages: masterPages
  });

  // 3. Department Module (Super Admin, HOD, and Staff)
  if (isSuperAdmin || isHOD || isStaff) {
    const departmentPages = [];

    // Job Roster: HOD assigns & monitors; Staff views & updates duty status; Super Admin oversees
    departmentPages.push({
      path: '/department/job-roster',
      name: 'Job Roster',
      icon: ClipboardList,
      hint: isHOD
        ? 'Assign & track daily staff duties'
        : isStaff
        ? 'View & update my daily duties'
        : 'Department daily staff duties & coverage'
    });

    if (isSuperAdmin || isHOD) {
      departmentPages.push(
        {
          path: '/department/create-schedule',
          name: 'Create Schedule',
          icon: CalendarDays,
          hint: 'Design & publish semester timetable'
        },
        {
          path: '/department/student-lookup',
          name: 'Student Subject Lookup',
          icon: Search,
          hint: 'Curriculum validation & HOD'
        },
        {
          path: '/department/hod-overview',
          name: 'HOD Staff Overview',
          icon: BookOpen,
          hint: 'Departmental staff & subjects'
        }
      );
    }

    list.push({
      id: 'department',
      name: 'Department',
      parentTitle: 'Department',
      subtitle: isHOD
        ? 'Staff Operations & Daily Job Roster'
        : isStaff
        ? 'Daily Duties & Department Roster'
        : 'Department Workflows & Operations',
      icon: Building2,
      defaultPath: isStaff || isHOD ? '/department/job-roster' : '/department/student-lookup',
      matchPrefix: (pathname) => pathname.startsWith('/department'),
      pages: departmentPages
    });
  }

  // 4. Student Module (Super Admin, HOD, and Staff)
  if (isSuperAdmin || isHOD || isStaff) {
    list.push({
      id: 'student',
      name: 'Student',
      parentTitle: 'Student',
      subtitle: isStaff ? 'Student Directory & Lookup' : isHOD ? 'Student Directory (View Only)' : 'Student Directory',
      icon: Users,
      defaultPath: '/student',
      matchPrefix: (pathname) => pathname.startsWith('/student'),
      pages: [
        {
          path: '/student',
          name: 'Student Directory',
          icon: Users,
          hint: isStaff || isHOD ? 'Student academic profiles (View Only)' : 'Enrollment & academic records'
        }
      ]
    });
  }

  // 5. Attendance Module (All roles with tailored interfaces)
  list.push({
    id: 'attendance',
    name: 'Attendance',
    parentTitle: 'Attendance',
    subtitle: isStudent
      ? 'Personal Attendance Records'
      : isStaff
      ? 'Mark & Track Student Attendance'
      : isHOD
      ? 'Cohort Attendance Analytics (View Only)'
      : 'Attendance Management & Tracking',
    icon: CalendarCheck,
    defaultPath: '/attendance',
    matchPrefix: (pathname) => pathname.startsWith('/attendance'),
    pages: [
      {
        path: '/attendance',
        name: isStudent ? 'My Attendance' : isStaff || isSuperAdmin ? 'Mark Attendance' : 'Attendance Overview',
        icon: CalendarCheck,
        hint: isStudent
          ? 'Personal attendance percentage & eligibility'
          : isStaff || isSuperAdmin
          ? 'Record daily classroom lecture attendance'
          : 'Inspect attendance sheets and analytics'
      }
    ]
  });

  return list;
};

export default function Sidebar() {
  const { logout, tenant, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const role = user?.role || 'Staff';
  const modules = getModulesForRole(role);

  // Determine current active module from route
  const currentRouteModule =
    modules.find((m) => m.matchPrefix(location.pathname)) || modules[0] || {};

  // Dual navbar state:
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState(currentRouteModule.id || 'master');

  // Synchronize selected module if route changes externally
  useEffect(() => {
    const matched = modules.find((m) => m.matchPrefix(location.pathname));
    if (matched) {
      setSelectedModuleId(matched.id);
    } else if (modules.length > 0) {
      setSelectedModuleId(modules[0].id);
    }
  }, [location.pathname, role]);

  const activeModuleData =
    modules.find((m) => m.id === selectedModuleId) || modules[0] || { pages: [], icon: Home };
  const ActiveModuleIcon = activeModuleData.icon || Home;

  const handleFirstNavClick = (mod) => {
    setSelectedModuleId(mod.id);
    if (!isOpen) {
      setIsOpen(true);
    }
    if (mod.defaultPath) {
      navigate(mod.defaultPath);
    }
  };

  return (
    <div className="flex h-full shrink-0 z-20">
      {/* ============================================================== */}
      {/* FIRST NAVBAR: Slim Rail (Icons alone for Home, Master, Dept, Student) */}
      {/* ============================================================== */}
      <aside className="w-[72px] bg-[#C66B45] flex flex-col justify-between items-center py-6 h-full shrink-0 shadow-md border-r border-[#B85D38] select-none">
        {/* Primary Navigation Icons Alone: Filtered by role */}
        <nav className="flex flex-col items-center space-y-3.5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isSelected = selectedModuleId === mod.id;
            const isRouteActive = mod.matchPrefix(location.pathname);

            return (
              <div key={mod.id} className="relative group">
                <button
                  onClick={() => handleFirstNavClick(mod)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 ${
                    isSelected || isRouteActive
                      ? 'bg-white text-[#C66B45] shadow-md font-bold'
                      : 'text-white/80 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </button>

                {/* Tooltip on hover */}
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#553729] text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                  {mod.name}
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-[#553729]" />
                </div>
              </div>
            );
          })}
        </nav>

        {/* Bottom: Logout Icon Alone */}
        <div className="relative group">
          <button
            onClick={logout}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-all shadow-xs"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#553729] text-white text-xs font-semibold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            Logout
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-[#553729]" />
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* SECOND NAVBAR: Flyout Drawer (Parent Module Name + Sub-Pages)   */}
      {/* ============================================================== */}
      {isOpen && (
        <aside className="w-64 bg-[#FFFDFB] border-r border-[#EBD9CB] flex flex-col justify-between h-full shrink-0 z-10 shadow-sm animate-in slide-in-from-left duration-200 select-none">
          <div>
            {/* Header: Parent Module Name & Collapse button */}
            <div className="p-4 border-b border-[#EBD9CB] bg-[#FCE6D8]/30 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#C66B45]/10 text-[#C66B45] flex items-center justify-center shrink-0">
                  <ActiveModuleIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#929071] block">
                    Module
                  </span>
                  <h2 className="text-sm font-bold text-[#553729] truncate">
                    {activeModuleData.parentTitle}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                title="Collapse sidebar"
                className="p-1.5 rounded-lg text-[#553729]/60 hover:text-[#553729] hover:bg-[#FCE6D8] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Remaining Pages for the Parent Module */}
            <div className="p-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-12rem)]">
              <p className="px-2 text-[10px] uppercase font-bold tracking-wider text-[#929071] mb-2">
                Pages ({activeModuleData.pages.length})
              </p>

              {activeModuleData.pages.map((page) => {
                const isPageActive = location.pathname === page.path;
                const PageIcon = page.icon;

                return (
                  <NavLink
                    key={page.path}
                    to={page.path}
                    className={`flex items-start p-2.5 rounded-xl text-xs transition-all duration-150 ${
                      isPageActive
                        ? 'bg-[#C66B45] text-white font-semibold shadow-xs'
                        : 'text-[#553729] hover:bg-[#FCE6D8]'
                    }`}
                  >
                    <PageIcon
                      className={`w-4 h-4 mt-0.5 mr-2.5 shrink-0 ${
                        isPageActive ? 'text-white' : 'text-[#C66B45]'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate leading-snug">
                        {page.name}
                      </p>
                      {page.hint && (
                        <p
                          className={`text-[10px] mt-0.5 truncate leading-tight ${
                            isPageActive ? 'text-white/80' : 'text-[#929071]'
                          }`}
                        >
                          {page.hint}
                        </p>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Footer: Institutional Context & Status */}
          <div className="p-3 border-t border-[#EBD9CB] bg-[#FCE6D8]/20 text-[11px] text-[#929071] flex items-center justify-between">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              <span className="truncate">Single Tenant Active</span>
            </span>
            <span className="font-bold text-[#C66B45] text-[10px] ml-1">
              ABC_ENG
            </span>
          </div>
        </aside>
      )}
    </div>
  );
}
