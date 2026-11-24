import React from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/layout/PageHeader';
import { Settings, Shield, Building, Database, Server, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, tenant } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & System Configuration"
        subtitle="Institutional tenancy parameters, security configurations, and microservice status."
        breadcrumbItems={[{ label: 'Settings' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tenant Configuration Card */}
        <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 pb-4 border-b border-[#EBD9CB] mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#FCE6D8] text-[#C66B45] flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#553729]">Tenant Organization</h3>
              <p className="text-xs text-[#929071]">Primary Institutional Tenancy</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-[#EBD9CB]/50">
              <span className="text-[#929071] font-medium">Institution Name</span>
              <span className="font-bold text-[#553729]">{tenant?.name || 'ABC College of Engineering'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#EBD9CB]/50">
              <span className="text-[#929071] font-medium">Tenant Identifier Code</span>
              <span className="font-mono font-bold text-[#C66B45]">{tenant?.code || 'ABC_ENG'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#EBD9CB]/50">
              <span className="text-[#929071] font-medium">Deployment Model</span>
              <span className="font-semibold text-[#553729]">Single Tenant (Multi-Tenant Ready)</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#929071] font-medium">Database Tenant Scoping</span>
              <span className="inline-flex items-center text-[#15803d] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Enforced by Middleware
              </span>
            </div>
          </div>
        </div>

        {/* Current User Session */}
        <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-3 pb-4 border-b border-[#EBD9CB] mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#F5D2C2] text-[#AD5938] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[#553729]">Active User Credentials</h3>
              <p className="text-xs text-[#929071]">JWT Authenticated Identity</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-[#EBD9CB]/50">
              <span className="text-[#929071] font-medium">Authenticated Name</span>
              <span className="font-bold text-[#553729]">{user?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#EBD9CB]/50">
              <span className="text-[#929071] font-medium">Assigned Institutional Role</span>
              <span className="font-bold text-[#C66B45] uppercase tracking-wide">{user?.role}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[#EBD9CB]/50">
              <span className="text-[#929071] font-medium">Campus Email</span>
              <span className="font-semibold text-[#553729]">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[#929071] font-medium">Assigned Department</span>
              <span className="font-semibold text-[#553729]">{user?.department ? `${user.department.code} - ${user.department.name}` : 'Institutional Scope (All)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Microservices Architecture Status */}
      <div className="bg-[#FFF8F1] border border-[#EBD9CB] rounded-2xl p-6 shadow-sm">
        <div className="flex items-center space-x-3 pb-4 border-b border-[#EBD9CB] mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#FCE6D8] text-[#C66B45] flex items-center justify-center">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-[#553729]">Microservices Health & Topology</h3>
            <p className="text-xs text-[#929071]">Documented REST API Service Registry</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div className="p-3 bg-[#FCE6D8]/30 border border-[#EBD9CB] rounded-xl">
            <p className="font-bold text-[#553729]">API Gateway</p>
            <p className="text-[#929071] font-mono mt-0.5">Port 5000</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-[#15803d]">● Online</span>
          </div>

          <div className="p-3 bg-[#FCE6D8]/30 border border-[#EBD9CB] rounded-xl">
            <p className="font-bold text-[#553729]">Auth & Tenant Service</p>
            <p className="text-[#929071] font-mono mt-0.5">Port 5001</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-[#15803d]">● Online</span>
          </div>

          <div className="p-3 bg-[#FCE6D8]/30 border border-[#EBD9CB] rounded-xl">
            <p className="font-bold text-[#553729]">Master Data Service</p>
            <p className="text-[#929071] font-mono mt-0.5">Port 5002</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-[#15803d]">● Online</span>
          </div>

          <div className="p-3 bg-[#FCE6D8]/30 border border-[#EBD9CB] rounded-xl">
            <p className="font-bold text-[#553729]">Student Service</p>
            <p className="text-[#929071] font-mono mt-0.5">Port 5003</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-[#15803d]">● Online</span>
          </div>

          <div className="p-3 bg-[#FCE6D8]/30 border border-[#EBD9CB] rounded-xl">
            <p className="font-bold text-[#553729]">Department Service</p>
            <p className="text-[#929071] font-mono mt-0.5">Port 5004</p>
            <span className="inline-block mt-2 text-[10px] font-bold text-[#15803d]">● Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}
