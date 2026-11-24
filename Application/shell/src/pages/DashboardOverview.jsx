import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';
import PageHeader from '../components/layout/PageHeader';
import Loader from '../components/common/Loader';
import {
  Calendar,
  Users,
  Building2,
  GraduationCap,
  ArrowRight,
  Database,
  Search,
  BookOpen,
  Sparkles
} from 'lucide-react';

export default function DashboardOverview() {
  const { user, tenant } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await authService.getTenantSummary();
        setSummary(res.data);
      } catch (err) {
        console.error('Failed to load summary:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.name || 'Administrator'}!`}
        subtitle={`Institutional overview for ${tenant?.name || 'ABC College of Engineering'}`}
      />

      <div className="bg-[#FCE6D8] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-[#C66B45] mb-1">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Campus Session Status
          </span>
          <h2 className="text-xl font-bold text-[#553729]">Academic Year Active</h2>
          <p className="text-sm text-[#929071] mt-0.5">
            Institutional tenancy scoped to {tenant?.name || 'ABC College of Engineering'}
          </p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xs uppercase font-bold tracking-wider text-[#929071]">Today's Date</p>
          <p className="text-base font-bold text-[#553729]">
            {summary?.currentDate || new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {loading ? (
        <Loader message="Loading institutional statistics..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-[#929071]">Academic Years</span>
              <div className="w-10 h-10 rounded-xl bg-[#FCE6D8] text-[#C66B45] flex items-center justify-center">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold text-[#553729]">{summary?.totalAcademicYears || 4}</p>
              <p className="text-xs text-[#929071] mt-1 font-medium">Standard 4-Year B.Tech Program</p>
            </div>
          </div>

          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-[#929071]">Faculty & Staff</span>
              <div className="w-10 h-10 rounded-xl bg-[#F5D2C2] text-[#AD5938] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold text-[#553729]">{summary?.totalStaff || 11}</p>
              <p className="text-xs text-[#929071] mt-1 font-medium">Professors, HODs & Lecturers</p>
            </div>
          </div>

          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-[#929071]">Departments</span>
              <div className="w-10 h-10 rounded-xl bg-[#FCE6D8] text-[#C66B45] flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold text-[#553729]">{summary?.totalDepartments || 4}</p>
              <p className="text-xs text-[#929071] mt-1 font-medium">CSE, ECE, MECH, CIVIL</p>
            </div>
          </div>

          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-[#929071]">Enrolled Students</span>
              <div className="w-10 h-10 rounded-xl bg-[#F5D2C2] text-[#C66B45] flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-extrabold text-[#553729]">{summary?.totalStudents || 24}</p>
              <p className="text-xs text-[#929071] mt-1 font-medium">Active Undergraduate Batches</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-base font-bold text-[#553729] mb-4">Quick Module Navigation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/master/year"
            className="group bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-[#C66B45] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#FCE6D8] text-[#C66B45] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#553729] mb-1">Master Data Module</h4>
              <p className="text-xs text-[#929071] leading-relaxed">
                Institutional reference datasets: Year Master, Staff Master, and Department Master registries.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#EBD9CB] flex items-center text-xs font-bold text-[#C66B45]">
              <span>Manage Master Data</span>
              <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/student"
            className="group bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-[#C66B45] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#F5D2C2] text-[#AD5938] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#553729] mb-1">Student Module</h4>
              <p className="text-xs text-[#929071] leading-relaxed">
                Lookup enrolled students, search by roll number, department and verify strictly scoped subjects.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#EBD9CB] flex items-center text-xs font-bold text-[#C66B45]">
              <span>Lookup Students</span>
              <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            to="/department/student-lookup"
            className="group bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-[#C66B45] transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#FCE6D8] text-[#C66B45] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-[#553729] mb-1">Department Module</h4>
              <p className="text-xs text-[#929071] leading-relaxed">
                Student subject lookup workflow and authorized HOD faculty & teaching assignment overviews.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#EBD9CB] flex items-center text-xs font-bold text-[#C66B45]">
              <span>Open Workflows</span>
              <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
