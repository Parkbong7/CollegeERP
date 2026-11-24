import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="h-screen w-full overflow-hidden flex flex-col bg-[#FFF8F1]">
      <Header />
      <div className="flex-1 flex overflow-hidden min-h-0 w-full">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-0 w-full p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full pb-16">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
