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
import ConfirmDialog from '../shell/src/components/common/ConfirmDialog';
import Loader from '../shell/src/components/common/Loader';
import EmptyState from '../shell/src/components/common/EmptyState';
import {
  Search,
  UserCheck,
  Mail,
  Phone,
  Building2,
  Briefcase,
  BookOpen,
  Award,
  Layers,
  ChevronRight,
  RefreshCw,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';

export default function StaffMasterPage() {
  const { showSuccess, showError } = useToast();

  // Search & Filter state
  const [departments, setDepartments] = useState([]);
  const [staffDropdownList, setStaffDropdownList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [searchNameQuery, setSearchNameQuery] = useState('');
  const [filterDepartmentId, setFilterDepartmentId] = useState('');
  const [searching, setSearching] = useState(false);

  // Search results list (when multiple match)
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Active selected staff member detail & assignments
  const [activeStaff, setActiveStaff] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  // Allocation Modals State (Super Admin Only)
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [editAllocationModalOpen, setEditAllocationModalOpen] = useState(false);
  const [deleteAllocationOpen, setDeleteAllocationOpen] = useState(false);
  const [allYears, setAllYears] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [allocationForm, setAllocationForm] = useState({
    subjectId: '',
    academicYearId: '',
    departmentId: ''
  });
  const [allocationSaving, setAllocationSaving] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState(null);
  const [allocationToDelete, setAllocationToDelete] = useState(null);

  // Add Faculty Modal
  const [createStaffModalOpen, setCreateStaffModalOpen] = useState(false);
  const [createStaffLoading, setCreateStaffLoading] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    employeeId: '',
    departmentId: '',
    designation: 'Assistant Professor',
    email: '',
    phone: ''
  });

  // Initial load: fetch departments & staff options for dropdown
  const loadInitialOptions = async () => {
    try {
      const [deptRes, staffRes] = await Promise.all([
        masterService.searchDepartments({ all: 'true' }),
        masterService.searchStaff({ all: 'true' })
      ]);
      setDepartments(deptRes.data || []);
      setStaffDropdownList(staffRes.data || []);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  };

  useEffect(() => {
    loadInitialOptions();
  }, []);

  // Handle Search / Apply button
  const handleSearch = async (overrideAll = false) => {
    setSearching(true);
    setHasSearched(true);
    try {
      if (selectedStaffId && !overrideAll) {
        // Direct selection from dropdown
        await loadStaffProfile(selectedStaffId);
        setSearchResults([]);
      } else {
        const params = {};
        if (overrideAll) {
          params.all = 'true';
        } else {
          if (searchNameQuery.trim()) params.query = searchNameQuery.trim();
          if (filterDepartmentId) params.departmentId = filterDepartmentId;
          if (!searchNameQuery.trim() && !filterDepartmentId) params.all = 'true';
        }

        const res = await masterService.searchStaff(params);
        const list = res.data || [];
        setSearchResults(list);

        // If exact 1 result, auto-load profile
        if (list.length === 1) {
          await loadStaffProfile(list[0].id);
        } else if (list.length === 0) {
          setActiveStaff(null);
          setAssignments([]);
        }
      }
    } catch (err) {
      showError(err.message || 'Error occurred while searching staff');
    } finally {
      setSearching(false);
    }
  };

  // Load detailed staff profile and teaching assignments
  const loadStaffProfile = async (id) => {
    setLoadingDetails(true);
    try {
      const [staffRes, assignRes] = await Promise.all([
        masterService.getStaffById(id),
        masterService.getStaffAssignments(id)
      ]);
      setActiveStaff(staffRes.data);
      setAssignments(assignRes.data || []);
      setSelectedStaffId(id);
    } catch (err) {
      showError(err.message || 'Failed to fetch staff details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleReset = () => {
    setSelectedStaffId('');
    setSearchNameQuery('');
    setFilterDepartmentId('');
    setSearchResults([]);
    setActiveStaff(null);
    setAssignments([]);
    setHasSearched(false);
  };

  // Submit Add Faculty
  const handleCreateStaffSubmit = async (e) => {
    e.preventDefault();
    setCreateStaffLoading(true);
    try {
      const res = await masterService.createStaff(staffForm);
      showSuccess(`Faculty member ${res.data?.name} (${res.data?.employee_id}) added successfully!`);
      setCreateStaffModalOpen(false);
      setStaffForm({
        name: '',
        employeeId: '',
        departmentId: '',
        designation: 'Assistant Professor',
        email: '',
        phone: ''
      });

      // Refresh staff options immediately so it appears in dropdowns everywhere
      await loadInitialOptions();
      if (res.data?.id) {
        await loadStaffProfile(res.data.id);
      }
    } catch (err) {
      showError(err.message || 'Failed to add faculty member');
    } finally {
      setCreateStaffLoading(false);
    }
  };

  // Staff-Subject Allocation Handlers (Super Admin Only)
  const handleOpenAllocateModal = async () => {
    try {
      const [yearRes, subRes] = await Promise.all([
        masterService.getYears(),
        masterService.getSubjects()
      ]);
      setAllYears(yearRes.data || []);
      setAllSubjects(subRes.data || []);
      setAllocationForm({
        subjectId: '',
        academicYearId: yearRes.data?.[0]?.id || '',
        departmentId: activeStaff?.department_id || activeStaff?.Department?.id || departments[0]?.id || ''
      });
      setAllocateModalOpen(true);
    } catch (err) {
      showError('Failed to load courses for allocation');
    }
  };

  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    if (!activeStaff) return;
    setAllocationSaving(true);
    try {
      await masterService.createStaffAssignment({
        staffId: activeStaff.id,
        subjectId: allocationForm.subjectId,
        academicYearId: allocationForm.academicYearId || undefined,
        departmentId: allocationForm.departmentId || undefined
      });
      showSuccess('Subject allocated to faculty member successfully');
      setAllocateModalOpen(false);
      await loadStaffProfile(activeStaff.id);
    } catch (err) {
      showError(err.message || 'Failed to allocate subject');
    } finally {
      setAllocationSaving(false);
    }
  };

  const handleOpenEditAllocation = async (row) => {
    try {
      const [yearRes, subRes] = await Promise.all([
        masterService.getYears(),
        masterService.getSubjects()
      ]);
      setAllYears(yearRes.data || []);
      setAllSubjects(subRes.data || []);
      setEditingAllocation(row);
      setAllocationForm({
        subjectId: row.subjectId || '',
        academicYearId: row.academicYearId || '',
        departmentId: row.departmentId || ''
      });
      setEditAllocationModalOpen(true);
    } catch (err) {
      showError('Failed to load allocation details');
    }
  };

  const handleUpdateAllocation = async (e) => {
    e.preventDefault();
    if (!editingAllocation) return;
    setAllocationSaving(true);
    try {
      await masterService.updateStaffAssignment(editingAllocation.assignmentId || editingAllocation.id, {
        subjectId: allocationForm.subjectId,
        academicYearId: allocationForm.academicYearId,
        departmentId: allocationForm.departmentId
      });
      showSuccess('Subject allocation updated successfully');
      setEditAllocationModalOpen(false);
      await loadStaffProfile(activeStaff.id);
    } catch (err) {
      showError(err.message || 'Failed to update allocation');
    } finally {
      setAllocationSaving(false);
    }
  };

  const handleDeleteAllocation = async () => {
    if (!allocationToDelete) return;
    try {
      await masterService.deleteStaffAssignment(allocationToDelete.assignmentId || allocationToDelete.id);
      showSuccess('Subject allocation removed successfully');
      setDeleteAllocationOpen(false);
      await loadStaffProfile(activeStaff.id);
    } catch (err) {
      showError(err.message || 'Failed to remove allocation');
    }
  };

  // Table columns for Teaching Assignments
  const assignmentColumns = [
    {
      header: 'Subject Code',
      accessor: 'subjectCode',
      render: (row) => (
        <span className="font-mono font-bold text-[#C66B45] bg-[#FCE6D8]/50 px-2 py-0.5 rounded">
          {row.subjectCode}
        </span>
      )
    },
    {
      header: 'Subject Name',
      accessor: 'subjectName',
      render: (row) => <span className="font-medium text-[#553729]">{row.subjectName}</span>
    },
    {
      header: 'Academic Year',
      accessor: 'academicYear',
      render: (row) => (
        <span className="inline-flex items-center text-xs font-semibold px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-md">
          {row.academicYear}
        </span>
      )
    },
    {
      header: 'Semester',
      accessor: 'semester',
      render: (row) => <span className="text-xs text-[#929071]">{row.semester || 'N/A'}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'Active'} />
    },
    ...(isSuperAdmin
      ? [
          {
            header: 'Actions',
            align: 'right',
            render: (row) => (
              <div className="flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEditAllocation(row)}
                  title="Edit Allocation"
                  className="p-1.5 rounded-lg border border-[#EBD9CB] bg-[#FFF8F1] text-[#553729] hover:bg-[#FCE6D8] transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setAllocationToDelete(row);
                    setDeleteAllocationOpen(true);
                  }}
                  title="Remove Allocation"
                  className="p-1.5 rounded-lg border border-[#EBD9CB] bg-[#FFF8F1] text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          }
        ]
      : [])
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Faculty Master"
        subtitle="Search and view faculty profile, teaching load, and academic year subject mappings"
        breadcrumbs={[
          { label: 'Master', path: '/master/year' },
          { label: 'Staff Master' }
        ]}
        actions={
          isSuperAdmin ? (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setCreateStaffModalOpen(true)}
            >
              Add Faculty Member
            </Button>
          ) : null
        }
      />

      {/* Section 5.2 Filter / Search Interface */}
      <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EBD9CB]/70">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#C66B45]" />
            <h3 className="text-base font-bold text-[#553729]">Faculty Lookup & Filters</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSearch(true)}
              className="text-xs font-bold text-[#C66B45] hover:text-[#AD5938] hover:underline flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              View All Faculty
            </button>
            {(hasSearched || activeStaff) && (
              <button
                onClick={handleReset}
                className="text-xs font-medium text-[#929071] hover:text-[#553729] ml-3 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Department Filter Dropdown (Moved First for Natural Cascading) */}
          <FormField label="Filter by Department" hint="Narrow down by academic department">
            <Select
              name="deptFilter"
              value={filterDepartmentId}
              onChange={(e) => {
                const newDeptId = e.target.value;
                setFilterDepartmentId(newDeptId);
                if (newDeptId && selectedStaffId) {
                  const currStaff = staffDropdownList.find((s) => s.id === selectedStaffId);
                  if (currStaff && currStaff.department_id !== newDeptId && currStaff.Department?.id !== newDeptId) {
                    setSelectedStaffId('');
                  }
                }
              }}
              options={departments.map((d) => ({
                value: d.id,
                label: `${d.code} - ${d.name}`
              }))}
              placeholder="-- All Departments --"
            />
          </FormField>

          {/* Searchable Dropdown dynamically filtered by selected department */}
          <FormField
            label="Select Staff Member"
            hint={filterDepartmentId ? 'Filtered to selected department faculty' : 'Choose directly from college faculty list'}
          >
            <Select
              name="staffSelect"
              value={selectedStaffId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStaffId(val);
                if (val) loadStaffProfile(val);
              }}
              options={staffDropdownList
                .filter((s) => !filterDepartmentId || s.department_id === filterDepartmentId || s.Department?.id === filterDepartmentId)
                .map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.employee_id}) - ${s.Department?.code || 'N/A'}`
                }))}
              placeholder={
                filterDepartmentId
                  ? `-- Select ${departments.find((d) => d.id === filterDepartmentId)?.code || ''} Faculty --`
                  : '-- Select a staff member --'
              }
            />
          </FormField>

          {/* Search by Name / ID Input */}
          <FormField label="Or Search by Name / Employee ID" hint="Type faculty name or code">
            <Input
              name="searchQuery"
              placeholder="e.g. Arun Kumar, STF-0101"
              value={searchNameQuery}
              onChange={(e) => setSearchNameQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="primary"
            onClick={() => handleSearch(false)}
            loading={searching}
            icon={Search}
          >
            Search / Apply
          </Button>
        </div>
      </div>

      {/* Multiple Matching Staff Selector List */}
      {searchResults.length > 0 && (
        <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs">
          <h4 className="text-sm font-bold text-[#553729] mb-3 flex items-center justify-between">
            <span>Matching Faculty Members ({searchResults.length})</span>
            <span className="text-xs font-normal text-[#929071]">Click a profile to view complete details</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map((staff) => {
              const isSelected = activeStaff?.id === staff.id;
              return (
                <div
                  key={staff.id}
                  onClick={() => loadStaffProfile(staff.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#C66B45] bg-[#FCE6D8]/60 shadow-xs ring-1 ring-[#C66B45]'
                      : 'border-[#EBD9CB] bg-white hover:border-[#C66B45]/60 hover:bg-[#FFF8F1]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#553729] truncate">{staff.name}</p>
                    <p className="text-xs text-[#929071]">{staff.employee_id} • {staff.designation}</p>
                    <p className="text-xs text-[#C66B45] font-semibold mt-0.5">{staff.Department?.name}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-[#929071] shrink-0 ml-2 ${isSelected ? 'text-[#C66B45]' : ''}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Staff Loading State */}
      {loadingDetails && (
        <div className="py-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <Loader message="Fetching faculty profile and teaching assignments..." />
        </div>
      )}

      {/* Selected Staff Information Card & Teaching Assignments */}
      {!loadingDetails && activeStaff && (
        <div className="space-y-6">
          {/* Staff Information Card */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EBD9CB]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FCE6D8] border border-[#EBD9CB] flex items-center justify-center text-[#C66B45] font-bold text-xl shadow-xs">
                  {activeStaff.name ? activeStaff.name.charAt(0) : 'F'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-[#553729]">{activeStaff.name}</h2>
                    {activeStaff.isHod && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#C66B45] text-white">
                        <Award className="w-3 h-3" /> Head of Department
                      </span>
                    )}
                    <StatusBadge status={activeStaff.status || 'Active'} />
                  </div>
                  <p className="text-sm text-[#929071] font-medium mt-0.5">
                    {activeStaff.designation} • ID: <span className="font-mono text-[#553729] font-bold">{activeStaff.employeeId}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs px-3 py-1.5 rounded-xl bg-[#FCE6D8] text-[#553729] font-semibold border border-[#EBD9CB] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#C66B45]" />
                  {activeStaff.department}
                </span>
              </div>
            </div>

            {/* Quick Contact & Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#929071] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#C66B45]" /> Email Address
                </span>
                <p className="text-sm font-semibold text-[#553729] mt-1 break-all">{activeStaff.email || 'N/A'}</p>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#929071] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#C66B45]" /> Contact Phone
                </span>
                <p className="text-sm font-semibold text-[#553729] mt-1">{activeStaff.phone || 'N/A'}</p>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#929071] flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-[#C66B45]" /> Designation
                </span>
                <p className="text-sm font-semibold text-[#553729] mt-1">{activeStaff.designation}</p>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#929071] flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#C66B45]" /> Total Assigned Courses
                </span>
                <p className="text-sm font-bold text-[#C66B45] mt-1">{assignments.length} Subjects</p>
              </div>
            </div>
          </div>

          {/* Teaching Assignment Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#C66B45]" />
                <h3 className="text-base font-bold text-[#553729]">Teaching Assignments</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#929071]">
                  {assignments.length} subject{assignments.length === 1 ? '' : 's'} assigned to {activeStaff.name}
                </span>
                {isSuperAdmin && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={handleOpenAllocateModal}
                  >
                    Allocate Subject
                  </Button>
                )}
              </div>
            </div>

            <DataTable
              columns={assignmentColumns}
              data={assignments}
              loading={false}
              emptyMessage={`No teaching assignments currently mapped for ${activeStaff.name}`}
            />
          </div>
        </div>
      )}

      {/* Initial Empty State before any search */}
      {!loadingDetails && !activeStaff && searchResults.length === 0 && (
        <div className="p-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <EmptyState
            title={hasSearched ? 'No faculty found matching your search' : 'Select or search for a staff member'}
            description={
              hasSearched
                ? 'Try refining your query, selecting from the dropdown, or clearing filters.'
                : 'Use the dropdown or search fields above to view faculty profile and assigned subjects, or click "Add Faculty Member".'
            }
          />
        </div>
      )}

      {/* Add Faculty Modal */}
      <Modal
        isOpen={createStaffModalOpen}
        onClose={() => setCreateStaffModalOpen(false)}
        title="Add New Faculty Member"
        size="md"
      >
        <form onSubmit={handleCreateStaffSubmit} className="space-y-4">
          <FormField label="Full Name" required hint="e.g. Dr. Rajesh Kannan">
            <Input
              name="name"
              required
              placeholder="e.g. Dr. Rajesh Kannan"
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
            />
          </FormField>

          <FormField label="Employee ID / Faculty Code" required hint="e.g. STF-0401">
            <Input
              name="employeeId"
              required
              placeholder="e.g. STF-0401"
              value={staffForm.employeeId}
              onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })}
            />
          </FormField>

          <FormField label="Department" required hint="Assign faculty to department">
            <Select
              name="departmentId"
              required
              value={staffForm.departmentId}
              onChange={(e) => setStaffForm({ ...staffForm, departmentId: e.target.value })}
              options={departments.map((d) => ({
                value: d.id,
                label: `${d.code} - ${d.name}`
              }))}
              placeholder="-- Select Department --"
            />
          </FormField>

          <FormField label="Designation" required>
            <Select
              name="designation"
              required
              value={staffForm.designation}
              onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })}
              options={[
                { value: 'Professor & HOD', label: 'Professor & HOD' },
                { value: 'Professor', label: 'Professor' },
                { value: 'Associate Professor', label: 'Associate Professor' },
                { value: 'Assistant Professor', label: 'Assistant Professor' },
                { value: 'Lecturer', label: 'Lecturer' }
              ]}
              placeholder="-- Select Designation --"
            />
          </FormField>

          <FormField label="Email Address" required>
            <Input
              name="email"
              type="email"
              required
              placeholder="e.g. rajesh@abccollege.edu"
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
            />
          </FormField>

          <FormField label="Contact Phone">
            <Input
              name="phone"
              placeholder="+91 98765 43210"
              value={staffForm.phone}
              onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
            />
          </FormField>

          <FormActions
            submitLabel="Add Faculty Member"
            loading={createStaffLoading}
            onCancel={() => setCreateStaffModalOpen(false)}
          />
        </form>
      </Modal>

      {/* Allocate Subject Modal (Super Admin Only) */}
      {isSuperAdmin && (
        <Modal
          isOpen={allocateModalOpen}
          onClose={() => setAllocateModalOpen(false)}
          title={`Allocate Subject — ${activeStaff?.name}`}
          subtitle="Assign a curriculum subject and academic year to faculty member"
        >
          <form onSubmit={handleSaveAllocation} className="space-y-4">
            <FormField label="Department" required>
              <Select
                value={allocationForm.departmentId}
                onChange={(e) => setAllocationForm({ ...allocationForm, departmentId: e.target.value })}
                options={departments.map((d) => ({ value: d.id, label: `${d.code} - ${d.name}` }))}
                placeholder="-- Select Department --"
                required
              />
            </FormField>

            <FormField label="Academic Year" required>
              <Select
                value={allocationForm.academicYearId}
                onChange={(e) => setAllocationForm({ ...allocationForm, academicYearId: e.target.value })}
                options={allYears.map((y) => ({ value: y.id, label: `${y.name} (${y.code})` }))}
                placeholder="-- Select Academic Year --"
                required
              />
            </FormField>

            <FormField label="Curriculum Subject" required>
              <Select
                value={allocationForm.subjectId}
                onChange={(e) => setAllocationForm({ ...allocationForm, subjectId: e.target.value })}
                options={allSubjects
                  .filter((s) => !allocationForm.departmentId || s.departmentId === allocationForm.departmentId)
                  .map((s) => ({ value: s.id, label: `${s.code} - ${s.name} (${s.semester})` }))}
                placeholder="-- Select Subject --"
                required
              />
            </FormField>

            <FormActions
              submitLabel="Allocate Subject"
              loading={allocationSaving}
              onCancel={() => setAllocateModalOpen(false)}
            />
          </form>
        </Modal>
      )}

      {/* Edit Allocation Modal (Super Admin Only) */}
      {isSuperAdmin && (
        <Modal
          isOpen={editAllocationModalOpen}
          onClose={() => setEditAllocationModalOpen(false)}
          title={`Edit Allocation — ${activeStaff?.name}`}
          subtitle="Update subject or cohort assignment"
        >
          <form onSubmit={handleUpdateAllocation} className="space-y-4">
            <FormField label="Department" required>
              <Select
                value={allocationForm.departmentId}
                onChange={(e) => setAllocationForm({ ...allocationForm, departmentId: e.target.value })}
                options={departments.map((d) => ({ value: d.id, label: `${d.code} - ${d.name}` }))}
                placeholder="-- Select Department --"
                required
              />
            </FormField>

            <FormField label="Academic Year" required>
              <Select
                value={allocationForm.academicYearId}
                onChange={(e) => setAllocationForm({ ...allocationForm, academicYearId: e.target.value })}
                options={allYears.map((y) => ({ value: y.id, label: `${y.name} (${y.code})` }))}
                placeholder="-- Select Academic Year --"
                required
              />
            </FormField>

            <FormField label="Curriculum Subject" required>
              <Select
                value={allocationForm.subjectId}
                onChange={(e) => setAllocationForm({ ...allocationForm, subjectId: e.target.value })}
                options={allSubjects
                  .filter((s) => !allocationForm.departmentId || s.departmentId === allocationForm.departmentId)
                  .map((s) => ({ value: s.id, label: `${s.code} - ${s.name} (${s.semester})` }))}
                placeholder="-- Select Subject --"
                required
              />
            </FormField>

            <FormActions
              submitLabel="Update Allocation"
              loading={allocationSaving}
              onCancel={() => setEditAllocationModalOpen(false)}
            />
          </form>
        </Modal>
      )}

      {/* Delete Allocation Confirm Dialog (Super Admin Only) */}
      {isSuperAdmin && (
        <ConfirmDialog
          isOpen={deleteAllocationOpen}
          onClose={() => setDeleteAllocationOpen(false)}
          onConfirm={handleDeleteAllocation}
          title="Remove Subject Allocation"
          message={`Are you sure you want to remove ${allocationToDelete?.subjectCode} (${allocationToDelete?.subjectName}) from ${activeStaff?.name}?`}
        />
      )}
    </div>
  );
}
