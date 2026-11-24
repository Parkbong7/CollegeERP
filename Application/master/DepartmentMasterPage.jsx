import React, { useState, useEffect } from 'react';
import { masterService } from '../shell/src/services/masterService';
import { useAuth } from '../shell/src/context/AuthContext';
import { useToast } from '../shell/src/components/feedback/Toast';
import PageHeader from '../shell/src/components/layout/PageHeader';
import DataTable from '../shell/src/components/tables/DataTable';
import StatusBadge from '../shell/src/components/common/StatusBadge';
import Button from '../shell/src/components/common/Button';
import Input from '../shell/src/components/forms/Input';
import Select from '../shell/src/components/forms/Select';
import FormField from '../shell/src/components/forms/FormField';
import FormActions from '../shell/src/components/forms/FormActions';
import Modal from '../shell/src/components/common/Modal';
import Loader from '../shell/src/components/common/Loader';
import EmptyState from '../shell/src/components/common/EmptyState';
import {
  Building2,
  Search,
  Users,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Layers,
  Mail,
  ChevronRight,
  TrendingUp,
  Plus,
  UserCheck
} from 'lucide-react';

export default function DepartmentMasterPage() {
  const { showSuccess, showError } = useToast();

  // Search & Filter state
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [searchNameQuery, setSearchNameQuery] = useState('');
  const [filterCode, setFilterCode] = useState('');
  const [searching, setSearching] = useState(false);

  // Search results list (when searching via query / code)
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Active department overview, staff, student counts
  const [overview, setOverview] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [studentCounts, setStudentCounts] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // All faculty options for HOD assignment
  const [allStaffOptions, setAllStaffOptions] = useState([]);

  // Create Department Modal
  const [createDeptModalOpen, setCreateDeptModalOpen] = useState(false);
  const [createDeptLoading, setCreateDeptLoading] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', description: '', hodStaffId: '' });

  // Assign HOD Modal
  const [assignHodModalOpen, setAssignHodModalOpen] = useState(false);
  const [assignHodLoading, setAssignHodLoading] = useState(false);
  const [newHodStaffId, setNewHodStaffId] = useState('');

  // Current user role authorization (Super Admin vs HOD / Staff / Student / Sub Admin)
  const authContext = useAuth ? useAuth() : null;
  const currentUser = authContext?.user || (() => {
    try {
      const raw = localStorage.getItem('college_erp_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = currentUser?.role === 'Super Admin' || currentUser?.role === 'Tenant Administrator';

  // Initial load: populate department dropdown list & faculty options
  const loadDepartments = async () => {
    try {
      const [deptRes, staffRes] = await Promise.all([
        masterService.searchDepartments({ all: 'true' }),
        masterService.searchStaff({ all: 'true' })
      ]);
      setDepartmentOptions(deptRes.data || []);
      setAllStaffOptions(staffRes.data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  // Search / Apply handler
  const handleSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    try {
      if (selectedDeptId) {
        await loadDepartmentDetails(selectedDeptId);
        setSearchResults([]);
      } else {
        const params = {};
        if (searchNameQuery.trim()) params.query = searchNameQuery.trim();
        if (filterCode.trim()) params.code = filterCode.trim();
        if (!searchNameQuery.trim() && !filterCode.trim()) params.all = 'true';

        const res = await masterService.searchDepartments(params);
        const list = res.data || [];
        setSearchResults(list);

        if (list.length === 1) {
          await loadDepartmentDetails(list[0].id);
        } else if (list.length === 0) {
          setOverview(null);
          setStaffList([]);
          setStudentCounts([]);
        }
      }
    } catch (err) {
      showError(err.message || 'Error searching departments');
    } finally {
      setSearching(false);
    }
  };

  // Load detailed department overview, staff, and student counts
  const loadDepartmentDetails = async (deptId) => {
    setLoadingDetails(true);
    try {
      const [ovRes, staffRes, countsRes] = await Promise.all([
        masterService.getDepartmentById(deptId),
        masterService.getDepartmentStaff(deptId),
        masterService.getDepartmentStudentCounts(deptId)
      ]);

      setOverview(ovRes.data);
      setStaffList(staffRes.data || []);
      setStudentCounts(countsRes.data || []);
      setSelectedDeptId(deptId);
    } catch (err) {
      showError(err.message || 'Failed to fetch department information');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleReset = () => {
    setSelectedDeptId('');
    setSearchNameQuery('');
    setFilterCode('');
    setSearchResults([]);
    setOverview(null);
    setStaffList([]);
    setStudentCounts([]);
    setHasSearched(false);
  };

  // Submit Create Department
  const handleCreateDeptSubmit = async (e) => {
    e.preventDefault();
    setCreateDeptLoading(true);
    try {
      const res = await masterService.createDepartment(deptForm);
      showSuccess(`Department ${res.data?.code} (${res.data?.name}) created successfully!`);
      setCreateDeptModalOpen(false);
      setDeptForm({ name: '', code: '', description: '', hodStaffId: '' });

      // Refresh department dropdown immediately so it is available everywhere
      await loadDepartments();
      if (res.data?.id) {
        await loadDepartmentDetails(res.data.id);
      }
    } catch (err) {
      showError(err.message || 'Failed to create department');
    } finally {
      setCreateDeptLoading(false);
    }
  };

  // Submit Assign / Reassign HOD
  const handleAssignHodSubmit = async (e) => {
    e.preventDefault();
    if (!newHodStaffId) {
      showError('Please select a faculty member to assign as HOD');
      return;
    }

    setAssignHodLoading(true);
    try {
      const res = await masterService.assignHOD(overview.id, newHodStaffId);
      showSuccess(res.message || 'HOD assigned successfully!');
      setAssignHodModalOpen(false);
      setNewHodStaffId('');

      // Refresh overview immediately
      await loadDepartmentDetails(overview.id);
      await loadDepartments();
    } catch (err) {
      showError(err.message || 'Failed to assign HOD');
    } finally {
      setAssignHodLoading(false);
    }
  };

  // Department staff table columns
  const staffColumns = [
    {
      header: 'Staff Member',
      accessor: 'name',
      render: (row) => (
        <div>
          <p className="font-semibold text-[#553729]">{row.name}</p>
          <p className="text-xs text-[#929071]">{row.employeeId}</p>
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
      header: 'Subjects Handled',
      accessor: 'subjectsHandled',
      render: (row) => (
        <span className="text-xs text-[#553729] font-medium">
          {row.subjectsHandled}
        </span>
      )
    },
    {
      header: 'Academic Years Handled',
      accessor: 'academicYearsHandled',
      render: (row) => (
        <span className="text-xs text-[#C66B45] font-semibold">
          {row.academicYearsHandled}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Master"
        subtitle="Manage academic departments, assign departmental HODs, and monitor student distributions"
        breadcrumbs={[
          { label: 'Master', path: '/master/year' },
          { label: 'Department Master' }
        ]}
        actions={
          isSuperAdmin ? (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setCreateDeptModalOpen(true)}
            >
              Add Department
            </Button>
          ) : null
        }
      />

      {/* Section 5.3 Filter & Search Interface */}
      <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EBD9CB]/70">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#C66B45]" />
            <h3 className="text-base font-bold text-[#553729]">Department Search & Selection</h3>
          </div>
          {(hasSearched || overview) && (
            <button
              onClick={handleReset}
              className="text-xs font-medium text-[#929071] hover:text-[#553729] transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Searchable Dropdown */}
          <FormField label="Select Department" hint="Choose directly from department catalog">
            <Select
              name="deptDropdown"
              value={selectedDeptId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedDeptId(val);
                if (val) loadDepartmentDetails(val);
              }}
              options={departmentOptions.map((d) => ({
                value: d.id,
                label: `${d.code} - ${d.name}`
              }))}
              placeholder="-- Select Department --"
            />
          </FormField>

          {/* Department Name Search */}
          <FormField label="Or Search by Department Name" hint="Type keyword (e.g. Computer)">
            <Input
              name="searchDeptName"
              placeholder="e.g. Computer Science, Mechanical"
              value={searchNameQuery}
              onChange={(e) => setSearchNameQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          </FormField>

          {/* Department Code Filter */}
          <FormField label="Department Code" hint="Filter by official code (e.g. CSE)">
            <Input
              name="deptCode"
              placeholder="e.g. CSE, ECE, MECH"
              value={filterCode}
              onChange={(e) => setFilterCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="primary"
            onClick={handleSearch}
            loading={searching}
            icon={Search}
          >
            Search / Apply
          </Button>
        </div>
      </div>

      {/* Multiple Matching Departments Selector */}
      {searchResults.length > 0 && (
        <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs">
          <h4 className="text-sm font-bold text-[#553729] mb-3 flex items-center justify-between">
            <span>Matching Departments ({searchResults.length})</span>
            <span className="text-xs font-normal text-[#929071]">Select to load overview</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {searchResults.map((dept) => {
              const isSelected = overview?.id === dept.id;
              return (
                <div
                  key={dept.id}
                  onClick={() => loadDepartmentDetails(dept.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#C66B45] bg-[#FCE6D8]/60 shadow-xs ring-1 ring-[#C66B45]'
                      : 'border-[#EBD9CB] bg-white hover:border-[#C66B45]/60 hover:bg-[#FFF8F1]'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-[#C66B45] bg-[#FCE6D8]/80 px-2 py-0.5 rounded">
                      {dept.code}
                    </span>
                    <p className="text-sm font-bold text-[#553729] mt-1">{dept.name}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-[#929071] shrink-0 ml-2 ${isSelected ? 'text-[#C66B45]' : ''}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loadingDetails && (
        <div className="py-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <Loader message="Fetching department overview, faculty records, and student distributions..." />
        </div>
      )}

      {/* Selected Department Overview & Stats */}
      {!loadingDetails && overview && (
        <div className="space-y-6">
          {/* Overview Banner Card */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EBD9CB]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FCE6D8] border border-[#EBD9CB] flex items-center justify-center text-[#C66B45] font-bold text-xl shadow-xs">
                  {overview.code}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-[#553729]">{overview.name}</h2>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#FCE6D8] text-[#C66B45]">
                      {overview.code}
                    </span>
                    <StatusBadge status={overview.status || 'Active'} />
                  </div>
                  <p className="text-sm text-[#929071] mt-1">{overview.description || 'Academic Engineering Department'}</p>
                </div>
              </div>

              {/* HOD Cardlet with Quick Assign/Change Button */}
              <div className="bg-white/90 border border-[#EBD9CB] p-4 rounded-xl flex items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C66B45] text-white flex items-center justify-center shadow-xs">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#929071]">Head of Department</span>
                    <p className="text-sm font-bold text-[#553729]">{overview.hodName}</p>
                    {overview.hod?.email && (
                      <p className="text-xs text-[#929071] flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-[#C66B45]" /> {overview.hod.email}
                      </p>
                    )}
                  </div>
                </div>

                {isSuperAdmin && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={UserCheck}
                    onClick={() => setAssignHodModalOpen(true)}
                  >
                    Assign / Change HOD
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-4 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#929071]">Total Faculty</span>
                  <p className="text-2xl font-bold text-[#553729] mt-1">{overview.totalStaff}</p>
                </div>
                <Users className="w-8 h-8 text-[#C66B45]/40" />
              </div>

              <div className="p-4 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#929071]">Enrolled Students</span>
                  <p className="text-2xl font-bold text-[#553729] mt-1">{overview.totalStudents}</p>
                </div>
                <GraduationCap className="w-8 h-8 text-[#C66B45]/40" />
              </div>

              <div className="p-4 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#929071]">Active Cohorts</span>
                  <p className="text-2xl font-bold text-[#553729] mt-1">{studentCounts.length} Academic Years</p>
                </div>
                <Calendar className="w-8 h-8 text-[#C66B45]/40" />
              </div>
            </div>
          </div>

          {/* Student Count by Academic Year (Section 5.3 requirement) */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#C66B45]" />
                <h3 className="text-base font-bold text-[#553729]">Student Count by Academic Year</h3>
              </div>
              <span className="text-xs text-[#929071]">Dynamically calculated from enrolled student records</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {studentCounts.map((cohort) => (
                <div
                  key={cohort.academicYearId}
                  className="bg-white/80 border border-[#EBD9CB] rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C66B45] bg-[#FCE6D8]/80 px-2 py-0.5 rounded">
                      {cohort.academicYearCode}
                    </span>
                    <GraduationCap className="w-4 h-4 text-[#929071]" />
                  </div>
                  <div className="mt-3">
                    <h4 className="text-sm font-semibold text-[#553729]">{cohort.academicYearName}</h4>
                    <p className="text-2xl font-bold text-[#553729] mt-1">
                      {cohort.studentCount}
                      <span className="text-xs font-normal text-[#929071] ml-1.5">students</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Staff Table (Section 5.3 requirement) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C66B45]" />
                <h3 className="text-base font-bold text-[#553729]">Department Faculty & Teaching Assignments</h3>
              </div>
              <span className="text-xs text-[#929071]">
                {staffList.length} faculty member{staffList.length === 1 ? '' : 's'} in {overview.code}
              </span>
            </div>

            <DataTable
              columns={staffColumns}
              data={staffList}
              loading={false}
              emptyMessage={`No faculty currently mapped to ${overview.name}`}
            />
          </div>
        </div>
      )}

      {/* Initial Empty State before selection */}
      {!loadingDetails && !overview && searchResults.length === 0 && (
        <div className="p-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <EmptyState
            title={hasSearched ? 'No department found matching criteria' : 'Select a department to view details'}
            description={
              hasSearched
                ? 'Try searching by a different name, department code, or click "Add Department" above.'
                : 'Choose a department from the dropdown or search above to view HOD, faculty, and student distributions.'
            }
          />
        </div>
      )}

      {/* Modal 1: Add Department */}
      <Modal
        isOpen={createDeptModalOpen}
        onClose={() => setCreateDeptModalOpen(false)}
        title="Add New Academic Department"
        size="md"
      >
        <form onSubmit={handleCreateDeptSubmit} className="space-y-4">
          <FormField label="Department Name" required hint="e.g. Artificial Intelligence & Data Science">
            <Input
              name="deptName"
              required
              placeholder="e.g. Artificial Intelligence & Data Science"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
            />
          </FormField>

          <FormField label="Department Code" required hint="Official acronym (e.g. AIDS, AIML, BIO)">
            <Input
              name="deptCode"
              required
              placeholder="e.g. AIDS"
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
            />
          </FormField>

          <FormField label="Description">
            <Input
              name="deptDesc"
              placeholder="e.g. Department of AI and Modern Computing"
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
            />
          </FormField>

          <FormField label="Assign Initial HOD (Optional)" hint="Select faculty member to head this branch">
            <Select
              name="initialHod"
              value={deptForm.hodStaffId}
              onChange={(e) => setDeptForm({ ...deptForm, hodStaffId: e.target.value })}
              options={allStaffOptions.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.employee_id}) - ${s.Department?.code || 'Faculty'}`
              }))}
              placeholder="-- Select Faculty Member --"
            />
          </FormField>

          <FormActions
            submitLabel="Create Department"
            loading={createDeptLoading}
            onCancel={() => setCreateDeptModalOpen(false)}
          />
        </form>
      </Modal>

      {/* Modal 2: Assign / Change HOD */}
      <Modal
        isOpen={assignHodModalOpen}
        onClose={() => setAssignHodModalOpen(false)}
        title={`Assign Head of Department — ${overview?.code}`}
        size="md"
      >
        <form onSubmit={handleAssignHodSubmit} className="space-y-4">
          <div className="bg-[#FCE6D8]/50 p-3 rounded-xl border border-[#EBD9CB] text-xs text-[#553729]">
            Current HOD: <strong className="text-[#C66B45]">{overview?.hodName}</strong>
          </div>

          <FormField label="Select New HOD" required hint="Choose from institution faculty members">
            <Select
              name="newHod"
              required
              value={newHodStaffId}
              onChange={(e) => setNewHodStaffId(e.target.value)}
              options={allStaffOptions.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.employee_id}) - ${s.designation}`
              }))}
              placeholder="-- Select Faculty Member --"
            />
          </FormField>

          <FormActions
            submitLabel="Confirm & Assign HOD"
            loading={assignHodLoading}
            onCancel={() => setAssignHodModalOpen(false)}
          />
        </form>
      </Modal>
    </div>
  );
}
