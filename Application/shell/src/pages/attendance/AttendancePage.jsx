import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/feedback/Toast';
import { attendanceService } from '../../services/attendanceService';
import { masterService } from '../../services/masterService';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/common/Button';
import Select from '../../components/forms/Select';
import Input from '../../components/forms/Input';
import FormField from '../../components/forms/FormField';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  BookOpen,
  Calendar,
  Building2,
  Save,
  Check,
  AlertCircle,
  TrendingUp,
  Award,
  Sparkles,
  Info,
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const role = user?.role || 'Staff';
  const isSuperAdmin = role === 'Super Admin' || role === 'Tenant Administrator';
  const isHOD = role === 'HOD';
  const isStaff = role === 'Staff';
  const isStudent = role === 'Student';
  const canMarkAttendance = isSuperAdmin || isStaff;

  // Tabs for Staff / Admin / HOD
  const [activeTab, setActiveTab] = useState('sheet'); // 'sheet' | 'summary'

  // Student specific data state
  const [studentData, setStudentData] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);

  // Filter options
  const [departments, setDepartments] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);

  // Selected filters for marking/inspecting
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Attendance Sheet state
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [sheetData, setSheetData] = useState(null);
  const [studentRows, setStudentRows] = useState([]);

  // Summary state
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    if (isStudent) {
      loadStudentAttendance();
    } else {
      loadFilterOptions();
    }
  }, [isStudent]);

  // Load student personal attendance
  const loadStudentAttendance = async () => {
    setStudentLoading(true);
    try {
      const res = await attendanceService.getMyAttendance();
      setStudentData(res.data);
    } catch (err) {
      showError(err.message || 'Failed to load personal attendance records');
    } finally {
      setStudentLoading(false);
    }
  };

  // Load departments, years, and subjects
  const loadFilterOptions = async () => {
    try {
      const [deptRes, yearRes, subRes] = await Promise.all([
        masterService.searchDepartments({ all: true }),
        masterService.getYears(),
        masterService.getSubjects()
      ]);

      const depts = deptRes.data || [];
      const years = yearRes.data || [];
      const subs = subRes.data || [];

      setDepartments(depts);
      setAcademicYears(years);
      setAllSubjects(subs);

      // Default department: if staff, pick staff department if available
      const userDeptId = user?.department?.id || (depts.length > 0 ? depts[0].id : '');
      const defaultDept = userDeptId || (depts[0]?.id || '');
      const defaultYear = years[0]?.id || '';

      setSelectedDeptId(defaultDept);
      setSelectedYearId(defaultYear);

      // Filter subjects for default dept + year
      const matchingSubs = subs.filter(
        (s) => (!defaultDept || s.departmentId === defaultDept) && (!defaultYear || s.academicYearId === defaultYear)
      );
      if (matchingSubs.length > 0) {
        setSelectedSubjectId(matchingSubs[0].id);
      }
    } catch (err) {
      console.error('Failed to load attendance options:', err);
    }
  };

  // Filter subjects whenever department or academic year changes
  const availableSubjects = allSubjects.filter(
    (s) =>
      (!selectedDeptId || s.departmentId === selectedDeptId) &&
      (!selectedYearId || s.academicYearId === selectedYearId)
  );

  // Update subject selection if current subject does not belong to filtered subjects
  useEffect(() => {
    if (!isStudent && availableSubjects.length > 0) {
      if (!availableSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else if (availableSubjects.length === 0) {
      setSelectedSubjectId('');
    }
  }, [selectedDeptId, selectedYearId, allSubjects]);

  // Load Attendance Sheet
  const handleLoadSheet = async () => {
    if (!selectedDeptId || !selectedYearId) {
      showError('Please select both a Department and an Academic Year');
      return;
    }

    setLoadingSheet(true);
    try {
      const res = await attendanceService.getAttendanceSheet({
        departmentId: selectedDeptId,
        academicYearId: selectedYearId,
        subjectId: selectedSubjectId || undefined,
        date: selectedDate
      });
      setSheetData(res.data);
      setStudentRows(res.data?.students || []);
    } catch (err) {
      showError(err.message || 'Failed to fetch attendance sheet');
    } finally {
      setLoadingSheet(false);
    }
  };

  // Update a single student's status
  const handleStatusChange = (studentId, newStatus) => {
    if (!canMarkAttendance) return;
    setStudentRows((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: newStatus } : s))
    );
  };

  // Update remarks
  const handleRemarkChange = (studentId, remarks) => {
    if (!canMarkAttendance) return;
    setStudentRows((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, remarks } : s))
    );
  };

  // Bulk actions
  const handleMarkAll = (status) => {
    if (!canMarkAttendance) return;
    setStudentRows((prev) => prev.map((s) => ({ ...s, status })));
  };

  // Submit Attendance
  const handleSubmitAttendance = async () => {
    if (!selectedSubjectId) {
      showError('Please select a curriculum subject to save attendance');
      return;
    }
    if (studentRows.length === 0) {
      showError('No students to record attendance for');
      return;
    }

    setSavingAttendance(true);
    try {
      const records = studentRows.map((s) => ({
        studentId: s.id,
        status: s.status,
        remarks: s.remarks || undefined
      }));

      await attendanceService.markAttendance({
        academicYearId: selectedYearId,
        departmentId: selectedDeptId,
        subjectId: selectedSubjectId,
        date: selectedDate,
        records
      });

      showSuccess(`Attendance successfully saved for ${records.length} students!`);
      // Reload sheet to show saved status
      handleLoadSheet();
    } catch (err) {
      showError(err.message || 'Failed to submit attendance');
    } finally {
      setSavingAttendance(false);
    }
  };

  // Load summary
  const handleLoadSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await attendanceService.getAttendanceSummary({
        departmentId: selectedDeptId || undefined,
        academicYearId: selectedYearId || undefined
      });
      setSummaryData(res.data);
    } catch (err) {
      showError(err.message || 'Failed to load attendance summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'summary' && !isStudent) {
      handleLoadSummary();
    }
  }, [activeTab, selectedDeptId, selectedYearId]);

  // =========================================================================
  // VIEW A: STUDENT PERSONAL ATTENDANCE
  // =========================================================================
  if (isStudent) {
    if (studentLoading) {
      return (
        <div className="py-20 text-center">
          <Loader message="Loading your attendance profile and records..." />
        </div>
      );
    }

    const stats = studentData?.statistics || {
      overallPercentage: 0,
      totalClasses: 0,
      presentCount: 0,
      absentCount: 0,
      lateCount: 0,
      isEligible: true
    };
    const student = studentData?.student || {};
    const subjects = studentData?.subjectBreakdown || [];

    return (
      <div className="space-y-6">
        <PageHeader
          title="My Attendance Profile"
          subtitle={`Student: ${student.name || user?.name} (${student.rollNumber || 'Enrolled'}) • ${student.department || ''} • ${student.academicYear || ''}`}
          breadcrumbItems={[
            { label: 'Attendance' },
            { label: 'My Records' }
          ]}
        />

        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Overall Percentage */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-[#929071]">Overall Attendance</span>
              <div className={`p-2 rounded-xl ${stats.overallPercentage >= 75 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                <CalendarCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold ${stats.overallPercentage >= 75 ? 'text-emerald-700' : 'text-red-700'}`}>
                {stats.overallPercentage}%
              </span>
              <span className="text-xs font-semibold text-[#929071]">
                ({stats.presentCount + stats.lateCount}/{stats.totalClasses} sessions)
              </span>
            </div>
            <div className="mt-3">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                stats.isEligible ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {stats.isEligible ? <Award className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {stats.isEligible ? 'Exam Eligible (≥ 75%)' : 'Attendance Shortage (< 75%)'}
              </span>
            </div>
          </div>

          {/* Present Sessions */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-[#929071]">Present</span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-[#553729]">{stats.presentCount}</span>
              <p className="text-xs text-[#929071] mt-1">Lectures fully attended</p>
            </div>
          </div>

          {/* Absent Sessions */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-[#929071]">Absent</span>
              <div className="p-2 rounded-xl bg-red-100 text-red-700">
                <XCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-red-600">{stats.absentCount}</span>
              <p className="text-xs text-[#929071] mt-1">Missed lectures</p>
            </div>
          </div>

          {/* Late Sessions */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-bold text-[#929071]">Late Entry</span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-amber-600">{stats.lateCount}</span>
              <p className="text-xs text-[#929071] mt-1">Counted with attendance</p>
            </div>
          </div>
        </div>

        {/* Subject-wise Breakdown Table */}
        <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EBD9CB]">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#C66B45]" />
              <h3 className="text-base font-bold text-[#553729]">Subject-wise Attendance Breakdown</h3>
            </div>
            <span className="text-xs text-[#929071]">
              Minimum 75% required per subject for exam qualification
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#EBD9CB]">
            <table className="min-w-full divide-y divide-[#EBD9CB] text-left text-sm">
              <thead className="bg-[#FCE6D8]/60 text-xs uppercase tracking-wider text-[#553729] font-bold">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Semester</th>
                  <th className="px-4 py-3">Total Held</th>
                  <th className="px-4 py-3">Attended</th>
                  <th className="px-4 py-3">Missed</th>
                  <th className="px-4 py-3">Attendance Progress</th>
                  <th className="px-4 py-3">Eligibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBD9CB]/50 bg-[#FFF8F1]">
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-xs text-[#929071]">
                      No subject attendance recorded yet.
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub) => {
                    const isElig = sub.percentage >= 75;
                    return (
                      <tr key={sub.subjectId} className="hover:bg-[#FCE6D8]/20 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-bold text-[#C66B45] bg-[#FCE6D8] px-2 py-0.5 rounded mr-2">
                            {sub.code}
                          </span>
                          <span className="font-semibold text-[#553729]">{sub.name}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#929071]">{sub.semester}</td>
                        <td className="px-4 py-3 font-semibold text-[#553729]">{sub.total}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{sub.present + sub.late}</td>
                        <td className="px-4 py-3 font-bold text-red-600">{sub.absent}</td>
                        <td className="px-4 py-3 w-48">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-[#EBD9CB] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  sub.percentage >= 75
                                    ? 'bg-emerald-600'
                                    : sub.percentage >= 65
                                    ? 'bg-amber-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                              />
                            </div>
                            <span className="font-bold text-xs text-[#553729] w-10 text-right">
                              {sub.percentage}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isElig ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isElig ? 'Qualified' : 'Shortage'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: STAFF, SUPER ADMIN, AND HOD ATTENDANCE INTERFACE
  // =========================================================================
  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Attendance Management"
        subtitle={
          isStaff
            ? "Record and manage daily classroom lecture attendance for your academic cohorts."
            : isHOD
            ? "Inspect student attendance sheets, cohort performance, and examination eligibility (View Only)."
            : "Complete institutional attendance control, roster tracking, and analytics."
        }
        breadcrumbItems={[
          { label: 'Attendance', href: '/attendance' },
          { label: activeTab === 'sheet' ? 'Mark & Track' : 'Analytics' }
        ]}
        actions={
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'sheet' ? 'primary' : 'outline'}
              size="sm"
              icon={CalendarCheck}
              onClick={() => setActiveTab('sheet')}
            >
              {canMarkAttendance ? 'Mark Attendance' : 'Attendance Sheet'}
            </Button>
            <Button
              variant={activeTab === 'summary' ? 'primary' : 'outline'}
              size="sm"
              icon={TrendingUp}
              onClick={() => setActiveTab('summary')}
            >
              Summary & Analytics
            </Button>
          </div>
        }
      />

      {/* Role Notice Banner for HOD */}
      {isHOD && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-900 shadow-2xs">
          <Info className="w-5 h-5 text-amber-700 shrink-0" />
          <p>
            <strong>HOD View-Only Mode:</strong> You can inspect attendance sheets, individual records, and analytical summaries across all departments and cohorts. Attendance marking controls are reserved for faculty staff and super administrators.
          </p>
        </div>
      )}

      {/* Filtering Bar */}
      <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#EBD9CB]/70">
          <Filter className="w-4 h-4 text-[#C66B45]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#553729]">
            Select Cohort & Lecture Parameters
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Department */}
          <FormField label="Department" required>
            <Select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              options={departments.map((d) => ({
                value: d.id,
                label: `${d.code} - ${d.name}`
              }))}
              placeholder="-- Select Department --"
            />
          </FormField>

          {/* Academic Year */}
          <FormField label="Academic Year" required>
            <Select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              options={academicYears.map((y) => ({
                value: y.id,
                label: y.name
              }))}
              placeholder="-- Select Academic Year --"
            />
          </FormField>

          {/* Subject */}
          <FormField label="Subject" required hint={availableSubjects.length > 0 ? `${availableSubjects.length} courses` : 'No courses'}>
            <Select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              options={availableSubjects.map((s) => ({
                value: s.id,
                label: `${s.code} - ${s.name} (${s.semester})`
              }))}
              placeholder="-- Select Subject --"
            />
          </FormField>

          {/* Date */}
          <FormField label="Attendance Date" required>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </FormField>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            variant="primary"
            icon={Search}
            onClick={handleLoadSheet}
            loading={loadingSheet}
          >
            Load Attendance Sheet
          </Button>
        </div>
      </div>

      {/* TAB 1: ATTENDANCE SHEET */}
      {activeTab === 'sheet' && (
        <div className="space-y-4">
          {loadingSheet ? (
            <div className="py-16 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl text-center">
              <Loader message="Loading student cohort and attendance sheet..." />
            </div>
          ) : studentRows.length === 0 ? (
            <div className="p-12 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl">
              <EmptyState
                title="No Attendance Sheet Loaded"
                description="Select your department, academic cohort, subject, and date above, then click 'Load Attendance Sheet' to record or inspect attendance."
                actionLabel="Load Sheet"
                onAction={handleLoadSheet}
              />
            </div>
          ) : (
            <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs space-y-4">
              {/* Sheet Header & Quick Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EBD9CB]">
                <div>
                  <h3 className="text-base font-bold text-[#553729] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#C66B45]" />
                    <span>Class Attendance Roster ({studentRows.length} Students)</span>
                  </h3>
                  <p className="text-xs text-[#929071] mt-0.5">
                    Lecture Date: <strong className="text-[#553729]">{selectedDate}</strong> • Subject:{' '}
                    <strong className="text-[#C66B45]">
                      {allSubjects.find((s) => s.id === selectedSubjectId)?.name || 'Selected Course'}
                    </strong>
                  </p>
                </div>

                {/* Quick Action Buttons for Staff / Super Admin */}
                {canMarkAttendance && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleMarkAll('present')}
                      className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors"
                    >
                      All Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkAll('absent')}
                      className="px-2.5 py-1 text-xs font-bold text-red-800 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                    >
                      All Absent
                    </button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Save}
                      onClick={handleSubmitAttendance}
                      loading={savingAttendance}
                    >
                      Save Attendance
                    </Button>
                  </div>
                )}
              </div>

              {/* Roster Live Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FCE6D8]/30 p-3 rounded-xl border border-[#EBD9CB]">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-[#929071]">Total Enrolled</span>
                  <p className="text-lg font-extrabold text-[#553729]">{studentRows.length}</p>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">Present</span>
                  <p className="text-lg font-extrabold text-emerald-700">
                    {studentRows.filter((s) => s.status === 'present').length}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-red-800">Absent</span>
                  <p className="text-lg font-extrabold text-red-600">
                    {studentRows.filter((s) => s.status === 'absent').length}
                  </p>
                </div>
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-amber-800">Late</span>
                  <p className="text-lg font-extrabold text-amber-600">
                    {studentRows.filter((s) => s.status === 'late').length}
                  </p>
                </div>
              </div>

              {/* Student Table */}
              <div className="overflow-x-auto rounded-xl border border-[#EBD9CB]">
                <table className="min-w-full divide-y divide-[#EBD9CB] text-left text-sm">
                  <thead className="bg-[#FCE6D8]/60 text-xs uppercase tracking-wider text-[#553729] font-bold">
                    <tr>
                      <th className="px-4 py-3 w-16">S.No</th>
                      <th className="px-4 py-3">Roll Number</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Semester</th>
                      <th className="px-4 py-3 w-64">Attendance Status</th>
                      <th className="px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBD9CB]/50 bg-[#FFF8F1]">
                    {studentRows.map((stu, idx) => (
                      <tr key={stu.id} className="hover:bg-[#FCE6D8]/20 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-[#929071]">{idx + 1}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs font-bold text-[#C66B45] bg-[#FCE6D8] px-2 py-0.5 rounded">
                            {stu.rollNumber}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-[#553729]">{stu.name}</td>
                        <td className="px-4 py-2.5 text-xs text-[#929071]">{stu.semester || 'Semester 1'}</td>
                        <td className="px-4 py-2.5">
                          {canMarkAttendance ? (
                            <div className="inline-flex rounded-lg border border-[#EBD9CB] p-0.5 bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.id, 'present')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                                  stu.status === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-[#929071] hover:text-[#553729] hover:bg-gray-100'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Present
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.id, 'absent')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                                  stu.status === 'absent'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-[#929071] hover:text-[#553729] hover:bg-gray-100'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" /> Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStatusChange(stu.id, 'late')}
                                className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                                  stu.status === 'late'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-[#929071] hover:text-[#553729] hover:bg-gray-100'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" /> Late
                              </button>
                            </div>
                          ) : (
                            /* Read Only for HOD */
                            stu.status === 'present' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Present
                              </span>
                            ) : stu.status === 'absent' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                <XCircle className="w-3.5 h-3.5" /> Absent
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                <Clock className="w-3.5 h-3.5" /> Late
                              </span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {canMarkAttendance ? (
                            <input
                              type="text"
                              value={stu.remarks || ''}
                              onChange={(e) => handleRemarkChange(stu.id, e.target.value)}
                              placeholder="Notes (optional)"
                              className="w-full text-xs px-2.5 py-1 rounded-lg border border-[#EBD9CB] bg-white text-[#553729] focus:outline-none focus:ring-1 focus:ring-[#C66B45]"
                            />
                          ) : (
                            <span className="text-xs text-[#929071]">{stu.remarks || '—'}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {canMarkAttendance && (
                <div className="flex justify-end pt-3">
                  <Button
                    variant="primary"
                    icon={Save}
                    onClick={handleSubmitAttendance}
                    loading={savingAttendance}
                  >
                    Save Attendance Records
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ATTENDANCE SUMMARY & ANALYTICS */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {loadingSummary ? (
            <div className="py-16 bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl text-center">
              <Loader message="Computing attendance analytics..." />
            </div>
          ) : (
            <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#EBD9CB]">
                <div>
                  <h3 className="text-base font-bold text-[#553729] flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#C66B45]" />
                    <span>Cohort Attendance Performance</span>
                  </h3>
                  <p className="text-xs text-[#929071] mt-0.5">
                    Aggregated attendance metrics for selected department and academic cohort
                  </p>
                </div>
              </div>

              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white/80 border border-[#EBD9CB] rounded-xl text-center">
                  <span className="text-xs uppercase font-bold text-[#929071]">Total Attendance Sessions</span>
                  <p className="text-2xl font-extrabold text-[#553729] mt-2">{summaryData?.totalSessions || 0}</p>
                </div>

                <div className="p-4 bg-white/80 border border-[#EBD9CB] rounded-xl text-center">
                  <span className="text-xs uppercase font-bold text-emerald-800">Present Rate</span>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-2">{summaryData?.overallPercentage || 0}%</p>
                </div>

                <div className="p-4 bg-white/80 border border-[#EBD9CB] rounded-xl text-center">
                  <span className="text-xs uppercase font-bold text-red-800">Total Absences</span>
                  <p className="text-2xl font-extrabold text-red-600 mt-2">{summaryData?.absentRecords || 0}</p>
                </div>

                <div className="p-4 bg-white/80 border border-[#EBD9CB] rounded-xl text-center">
                  <span className="text-xs uppercase font-bold text-amber-800">Late Attendances</span>
                  <p className="text-2xl font-extrabold text-amber-600 mt-2">{summaryData?.lateRecords || 0}</p>
                </div>
              </div>

              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950">
                <Sparkles className="w-5 h-5 text-[#C66B45] shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Automated Examination Eligibility Policy:</p>
                  <p className="mt-0.5 text-amber-900 leading-relaxed">
                    Students maintaining ≥ 75% aggregate subject attendance are automatically certified as eligible for end-semester examinations. Students falling between 65% - 74% require institutional condonation from the Head of Department.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
