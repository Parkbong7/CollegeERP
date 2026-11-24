import React, { useState, useEffect } from 'react';
import { useAuth } from '../shell/src/context/AuthContext';
import { departmentService } from '../shell/src/services/departmentService';
import { useToast } from '../shell/src/components/feedback/Toast';
import PageHeader from '../shell/src/components/layout/PageHeader';
import DataTable from '../shell/src/components/tables/DataTable';
import StatusBadge from '../shell/src/components/common/StatusBadge';
import Button from '../shell/src/components/common/Button';
import Select from '../shell/src/components/forms/Select';
import FormField from '../shell/src/components/forms/FormField';
import Loader from '../shell/src/components/common/Loader';
import EmptyState from '../shell/src/components/common/EmptyState';
import {
  Award,
  Building2,
  Users,
  BookOpen,
  Calendar,
  Mail,
  Phone,
  ShieldAlert,
  ChevronRight,
  Briefcase
} from 'lucide-react';

export default function HODStaffOverviewPage() {
  const { user } = useAuth();
  const { showError } = useToast();

  const isAdmin = user?.role === 'Admin' || user?.role === 'Super Admin' || user?.role === 'Sub Admin' || user?.role === 'Tenant Administrator';
  const isHOD = user?.role === 'HOD';

  // HOD options for Admin dropdown
  const [hodList, setHodList] = useState([]);
  const [selectedHodStaffId, setSelectedHodStaffId] = useState('');

  // Overview data
  const [overviewData, setOverviewData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load all department HOD options for institutional overview
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const listRes = await departmentService.getHODList();
        const list = listRes.data || [];
        setHodList(list);

        const defaultHodId = list.length > 0 ? list[0].hodStaffId : null;
        if (defaultHodId) {
          setSelectedHodStaffId(defaultHodId);
          await fetchOverview(defaultHodId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        showError(err.message || 'Failed to initialize department overview');
        setLoading(false);
      }
    }
    init();
  }, []);

  const fetchOverview = async (hodStaffId = null) => {
    setLoading(true);
    try {
      const res = await departmentService.getHODStaffOverview(hodStaffId);
      setOverviewData(res.data);
    } catch (err) {
      showError(err.message || 'Failed to fetch HOD department staff overview');
      setOverviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleHodSelectChange = (e) => {
    const val = e.target.value;
    setSelectedHodStaffId(val);
    if (val) {
      fetchOverview(val);
    }
  };

  // Staff table columns matching Workflow 7.2 requirements
  const staffColumns = [
    {
      header: 'Staff Member',
      accessor: 'staffName',
      render: (row) => (
        <div>
          <p className="font-semibold text-[#553729]">{row.staffName}</p>
          <p className="text-xs text-[#929071] font-mono">ID: {row.staffId}</p>
        </div>
      )
    },
    {
      header: 'Designation',
      accessor: 'designation',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#FCE6D8] text-[#553729]">
          {row.designation}
        </span>
      )
    },
    {
      header: 'Contact',
      accessor: 'email',
      render: (row) => (
        <div className="text-xs text-[#929071]">
          <p className="flex items-center gap-1 text-[#553729]">
            <Mail className="w-3 h-3 text-[#C66B45]" /> {row.email}
          </p>
          {row.phone && (
            <p className="flex items-center gap-1 mt-0.5">
              <Phone className="w-3 h-3 text-[#C66B45]" /> {row.phone}
            </p>
          )}
        </div>
      )
    },
    {
      header: 'Assigned Subjects',
      accessor: 'subjectsTeaching',
      render: (row) => (
        <span className="text-xs font-medium text-[#553729]">
          {row.subjectsTeaching}
        </span>
      )
    },
    {
      header: 'Academic Years Taught',
      accessor: 'academicYears',
      render: (row) => (
        <span className="text-xs font-bold text-[#C66B45] bg-[#FCE6D8]/60 px-2 py-0.5 rounded">
          {row.academicYears}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department HOD & Staff Overview"
        subtitle="Department faculty roster, subject distribution, and academic year assignments overseen by HOD"
        breadcrumbs={[
          { label: 'Department', path: '/department/student-lookup' },
          { label: 'HOD Staff Overview' }
        ]}
      />

      {/* Department & HOD Switcher Bar */}
      <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#C66B45]" />
          <div>
            <h3 className="text-sm font-bold text-[#553729]">Select Academic Department / HOD</h3>
            <p className="text-xs text-[#929071]">Inspect departmental faculty roster, teaching load, and active courses</p>
          </div>
        </div>

        <div className="w-full sm:w-80">
          <Select
            name="hodSelector"
            value={selectedHodStaffId}
            onChange={handleHodSelectChange}
            options={hodList.map((h) => ({
              value: h.hodStaffId,
              label: `${h.staffName} (${h.departmentCode} - ${h.departmentName})`
            }))}
            placeholder="-- Select Department HOD --"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="py-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <Loader message="Loading department staff and subject allocations..." />
        </div>
      )}

      {/* Display Overview */}
      {!loading && overviewData && (
        <div className="space-y-6">
          {/* HOD & Department Summary Card */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EBD9CB]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FCE6D8] border border-[#EBD9CB] flex items-center justify-center text-[#C66B45] font-bold text-xl shadow-xs">
                  {overviewData.department?.code}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-[#553729]">
                      Department of {overviewData.department?.name}
                    </h2>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FCE6D8] text-[#C66B45]">
                      {overviewData.department?.code}
                    </span>
                  </div>
                  <p className="text-sm text-[#929071] mt-0.5 font-medium">
                    Department Faculty & Course Distribution
                  </p>
                </div>
              </div>

              {/* HOD Profile Pill */}
              <div className="bg-white/90 border border-[#EBD9CB] p-4 rounded-xl flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-lg bg-[#C66B45] text-white flex items-center justify-center shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#929071]">
                    Head of Department (HOD)
                  </span>
                  <p className="text-base font-bold text-[#553729]">{overviewData.hod?.name}</p>
                  <p className="text-xs text-[#929071]">{overviewData.hod?.designation} • ID: {overviewData.hod?.employeeId}</p>
                </div>
              </div>
            </div>

            {/* Quick Department Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-3.5 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center gap-3">
                <Users className="w-5 h-5 text-[#C66B45]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#929071] block">Total Faculty</span>
                  <p className="text-base font-bold text-[#553729]">{overviewData.staff?.length || 0} Staff Members</p>
                </div>
              </div>

              <div className="p-3.5 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#C66B45]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#929071] block">Department</span>
                  <p className="text-base font-bold text-[#553729]">{overviewData.department?.name}</p>
                </div>
              </div>

              <div className="p-3.5 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#C66B45]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#929071] block">Active Cohorts</span>
                  <p className="text-base font-bold text-[#C66B45]">Year 1 - Year 4</p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Staff & Teaching Allocation Table (Workflow 7.2) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#C66B45]" />
                <h3 className="text-base font-bold text-[#553729]">
                  Faculty Roster & Teaching Allocations ({overviewData.department?.code})
                </h3>
              </div>
              <span className="text-xs text-[#929071]">
                {overviewData.staff?.length} active faculty in department
              </span>
            </div>

            <DataTable
              columns={staffColumns}
              data={overviewData.staff || []}
              loading={false}
              emptyMessage={`No staff members found for ${overviewData.department?.name}`}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !overviewData && (isAdmin || isHOD) && (
        <div className="p-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <EmptyState
            title="No department overview data available"
            description="Ensure the department and HOD assignments are configured in Master Configuration."
          />
        </div>
      )}
    </div>
  );
}
