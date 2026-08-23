import { useState, useEffect } from "react";
import api from "../services/api";

export default function MyAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountType, setAccountType] = useState("SAVINGS");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const ALL_TYPES = ["SAVINGS", "CURRENT", "BUSINESS"];

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get("/accounts");
      const list = res.data.accounts || [];
      setAccounts(list);

      // Auto-select first available account type for modal
      const existingTypes = list.map((a) => a.accountType);
      const available = ALL_TYPES.find((type) => !existingTypes.includes(type));
      if (available) {
        setAccountType(available);
      }
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const existingAccountTypes = accounts.map((acc) => acc.accountType);
  const hasMaxAccounts = existingAccountTypes.length >= 3;

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await api.post("/accounts/create", {
        accountType,
        currency: "INR",
      });
      setIsModalOpen(false);
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create account.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-8 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold">My Bank Accounts</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your personal bank accounts (Limit: 1 per type).
          </p>
        </div>

        <button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          disabled={hasMaxAccounts}
          className={`px-5 py-2.5 font-semibold text-sm rounded-xl transition shadow-lg ${
            hasMaxAccounts
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
          }`}
        >
          {hasMaxAccounts ? "Account Limit Reached (3/3)" : "+ Open New Account"}
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-900 rounded-2xl"></div>
          <div className="h-32 bg-slate-900 rounded-2xl"></div>
        </div>
      ) : accounts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto my-12">
          <div className="w-16 h-16 bg-blue-600/10 text-blue-400 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4 border border-blue-500/20">
            💳
          </div>
          <h3 className="text-xl font-bold mb-2">No Active Account Found</h3>
          <p className="text-slate-400 text-sm mb-6">
            You don't have any active accounts linked to your profile yet. Open an account to start managing your funds.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/30 text-white"
          >
            Create First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accounts.map((acc, index) => (
            <div
              key={acc._id || index}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                    {acc.accountType || "SAVINGS"}
                  </span>
                  <p className="text-xs text-slate-400 font-mono mt-3">ID: {acc._id}</p>
                </div>
                {acc.accountType === "SAVINGS" && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Primary Account
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Available Balance</p>
                <p className="text-3xl font-extrabold text-white mt-1 font-mono">
                  ₹{Number(acc.balance || 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Open New Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-1">Open a New Account</h3>
            <p className="text-xs text-slate-400 mb-6">
              Select an available account category. New accounts start with a ₹0 balance.
            </p>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-2">Account Type</label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-white"
                >
                  <option value="SAVINGS" disabled={existingAccountTypes.includes("SAVINGS")}>
                    Savings Account {existingAccountTypes.includes("SAVINGS") ? "(Already Created)" : ""}
                  </option>
                  <option value="CURRENT" disabled={existingAccountTypes.includes("CURRENT")}>
                    Current Account {existingAccountTypes.includes("CURRENT") ? "(Already Created)" : ""}
                  </option>
                  <option value="BUSINESS" disabled={existingAccountTypes.includes("BUSINESS")}>
                    Business Account {existingAccountTypes.includes("BUSINESS") ? "(Already Created)" : ""}
                  </option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}