import React, { useState, useEffect } from 'react';
import { useAuth } from '../shell/src/context/AuthContext';
import { departmentService } from '../shell/src/services/departmentService';
import { useToast } from '../shell/src/components/feedback/Toast';
import PageHeader from '../shell/src/components/layout/PageHeader';
import Button from '../shell/src/components/common/Button';
import Select from '../shell/src/components/forms/Select';
import FormField from '../shell/src/components/forms/FormField';
import Modal from '../shell/src/components/common/Modal';
import Loader from '../shell/src/components/common/Loader';
import EmptyState from '../shell/src/components/common/EmptyState';
import {
  CalendarDays,
  Clock,
  Sparkles,
  BookOpen,
  Users,
  Building2,
  CheckCircle2,
  Send,
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle,
  Sliders,
  Compass,
  Check,
  ChevronRight,
  Maximize2
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const DEFAULT_PERIODS = [
  { period: 1, start: '09:00', end: '10:00', label: 'Period 1' },
  { period: 2, start: '10:00', end: '11:00', label: 'Period 2' },
  // Tea break 11:00 - 11:15
  { period: 3, start: '11:15', end: '12:15', label: 'Period 3' },
  // Lunch break 12:15 - 13:15
  { period: 4, start: '13:15', end: '14:15', label: 'Period 4' },
  { period: 5, start: '14:15', end: '15:15', label: 'Period 5' },
  { period: 6, start: '15:15', end: '16:15', label: 'Period 6' }
];

const ROOM_OPTIONS = [
  'Lecture Hall 101',
  'Lecture Hall 102',
  'Advanced Computing Lab 1',
  'Database Systems Lab 2',
  'Hardware & IoT Lab',
  'Seminar Hall A'
];

export default function CreateSchedulePage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const isHOD = user?.role === 'HOD';
  const isSuperAdmin = user?.role === 'Super Admin' || user?.role === 'Tenant Administrator';

  // Metadata
  const [meta, setMeta] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Form selections
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Semester 1');

  // Time customizer state with animation
  const [periods, setPeriods] = useState(DEFAULT_PERIODS);
  const [timeShiftMinutes, setTimeShiftMinutes] = useState(0); // -30, 0, +30
  const [isAnimatingShuffle, setIsAnimatingShuffle] = useState(false);
  const [activePreset, setActivePreset] = useState('standard'); // 'standard' | 'early' | 'extended'

  // Timetable grid: { [Day]: { [Period]: { subject, staff, room, type } } }
  const [scheduleGrid, setScheduleGrid] = useState({});
  const [publishing, setPublishing] = useState(false);

  // Slot editor modal
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null); // { day, period }
  const [slotForm, setSlotForm] = useState({
    subjectId: '',
    staffId: '',
    roomNumber: 'Lecture Hall 101',
    scheduleType: 'Lecture'
  });

  // Load metadata on mount
  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    setLoadingMeta(true);
    try {
      const res = await departmentService.getScheduleMeta();
      setMeta(res.data);
      if (res.data?.academicYears?.length > 0) {
        setSelectedYearId(res.data.academicYears[0].id);
      }
    } catch (err) {
      showError(err.message || 'Failed to load schedule metadata');
    } finally {
      setLoadingMeta(false);
    }
  };

  // Determine available semesters based on selected academic year code / name
  const selectedYear = meta?.academicYears?.find((y) => y.id === selectedYearId);
  const getSemestersForYear = (year) => {
    if (!year) return ['Semester 1', 'Semester 2'];
    const code = (year.code || '').toUpperCase();
    if (code === 'Y1' || year.name?.includes('1')) return ['Semester 1', 'Semester 2'];
    if (code === 'Y2' || year.name?.includes('2')) return ['Semester 3', 'Semester 4'];
    if (code === 'Y3' || year.name?.includes('3')) return ['Semester 5', 'Semester 6'];
    if (code === 'Y4' || year.name?.includes('4')) return ['Semester 7', 'Semester 8'];
    return ['Semester 1', 'Semester 2'];
  };

  const availableSemesters = getSemestersForYear(selectedYear);

  // Sync selectedSemester when year changes
  useEffect(() => {
    if (availableSemesters.length > 0 && !availableSemesters.includes(selectedSemester)) {
      setSelectedSemester(availableSemesters[0]);
    }
  }, [selectedYearId]);

  // Load existing schedule when year or semester changes
  useEffect(() => {
    if (selectedYearId && selectedSemester) {
      loadExistingSchedule();
    }
  }, [selectedYearId, selectedSemester]);

  const loadExistingSchedule = async () => {
    try {
      const res = await departmentService.getClassSchedule({
        academicYearId: selectedYearId,
        semester: selectedSemester
      });

      if (res.data?.entries && res.data.entries.length > 0) {
        // Hydrate grid
        const newGrid = {};
        DAYS.forEach((d) => {
          newGrid[d] = {};
        });
        res.data.entries.forEach((e) => {
          if (!newGrid[e.dayOfWeek]) newGrid[e.dayOfWeek] = {};
          newGrid[e.dayOfWeek][e.periodNumber] = {
            subjectId: e.subjectId,
            subjectCode: e.subjectCode,
            subjectName: e.subjectName,
            staffId: e.staffId,
            staffName: e.staffName,
            roomNumber: e.roomNumber,
            scheduleType: e.scheduleType
          };
        });
        setScheduleGrid(newGrid);
      } else {
        // Reset empty grid
        const emptyGrid = {};
        DAYS.forEach((d) => {
          emptyGrid[d] = {};
        });
        setScheduleGrid(emptyGrid);
      }
    } catch (err) {
      console.warn('No existing schedule:', err.message);
    }
  };

  // Filter department subjects for this semester
  const semesterSubjects = (meta?.subjects || []).filter(
    (s) => s.semester === selectedSemester || s.academicYearId === selectedYearId
  );

  // Filter staff members
  const staffList = meta?.staffMembers || [];

  // Creative Time Presets
  const applyTimePreset = (preset) => {
    setActivePreset(preset);
    if (preset === 'early') {
      setPeriods([
        { period: 1, start: '08:30', end: '09:30', label: 'Period 1' },
        { period: 2, start: '09:30', end: '10:30', label: 'Period 2' },
        { period: 3, start: '10:45', end: '11:45', label: 'Period 3' },
        { period: 4, start: '12:45', end: '13:45', label: 'Period 4' },
        { period: 5, start: '13:45', end: '14:45', label: 'Period 5' },
        { period: 6, start: '14:45', end: '15:45', label: 'Period 6' }
      ]);
    } else if (preset === 'extended') {
      setPeriods([
        { period: 1, start: '09:30', end: '10:30', label: 'Period 1' },
        { period: 2, start: '10:30', end: '11:30', label: 'Period 2' },
        { period: 3, start: '11:45', end: '12:45', label: 'Period 3' },
        { period: 4, start: '13:45', end: '14:45', label: 'Period 4' },
        { period: 5, start: '14:45', end: '15:45', label: 'Period 5' },
        { period: 6, start: '15:45', end: '16:45', label: 'Period 6' }
      ]);
    } else {
      setPeriods(DEFAULT_PERIODS);
    }
    showSuccess(`Applied ${preset.toUpperCase()} time template!`);
  };

  // Creative Animation: Auto-Generate Optimal Schedule
  const handleAutoGenerateSchedule = () => {
    if (semesterSubjects.length === 0) {
      showError(`No subjects configured for ${selectedSemester}. Please add subjects in Year Master.`);
      return;
    }

    setIsAnimatingShuffle(true);

    setTimeout(() => {
      const newGrid = {};
      DAYS.forEach((d) => {
        newGrid[d] = {};
      });

      let subIdx = 0;
      DAYS.forEach((day, dayIndex) => {
        for (let p = 1; p <= 6; p++) {
          // Lab practical for Friday afternoon
          const isLab = p >= 5 && (day === 'Tuesday' || day === 'Thursday');
          const sub = semesterSubjects[subIdx % semesterSubjects.length];

          // Pick mapped faculty or cycle staff
          const assignedStaffName = sub.staffName || (staffList.length > 0 ? staffList[(subIdx + dayIndex) % staffList.length].name : 'Faculty In-Charge');
          const assignedStaffId = sub.staffId || (staffList.length > 0 ? staffList[(subIdx + dayIndex) % staffList.length].id : null);

          newGrid[day][p] = {
            subjectId: sub.id,
            subjectCode: sub.code,
            subjectName: sub.name,
            staffId: assignedStaffId,
            staffName: assignedStaffName,
            roomNumber: isLab ? 'Database Systems Lab 2' : ROOM_OPTIONS[p % ROOM_OPTIONS.length],
            scheduleType: isLab ? 'Lab Practical' : 'Lecture'
          };

          subIdx++;
        }
      });

      setScheduleGrid(newGrid);
      setIsAnimatingShuffle(false);
      showSuccess(`✨ Optimally generated balanced timetable for ${selectedSemester}!`);
    }, 700);
  };

  // Open slot editor
  const handleOpenSlotModal = (day, period) => {
    const current = scheduleGrid[day]?.[period];
    setEditingSlot({ day, period });

    if (current) {
      setSlotForm({
        subjectId: current.subjectId || '',
        staffId: current.staffId || '',
        roomNumber: current.roomNumber || 'Lecture Hall 101',
        scheduleType: current.scheduleType || 'Lecture'
      });
    } else {
      const defaultSub = semesterSubjects[0];
      setSlotForm({
        subjectId: defaultSub?.id || '',
        staffId: defaultSub?.staffId || staffList[0]?.id || '',
        roomNumber: 'Lecture Hall 101',
        scheduleType: 'Lecture'
      });
    }
    setSlotModalOpen(true);
  };

  // Save single slot
  const handleSaveSlot = (e) => {
    e.preventDefault();
    if (!editingSlot) return;

    const { day, period } = editingSlot;
    const sub = semesterSubjects.find((s) => s.id === slotForm.subjectId);
    const staff = staffList.find((st) => st.id === slotForm.staffId);

    const updated = {
      ...scheduleGrid,
      [day]: {
        ...(scheduleGrid[day] || {}),
        [period]: {
          subjectId: slotForm.subjectId,
          subjectCode: sub?.code || 'GEN101',
          subjectName: sub?.name || 'Class Lecture',
          staffId: slotForm.staffId,
          staffName: staff?.name || sub?.staffName || 'Faculty In-Charge',
          roomNumber: slotForm.roomNumber,
          scheduleType: slotForm.scheduleType
        }
      }
    };

    setScheduleGrid(updated);
    setSlotModalOpen(false);
    showSuccess(`Slot updated for ${day} Period ${period}`);
  };

  // Clear single slot
  const handleClearSlot = (day, period, e) => {
    e.stopPropagation();
    const updated = { ...scheduleGrid };
    if (updated[day]) {
      delete updated[day][period];
    }
    setScheduleGrid(updated);
  };

  // Publish / Send Schedule to Year Module
  const handlePublishSchedule = async () => {
    // Gather all occupied slots
    const entries = [];
    DAYS.forEach((day) => {
      for (let p = 1; p <= 6; p++) {
        const slot = scheduleGrid[day]?.[p];
        if (slot) {
          const periodTiming = periods.find((pr) => pr.period === p) || DEFAULT_PERIODS[p - 1];
          entries.push({
            dayOfWeek: day,
            periodNumber: p,
            startTime: periodTiming.start,
            endTime: periodTiming.end,
            subjectId: slot.subjectId,
            subjectCode: slot.subjectCode,
            subjectName: slot.subjectName,
            staffId: slot.staffId,
            staffName: slot.staffName,
            roomNumber: slot.roomNumber,
            scheduleType: slot.scheduleType
          });
        }
      }
    });

    if (entries.length === 0) {
      showError('Please assign at least one period before publishing the schedule.');
      return;
    }

    setPublishing(true);
    try {
      await departmentService.publishClassSchedule({
        academicYearId: selectedYearId,
        semester: selectedSemester,
        departmentId: meta?.department?.id,
        entries
      });

      showSuccess(`🚀 Schedule published successfully! Reflected in Year Master under ${selectedSemester}.`);
    } catch (err) {
      showError(err.message || 'Failed to publish schedule');
    } finally {
      setPublishing(false);
    }
  };

  if (loadingMeta) {
    return <Loader message="Loading timetable scheduler metadata..." />;
  }

  // Count occupied slots
  let totalSlots = 0;
  DAYS.forEach((d) => {
    for (let p = 1; p <= 6; p++) {
      if (scheduleGrid[d]?.[p]) totalSlots++;
    }
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Schedule & Timetable Builder"
        subtitle={`Design, adjust timings, and publish weekly class timetables for ${meta?.department?.name || 'Department'}.`}
        breadcrumbItems={[
          { label: 'Department', href: '/department' },
          { label: 'Create Schedule' }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={handleAutoGenerateSchedule}
              disabled={isAnimatingShuffle || publishing}
              className={isAnimatingShuffle ? 'animate-pulse' : ''}
            >
              Auto-Generate Schedule
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={handlePublishSchedule}
              loading={publishing}
            >
              Send to Year Module
            </Button>
          </div>
        }
      />

      {/* Control Strip: Academic Year & Semester Selector */}
      <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EBD9CB] pb-4">
          {/* Year Selector */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C66B45] text-white flex items-center justify-center shadow-xs">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C66B45] block">
                Academic Cohort
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-[#929071]">Academic Year:</span>
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="text-sm font-extrabold px-3 py-1.5 rounded-xl border border-[#EBD9CB] bg-white text-[#553729] focus:outline-none"
                >
                  {(meta?.academicYears || []).map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} ({y.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Department Context */}
          <div className="flex items-center gap-2 bg-[#FCE6D8]/60 border border-[#EBD9CB] px-3.5 py-1.5 rounded-xl">
            <Building2 className="w-4 h-4 text-[#C66B45]" />
            <span className="text-xs font-bold text-[#553729]">
              {meta?.department ? `${meta.department.code} - ${meta.department.name}` : 'Department'}
            </span>
          </div>
        </div>

        {/* Semester Pills Selection */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#929071] uppercase tracking-wider">
              Target Semester:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {availableSemesters.map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem)}
                  className={`text-xs px-4 py-1.5 rounded-xl border font-bold transition-all shadow-2xs ${
                    selectedSemester === sem
                      ? 'bg-[#C66B45] text-white border-[#C66B45] shadow-xs'
                      : 'bg-white text-[#553729] border-[#EBD9CB] hover:bg-[#FCE6D8]/40'
                  }`}
                >
                  {sem}
                </button>
              ))}
            </div>
          </div>

          {/* Creative Timing Presets with Animation */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#929071] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#C66B45]" /> Time Preset:
            </span>
            <div className="flex rounded-xl border border-[#EBD9CB] bg-white p-0.5">
              <button
                type="button"
                onClick={() => applyTimePreset('standard')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                  activePreset === 'standard'
                    ? 'bg-[#C66B45] text-white shadow-2xs'
                    : 'text-[#553729] hover:bg-[#FCE6D8]/30'
                }`}
              >
                Standard (09:00 - 16:15)
              </button>
              <button
                type="button"
                onClick={() => applyTimePreset('early')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                  activePreset === 'early'
                    ? 'bg-[#C66B45] text-white shadow-2xs'
                    : 'text-[#553729] hover:bg-[#FCE6D8]/30'
                }`}
              >
                Early Bird (08:30 - 15:45)
              </button>
              <button
                type="button"
                onClick={() => applyTimePreset('extended')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all ${
                  activePreset === 'extended'
                    ? 'bg-[#C66B45] text-white shadow-2xs'
                    : 'text-[#553729] hover:bg-[#FCE6D8]/30'
                }`}
              >
                Extended (09:30 - 16:45)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Builder Grid: Subjects & Staff Drawer (Left) + Timetable Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column: Department Curriculum Subjects & Faculty */}
        <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-3xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EBD9CB] pb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#C66B45]" />
              <h3 className="text-sm font-extrabold text-[#553729]">
                Curriculum Subjects ({semesterSubjects.length})
              </h3>
            </div>
            <span className="text-[10px] text-[#C66B45] font-extrabold bg-[#FCE6D8] px-2 py-0.5 rounded-full">
              {selectedSemester}
            </span>
          </div>

          <p className="text-[11px] text-[#929071] leading-relaxed">
            Faculty mapped for this semester. Click any slot in the timetable grid to assign or swap subjects.
          </p>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {semesterSubjects.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#929071] bg-white rounded-2xl border border-[#EBD9CB]">
                No subjects found for {selectedSemester}.
              </div>
            ) : (
              semesterSubjects.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white border border-[#EBD9CB] rounded-2xl p-3 shadow-2xs hover:border-[#C66B45] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#C66B45] bg-[#FCE6D8] px-2 py-0.5 rounded-md">
                      {sub.code}
                    </span>
                    <span className="text-[10px] text-[#929071] font-bold">
                      {sub.credits} Credits
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-[#553729] mt-1.5 leading-snug">
                    {sub.name}
                  </h4>
                  <div className="mt-2 pt-2 border-t border-[#EBD9CB]/50 flex items-center gap-1.5 text-[11px] text-[#929071]">
                    <Users className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium text-[#553729]">
                      {sub.staffName || 'Unassigned Faculty'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Interactive Animated Timetable Grid */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EBD9CB]">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#C66B45]" />
                <h3 className="text-base font-extrabold text-[#553729]">
                  Weekly Timetable Matrix ({selectedSemester})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#929071]">
                  Occupied Slots: <strong className="text-[#C66B45]">{totalSlots} / 30</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const emptyGrid = {};
                    DAYS.forEach((d) => (emptyGrid[d] = {}));
                    setScheduleGrid(emptyGrid);
                    showSuccess('Cleared all timetable slots.');
                  }}
                  className="text-[11px] font-bold text-red-600 hover:text-red-700 underline ml-2"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Timetable Matrix Table */}
            <div
              className={`overflow-x-auto rounded-2xl border border-[#EBD9CB] transition-all duration-500 ${
                isAnimatingShuffle ? 'scale-[0.98] opacity-60 blur-[1px]' : 'scale-100 opacity-100'
              }`}
            >
              <table className="min-w-full divide-y divide-[#EBD9CB] text-left text-xs">
                <thead className="bg-[#FCE6D8]/80 text-[#553729] font-extrabold text-center uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-3 w-28 text-left border-r border-[#EBD9CB]">Day / Period</th>
                    {periods.map((pr, idx) => (
                      <React.Fragment key={pr.period}>
                        {idx === 2 && (
                          <th className="px-2 py-3 bg-[#FCE6D8] text-[#C66B45] w-14 font-extrabold text-[10px] writing-mode-vertical">
                            TEA BREAK
                          </th>
                        )}
                        {idx === 3 && (
                          <th className="px-2 py-3 bg-[#F5D2C2] text-[#AD5938] w-14 font-extrabold text-[10px] writing-mode-vertical">
                            LUNCH BREAK
                          </th>
                        )}
                        <th className="px-3 py-3 min-w-[140px]">
                          <div>{pr.label}</div>
                          <span className="text-[10px] font-mono text-[#929071] lowercase font-normal">
                            {pr.start} - {pr.end}
                          </span>
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#EBD9CB] bg-white">
                  {DAYS.map((day) => (
                    <tr key={day} className="hover:bg-[#FFF8F1]/60 transition-colors">
                      {/* Day Label */}
                      <td className="px-3 py-4 font-extrabold text-[#553729] bg-[#FFF8F1]/80 border-r border-[#EBD9CB]">
                        {day}
                      </td>

                      {/* Period Cells */}
                      {periods.map((pr, idx) => {
                        const cell = scheduleGrid[day]?.[pr.period];

                        return (
                          <React.Fragment key={pr.period}>
                            {idx === 2 && (
                              <td className="bg-[#FFF8F1] border-x border-[#EBD9CB] text-center text-[10px] text-[#929071] font-bold">
                                ☕ 15m
                              </td>
                            )}
                            {idx === 3 && (
                              <td className="bg-[#FFF8F1] border-x border-[#EBD9CB] text-center text-[10px] text-[#929071] font-bold">
                                🍱 60m
                              </td>
                            )}
                            <td
                              onClick={() => handleOpenSlotModal(day, pr.period)}
                              className="px-2.5 py-2.5 border-r border-[#EBD9CB]/60 cursor-pointer transition-all hover:bg-[#FCE6D8]/30 group relative"
                            >
                              {cell ? (
                                <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-xl p-2.5 shadow-2xs group-hover:border-[#C66B45] transition-all space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] font-bold text-[#C66B45] bg-[#FCE6D8] px-1.5 py-0.2 rounded">
                                      {cell.subjectCode}
                                    </span>
                                    <span
                                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                        cell.scheduleType === 'Lab Practical'
                                          ? 'bg-purple-100 text-purple-800'
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {cell.scheduleType === 'Lab Practical' ? 'LAB' : 'LEC'}
                                    </span>
                                  </div>
                                  <p className="font-bold text-[11px] text-[#553729] truncate">
                                    {cell.subjectName}
                                  </p>
                                  <div className="flex items-center gap-1 text-[10px] text-[#929071]">
                                    <Users className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span className="truncate">{cell.staffName}</span>
                                  </div>
                                  <p className="text-[9px] text-[#929071] truncate">{cell.roomNumber}</p>

                                  <button
                                    type="button"
                                    onClick={(e) => handleClearSlot(day, pr.period, e)}
                                    title="Remove Slot"
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs text-xs"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : (
                                <div className="h-16 rounded-xl border border-dashed border-[#EBD9CB] flex flex-col items-center justify-center text-[#929071] group-hover:border-[#C66B45] group-hover:text-[#C66B45] transition-colors">
                                  <Plus className="w-4 h-4 mb-0.5" />
                                  <span className="text-[9px] font-bold">Assign Slot</span>
                                </div>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Summary & Publish Bar */}
            <div className="bg-[#FCE6D8]/40 border border-[#EBD9CB] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-[#553729]">Ready to Synchronize Timetable?</h4>
                  <p className="text-[11px] text-[#929071]">
                    Publishing will make this timetable immediately visible in <strong>Year Master</strong> under <strong>{selectedSemester}</strong>.
                  </p>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                icon={Send}
                onClick={handlePublishSchedule}
                loading={publishing}
                className="w-full sm:w-auto"
              >
                Publish to Year Master
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: ASSIGN / EDIT SINGLE PERIOD SLOT */}
      <Modal
        isOpen={slotModalOpen}
        onClose={() => setSlotModalOpen(false)}
        title={
          editingSlot
            ? `Assign Slot: ${editingSlot.day} • Period ${editingSlot.period} (${periods[editingSlot.period - 1]?.start} - ${periods[editingSlot.period - 1]?.end})`
            : 'Configure Timetable Period'
        }
        size="md"
      >
        <form onSubmit={handleSaveSlot} className="space-y-4">
          <FormField label="Subject *" required>
            <Select
              value={slotForm.subjectId}
              onChange={(e) => {
                const subId = e.target.value;
                const matchedSub = semesterSubjects.find((s) => s.id === subId);
                setSlotForm({
                  ...slotForm,
                  subjectId: subId,
                  staffId: matchedSub?.staffId || slotForm.staffId
                });
              }}
              options={semesterSubjects.map((s) => ({
                value: s.id,
                label: `${s.code} - ${s.name} (${s.credits} Credits)`
              }))}
            />
          </FormField>

          <FormField label="Faculty In-Charge *" required>
            <Select
              value={slotForm.staffId}
              onChange={(e) => setSlotForm({ ...slotForm, staffId: e.target.value })}
              options={staffList.map((st) => ({
                value: st.id,
                label: `${st.name} (${st.designation || 'Faculty'}) - [${st.employeeId}]`
              }))}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Classroom / Lab *">
              <Select
                value={slotForm.roomNumber}
                onChange={(e) => setSlotForm({ ...slotForm, roomNumber: e.target.value })}
                options={ROOM_OPTIONS.map((r) => ({ value: r, label: r }))}
              />
            </FormField>

            <FormField label="Session Type *">
              <Select
                value={slotForm.scheduleType}
                onChange={(e) => setSlotForm({ ...slotForm, scheduleType: e.target.value })}
                options={[
                  { value: 'Lecture', label: 'Class Lecture (Theory)' },
                  { value: 'Lab Practical', label: 'Lab Practical Session' },
                  { value: 'Tutorial', label: 'Tutorial / Remedial' }
                ]}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#EBD9CB]">
            <Button variant="outline" size="sm" onClick={() => setSlotModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" icon={Check}>
              Apply to Slot
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
