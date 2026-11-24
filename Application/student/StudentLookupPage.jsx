import React, { useState, useEffect } from 'react';
import { studentService } from '../shell/src/services/studentService';
import { masterService } from '../shell/src/services/masterService';
import { useToast } from '../shell/src/components/feedback/Toast';
import PageHeader from '../shell/src/components/layout/PageHeader';
import DataTable from '../shell/src/components/tables/DataTable';
import StatusBadge from '../shell/src/components/common/StatusBadge';
import Button from '../shell/src/components/common/Button';
import Input from '../shell/src/components/forms/Input';
import Select from '../shell/src/components/forms/Select';
import FormField from '../shell/src/components/forms/FormField';
import Modal from '../shell/src/components/common/Modal';
import FormActions from '../shell/src/components/forms/FormActions';
import Loader from '../shell/src/components/common/Loader';
import EmptyState from '../shell/src/components/common/EmptyState';
import {
  Users,
  Search,
  Plus,
  GraduationCap,
  Award,
  BookOpen,
  Calendar,
  Building2,
  Mail,
  Phone,
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export default function StudentLookupPage() {
  const { showSuccess, showError } = useToast();

  // Current user role authorization (Super Admin vs Admin/Sub Admin)
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem('college_erp_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = currentUser?.role === 'Super Admin';

  // Filter options loaded from Master
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Search filter criteria
  const [searchName, setSearchName] = useState('');
  const [searchRoll, setSearchRoll] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Results list
  const [searchResults, setSearchResults] = useState([]);

  // Selected student & subjects
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [loadingStudent, setLoadingStudent] = useState(false);

  // Enroll Student Modal
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    name: '',
    rollNumber: '',
    email: '',
    phone: '',
    departmentId: '',
    academicYearId: '',
    semester: 'Semester 1'
  });

  // Initial load: fetch departments & academic years
  useEffect(() => {
    async function loadMeta() {
      try {
        const [deptRes, yearRes] = await Promise.all([
          masterService.searchDepartments({ all: 'true' }),
          masterService.getYears()
        ]);
        setDepartments(deptRes.data || []);
        setAcademicYears(yearRes.data || []);
      } catch (err) {
        console.error('Failed to load filter metadata:', err);
      }
      handleFilter(true, '', '');
    }
    loadMeta();
  }, []);

  // Filter execution
  const handleFilter = async (loadAll = false, overrideDept = null, overrideYear = null) => {
    setSearching(true);
    setHasSearched(true);
    try {
      const params = {};
      const deptVal = overrideDept !== null ? overrideDept : filterDept;
      const yearVal = overrideYear !== null ? overrideYear : filterYear;

      if (loadAll) {
        params.all = 'true';
      } else {
        if (searchName.trim()) params.query = searchName.trim();
        if (searchRoll.trim()) params.rollNumber = searchRoll.trim();
        if (deptVal) params.departmentId = deptVal;
        if (yearVal) params.academicYearId = yearVal;
        if (!searchName.trim() && !searchRoll.trim() && !deptVal && !yearVal) {
          params.all = 'true';
        }
      }

      const res = await studentService.searchStudents(params);
      const list = res.data || [];
      setSearchResults(list);

      if (list.length > 0) {
        await loadStudentDetails(list[0].id);
      } else {
        setSelectedStudent(null);
        setStudentSubjects([]);
      }
    } catch (err) {
      showError(err.message || 'Error executing student search');
    } finally {
      setSearching(false);
    }
  };

  // Fetch student profile and strictly scoped subjects
  const loadStudentDetails = async (studentId) => {
    setLoadingStudent(true);
    try {
      const [stuRes, subRes] = await Promise.all([
        studentService.getStudentById(studentId),
        studentService.getStudentSubjects(studentId)
      ]);
      setSelectedStudent(stuRes.data);
      setStudentSubjects(subRes.data?.subjects || []);
    } catch (err) {
      showError(err.message || 'Failed to retrieve student subject records');
    } finally {
      setLoadingStudent(false);
    }
  };

  const handleReset = () => {
    setSearchName('');
    setSearchRoll('');
    setFilterDept('');
    setFilterYear('');
    setSearchResults([]);
    setSelectedStudent(null);
    setStudentSubjects([]);
    setHasSearched(false);
  };

  // Submit enrollment of new student
  const handleEnrollSubmit = async (e) => {
    e.preventDefault();
    setEnrollLoading(true);
    try {
      const res = await studentService.createStudent(enrollForm);
      showSuccess(`Student ${res.data?.name} enrolled successfully!`);
      setEnrollModalOpen(false);
      setEnrollForm({
        name: '',
        rollNumber: '',
        email: '',
        phone: '',
        departmentId: '',
        academicYearId: '',
        semester: 'Semester 1'
      });
      // Load newly enrolled student
      if (res.data?.id) {
        await loadStudentDetails(res.data.id);
      }
    } catch (err) {
      showError(err.message || 'Failed to enroll student');
    } finally {
      setEnrollLoading(false);
    }
  };

  // Table columns for student scoped subjects
  const subjectColumns = [
    {
      header: 'Subject Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono font-bold text-[#C66B45] bg-[#FCE6D8]/60 px-2 py-0.5 rounded">
          {row.code}
        </span>
      )
    },
    {
      header: 'Subject Name',
      accessor: 'name',
      render: (row) => <span className="font-semibold text-[#553729]">{row.name}</span>
    },
    {
      header: 'Semester',
      accessor: 'semester',
      render: (row) => <span className="text-xs text-[#929071]">{row.semester || 'N/A'}</span>
    },
    {
      header: 'Credits',
      accessor: 'credits',
      render: (row) => (
        <span className="inline-flex items-center text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
          {row.credits} Cr
        </span>
      )
    },
    {
      header: 'Assigned Faculty',
      accessor: 'assignedStaff',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold text-[#553729]">{row.assignedStaff}</span>
          {row.staffEmployeeId && (
            <span className="text-[11px] text-[#929071] block">{row.staffEmployeeId}</span>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status || 'Active'} />
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory & Subject Lookup"
        subtitle="Lookup student academic profile, verified department HOD, and scoped subject curriculum"
        actions={
          isSuperAdmin ? (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setEnrollModalOpen(true)}
            >
              Enroll New Student
            </Button>
          ) : null
        }
      />

      {/* Section 6 Search / Filter Panel */}
      <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#EBD9CB]/70">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C66B45]" />
            <h3 className="text-base font-bold text-[#553729]">Student Search & Filters</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFilter(true)}
              className="text-xs font-bold text-[#C66B45] hover:text-[#AD5938] hover:underline flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              View All Students
            </button>
            {(hasSearched || selectedStudent) && (
              <button
                onClick={handleReset}
                className="text-xs font-medium text-[#929071] hover:text-[#553729] ml-3 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {/* Student Name */}
          <FormField label="Student Name" hint="Filter by full or partial name">
            <Input
              name="searchName"
              placeholder="e.g. John Doe, Rahul"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFilter();
              }}
            />
          </FormField>

          {/* Roll Number */}
          <FormField label="Roll Number" hint="Filter by registration ID">
            <Input
              name="searchRoll"
              placeholder="e.g. 21CS001, 22EC005"
              value={searchRoll}
              onChange={(e) => setSearchRoll(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFilter();
              }}
            />
          </FormField>

          {/* Department Dropdown */}
          <FormField label="Department" hint="Filter by enrolled branch">
            <Select
              name="filterDept"
              value={filterDept}
              onChange={(e) => {
                const val = e.target.value;
                setFilterDept(val);
                handleFilter(false, val, filterYear);
              }}
              options={departments.map((d) => ({
                value: d.id,
                label: `${d.code} - ${d.name}`
              }))}
              placeholder="-- All Departments --"
            />
          </FormField>

          {/* Academic Year Dropdown */}
          <FormField label="Academic Year" hint="Filter by cohort year">
            <Select
              name="filterYear"
              value={filterYear}
              onChange={(e) => {
                const val = e.target.value;
                setFilterYear(val);
                handleFilter(false, filterDept, val);
              }}
              options={academicYears.map((y) => ({
                value: y.id,
                label: y.name
              }))}
              placeholder="-- All Academic Years --"
            />
          </FormField>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="primary"
            onClick={() => handleFilter(false)}
            loading={searching}
            icon={Search}
          >
            Filter Students
          </Button>
        </div>
      </div>

      {/* Multiple Matching Students List */}
      {searchResults.length > 0 && (
        <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs">
          <h4 className="text-sm font-bold text-[#553729] mb-3 flex items-center justify-between">
            <span>Matching Students ({searchResults.length})</span>
            <span className="text-xs font-normal text-[#929071]">Select student to view academic details & subjects</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map((stu) => {
              const isSelected = selectedStudent?.id === stu.id;
              return (
                <div
                  key={stu.id}
                  onClick={() => loadStudentDetails(stu.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'border-[#C66B45] bg-[#FCE6D8]/60 shadow-xs ring-1 ring-[#C66B45]'
                      : 'border-[#EBD9CB] bg-white hover:border-[#C66B45]/60 hover:bg-[#FFF8F1]'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#553729] truncate">{stu.name}</p>
                    <p className="text-xs text-[#929071]">Roll: <span className="font-mono font-bold text-[#553729]">{stu.roll_number}</span></p>
                    <p className="text-xs text-[#C66B45] font-semibold mt-0.5">
                      {stu.Department?.code} • {stu.AcademicYear?.name}
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-[#929071] shrink-0 ml-2 ${isSelected ? 'text-[#C66B45]' : ''}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State when no results */}
      {hasSearched && searchResults.length === 0 && !searching && (
        <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-8 text-center space-y-3">
          <Users className="w-12 h-12 text-[#929071] mx-auto opacity-40" />
          <h4 className="text-base font-bold text-[#553729]">No students found matching filters</h4>
          <p className="text-xs text-[#929071] max-w-sm mx-auto">
            Try adjusting your search criteria or clearing filters to view all enrolled students.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleReset();
              handleFilter(true, '', '');
            }}
          >
            Show All Students
          </Button>
        </div>
      )}

      {/* Student Details Loading */}
      {loadingStudent && (
        <div className="py-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <Loader message="Resolving department, HOD, and scoped subject mapping..." />
        </div>
      )}

      {/* Selected Student Detail View */}
      {!loadingStudent && selectedStudent && (
        <div className="space-y-6">
          {/* Student Profile Card (Section 6 display requirements) */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EBD9CB]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FCE6D8] border border-[#EBD9CB] flex items-center justify-center text-[#C66B45] font-bold text-xl shadow-xs">
                  {selectedStudent.name ? selectedStudent.name.charAt(0) : 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-[#553729]">{selectedStudent.name}</h2>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FCE6D8] text-[#C66B45] border border-[#EBD9CB]">
                      Roll: {selectedStudent.rollNumber}
                    </span>
                    <StatusBadge status={selectedStudent.status || 'Active'} />
                  </div>
                  <p className="text-sm text-[#929071] mt-0.5 font-medium">
                    {selectedStudent.department} • {selectedStudent.academicYear}
                  </p>
                </div>
              </div>

              {/* Resolved Department HOD Cardlet */}
              <div className="bg-white/80 border border-[#EBD9CB] p-3.5 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#C66B45] text-white flex items-center justify-center shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#929071]">
                    Department HOD
                  </span>
                  <p className="text-sm font-bold text-[#553729]">{selectedStudent.hodName}</p>
                  <p className="text-xs text-[#929071]">{selectedStudent.department}</p>
                </div>
              </div>
            </div>

            {/* Student Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#929071] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#C66B45]" /> Email Address
                </span>
                <p className="text-sm font-semibold text-[#553729] mt-1 break-all">
                  {selectedStudent.email || 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#929071] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#C66B45]" /> Contact Phone
                </span>
                <p className="text-sm font-semibold text-[#553729] mt-1">
                  {selectedStudent.phone || 'N/A'}
                </p>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#929071] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#C66B45]" /> Current Semester
                </span>
                <p className="text-sm font-semibold text-[#553729] mt-1">
                  {selectedStudent.semester || 'Semester 1'}
                </p>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl">
                <span className="text-[11px] uppercase tracking-wider font-bold text-[#929071] flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-[#C66B45]" /> Academic CGPA
                </span>
                <p className="text-sm font-bold text-[#C66B45] mt-1">
                  {selectedStudent.cgpa ? `${selectedStudent.cgpa} / 10.0` : 'In Progress'}
                </p>
              </div>
            </div>
          </div>

          {/* Strictly Scoped Subject Details (Section 6 Subject retrieval logic) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#C66B45]" />
                <h3 className="text-base font-bold text-[#553729]">
                  Scoped Subjects for {selectedStudent.department} — {selectedStudent.academicYear}
                </h3>
              </div>
              <span className="text-xs text-[#929071]">
                {studentSubjects.length} verified subject{studentSubjects.length === 1 ? '' : 's'}
              </span>
            </div>

            <DataTable
              columns={subjectColumns}
              data={studentSubjects}
              loading={false}
              emptyMessage={`No subjects found matching ${selectedStudent.department} and ${selectedStudent.academicYear}`}
            />
          </div>
        </div>
      )}

      {/* Initial Empty State before selection */}
      {!loadingStudent && !selectedStudent && searchResults.length === 0 && (
        <div className="p-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <EmptyState
            title={hasSearched ? 'No students found matching your filters' : 'Search or filter student directory'}
            description={
              hasSearched
                ? 'Try searching with a broader name query, different roll number, or clear filters.'
                : 'Enter a student name, roll number, or select department/year to inspect student subjects and HOD.'
            }
          />
        </div>
      )}

      {/* Enroll New Student Modal (Super Admin only) */}
      {isSuperAdmin && (
        <Modal
          isOpen={enrollModalOpen}
          onClose={() => setEnrollModalOpen(false)}
          title="Enroll New Student"
          size="lg"
        >
          <form onSubmit={handleEnrollSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Full Name" required>
                <Input
                  name="name"
                  required
                  placeholder="e.g. Karthik Venkat"
                  value={enrollForm.name}
                  onChange={(e) => setEnrollForm({ ...enrollForm, name: e.target.value })}
                />
              </FormField>

              <FormField label="Roll Number" required hint="Unique institutional ID">
                <Input
                  name="rollNumber"
                  required
                  placeholder="e.g. 23CS015"
                  value={enrollForm.rollNumber}
                  onChange={(e) => setEnrollForm({ ...enrollForm, rollNumber: e.target.value })}
                />
              </FormField>

              <FormField label="Email Address" required>
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="e.g. karthik.v@student.abccollege.edu"
                  value={enrollForm.email}
                  onChange={(e) => setEnrollForm({ ...enrollForm, email: e.target.value })}
                />
              </FormField>

              <FormField label="Phone Number">
                <Input
                  name="phone"
                  placeholder="+91 98765 43210"
                  value={enrollForm.phone}
                  onChange={(e) => setEnrollForm({ ...enrollForm, phone: e.target.value })}
                />
              </FormField>

              <FormField label="Department" required>
                <Select
                  name="departmentId"
                  required
                  value={enrollForm.departmentId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, departmentId: e.target.value })}
                  options={departments.map((d) => ({
                    value: d.id,
                    label: `${d.code} - ${d.name}`
                  }))}
                  placeholder="-- Select Department --"
                />
              </FormField>

              <FormField label="Academic Year" required>
                <Select
                  name="academicYearId"
                  required
                  value={enrollForm.academicYearId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, academicYearId: e.target.value })}
                  options={academicYears.map((y) => ({
                    value: y.id,
                    label: y.name
                  }))}
                  placeholder="-- Select Academic Year --"
                />
              </FormField>
            </div>

            <FormActions
              submitLabel="Enroll Student"
              loading={enrollLoading}
              onCancel={() => setEnrollModalOpen(false)}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
