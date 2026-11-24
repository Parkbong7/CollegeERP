import React, { useEffect, useState } from 'react';
import { masterService } from '../shell/src/services/masterService';
import { useAuth } from '../shell/src/context/AuthContext';
import { useToast } from '../shell/src/components/feedback/Toast';
import PageHeader from '../shell/src/components/layout/PageHeader';
import DataTable from '../shell/src/components/tables/DataTable';
import StatusBadge from '../shell/src/components/common/StatusBadge';
import Modal from '../shell/src/components/common/Modal';
import ConfirmDialog from '../shell/src/components/common/ConfirmDialog';
import Button from '../shell/src/components/common/Button';
import Input from '../shell/src/components/forms/Input';
import Select from '../shell/src/components/forms/Select';
import FormField from '../shell/src/components/forms/FormField';
import FormActions from '../shell/src/components/forms/FormActions';
import { Eye, Edit2, Trash2, Plus, Calendar, BookOpen, CalendarDays, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMETABLE_PERIODS = [
  { period: 1, time: '09:00 - 10:00', label: 'Period 1' },
  { period: 2, time: '10:00 - 11:00', label: 'Period 2' },
  { type: 'break', label: 'Tea Break', time: '11:00 - 11:15', icon: '☕' },
  { period: 3, time: '11:15 - 12:15', label: 'Period 3' },
  { type: 'break', label: 'Lunch Break', time: '12:15 - 13:15', icon: '🍽️' },
  { period: 4, time: '13:15 - 14:15', label: 'Period 4' },
  { period: 5, time: '14:15 - 15:15', label: 'Period 5' },
  { period: 6, time: '15:15 - 16:15', label: 'Period 6' }
];

export default function YearMasterPage() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subject details modal (Eye icon behavior)
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [subjectModalActiveTab, setSubjectModalActiveTab] = useState('subjects'); // 'subjects' | 'schedule'
  const [selectedYearSubjects, setSelectedYearSubjects] = useState(null);
  const [subjectLoading, setSubjectLoading] = useState(false);

  // Timetable Schedule View in Year Master
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedScheduleYear, setSelectedScheduleYear] = useState(null);
  const [scheduleSemester, setScheduleSemester] = useState('Semester 1');
  const [scheduleData, setScheduleData] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Create / Edit Year modal
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [yearFormData, setYearFormData] = useState({ name: '', code: '', startDate: '', endDate: '' });
  const [formSaving, setFormSaving] = useState(false);

  // Associated Subjects for Year Create / Edit
  const [yearSubjects, setYearSubjects] = useState([]);
  const [loadingYearSubjects, setLoadingYearSubjects] = useState(false);
  const [addingSubjectToYear, setAddingSubjectToYear] = useState(false);
  const [inlineSubjectForm, setInlineSubjectForm] = useState({
    departmentId: '',
    code: '',
    name: '',
    semester: 'Semester 1',
    credits: 3,
    staffId: ''
  });

  // Add Subject modal (Eye icon workflow)
  const [addSubjectModalOpen, setAddSubjectModalOpen] = useState(false);
  const [subjectFormData, setSubjectFormData] = useState({ departmentId: '', code: '', name: '', semester: 'Semester 1', credits: 4, staffId: '' });
  const [departments, setDepartments] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Delete confirm
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [yearToDelete, setYearToDelete] = useState(null);

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

  const { showSuccess, showError } = useToast();

  const fetchYears = async () => {
    setLoading(true);
    try {
      const res = await masterService.getYears();
      setYears(res.data);
    } catch (err) {
      showError(err.message || 'Failed to load academic years');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYears();
    masterService.searchDepartments({ all: true }).then((res) => setDepartments(res.data)).catch(() => {});
    masterService.searchStaff({ all: true }).then((res) => setStaffList(res.data || [])).catch(() => {});
  }, []);

  // Eye icon behavior: View mapped subjects (Section 5.1)
  const handleViewSubjects = async (year) => {
    setSubjectLoading(true);
    setSubjectModalActiveTab('subjects');
    setSubjectModalOpen(true);
    try {
      const res = await masterService.getYearSubjects(year.id);
      setSelectedYearSubjects(res.data);
    } catch (err) {
      showError(err.message || 'Failed to fetch subjects');
    } finally {
      setSubjectLoading(false);
    }
  };

  // Helper to determine available semesters for a selected academic year
  const getSemestersForYearObj = (year) => {
    if (!year) return ['Semester 1', 'Semester 2'];
    const code = (year.code || '').toUpperCase();
    if (code === 'Y1' || year.name?.includes('1')) return ['Semester 1', 'Semester 2'];
    if (code === 'Y2' || year.name?.includes('2')) return ['Semester 3', 'Semester 4'];
    if (code === 'Y3' || year.name?.includes('3')) return ['Semester 5', 'Semester 6'];
    if (code === 'Y4' || year.name?.includes('4')) return ['Semester 7', 'Semester 8'];
    return ['Semester 1', 'Semester 2'];
  };

  // Open Timetable Schedule Modal for Year & Semester
  const handleOpenYearSchedule = (year, targetSem = null) => {
    setSelectedScheduleYear(year);
    const sems = getSemestersForYearObj(year);
    const initialSem = targetSem || sems[0] || 'Semester 1';
    setScheduleSemester(initialSem);
    setScheduleModalOpen(true);
    loadYearTimetable(year.id, initialSem);
  };

  // Load published schedule for academic year & semester
  const loadYearTimetable = async (yearId, sem) => {
    setScheduleLoading(true);
    try {
      const res = await masterService.getClassSchedule({ academicYearId: yearId, semester: sem });
      setScheduleData(res.data);
    } catch (err) {
      console.warn('Failed to load timetable:', err.message);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleOpenCreateYear = () => {
    setEditingYear(null);
    setYearFormData({ name: '', code: '', startDate: '', endDate: '' });
    setYearSubjects([]);
    setInlineSubjectForm({
      departmentId: '',
      code: '',
      name: '',
      semester: 'Semester 1',
      credits: 3,
      staffId: ''
    });
    setYearModalOpen(true);
  };

  const handleOpenEditYear = (year) => {
    setEditingYear(year);
    setYearFormData({
      name: year.name,
      code: year.code,
      startDate: year.startDate || '',
      endDate: year.endDate || ''
    });
    setYearSubjects([]);
    setInlineSubjectForm({
      departmentId: '',
      code: '',
      name: '',
      semester: 'Semester 1',
      credits: 3,
      staffId: ''
    });
    setLoadingYearSubjects(true);
    setYearModalOpen(true);

    masterService
      .getYearSubjects(year.id)
      .then((res) => {
        setYearSubjects(res.data?.subjects || []);
      })
      .catch(() => {})
      .finally(() => {
        setLoadingYearSubjects(false);
      });
  };

  const handleAddSubjectToYear = async () => {
    if (!inlineSubjectForm.code || !inlineSubjectForm.name || !inlineSubjectForm.departmentId) {
      showError('Please fill in Subject Code, Name, and Department');
      return;
    }

    setAddingSubjectToYear(true);
    try {
      const selectedStaff = staffList.find((s) => s.id === inlineSubjectForm.staffId);
      if (editingYear) {
        // Direct backend persistence when editing an existing academic year
        const res = await masterService.createSubject({
          departmentId: inlineSubjectForm.departmentId,
          academicYearId: editingYear.id,
          code: inlineSubjectForm.code.toUpperCase(),
          name: inlineSubjectForm.name,
          semester: inlineSubjectForm.semester,
          credits: parseInt(inlineSubjectForm.credits, 10) || 3,
          staffId: inlineSubjectForm.staffId || undefined
        });
        const dept = departments.find((d) => d.id === inlineSubjectForm.departmentId);
        setYearSubjects([
          ...yearSubjects,
          {
            ...res.data,
            department: dept ? `${dept.code} - ${dept.name}` : '',
            staffName: selectedStaff ? selectedStaff.name : (res.data?.staffName || null)
          }
        ]);
        showSuccess(`Subject ${inlineSubjectForm.code.toUpperCase()} added to ${editingYear.name}`);
      } else {
        // Staged in-memory when creating a new academic year
        const dept = departments.find((d) => d.id === inlineSubjectForm.departmentId);
        setYearSubjects([
          ...yearSubjects,
          {
            id: 'temp_' + Date.now() + Math.random().toString(36).substring(2, 6),
            departmentId: inlineSubjectForm.departmentId,
            department: dept ? `${dept.code} - ${dept.name}` : '',
            code: inlineSubjectForm.code.toUpperCase(),
            name: inlineSubjectForm.name,
            semester: inlineSubjectForm.semester,
            credits: parseInt(inlineSubjectForm.credits, 10) || 3,
            staffId: inlineSubjectForm.staffId || null,
            staffName: selectedStaff ? selectedStaff.name : null
          }
        ]);
        showSuccess(`Subject ${inlineSubjectForm.code.toUpperCase()} added to staging list`);
      }

      setInlineSubjectForm({
        ...inlineSubjectForm,
        code: '',
        name: '',
        staffId: ''
      });
      fetchYears();
    } catch (err) {
      showError(err.message || 'Failed to add subject');
    } finally {
      setAddingSubjectToYear(false);
    }
  };

  const handleRemoveSubjectFromYear = async (sub) => {
    try {
      if (editingYear && !sub.id.startsWith('temp_')) {
        await masterService.deleteSubject(sub.id);
        showSuccess(`Subject ${sub.code} removed from ${editingYear.name}`);
      } else {
        showSuccess(`Subject ${sub.code} removed`);
      }
      setYearSubjects(yearSubjects.filter((s) => s.id !== sub.id));
      fetchYears();
    } catch (err) {
      showError(err.message || 'Failed to remove subject');
    }
  };

  const handleSaveYear = async (e) => {
    e.preventDefault();
    setFormSaving(true);
    try {
      if (editingYear) {
        await masterService.updateYear(editingYear.id, yearFormData);
        showSuccess('Academic year updated successfully');
      } else {
        const createRes = await masterService.createYear(yearFormData);
        const newYearId = createRes.data?.id;

        // Persist any staged subjects associated with this new year
        if (newYearId && yearSubjects.length > 0) {
          for (const sub of yearSubjects) {
            try {
              await masterService.createSubject({
                departmentId: sub.departmentId,
                academicYearId: newYearId,
                code: sub.code,
                name: sub.name,
                semester: sub.semester,
                credits: sub.credits,
                staffId: sub.staffId || undefined
              });
            } catch (subErr) {
              console.error(`Failed to map subject ${sub.code}:`, subErr);
            }
          }
        }
        showSuccess(
          `Academic year created with ${yearSubjects.length} associated subject${
            yearSubjects.length === 1 ? '' : 's'
          }!`
        );
      }
      setYearModalOpen(false);
      fetchYears();
    } catch (err) {
      showError(err.message || 'Failed to save academic year');
    } finally {
      setFormSaving(false);
    }
  };

  const handleDeleteYear = async () => {
    if (!yearToDelete) return;
    try {
      await masterService.deleteYear(yearToDelete.id);
      showSuccess('Academic year deleted successfully');
      setDeleteConfirmOpen(false);
      fetchYears();
    } catch (err) {
      showError(err.message || 'Failed to delete academic year');
    }
  };

  const handleSaveSubject = async (e) => {
    e.preventDefault();
    if (!selectedYearSubjects) return;
    setFormSaving(true);
    try {
      await masterService.createSubject({
        ...subjectFormData,
        academicYearId: selectedYearSubjects.year.id,
        staffId: subjectFormData.staffId || undefined
      });
      showSuccess(`Subject ${subjectFormData.code} added to ${selectedYearSubjects.year.name}`);
      setAddSubjectModalOpen(false);
      setSubjectFormData({ departmentId: '', code: '', name: '', semester: 'Semester 1', credits: 4, staffId: '' });
      const res = await masterService.getYearSubjects(selectedYearSubjects.year.id);
      setSelectedYearSubjects(res.data);
      fetchYears();
    } catch (err) {
      showError(err.message || 'Failed to add subject');
    } finally {
      setFormSaving(false);
    }
  };

  const columns = [
    {
      header: 'S.No',
      accessor: 'serialNo',
      className: 'w-16 font-bold text-[#929071]'
    },
    {
      header: 'Year Name',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FCE6D8] text-[#C66B45] flex items-center justify-center font-bold text-xs">
            {row.code}
          </div>
          <div>
            <span className="font-bold text-[#553729]">{row.name}</span>
            <p className="text-[11px] text-[#929071]">ABC College of Engineering</p>
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      header: 'Subject Count',
      accessor: 'subjectCount',
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#FCE6D8]/60 text-xs font-bold text-[#C66B45]">
          <BookOpen className="w-3.5 h-3.5 mr-1" />
          {row.subjectCount} Subjects
        </span>
      )
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end space-x-2">
          <button
            onClick={() => handleViewSubjects(row)}
            title="View Mapped Subjects (Eye Icon)"
            className="p-1.5 rounded-lg border border-[#EBD9CB] bg-[#FFF8F1] text-[#C66B45] hover:bg-[#FCE6D8] transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenYearSchedule(row)}
            title="View Timetable Schedule"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#EBD9CB] bg-[#FFF8F1] text-[#C66B45] hover:bg-[#FCE6D8] font-bold text-xs transition-colors shadow-sm"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>
          {isSuperAdmin && (
            <>
              <button
                onClick={() => handleOpenEditYear(row)}
                title="Edit Year"
                className="p-1.5 rounded-lg border border-[#EBD9CB] bg-[#FFF8F1] text-[#553729] hover:bg-[#FCE6D8] transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setYearToDelete(row);
                  setDeleteConfirmOpen(true);
                }}
                title="Delete Year"
                className="p-1.5 rounded-lg border border-[#EBD9CB] bg-[#FFF8F1] text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Year Master"
        subtitle="Display all four seeded academic years with mapped curriculum subjects and management actions."
        breadcrumbItems={[
          { label: 'Master', href: '/master/year' },
          { label: 'Year Master' }
        ]}
        actions={
          isSuperAdmin ? (
            <Button variant="primary" icon={Plus} onClick={handleOpenCreateYear}>
              Add Academic Year
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        data={years}
        loading={loading}
        emptyMessage="No academic years found."
      />

      {/* 5.1 Eye Icon Behavior Modal: Subject Details */}
      <Modal
        isOpen={subjectModalOpen}
        onClose={() => setSubjectModalOpen(false)}
        title={`Mapped Subjects — ${selectedYearSubjects?.year?.name || ''}`}
        subtitle={`Displaying all subjects mapped to ${selectedYearSubjects?.year?.name || ''} and ABC College of Engineering`}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#EBD9CB]">
            <p className="text-xs text-[#929071]">
              Total Subjects: <strong className="text-[#553729]">{selectedYearSubjects?.subjects?.length || 0}</strong>
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={CalendarDays}
                onClick={() => {
                  setSubjectModalOpen(false);
                  if (selectedYearSubjects?.year) {
                    handleOpenYearSchedule(selectedYearSubjects.year);
                  }
                }}
              >
                View Timetable Schedule
              </Button>
              {isSuperAdmin && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => setAddSubjectModalOpen(true)}
                >
                  Add Subject
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#EBD9CB]">
            <table className="min-w-full divide-y divide-[#EBD9CB] text-left text-sm">
              <thead className="bg-[#FCE6D8]/60 text-xs uppercase tracking-wider text-[#553729] font-bold">
                <tr>
                  <th className="px-4 py-3">Subject Code</th>
                  <th className="px-4 py-3">Subject Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Semester</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3">Assigned Faculty</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBD9CB]/50 bg-[#FFF8F1]">
                {subjectLoading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-sm text-[#929071]">
                      Loading subjects...
                    </td>
                  </tr>
                ) : selectedYearSubjects?.subjects?.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-sm text-[#929071]">
                      No subjects mapped to this academic year yet.
                    </td>
                  </tr>
                ) : (
                  selectedYearSubjects?.subjects?.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[#FCE6D8]/20">
                      <td className="px-4 py-2.5 font-bold text-[#C66B45]">{sub.code}</td>
                      <td className="px-4 py-2.5 font-medium text-[#553729]">{sub.name}</td>
                      <td className="px-4 py-2.5 text-xs text-[#553729]">{sub.department}</td>
                      <td className="px-4 py-2.5 text-xs text-[#929071]">{sub.semester}</td>
                      <td className="px-4 py-2.5 text-xs font-semibold text-[#553729]">{sub.credits}</td>
                      <td className="px-4 py-2.5 text-xs text-[#553729]">
                        {sub.staffName || sub.assignedStaff?.name ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium text-xs">
                            👨‍🏫 {sub.staffName || sub.assignedStaff?.name}
                          </span>
                        ) : (
                          <span className="text-[#929071] italic text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={sub.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Year Create / Edit Modal */}
      <Modal
        isOpen={yearModalOpen}
        onClose={() => setYearModalOpen(false)}
        title={editingYear ? `Edit Academic Year (${editingYear.name})` : 'Create Academic Year'}
        subtitle="Configure institution academic year parameters and manage associated curriculum subjects"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveYear} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Year Name" required>
              <Input
                value={yearFormData.name}
                onChange={(e) => setYearFormData({ ...yearFormData, name: e.target.value })}
                placeholder="e.g. Year 1"
                required
              />
            </FormField>

            <FormField label="Year Code" required>
              <Input
                value={yearFormData.code}
                onChange={(e) => setYearFormData({ ...yearFormData, code: e.target.value })}
                placeholder="e.g. Y1"
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Start Date">
              <Input
                type="date"
                value={yearFormData.startDate}
                onChange={(e) => setYearFormData({ ...yearFormData, startDate: e.target.value })}
              />
            </FormField>

            <FormField label="End Date">
              <Input
                type="date"
                value={yearFormData.endDate}
                onChange={(e) => setYearFormData({ ...yearFormData, endDate: e.target.value })}
              />
            </FormField>
          </div>

          {/* Associated Subjects Section (Add & Manage Subjects for this Year) */}
          <div className="pt-4 border-t border-[#EBD9CB] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#C66B45]" />
                <h4 className="text-sm font-bold text-[#553729]">
                  Associated Curriculum Subjects ({yearSubjects.length})
                </h4>
              </div>
              <span className="text-[11px] text-[#929071]">
                {editingYear ? 'Subjects mapped to this year' : 'Subjects to be created with this year'}
              </span>
            </div>

            {/* Existing / Staged Subjects List */}
            <div className="max-h-44 overflow-y-auto rounded-xl border border-[#EBD9CB] bg-[#FFF8F1]/40 divide-y divide-[#EBD9CB]">
              {loadingYearSubjects ? (
                <div className="p-4 text-center text-xs text-[#929071]">Loading associated subjects...</div>
              ) : yearSubjects.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#929071]">
                  No subjects currently associated with this academic year. Use the form below to add subjects.
                </div>
              ) : (
                yearSubjects.map((sub) => (
                  <div key={sub.id} className="p-2.5 flex items-center justify-between hover:bg-[#FCE6D8]/30 transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-[#C66B45] bg-[#FCE6D8] px-2 py-0.5 rounded">
                        {sub.code}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-[#553729]">{sub.name}</p>
                        <p className="text-[10px] text-[#929071] flex items-center gap-1.5 flex-wrap">
                          <span>
                            {sub.department || (departments.find((d) => d.id === sub.departmentId)?.code || '')} • {sub.semester} • {sub.credits} Credits
                          </span>
                          {(sub.staffName || sub.assignedStaff?.name) && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium text-[10px]">
                              👨‍🏫 {sub.staffName || sub.assignedStaff?.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubjectFromYear(sub)}
                      title="Remove Subject"
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Quick Add Subject to Year Inline Form with Staff Assignment */}
            <div className="p-3 bg-[#FCE6D8]/30 border border-[#EBD9CB] rounded-xl space-y-2.5">
              <span className="text-xs font-bold text-[#553729] flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-[#C66B45]" /> Add Subject & Assign Staff to this Academic Year
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select
                  value={inlineSubjectForm.departmentId}
                  onChange={(e) => {
                    const newDept = e.target.value;
                    setInlineSubjectForm({
                      ...inlineSubjectForm,
                      departmentId: newDept,
                      staffId: '' // automatically reset staff when department changes
                    });
                  }}
                  options={departments.map((d) => ({ value: d.id, label: `${d.code} - ${d.name}` }))}
                  placeholder="-- Select Department --"
                />
                <Input
                  value={inlineSubjectForm.code}
                  onChange={(e) => setInlineSubjectForm({ ...inlineSubjectForm, code: e.target.value.toUpperCase() })}
                  placeholder="Subject Code (e.g. CS104)"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={inlineSubjectForm.name}
                  onChange={(e) => setInlineSubjectForm({ ...inlineSubjectForm, name: e.target.value })}
                  placeholder="Subject Name (e.g. Applied Physics)"
                />
                <Select
                  value={inlineSubjectForm.staffId}
                  onChange={(e) => setInlineSubjectForm({ ...inlineSubjectForm, staffId: e.target.value })}
                  options={(
                    inlineSubjectForm.departmentId
                      ? staffList.filter((s) => s.department_id === inlineSubjectForm.departmentId || s.Department?.id === inlineSubjectForm.departmentId)
                      : []
                  ).map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.designation || 'Faculty'}${s.employee_id ? ' • ' + s.employee_id : ''})`
                  }))}
                  placeholder={
                    !inlineSubjectForm.departmentId
                      ? '-- Select Department first --'
                      : staffList.filter((s) => s.department_id === inlineSubjectForm.departmentId || s.Department?.id === inlineSubjectForm.departmentId).length > 0
                      ? '-- Assign Faculty / Staff (Optional) --'
                      : '-- No Staff Found in Selected Department --'
                  }
                  disabled={!inlineSubjectForm.departmentId}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="w-48">
                  <Select
                    value={inlineSubjectForm.semester}
                    onChange={(e) => setInlineSubjectForm({ ...inlineSubjectForm, semester: e.target.value })}
                    options={[
                      'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
                      'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'
                    ]}
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    value={inlineSubjectForm.credits}
                    onChange={(e) => setInlineSubjectForm({ ...inlineSubjectForm, credits: parseInt(e.target.value, 10) || 3 })}
                    placeholder="Credits"
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleAddSubjectToYear}
                  loading={addingSubjectToYear}
                  className="shrink-0 ml-auto"
                >
                  Add Subject
                </Button>
              </div>
            </div>
          </div>

          <FormActions
            onCancel={() => setYearModalOpen(false)}
            submitText={editingYear ? 'Update Year' : 'Create Year'}
            loading={formSaving}
          />
        </form>
      </Modal>

      {/* Add Subject Modal */}
      <Modal
        isOpen={addSubjectModalOpen}
        onClose={() => setAddSubjectModalOpen(false)}
        title={`Add Subject to ${selectedYearSubjects?.year?.name}`}
        subtitle="Map a curriculum course and assign faculty to this academic year"
      >
        <form onSubmit={handleSaveSubject} className="space-y-4">
          <FormField label="Department" required>
            <Select
              value={subjectFormData.departmentId}
              onChange={(e) => {
                const newDept = e.target.value;
                setSubjectFormData({
                  ...subjectFormData,
                  departmentId: newDept,
                  staffId: '' // reset assigned staff when department changes
                });
              }}
              options={departments.map((d) => ({ value: d.id, label: `${d.code} - ${d.name}` }))}
              placeholder="Select Department"
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Subject Code" required>
              <Input
                value={subjectFormData.code}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CS104"
                required
              />
            </FormField>
            <FormField label="Semester" required>
              <Select
                value={subjectFormData.semester}
                onChange={(e) => setSubjectFormData({ ...subjectFormData, semester: e.target.value })}
                options={[
                  'Semester 1', 'Semester 2', 'Semester 3', 'Semester 4',
                  'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'
                ]}
                required
              />
            </FormField>
          </div>

          <FormField label="Subject Name" required>
            <Input
              value={subjectFormData.name}
              onChange={(e) => setSubjectFormData({ ...subjectFormData, name: e.target.value })}
              placeholder="e.g. Applied Physics & Lab"
              required
            />
          </FormField>

          <FormField
            label="Assign Faculty / Staff (Optional)"
            hint={subjectFormData.departmentId ? 'Filtered to selected department faculty' : 'Select a department first'}
          >
            <Select
              value={subjectFormData.staffId}
              onChange={(e) => setSubjectFormData({ ...subjectFormData, staffId: e.target.value })}
              options={(
                subjectFormData.departmentId
                  ? staffList.filter((s) => s.department_id === subjectFormData.departmentId || s.Department?.id === subjectFormData.departmentId)
                  : []
              ).map((s) => ({
                value: s.id,
                label: `${s.name} (${s.designation || 'Faculty'}${s.employee_id ? ' • ' + s.employee_id : ''})`
              }))}
              placeholder={
                !subjectFormData.departmentId
                  ? '-- Select Department first --'
                  : staffList.filter((s) => s.department_id === subjectFormData.departmentId || s.Department?.id === subjectFormData.departmentId).length > 0
                  ? '-- Select Faculty Member (Optional) --'
                  : '-- No Faculty found in Selected Department --'
              }
              disabled={!subjectFormData.departmentId}
            />
          </FormField>

          <FormField label="Credits">
            <Input
              type="number"
              value={subjectFormData.credits}
              onChange={(e) => setSubjectFormData({ ...subjectFormData, credits: parseInt(e.target.value, 10) || 3 })}
            />
          </FormField>

          <FormActions
            onCancel={() => setAddSubjectModalOpen(false)}
            submitText="Save Subject"
            loading={formSaving}
          />
        </form>
      </Modal>

      {/* Timetable Schedule Modal (Weekly Matrix per Semester) */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={`Class Timetable Schedule — ${selectedScheduleYear?.name || ''}`}
        subtitle={`Weekly academic schedule for ${scheduleSemester} reflecting slots configured and published by Department HOD.`}
        maxWidth="max-w-6xl"
      >
        <div className="space-y-5">
          {/* Top Bar: Semester Selector & Metadata Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FFF8F1] border border-[#EBD9CB]">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#929071] mr-1">
                Semester:
              </span>
              <div className="flex items-center gap-1.5">
                {getSemestersForYearObj(selectedScheduleYear).map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => {
                      setScheduleSemester(sem);
                      if (selectedScheduleYear) {
                        loadYearTimetable(selectedScheduleYear.id, sem);
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      scheduleSemester === sem
                        ? 'bg-[#C66B45] text-white shadow-sm'
                        : 'bg-white border border-[#EBD9CB] text-[#553729] hover:bg-[#FCE6D8]/50'
                    }`}
                  >
                    {sem}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#FCE6D8] text-[#C66B45] font-bold">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {scheduleData?.totalSlots || 0} Slots Scheduled
              </span>
              <button
                type="button"
                onClick={() => {
                  if (selectedScheduleYear) {
                    loadYearTimetable(selectedScheduleYear.id, scheduleSemester);
                  }
                }}
                title="Refresh Timetable"
                className="p-1.5 rounded-lg border border-[#EBD9CB] bg-white text-[#553729] hover:bg-[#FCE6D8] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Timetable Schedule Content */}
          {scheduleLoading ? (
            <div className="py-16 text-center text-[#929071] flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#C66B45]" />
              <p className="text-xs font-medium">Loading weekly timetable matrix...</p>
            </div>
          ) : !scheduleData?.entries || scheduleData.entries.length === 0 ? (
            <div className="py-14 text-center bg-[#FFF8F1]/60 rounded-2xl border-2 border-dashed border-[#EBD9CB] space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#FCE6D8] flex items-center justify-center text-[#C66B45]">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-[#553729] text-base">
                  No Schedule Published for {scheduleSemester}
                </h4>
                <p className="text-xs text-[#929071] mt-1 max-w-md mx-auto">
                  The weekly timetable for <strong>{selectedScheduleYear?.name}</strong> ({scheduleSemester}) has not been published yet. The Department HOD can configure and send the schedule using <strong>Department &gt; Create Schedule</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#EBD9CB] shadow-sm bg-white">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-[#553729] text-white text-xs uppercase tracking-wider">
                    <th className="py-3 px-3 w-28 text-center font-bold border-r border-[#6d4634]">
                      Day
                    </th>
                    {TIMETABLE_PERIODS.map((col, idx) => (
                      <th
                        key={idx}
                        className={`py-2 px-2 text-center border-r border-[#6d4634] last:border-r-0 ${
                          col.type === 'break'
                            ? 'w-20 bg-[#42291d] text-[#FCE6D8]'
                            : 'min-w-[140px]'
                        }`}
                      >
                        <div className="font-bold text-xs">{col.label}</div>
                        <div className="text-[10px] text-[#FCE6D8]/80 font-normal">
                          {col.time}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBD9CB] text-xs">
                  {WEEK_DAYS.map((day) => (
                    <tr key={day} className="hover:bg-[#FFFDFB] transition-colors">
                      <td className="py-3 px-3 text-center font-bold text-[#553729] bg-[#FFF8F1] border-r border-[#EBD9CB]">
                        {day}
                      </td>
                      {TIMETABLE_PERIODS.map((col, idx) => {
                        if (col.type === 'break') {
                          return (
                            <td
                              key={idx}
                              className="py-2 px-1 text-center bg-[#FAF3ED] border-r border-[#EBD9CB] text-[10px] font-semibold text-[#929071]"
                            >
                              <div className="flex flex-col items-center justify-center space-y-0.5">
                                <span className="text-sm">{col.icon}</span>
                                <span className="text-[9px] uppercase tracking-wider font-bold">
                                  {col.label.replace(' Break', '')}
                                </span>
                              </div>
                            </td>
                          );
                        }

                        const slot = scheduleData?.matrix?.[day]?.[col.period];
                        return (
                          <td
                            key={idx}
                            className="py-2 px-2 border-r border-[#EBD9CB] last:border-r-0 align-top"
                          >
                            {slot ? (
                              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#FFF8F1] to-[#FCE6D8]/50 border border-[#EBD9CB] space-y-1 shadow-sm">
                                <div className="flex items-center justify-between">
                                  <span className="font-extrabold text-[#C66B45] text-xs">
                                    {slot.subjectCode}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[#553729]/10 text-[#553729] font-bold">
                                    P{slot.periodNumber}
                                  </span>
                                </div>
                                <p
                                  className="font-semibold text-[#553729] text-[11px] line-clamp-1"
                                  title={slot.subjectName}
                                >
                                  {slot.subjectName}
                                </p>
                                <div
                                  className="flex items-center text-[10px] text-[#553729] truncate"
                                  title={slot.staffName}
                                >
                                  <span className="mr-1">👨‍🏫</span>
                                  <span className="font-medium truncate">
                                    {slot.staffName || 'Faculty'}
                                  </span>
                                </div>
                                <div className="flex items-center text-[10px] text-[#929071]">
                                  <span className="mr-1">📍</span>
                                  <span className="truncate">
                                    {slot.roomNumber || 'Lecture Hall'}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-20 rounded-xl border border-dashed border-[#EBD9CB]/70 flex items-center justify-center text-[10px] text-[#929071]/60 bg-[#FFFDFB]">
                                — Free —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-[#EBD9CB]">
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteYear}
        title="Delete Academic Year"
        message={`Are you sure you want to delete ${yearToDelete?.name}? All associated subject mappings will be impacted.`}
      />
    </div>
  );
}
