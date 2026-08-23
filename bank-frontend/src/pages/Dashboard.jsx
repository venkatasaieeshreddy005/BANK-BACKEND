import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [activeAccount, setActiveAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const accountRes = await api.get("/accounts");
      const accList = accountRes.data?.accounts || [];
      setAccounts(accList);

      if (accList.length > 0) {
        const primaryAcc = accList.find((a) => a.accountType === "SAVINGS") || accList[0];
        setActiveAccount(primaryAcc);
      } else {
        setActiveAccount(null);
      }
    } catch (err) {
      console.error("Failed to load accounts:", err?.response?.data || err.message);
      setAccounts([]);
      setActiveAccount(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(" ")[0] || "User"} 
          </h2>
          <p className="text-sm text-slate-400">Here is your primary account activity overview.</p>
        </div>
      </header>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="h-44 bg-slate-900 rounded-2xl w-full"></div>
          <div className="h-64 bg-slate-900 rounded-2xl w-full"></div>
        </div>
      ) : !activeAccount ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center max-w-lg mx-auto my-8 shadow-xl">
          <div className="w-14 h-14 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 border border-blue-500/20">
            💳
          </div>
          <h3 className="text-xl font-bold mb-2 text-white">No Active Account Linked</h3>
          <p className="text-slate-400 text-sm mb-6">
            You need to open at least one bank account before initiating transfers or viewing balance.
          </p>
          <button
            onClick={() => navigate("/accounts")}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/30 text-white cursor-pointer"
          >
            Create Your First Account
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Primary Balance Card */}
            <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-blue-500/20 flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-blue-200 font-semibold">
                      {activeAccount.accountType || "PRIMARY"} BALANCE
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                      {formatCurrency(activeAccount.balance ?? 0)}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {accounts.length > 1 && (
                      <button
                        onClick={() => navigate("/accounts")}
                        className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white transition border border-white/20 cursor-pointer"
                      >
                        {accounts.length} Accounts
                      </button>
                    )}
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/20">
                      {activeAccount.accountType || "SAVINGS"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-white/10 text-xs text-blue-100">
                <div className="truncate">
                  <p className="opacity-75">Account ID</p>
                  <p className="font-mono font-medium truncate">{activeAccount._id || "N/A"}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate("/transactions")}
                    className="flex-1 sm:flex-none px-4 py-2 bg-slate-900/60 hover:bg-slate-900 text-white font-semibold rounded-xl transition border border-white/10 text-center cursor-pointer"
                  >
                    My Transactions
                  </button>
                </div>
              </div>
            </div>

            {/* Security & Status Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg">
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-4">Security & Status</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Escrow Service</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800/80">
                    <span className="text-slate-400">Bill Payments</span>
                    <button
                      onClick={() => navigate("/my-bills")}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold underline cursor-pointer"
                    >
                      Pay My Bills →
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
                Real-time transaction settlement active.
              </div>
            </div>
          </div>

          {/* Quick Action Cards with Descriptive Text */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Transfer Money Action Card */}
              <button
                onClick={() => navigate("/transfer")}
                className="group p-5 bg-slate-800/80 hover:bg-blue-600/10 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition text-left flex flex-col justify-between cursor-pointer shadow-md"
              >
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-blue-400 transition mb-1">
                    + Transfer Money Now
                  </div>
                  <p className="text-xs text-slate-400">
                    Send funds securely to friends or other ledger accounts instantly.
                  </p>
                </div>
                <div className="mt-4 text-xs font-semibold text-blue-400 flex items-center gap-1">
                  Open Transfer →
                </div>
              </button>

              {/* Split a Bill Action Card */}
              <button
                onClick={() => navigate("/split-bill")}
                className="group p-5 bg-slate-800/80 hover:bg-purple-600/10 border border-slate-700 hover:border-purple-500/50 rounded-2xl transition text-left flex flex-col justify-between cursor-pointer shadow-md"
              >
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-purple-400 transition mb-1">
                    Split a Bill
                  </div>
                  <p className="text-xs text-slate-400">
                    Divide shared expenses easily with groups and track settlements.
                  </p>
                </div>
                <div className="mt-4 text-xs font-semibold text-purple-400 flex items-center gap-1">
                  Open Split Bill →
                </div>
              </button>

              {/* Add Friends Action Card */}
              <button
                onClick={() => navigate("/friends")}
                className="group p-5 bg-slate-800/80 hover:bg-emerald-600/10 border border-slate-700 hover:border-emerald-500/50 rounded-2xl transition text-left flex flex-col justify-between cursor-pointer shadow-md"
              >
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition mb-1">
                    Add Friends
                  </div>
                  <p className="text-xs text-slate-400">
                    Connect with peers to simplify peer-to-peer tracking and payments.
                  </p>
                </div>
                <div className="mt-4 text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  Manage Friends →
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}