import React, { useState, useEffect } from 'react';
import { departmentService } from '../shell/src/services/departmentService';
import { masterService } from '../shell/src/services/masterService';
import { useToast } from '../shell/src/components/feedback/Toast';
import PageHeader from '../shell/src/components/layout/PageHeader';
import DataTable from '../shell/src/components/tables/DataTable';
import Button from '../shell/src/components/common/Button';
import Input from '../shell/src/components/forms/Input';
import Select from '../shell/src/components/forms/Select';
import FormField from '../shell/src/components/forms/FormField';
import Loader from '../shell/src/components/common/Loader';
import EmptyState from '../shell/src/components/common/EmptyState';
import {
  Search,
  BookOpen,
  Building2,
  Calendar,
  Award,
  Info,
  Users,
  UserCheck,
  RotateCcw
} from 'lucide-react';

export default function StudentSubjectLookupPage() {
  const { showError } = useToast();

  // Department and Academic Year dropdown options
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Form input state (fully editable by user, never locks or reverts)
  const [formData, setFormData] = useState({
    rollNumber: '',
    studentName: '',
    departmentId: '',
    academicYearId: ''
  });

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Resolved lookup results
  const [resolvedStudent, setResolvedStudent] = useState(null);
  const [resolvedDept, setResolvedDept] = useState(null);
  const [resolvedYear, setResolvedYear] = useState(null);
  const [mappedSubjects, setMappedSubjects] = useState([]);
  const [matchingStudents, setMatchingStudents] = useState([]);

  // Initial load: fetch department and academic year master lists
  useEffect(() => {
    async function loadFormMeta() {
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
    }
    loadFormMeta();
  }, []);

  // Execute lookup with ANY combination of the 4 fields
  const executeLookup = async (overrideRoll = null) => {
    const rollToUse = overrideRoll !== null ? overrideRoll.trim() : formData.rollNumber.trim();
    const nameToUse = formData.studentName.trim();
    const deptToUse = formData.departmentId;
    const yearToUse = formData.academicYearId;

    // Filter works if ANY ONE of the 4 fields is chosen
    if (!rollToUse && !nameToUse && !deptToUse && !yearToUse) {
      showError('Please choose a Department, Academic Year, or type a Student Roll Number / Name.');
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const params = {};
      if (rollToUse) params.rollNumber = rollToUse;
      if (nameToUse) params.studentName = nameToUse;
      if (deptToUse) params.departmentId = deptToUse;
      if (yearToUse) params.academicYearId = yearToUse;

      const res = await departmentService.studentSubjectLookup(params);
      const data = res.data;

      setResolvedStudent(data.student || null);
      setResolvedDept(data.department || null);
      setResolvedYear(data.academicYear || null);
      setMappedSubjects(data.subjects || []);
      setMatchingStudents(data.matchingStudents || []);

      // If user clicked a student pill or searched by specific roll, update roll field cleanly
      if (overrideRoll !== null && data.student) {
        setFormData(prev => ({
          ...prev,
          rollNumber: data.student.rollNumber,
          studentName: data.student.name
        }));
      }
      // NOTE: Green tick notification is permanently suppressed per user request
    } catch (err) {
      setResolvedStudent(null);
      setResolvedDept(null);
      setResolvedYear(null);
      setMappedSubjects([]);
      setMatchingStudents([]);
      showError(err.message || 'No curriculum or student records found matching the criteria.');
    } finally {
      setLoading(false);
    }
  };

  // Form submit handler
  const handleLookupSubmit = (e) => {
    e.preventDefault();
    executeLookup();
  };

  // Reset form handler
  const handleReset = () => {
    setFormData({
      rollNumber: '',
      studentName: '',
      departmentId: '',
      academicYearId: ''
    });
    setResolvedStudent(null);
    setResolvedDept(null);
    setResolvedYear(null);
    setMappedSubjects([]);
    setMatchingStudents([]);
    setHasSearched(false);
  };

  // Table columns for curriculum subjects (Section 7.1)
  const subjectColumns = [
    {
      header: 'Subject Code',
      accessor: 'subjectCode',
      render: (row) => (
        <span className="font-mono font-bold text-[#C66B45] bg-[#FCE6D8]/60 px-2 py-0.5 rounded">
          {row.subjectCode}
        </span>
      )
    },
    {
      header: 'Subject Name',
      accessor: 'subjectName',
      render: (row) => <span className="font-semibold text-[#553729]">{row.subjectName}</span>
    },
    {
      header: 'Academic Year',
      accessor: 'academicYear',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
          {row.academicYear}
        </span>
      )
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => <span className="text-xs font-medium text-[#553729]">{row.department}</span>
    },
    {
      header: 'Assigned Staff',
      accessor: 'assignedStaff',
      render: (row) => (
        <div>
          <span className="text-xs font-semibold text-[#553729]">{row.assignedStaff || 'Unassigned'}</span>
          {row.staffId && <span className="text-[11px] text-[#929071] block">ID: {row.staffId}</span>}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Subject Lookup / Entry Workflow"
        subtitle="Validate student enrollment, resolve assigned department HOD, and fetch active semester subject curriculum"
        breadcrumbs={[
          { label: 'Department', path: '/department/student-lookup' },
          { label: 'Student Subject Lookup' }
        ]}
      />

      {/* Filter Form - Works with ANY single field or combination */}
      <form
        onSubmit={handleLookupSubmit}
        className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#EBD9CB]/70">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-[#C66B45]" />
            <h3 className="text-base font-bold text-[#553729]">Student & Curriculum Lookup Parameters</h3>
          </div>
          {(hasSearched || formData.rollNumber || formData.studentName || formData.departmentId || formData.academicYearId) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#929071] hover:text-[#C66B45] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Row 1: Department Filter & Academic Year Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Department Filter */}
          <FormField label="Filter by Department" hint="Choose department to inspect curriculum & HOD">
            <Select
              name="departmentId"
              value={formData.departmentId}
              onChange={(e) => setFormData(prev => ({ ...prev, departmentId: e.target.value }))}
              options={departments.map((d) => ({
                value: d.id,
                label: `${d.code} - ${d.name}`
              }))}
              placeholder="-- All Departments --"
            />
          </FormField>

          {/* Academic Year Filter */}
          <FormField label="Filter by Academic Year" hint="Choose cohort academic year">
            <Select
              name="academicYearId"
              value={formData.academicYearId}
              onChange={(e) => setFormData(prev => ({ ...prev, academicYearId: e.target.value }))}
              options={academicYears.map((y) => ({
                value: y.id,
                label: y.name
              }))}
              placeholder="-- All Academic Years --"
            />
          </FormField>
        </div>

        {/* Row 2: Student Roll Number & Student Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Roll Number Input */}
          <FormField label="Student Roll Number" hint="Optional: Search individual student by Roll ID">
            <Input
              name="rollNumber"
              placeholder="e.g. 26AD001, 26CS001, 25EC001"
              value={formData.rollNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, rollNumber: e.target.value }))}
            />
          </FormField>

          {/* Student Name Input */}
          <FormField label="Student Name" hint="Optional: Search by student name">
            <Input
              name="studentName"
              placeholder="e.g. Aditi Sharma, Preeti Deshmukh"
              value={formData.studentName}
              onChange={(e) => setFormData(prev => ({ ...prev, studentName: e.target.value }))}
            />
          </FormField>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 text-xs text-[#929071]">
            <Info className="w-4 h-4 text-[#C66B45] shrink-0" />
            <span>Select any single dropdown or enter Roll/Name above, then click Fetch Curriculum.</span>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={Search}
            >
              Fetch Curriculum
            </Button>
          </div>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="py-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <Loader message="Fetching curriculum subjects, verifying department HOD, and finding students..." />
        </div>
      )}

      {/* OUTPUT A: Specific Student Resolved (when Roll Number or Name was searched) */}
      {!loading && resolvedStudent && (
        <div className="space-y-6">
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EBD9CB]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FCE6D8] border border-[#EBD9CB] flex items-center justify-center text-[#C66B45] font-bold text-xl shadow-xs">
                  {resolvedStudent.name ? resolvedStudent.name.charAt(0) : 'S'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-[#553729]">{resolvedStudent.name}</h2>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FCE6D8] text-[#C66B45] border border-[#EBD9CB]">
                      Roll: {resolvedStudent.rollNumber}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      Verified Student
                    </span>
                  </div>
                  <p className="text-sm text-[#929071] mt-0.5 font-medium">
                    {resolvedStudent.department} • {resolvedStudent.academicYear}
                  </p>
                </div>
              </div>

              {/* Verified HOD Badge */}
              <div className="bg-white/80 border border-[#EBD9CB] p-3.5 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#C66B45] text-white flex items-center justify-center shadow-xs">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-[#929071]">
                    Department HOD
                  </span>
                  <p className="text-sm font-bold text-[#553729]">{resolvedStudent.hodName || 'Assigned HOD'}</p>
                  <p className="text-xs text-[#929071]">{resolvedStudent.department}</p>
                </div>
              </div>
            </div>

            {/* Verification Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#C66B45]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#929071] block">Department</span>
                  <p className="text-sm font-bold text-[#553729]">{resolvedStudent.department}</p>
                </div>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#C66B45]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#929071] block">Academic Year</span>
                  <p className="text-sm font-bold text-[#553729]">{resolvedStudent.academicYear}</p>
                </div>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-[#C66B45]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#929071] block">Mapped Subjects</span>
                  <p className="text-sm font-bold text-[#C66B45]">{mappedSubjects.length} Courses</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mapped Subjects Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#C66B45]" />
                <h3 className="text-base font-bold text-[#553729]">
                  Mapped Subjects for {resolvedStudent.name} ({resolvedStudent.department})
                </h3>
              </div>
              <span className="text-xs text-[#929071]">
                {mappedSubjects.length} course{mappedSubjects.length === 1 ? '' : 's'} active for this student
              </span>
            </div>

            <DataTable
              columns={subjectColumns}
              data={mappedSubjects}
              loading={false}
              emptyMessage={`No subjects found for ${resolvedStudent.department} in ${resolvedStudent.academicYear}`}
            />
          </div>
        </div>
      )}

      {/* OUTPUT B: Department / Academic Year Filtered (No single student entered) */}
      {!loading && !resolvedStudent && (resolvedDept || resolvedYear || mappedSubjects.length > 0) && (
        <div className="space-y-6">
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#EBD9CB]">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#FCE6D8] border border-[#EBD9CB] flex items-center justify-center text-[#C66B45] font-bold text-xl shadow-xs">
                  {resolvedDept ? resolvedDept.code : 'ERP'}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-[#553729]">
                      {resolvedDept ? resolvedDept.name : 'Curriculum Cohort'}
                    </h2>
                    {resolvedDept && (
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FCE6D8] text-[#C66B45] border border-[#EBD9CB]">
                        {resolvedDept.code}
                      </span>
                    )}
                    {resolvedYear && (
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
                        {resolvedYear.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-[#929071] mt-0.5 font-medium">
                    Department Curriculum & Cohort Student Directory
                  </p>
                </div>
              </div>

              {/* Resolved HOD Badge */}
              {resolvedDept && (
                <div className="bg-white/80 border border-[#EBD9CB] p-3.5 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#C66B45] text-white flex items-center justify-center shadow-xs">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#929071]">
                      Department HOD
                    </span>
                    <p className="text-sm font-bold text-[#553729]">{resolvedDept.hodName || 'Assigned HOD'}</p>
                    <p className="text-xs text-[#929071]">{resolvedDept.name}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Cohort Stat Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center gap-3">
                <Building2 className="w-5 h-5 text-[#C66B45]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#929071] block">Department</span>
                  <p className="text-sm font-bold text-[#553729]">{resolvedDept ? resolvedDept.name : 'All Departments'}</p>
                </div>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[#C66B45]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#929071] block">Academic Year</span>
                  <p className="text-sm font-bold text-[#553729]">{resolvedYear ? resolvedYear.name : 'All Academic Years'}</p>
                </div>
              </div>

              <div className="p-3 bg-white/70 border border-[#EBD9CB] rounded-xl flex items-center gap-3">
                <Users className="w-5 h-5 text-[#C66B45]" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#929071] block">Enrolled Students</span>
                  <p className="text-sm font-bold text-[#C66B45]">{matchingStudents.length} Students</p>
                </div>
              </div>
            </div>
          </div>

          {/* Mapped Subjects Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#C66B45]" />
                <h3 className="text-base font-bold text-[#553729]">
                  Curriculum Subjects ({mappedSubjects.length} Courses Found)
                </h3>
              </div>
              <span className="text-xs text-[#929071]">
                Active syllabus for {resolvedDept?.code || 'selected filters'}
              </span>
            </div>

            <DataTable
              columns={subjectColumns}
              data={mappedSubjects}
              loading={false}
              emptyMessage="No subjects found matching the selected department or academic year."
            />
          </div>

          {/* Enrolled Students in this Cohort */}
          {matchingStudents.length > 0 && (
            <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#EBD9CB]/70 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#C66B45]" />
                  <h4 className="text-sm font-bold text-[#553729]">
                    Students Enrolled in this Cohort ({matchingStudents.length})
                  </h4>
                </div>
                <span className="text-xs text-[#929071]">
                  Click any student to view their individual verified profile & curriculum
                </span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 max-h-56 overflow-y-auto">
                {matchingStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => executeLookup(s.rollNumber)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FCE6D8] border border-[#EBD9CB] rounded-xl text-xs text-[#553729] font-medium transition-all shadow-2xs hover:scale-102"
                  >
                    <span className="font-mono font-bold text-[#C66B45]">{s.rollNumber}</span>
                    <span>- {s.name}</span>
                    <span className="text-[10px] text-[#929071]">({s.department} • {s.academicYear})</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial state before search */}
      {!loading && !resolvedStudent && !resolvedDept && !resolvedYear && mappedSubjects.length === 0 && (
        <div className="p-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
          <EmptyState
            title={hasSearched ? 'No matching records found' : 'Ready for Department & Student Lookup'}
            description={
              hasSearched
                ? 'Try adjusting your Department, Academic Year, Roll Number, or Student Name.'
                : 'Select any department or academic year from the dropdowns above, or enter a student roll number / name, then click Fetch Curriculum.'
            }
          />
        </div>
      )}
    </div>
  );
}
