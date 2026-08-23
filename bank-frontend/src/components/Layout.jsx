import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function Layout() {
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (logout) logout();
    navigate("/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Sidebar Component with isOpen state control */}
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Persistent Global Top Navbar */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Hamburger Menu Icon to open the Sidebar */}
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition border border-slate-700 cursor-pointer shadow-sm flex items-center justify-center"
            title="Open Sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Vaulta Brand Name and Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-600/30">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9m4 0V7m0 0h4m-4 0H9" />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight tracking-tight">Vaulta</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Digital Banking</p>
            </div>
          </div>
        </div>

        {/* Global Log Out Button on the Right */}
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition border border-slate-700 cursor-pointer shadow-sm"
        >
          Log Out
        </button>
      </header>

      {/* Dynamic Main Page Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <Outlet />
      </main>

      {/* Modern Professional Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 px-4 sm:px-8 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <p>&copy; 2026 Vaulta Digital Banking. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-white transition">Privacy Policy</span>
            <span className="hover:text-white transition">Terms of Service</span>
            <span className="hover:text-white transition">Security</span>
          </div>
        </div>
      </footer>
    </div>
  );
}