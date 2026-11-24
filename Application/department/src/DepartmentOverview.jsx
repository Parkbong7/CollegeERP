import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import StudentSubjectLookupPage from '../StudentSubjectLookupPage';
import HODStaffOverviewPage from '../HODStaffOverviewPage';
import { Search, BookOpen } from 'lucide-react';

export default function DepartmentOverview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'student-lookup';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-[#EBD9CB] pb-4 gap-2">
        <button
          onClick={() => setTab('student-lookup')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            currentTab === 'student-lookup'
              ? 'bg-[#C66B45] text-white shadow-xs'
              : 'text-[#553729] hover:bg-[#FCE6D8] hover:text-[#553729]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Student Subject Lookup (Workflow 7.1)</span>
        </button>

        <button
          onClick={() => setTab('hod-overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            currentTab === 'hod-overview'
              ? 'bg-[#C66B45] text-white shadow-xs'
              : 'text-[#553729] hover:bg-[#FCE6D8] hover:text-[#553729]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>HOD Staff Overview (Workflow 7.2)</span>
        </button>
      </div>

      <div>
        {currentTab === 'student-lookup' && <StudentSubjectLookupPage />}
        {currentTab === 'hod-overview' && <HODStaffOverviewPage />}
      </div>
    </div>
  );
}
