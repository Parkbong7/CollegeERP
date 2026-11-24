import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Shield } from 'lucide-react';

export default function Header() {
  const { user, tenant } = useAuth();

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'A';
  const roleDisplay = user?.role || 'Tenant Administrator';
  const nameDisplay = user?.name || 'ABC Administration';
  const deptCode = user?.department?.code;
  const rollNumber = user?.student?.rollNumber || user?.rollNumber;

  return (
    <header className="h-16 bg-[#FFF8F1] border-b border-[#EBD9CB] px-6 flex items-center justify-between shadow-xs sticky top-0 z-30">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-[#C66B45] text-white flex items-center justify-center shadow-sm">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-[#553729] leading-tight">
            {tenant?.name || 'ABC College of Engineering'}
          </h1>
          <p className="text-xs text-[#929071] font-medium flex items-center gap-1.5">
            <span>Institutional Service ERP</span>
            {deptCode && (
              <>
                <span className="w-1 h-1 rounded-full bg-[#C66B45]"></span>
                <span className="font-semibold text-[#C66B45]">Dept: {deptCode}</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3 px-3 py-1.5 bg-[#FCE6D8]/50 border border-[#EBD9CB] rounded-xl">
          <div className="w-8 h-8 rounded-full bg-[#C66B45] text-white flex items-center justify-center text-xs font-bold shadow-xs">
            {initial}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-[#553729] leading-tight">{nameDisplay}</p>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="inline-flex items-center text-[10px] font-semibold text-[#C66B45] uppercase tracking-wide">
                <Shield className="w-2.5 h-2.5 mr-0.5" />
                {roleDisplay}
              </span>
              {rollNumber && (
                <span className="text-[10px] px-1.5 py-0.2 bg-[#FFF8F1] border border-[#EBD9CB] rounded font-mono text-[#553729]">
                  {rollNumber}
                </span>
              )}
              {deptCode && !rollNumber && (
                <span className="text-[10px] px-1.5 py-0.2 bg-[#FFF8F1] border border-[#EBD9CB] rounded font-semibold text-[#553729]">
                  {deptCode}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
