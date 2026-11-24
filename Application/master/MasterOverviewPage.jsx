import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../shell/src/components/layout/PageHeader';
import YearMasterPage from './YearMasterPage';
import StaffMasterPage from './StaffMasterPage';
import DepartmentMasterPage from './DepartmentMasterPage';
import { Calendar, UserCheck, Building2 } from 'lucide-react';

export default function MasterOverviewPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'year';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-[#EBD9CB] pb-4 gap-2">
        <button
          onClick={() => setTab('year')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            currentTab === 'year'
              ? 'bg-[#C66B45] text-white shadow-xs'
              : 'text-[#553729] hover:bg-[#FCE6D8] hover:text-[#553729]'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Academic Years</span>
        </button>

        <button
          onClick={() => setTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            currentTab === 'staff'
              ? 'bg-[#C66B45] text-white shadow-xs'
              : 'text-[#553729] hover:bg-[#FCE6D8] hover:text-[#553729]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Staff & Faculty</span>
        </button>

        <button
          onClick={() => setTab('department')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            currentTab === 'department'
              ? 'bg-[#C66B45] text-white shadow-xs'
              : 'text-[#553729] hover:bg-[#FCE6D8] hover:text-[#553729]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Departments</span>
        </button>
      </div>

      <div>
        {currentTab === 'year' && <YearMasterPage />}
        {currentTab === 'staff' && <StaffMasterPage />}
        {currentTab === 'department' && <DepartmentMasterPage />}
      </div>
    </div>
  );
}
