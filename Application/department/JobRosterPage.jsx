import React, { useState, useEffect } from 'react';
import { useAuth } from '../shell/src/context/AuthContext';
import { departmentService } from '../shell/src/services/departmentService';
import { masterService } from '../shell/src/services/masterService';
import { useToast } from '../shell/src/components/feedback/Toast';
import PageHeader from '../shell/src/components/layout/PageHeader';
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
  ClipboardList,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  ShieldCheck,
  Briefcase,
  Send,
  MessageSquare
} from 'lucide-react';

const SHIFT_OPTIONS = [
  { value: 'Full Day (09:00 - 17:00)', label: 'Full Day (09:00 - 17:00)' },
  { value: 'Morning Shift (09:00 - 13:00)', label: 'Morning Shift (09:00 - 13:00)' },
  { value: 'Afternoon Shift (13:00 - 17:00)', label: 'Afternoon Shift (13:00 - 17:00)' },
  { value: 'Evening Shift (17:00 - 20:00)', label: 'Evening Shift (17:00 - 20:00)' }
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const TASK_SUGGESTIONS = [
  'CS101 Programming Lecture & Lab Practical',
  'Mid-Semester Answer Sheet Evaluation & Moderation',
  'Department Seminar & Industry Guest Lecture In-charge',
  'Hardware Lab Maintenance & System Audit',
  'Student Mentorship & Project Review Session',
  'University Examination Invigilation Duty',
  'Curriculum Review & Accreditation Documentation'
];

export default function JobRosterPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const isSuperAdmin = user?.role === 'Super Admin' || user?.role === 'Tenant Administrator';
  const isHOD = user?.role === 'HOD';
  const isStaff = user?.role === 'Staff';
  const canAssign = isHOD || isSuperAdmin;

  // Selected date (defaults to today)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [allDepartments, setAllDepartments] = useState([]);

  // Data state
  const [rosterData, setRosterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'incomplete' | 'completed' | 'unassigned'

  // Modal: Assign / Edit Task (HOD / Admin)
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [taskForm, setTaskForm] = useState({
    staffId: '',
    taskTitle: '',
    taskDescription: '',
    shift: 'Full Day (09:00 - 17:00)',
    priority: 'medium',
    status: 'pending'
  });
  const [formSaving, setFormSaving] = useState(false);

  // Modal: Staff Duty Status & Short Note Submission
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [staffStatusForm, setStaffStatusForm] = useState({
    rosterId: '',
    staffName: '',
    taskTitle: '',
    shift: '',
    status: 'pending', // 'pending' | 'incomplete' | 'complete'
    completionNotes: ''
  });

  // Modal: Delete Task Confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);

  // Load departments if Super Admin
  useEffect(() => {
    async function init() {
      if (isSuperAdmin) {
        try {
          const res = await masterService.searchDepartments({ all: true });
          setAllDepartments(res.data || []);
          if (res.data?.length > 0 && !selectedDeptId) {
            setSelectedDeptId(res.data[0].id);
          }
        } catch (err) {
          console.error('Failed to load departments:', err);
        }
      }
    }
    init();
  }, [isSuperAdmin]);

  // Load roster data whenever date or department changes
  useEffect(() => {
    loadRoster();
  }, [selectedDate, selectedDeptId]);

  const loadRoster = async () => {
    setLoading(true);
    try {
      const params = { date: selectedDate };
      if (selectedDeptId) params.departmentId = selectedDeptId;

      const res = await departmentService.getJobRoster(params);
      setRosterData(res.data);
    } catch (err) {
      showError(err.message || 'Failed to load daily job roster');
    } finally {
      setLoading(false);
    }
  };

  // Filter out HOD from faculty roster list to ensure HOD is NEVER in the staff list
  const hodId = rosterData?.hod?.id;
  const rawRoster = rosterData?.roster || [];
  const departmentalFacultyRoster = rawRoster.filter((r) => !hodId || r.staffId !== hodId);

  // Identify logged in staff member's personal duty on the roster
  const myRosterItem = rawRoster.find((r) => {
    const userStaffId = user?.staffId || user?.staff?.id;
    if (userStaffId && r.staffId === userStaffId) return true;
    if (user?.email && r.email && user.email.toLowerCase() === r.email.toLowerCase()) return true;
    if (user?.name && r.name && user.name.toLowerCase() === r.name.toLowerCase()) return true;
    return false;
  }) || rawRoster[0] || null;

  // Open modal to assign or edit a task (HOD / Admin)
  const handleOpenAssignModal = (staffRow = null) => {
    if (staffRow) {
      setEditingStaff(staffRow);
      setTaskForm({
        staffId: staffRow.staffId,
        taskTitle: staffRow.taskTitle || '',
        taskDescription: staffRow.taskDescription || '',
        shift: staffRow.shift || 'Full Day (09:00 - 17:00)',
        priority: staffRow.priority || 'medium',
        status: staffRow.status === 'unassigned' ? 'pending' : staffRow.status
      });
    } else {
      setEditingStaff(null);
      const firstStaffId = departmentalFacultyRoster[0]?.staffId || '';
      setTaskForm({
        staffId: firstStaffId,
        taskTitle: '',
        taskDescription: '',
        shift: 'Full Day (09:00 - 17:00)',
        priority: 'medium',
        status: 'pending'
      });
    }
    setTaskModalOpen(true);
  };

  // Submit task assignment (HOD)
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.staffId || !taskForm.taskTitle.trim()) {
      showError('Please select a staff member and provide a task title');
      return;
    }

    setFormSaving(true);
    try {
      await departmentService.assignTask({
        staffId: taskForm.staffId,
        taskTitle: taskForm.taskTitle.trim(),
        taskDescription: taskForm.taskDescription.trim(),
        shift: taskForm.shift,
        priority: taskForm.priority,
        status: taskForm.status,
        date: selectedDate,
        departmentId: rosterData?.department?.id
      });

      showSuccess(`Duty assigned successfully for ${selectedDate}`);
      setTaskModalOpen(false);
      loadRoster();
    } catch (err) {
      showError(err.message || 'Failed to assign duty');
    } finally {
      setFormSaving(false);
    }
  };

  // Open Staff Status & Note submission modal
  const handleOpenStatusModal = (row) => {
    setStaffStatusForm({
      rosterId: row.jobRosterId,
      staffName: row.name,
      taskTitle: row.taskTitle,
      shift: row.shift,
      status: row.status === 'unassigned' || row.status === 'assigned' ? 'pending' : row.status,
      completionNotes: row.completionNotes || ''
    });
    setStatusModalOpen(true);
  };

  // Submit Staff Status & Short Note
  const handleSubmitStaffStatus = async () => {
    if (!staffStatusForm.rosterId) {
      showError('No active duty found to update');
      return;
    }

    if (!staffStatusForm.completionNotes.trim()) {
      showError('Please provide a short note on your duty status for the HOD');
      return;
    }

    setStatusSubmitting(true);
    try {
      await departmentService.updateTaskStatus(staffStatusForm.rosterId, {
        status: staffStatusForm.status,
        completionNotes: staffStatusForm.completionNotes.trim()
      });

      showSuccess(`Duty status and short note successfully submitted to HOD!`);
      setStatusModalOpen(false);
      loadRoster();
    } catch (err) {
      showError(err.message || 'Failed to submit status update');
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Delete task
  const handleDeleteTask = async () => {
    if (!taskToDelete?.jobRosterId) return;
    try {
      await departmentService.deleteTask(taskToDelete.jobRosterId);
      showSuccess('Duty removed from daily roster');
      setDeleteConfirmOpen(false);
      setTaskToDelete(null);
      loadRoster();
    } catch (err) {
      showError(err.message || 'Failed to remove duty');
    }
  };

  // Quick auto-assign default tasks to all unassigned staff (HOD)
  const handleQuickRosterAll = async () => {
    const unassigned = departmentalFacultyRoster.filter((r) => !r.hasTaskAssigned);
    if (unassigned.length === 0) {
      showSuccess('All faculty members already have duties assigned for today!');
      return;
    }

    try {
      const payload = {
        date: selectedDate,
        departmentId: rosterData?.department?.id,
        tasks: unassigned.map((st, idx) => ({
          staffId: st.staffId,
          taskTitle: TASK_SUGGESTIONS[idx % TASK_SUGGESTIONS.length],
          taskDescription: `Scheduled operational duty for ${st.name} assigned by Department Head.`,
          shift: idx % 2 === 0 ? 'Morning Shift (09:00 - 13:00)' : 'Afternoon Shift (13:00 - 17:00)',
          priority: 'medium',
          status: 'pending'
        }))
      };

      await departmentService.bulkAssignTasks(payload);
      showSuccess(`Assigned daily duties to ${unassigned.length} faculty members!`);
      loadRoster();
    } catch (err) {
      showError(err.message || 'Failed to auto-assign duties');
    }
  };

  const summary = rosterData?.summary || {
    totalStaff: departmentalFacultyRoster.length,
    assignedCount: departmentalFacultyRoster.filter((r) => r.hasTaskAssigned).length,
    unassignedCount: departmentalFacultyRoster.filter((r) => !r.hasTaskAssigned).length,
    completedCount: departmentalFacultyRoster.filter((r) => r.status === 'completed' || r.status === 'complete').length,
    incompleteCount: departmentalFacultyRoster.filter((r) => r.status === 'incomplete').length,
    inProgressCount: departmentalFacultyRoster.filter((r) => r.status === 'in_progress').length,
    pendingCount: departmentalFacultyRoster.filter((r) => r.status === 'pending' || r.status === 'assigned').length,
    coveragePercentage: 0
  };

  // Filter roster list (for HOD / Admin)
  const filteredRoster = departmentalFacultyRoster.filter((r) => {
    if (filterStatus === 'assigned') return r.hasTaskAssigned;
    if (filterStatus === 'unassigned') return !r.hasTaskAssigned;
    if (filterStatus === 'completed') return r.status === 'completed' || r.status === 'complete';
    if (filterStatus === 'incomplete') return r.status === 'incomplete';
    if (filterStatus === 'pending') return r.status === 'pending' || r.status === 'assigned';
    return true;
  });

  // Render Status Badge helper
  const renderStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'complete') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Complete
        </span>
      );
    }
    if (s === 'incomplete') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Incomplete
        </span>
      );
    }
    if (s === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <Clock className="w-3.5 h-3.5 text-blue-600" /> In Progress
        </span>
      );
    }
    if (s === 'pending' || s === 'assigned') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-700" /> Pending
        </span>
      );
    }
    return <span className="text-xs text-[#929071] italic">Unassigned</span>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStaff ? 'My Daily Duty & Roster' : 'Department Job Roster & Daily Duties'}
        subtitle={
          isStaff
            ? `View and submit your operational daily duty for ${rosterData?.department?.name || 'Department'}.`
            : `Schedule, assign, and track daily operational duties for all faculty of ${rosterData?.department?.name || 'Department'}.`
        }
        breadcrumbItems={[
          { label: 'Department', href: '/department' },
          { label: 'Job Roster' }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canAssign && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Sparkles}
                  onClick={handleQuickRosterAll}
                  disabled={loading}
                >
                  Auto-Roster Unassigned
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={() => handleOpenAssignModal()}
                  disabled={loading}
                >
                  Assign Daily Duty
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Date & Department Control Strip */}
      <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-[#EBD9CB] shadow-2xs">
            <Calendar className="w-4 h-4 text-[#C66B45]" />
            <span className="text-xs font-bold text-[#553729]">Roster Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-[#553729] focus:outline-none cursor-pointer bg-transparent"
            />
          </div>

          {/* Quick Date Shortcuts */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                selectedDate === todayStr
                  ? 'bg-[#C66B45] text-white border-[#C66B45]'
                  : 'bg-white text-[#553729] border-[#EBD9CB] hover:bg-[#FCE6D8]/40'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow.toISOString().split('T')[0]);
              }}
              className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-colors ${
                selectedDate === new Date(Date.now() + 86400000).toISOString().split('T')[0]
                  ? 'bg-[#C66B45] text-white border-[#C66B45]'
                  : 'bg-white text-[#553729] border-[#EBD9CB] hover:bg-[#FCE6D8]/40'
              }`}
            >
              Tomorrow
            </button>
          </div>
        </div>

        {/* Department Badge */}
        <div className="flex items-center gap-3">
          {isSuperAdmin && allDepartments.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#929071]">Department:</span>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#EBD9CB] bg-white text-[#553729] focus:outline-none"
              >
                {allDepartments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#FCE6D8]/60 border border-[#EBD9CB] px-3.5 py-1.5 rounded-xl">
              <Building2 className="w-4 h-4 text-[#C66B45]" />
              <span className="text-xs font-bold text-[#553729]">
                {rosterData?.department ? `${rosterData.department.code} - ${rosterData.department.name}` : 'Loading...'}
              </span>
              {rosterData?.hod && (
                <span className="text-[11px] font-medium text-[#929071] border-l border-[#EBD9CB] pl-2 ml-1">
                  HOD: <strong className="text-[#553729]">{rosterData.hod.name}</strong>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. STAFF PORTAL VIEW: DEDICATED PERSONAL DUTY CARD ALONE             */}
      {/* (Staff sees ONLY their assigned duty and can update status & note)   */}
      {/* ==================================================================== */}
      {isStaff ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#FFFDFB] via-[#FFF8F1] to-[#FCE6D8]/40 border-2 border-[#C66B45]/40 rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden transition-all">
            <div className="absolute -right-6 -bottom-6 w-48 h-48 bg-[#C66B45]/5 rounded-full pointer-events-none" />

            {loading ? (
              <Loader message="Loading your assigned daily duty..." />
            ) : myRosterItem && myRosterItem.hasTaskAssigned ? (
              <div className="space-y-6">
                {/* Header: Title & Live Status */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EBD9CB] pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#C66B45] text-white flex items-center justify-center shadow-md">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C66B45] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        My Daily Assignment • {selectedDate === todayStr ? "Today's Schedule" : selectedDate}
                      </span>
                      <h2 className="text-xl md:text-2xl font-extrabold text-[#553729]">
                        Operational Duty for {user?.name || 'Faculty Member'}
                      </h2>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#929071]">Current Status:</span>
                    {renderStatusBadge(myRosterItem.status)}
                  </div>
                </div>

                {/* Duty Details & Status Submission Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Task Title & Instructions (2 Columns) */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white/90 border border-[#EBD9CB] rounded-2xl p-5 shadow-2xs">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#929071] block mb-1">
                        Assigned Task Title
                      </span>
                      <h3 className="text-xl font-extrabold text-[#553729] flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[#C66B45] shrink-0" />
                        {myRosterItem.taskTitle}
                      </h3>
                      {myRosterItem.taskDescription && (
                        <div className="mt-3 bg-[#FFF8F1] p-4 rounded-xl border border-[#EBD9CB]/80">
                          <span className="text-[11px] font-bold text-[#929071] block mb-1">HOD Instructions:</span>
                          <p className="text-sm text-[#553729] leading-relaxed">
                            {myRosterItem.taskDescription}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="bg-white px-3.5 py-2 rounded-xl border border-[#EBD9CB] font-semibold text-[#553729] flex items-center gap-2 shadow-2xs">
                        <Clock className="w-4 h-4 text-[#C66B45]" />
                        Shift: <strong>{myRosterItem.shift}</strong>
                      </span>
                      <span className="bg-white px-3.5 py-2 rounded-xl border border-[#EBD9CB] font-semibold text-[#553729] flex items-center gap-2 shadow-2xs">
                        <ShieldCheck className="w-4 h-4 text-[#C66B45]" />
                        Priority: <strong className="uppercase text-[#553729]">{myRosterItem.priority}</strong>
                      </span>
                      {myRosterItem.assignedBy && (
                        <span className="bg-[#FCE6D8]/60 px-3.5 py-2 rounded-xl border border-[#EBD9CB] font-medium text-[#553729]">
                          Assigned by: <strong>{myRosterItem.assignedBy}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Report Submission Card (1 Column) */}
                  <div className="bg-white rounded-2xl border border-[#EBD9CB] p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#553729] flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-[#C66B45]" />
                        Status Report to HOD
                      </span>
                      {myRosterItem.completionNotes && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Submitted
                        </span>
                      )}
                    </div>

                    {myRosterItem.completionNotes ? (
                      <div className="bg-[#FFF8F1] rounded-xl border border-[#EBD9CB] p-3.5 text-xs space-y-1.5">
                        <span className="text-[10px] uppercase font-bold text-[#929071] block">Your Submitted Note:</span>
                        <p className="italic text-[#553729] font-medium leading-relaxed">
                          "{myRosterItem.completionNotes}"
                        </p>
                        {myRosterItem.updatedAt && (
                          <p className="text-[10px] text-[#929071] pt-1">
                            Last updated: {new Date(myRosterItem.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#929071] leading-relaxed">
                        Execute your assigned duty and submit your progress note along with current status directly to your Department HOD.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenStatusModal(myRosterItem)}
                      className="w-full py-3 px-4 rounded-xl bg-[#C66B45] hover:bg-[#AD5938] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      {myRosterItem.completionNotes ? 'Update Status & Note' : 'Submit Duty Status & Note'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#553729]">No Daily Duty Assigned for {selectedDate}</h3>
                    <p className="text-xs text-[#929071] mt-0.5">
                      Your Department Head ({rosterData?.hod?.name || 'HOD'}) has not scheduled an operational duty for your profile on this date.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadRoster}
                  className="text-xs font-bold px-4 py-2 rounded-xl border border-[#EBD9CB] bg-white text-[#553729] hover:bg-[#FCE6D8] transition-colors shadow-2xs"
                >
                  Refresh Status
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ==================================================================== */
        /* 2. HOD / SUPER ADMIN VIEW: DEPARTMENT-WIDE SCHEDULE (HOD EXCLUDED)  */
        /* ==================================================================== */
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Department Faculty (Excluding HOD) */}
            <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-[#929071]">Department Faculty</span>
                <div className="p-2 rounded-xl bg-[#FCE6D8] text-[#C66B45]">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-[#553729]">{summary.totalStaff}</span>
                <p className="text-xs text-[#929071] mt-0.5">Faculty under HOD</p>
              </div>
            </div>

            {/* Coverage */}
            <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-[#929071]">Roster Coverage</span>
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <ClipboardList className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-blue-700">{summary.coveragePercentage}%</span>
                <span className="text-xs text-[#929071]">({summary.assignedCount}/{summary.totalStaff})</span>
              </div>
              <div className="mt-1.5 w-full bg-[#EBD9CB]/50 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${summary.coveragePercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-[#929071]">Pending Duties</span>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-amber-700">{summary.pendingCount}</span>
                <p className="text-xs text-[#929071] mt-0.5">Awaiting staff work</p>
              </div>
            </div>

            {/* Incomplete */}
            <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-[#929071]">Incomplete</span>
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-rose-700">{summary.incompleteCount || 0}</span>
                <p className="text-xs text-[#929071] mt-0.5">Partial / issues</p>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-[#929071]">Completed</span>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-emerald-700">{summary.completedCount}</span>
                <p className="text-xs text-[#929071] mt-0.5">Fulfilled today</p>
              </div>
            </div>
          </div>

          {/* Roster Table Section */}
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-xs space-y-4">
            {/* Table Toolbar & Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EBD9CB]">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-[#C66B45]" />
                <h3 className="text-base font-bold text-[#553729]">
                  Department Faculty Duty Schedule ({selectedDate})
                </h3>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setFilterStatus('all')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                    filterStatus === 'all'
                      ? 'bg-[#C66B45] text-white border-[#C66B45]'
                      : 'bg-white text-[#553729] border-[#EBD9CB] hover:bg-[#FCE6D8]/30'
                  }`}
                >
                  All ({summary.totalStaff})
                </button>
                <button
                  onClick={() => setFilterStatus('pending')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                    filterStatus === 'pending'
                      ? 'bg-[#C66B45] text-white border-[#C66B45]'
                      : 'bg-white text-[#553729] border-[#EBD9CB] hover:bg-[#FCE6D8]/30'
                  }`}
                >
                  Pending ({summary.pendingCount})
                </button>
                <button
                  onClick={() => setFilterStatus('incomplete')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                    filterStatus === 'incomplete'
                      ? 'bg-[#C66B45] text-white border-[#C66B45]'
                      : 'bg-white text-[#553729] border-[#EBD9CB] hover:bg-[#FCE6D8]/30'
                  }`}
                >
                  Incomplete ({summary.incompleteCount || 0})
                </button>
                <button
                  onClick={() => setFilterStatus('completed')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                    filterStatus === 'completed'
                      ? 'bg-[#C66B45] text-white border-[#C66B45]'
                      : 'bg-white text-[#553729] border-[#EBD9CB] hover:bg-[#FCE6D8]/30'
                  }`}
                >
                  Complete ({summary.completedCount})
                </button>
                <button
                  onClick={() => setFilterStatus('unassigned')}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-semibold ${
                    filterStatus === 'unassigned'
                      ? 'bg-[#C66B45] text-white border-[#C66B45]'
                      : 'bg-white text-[#553729] border-[#EBD9CB] hover:bg-[#FCE6D8]/30'
                  }`}
                >
                  Unassigned ({summary.unassignedCount})
                </button>
              </div>
            </div>

            {/* Loading / Empty / Table */}
            {loading ? (
              <Loader message="Loading departmental faculty roster..." />
            ) : filteredRoster.length === 0 ? (
              <EmptyState
                title="No Roster Entries Match Filter"
                description="Try switching the filter or date to view other faculty duties."
                actionLabel="Reset Filter"
                onAction={() => setFilterStatus('all')}
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-[#EBD9CB]">
                <table className="min-w-full divide-y divide-[#EBD9CB] text-left text-sm">
                  <thead className="bg-[#FCE6D8]/60 text-xs uppercase tracking-wider text-[#553729] font-bold">
                    <tr>
                      <th className="px-4 py-3">Faculty / Staff Member</th>
                      <th className="px-4 py-3">Assigned Daily Duty & Instructions</th>
                      <th className="px-4 py-3">Shift / Time Slot</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Duty Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBD9CB]/50 bg-[#FFF8F1]">
                    {filteredRoster.map((row) => (
                      <tr key={row.staffId} className="hover:bg-[#FCE6D8]/20 transition-colors">
                        {/* Faculty Info */}
                        <td className="px-4 py-3">
                          <div className="font-bold text-[#553729]">{row.name}</div>
                          <div className="text-xs text-[#929071] flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-[#EBD9CB]">
                              {row.employeeId || 'FACULTY'}
                            </span>
                            <span>•</span>
                            <span>{row.designation || 'Staff'}</span>
                          </div>
                        </td>

                        {/* Daily Duty & Staff's Submitted Note */}
                        <td className="px-4 py-3 max-w-md">
                          {row.hasTaskAssigned ? (
                            <div className="space-y-1.5">
                              <p className="font-bold text-xs text-[#553729] flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                {row.taskTitle}
                              </p>
                              {row.taskDescription && (
                                <p className="text-xs text-[#553729]/80 line-clamp-2">
                                  {row.taskDescription}
                                </p>
                              )}
                              {row.assignedBy && (
                                <p className="text-[10px] text-[#929071]">
                                  Assigned by: <strong className="text-[#553729]">{row.assignedBy}</strong>
                                </p>
                              )}

                              {/* Staff's Submitted Short Note reflected for HOD */}
                              {row.completionNotes && (
                                <div className="mt-2 bg-white/95 border border-[#EBD9CB] rounded-xl p-2.5 text-xs shadow-2xs">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-[#C66B45] mb-0.5">
                                    <span className="flex items-center gap-1">
                                      <MessageSquare className="w-3 h-3" />
                                      Staff Status Note:
                                    </span>
                                    {row.updatedAt && (
                                      <span className="text-[10px] text-[#929071] font-normal">
                                        {new Date(row.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                  <p className="italic text-[#553729] font-medium leading-relaxed">
                                    "{row.completionNotes}"
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-[#929071] italic">
                              <AlertCircle className="w-4 h-4 text-amber-500" />
                              <span>No duty assigned for this day</span>
                              {canAssign && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(row)}
                                  className="text-xs font-bold text-[#C66B45] hover:underline not-italic ml-2"
                                >
                                  + Assign
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Shift */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs font-medium text-[#553729] bg-white border border-[#EBD9CB] px-2.5 py-1 rounded-lg inline-block">
                            {row.shift}
                          </span>
                        </td>

                        {/* Priority */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {row.priority === 'urgent' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                              Urgent
                            </span>
                          ) : row.priority === 'high' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                              High
                            </span>
                          ) : row.priority === 'low' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                              Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                              Medium
                            </span>
                          )}
                        </td>

                        {/* Duty Status Badge */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderStatusBadge(row.status)}
                        </td>

                        {/* Actions: Edit & Remove Duty for HOD */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {canAssign && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenAssignModal(row)}
                                  title={row.hasTaskAssigned ? 'Edit Duty Details' : 'Assign Duty'}
                                  className="p-1.5 rounded-lg border border-[#EBD9CB] bg-white text-[#553729] hover:bg-[#FCE6D8] transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {row.hasTaskAssigned && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTaskToDelete(row);
                                      setDeleteConfirmOpen(true);
                                    }}
                                    title="Remove Duty"
                                    className="p-1.5 rounded-lg border border-[#EBD9CB] bg-white text-red-600 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: STAFF DUTY STATUS & SHORT NOTE SUBMISSION                     */}
      {/* ==================================================================== */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Submit Duty Status & Progress Note to HOD"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-4 text-xs space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C66B45]">
              Assigned Operational Duty
            </span>
            <h4 className="text-sm font-bold text-[#553729]">{staffStatusForm.taskTitle}</h4>
            <p className="text-[#929071]">
              Faculty: <strong className="text-[#553729]">{staffStatusForm.staffName}</strong> • Shift: {staffStatusForm.shift}
            </p>
          </div>

          {/* 3 Status Selector Buttons: Pending / Incomplete / Complete */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#553729] mb-2">
              Select Duty Status *
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* 1. Pending */}
              <button
                type="button"
                onClick={() => setStaffStatusForm((prev) => ({ ...prev, status: 'pending' }))}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  staffStatusForm.status === 'pending' || staffStatusForm.status === 'assigned'
                    ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs font-bold ring-2 ring-amber-400/40'
                    : 'bg-white border-[#EBD9CB] text-[#553729] hover:bg-[#FCE6D8]/30 font-medium'
                }`}
              >
                <Clock className="w-5 h-5 mx-auto mb-1 text-amber-600" />
                <span className="text-xs block font-bold">Pending</span>
                <span className="text-[10px] text-amber-800/80 block mt-0.5">Not started yet</span>
              </button>

              {/* 2. Incomplete */}
              <button
                type="button"
                onClick={() => setStaffStatusForm((prev) => ({ ...prev, status: 'incomplete' }))}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  staffStatusForm.status === 'incomplete'
                    ? 'bg-rose-100 border-rose-400 text-rose-900 shadow-xs font-bold ring-2 ring-rose-400/40'
                    : 'bg-white border-[#EBD9CB] text-[#553729] hover:bg-[#FCE6D8]/30 font-medium'
                }`}
              >
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-rose-600" />
                <span className="text-xs block font-bold">Incomplete</span>
                <span className="text-[10px] text-rose-800/80 block mt-0.5">Partial / in-progress</span>
              </button>

              {/* 3. Complete */}
              <button
                type="button"
                onClick={() => setStaffStatusForm((prev) => ({ ...prev, status: 'complete' }))}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  staffStatusForm.status === 'complete' || staffStatusForm.status === 'completed'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900 shadow-xs font-bold ring-2 ring-emerald-400/40'
                    : 'bg-white border-[#EBD9CB] text-[#553729] hover:bg-[#FCE6D8]/30 font-medium'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                <span className="text-xs block font-bold">Complete</span>
                <span className="text-[10px] text-emerald-800/80 block mt-0.5">Duty fulfilled</span>
              </button>
            </div>
          </div>

          {/* Short Note Text Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#553729] mb-1.5 flex items-center justify-between">
              <span>Short Note on Status (Sent to HOD) *</span>
              <span className="text-[11px] font-normal text-[#929071]">Visible on HOD page</span>
            </label>
            <textarea
              rows={3}
              value={staffStatusForm.completionNotes}
              onChange={(e) => setStaffStatusForm((prev) => ({ ...prev, completionNotes: e.target.value }))}
              placeholder="E.g., Successfully conducted and finished student practical viva evaluation."
              className="w-full rounded-2xl border border-[#EBD9CB] p-3 text-xs text-[#553729] bg-white focus:outline-none focus:ring-2 focus:ring-[#C66B45]/30 leading-relaxed"
            />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-[#929071] block">Quick note templates:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Duty fully executed as scheduled.',
                'Completed session evaluations and marks moderation.',
                'Session partially finished; ongoing documentation.',
                'Invigilation completed without any incident.',
                'Lab maintenance completed, systems verified.'
              ].map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setStaffStatusForm((prev) => ({ ...prev, completionNotes: sug }))}
                  className="text-[10px] bg-[#FCE6D8]/60 hover:bg-[#FCE6D8] border border-[#EBD9CB] px-2.5 py-1 rounded-lg text-[#553729] transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#EBD9CB]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusModalOpen(false)}
              disabled={statusSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={handleSubmitStaffStatus}
              loading={statusSubmitting}
            >
              Send Update to HOD
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* MODAL: ASSIGN / EDIT DAILY DUTY (HOD VIEW - EXCLUDES HOD)            */}
      {/* ==================================================================== */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={editingStaff ? `Edit Duty for ${editingStaff.name}` : `Assign Daily Duty (${selectedDate})`}
        size="lg"
      >
        <form onSubmit={handleTaskSubmit} className="space-y-4">
          {/* Staff Member Selection (ONLY lists departmental faculty, NEVER the HOD) */}
          <FormField label="Department Faculty Member *" required>
            <Select
              value={taskForm.staffId}
              onChange={(e) => setTaskForm({ ...taskForm, staffId: e.target.value })}
              disabled={!!editingStaff}
              options={departmentalFacultyRoster.map((st) => ({
                value: st.staffId,
                label: `${st.name} (${st.designation || 'Faculty'}) - [${st.employeeId}]`
              }))}
            />
          </FormField>

          {/* Quick suggestions */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-[#929071]">Quick Duty Suggestions:</span>
            <div className="flex flex-wrap gap-1.5">
              {TASK_SUGGESTIONS.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTaskForm({ ...taskForm, taskTitle: sug })}
                  className="text-[11px] bg-[#FCE6D8]/60 hover:bg-[#FCE6D8] border border-[#EBD9CB] px-2.5 py-1 rounded-lg text-[#553729] transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Task Title */}
          <FormField label="Daily Task / Operational Duty Title *" required>
            <Input
              value={taskForm.taskTitle}
              onChange={(e) => setTaskForm({ ...taskForm, taskTitle: e.target.value })}
              placeholder="E.g., Lab Supervision, Answer Sheet Evaluation, Invigilation"
            />
          </FormField>

          {/* Task Description */}
          <FormField label="Duty Instructions / Operational Guidelines">
            <textarea
              rows={3}
              value={taskForm.taskDescription}
              onChange={(e) => setTaskForm({ ...taskForm, taskDescription: e.target.value })}
              placeholder="Provide specific guidelines, room numbers, reporting requirements, or expectations..."
              className="w-full rounded-xl border border-[#EBD9CB] p-3 text-xs text-[#553729] bg-white focus:outline-none focus:ring-2 focus:ring-[#C66B45]/30 leading-relaxed"
            />
          </FormField>

          {/* Shift and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Shift / Timing Slot *">
              <Select
                value={taskForm.shift}
                onChange={(e) => setTaskForm({ ...taskForm, shift: e.target.value })}
                options={SHIFT_OPTIONS}
              />
            </FormField>

            <FormField label="Task Priority *">
              <Select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                options={PRIORITY_OPTIONS}
              />
            </FormField>
          </div>

          <FormActions
            onCancel={() => setTaskModalOpen(false)}
            submitLabel={editingStaff ? 'Update Duty' : 'Assign Duty'}
            loading={formSaving}
          />
        </form>
      </Modal>

      {/* MODAL: DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteTask}
        title="Remove Duty Assignment"
        message={`Are you sure you want to remove the duty assignment "${taskToDelete?.taskTitle}" for ${taskToDelete?.name}?`}
        confirmLabel="Remove Duty"
        variant="danger"
      />
    </div>
  );
}
