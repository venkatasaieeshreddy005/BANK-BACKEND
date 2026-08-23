import { useState, useEffect, useMemo } from "react";
import api from "../services/api";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("ALL");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI Filters & Details Modal
  const [filterType, setFilterType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTx, setSelectedTx] = useState(null);

  // 1. Fetch user accounts to populate the account type dropdown
  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounts");
      // Adjust according to your response structure (e.g., res.data.accounts or res.data)
      const accountData = Array.isArray(res.data) ? res.data : res.data.accounts || [];
      setAccounts(accountData);
    } catch (err) {
      console.error("Failed to fetch user accounts:", err);
    }
  };

  // 2. Fetch transaction history with accountId filter sent to backend
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");

      const params = { page };
      if (selectedAccountId !== "ALL") {
        params.accountId = selectedAccountId;
      }

      // Endpoint matches app.use("/api/transactions") + router.get("/history")
      const res = await api.get("/transactions/history", { params });
      const data = res.data;

      setTransactions(data.transactions || []);
      setPage(data.page || 1);
      setTotalPages(data.totalPages || 1);
      setTotalTransactions(data.totalTransactions || 0);
    } catch (err) {
      console.error("Failed to fetch transaction history:", err);
      setError(
        err.response?.data?.message || "Failed to load transaction history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, selectedAccountId]);

  // Client-side filtering for UI Search Bar & Direction Tabs (SENT/RECEIVED/SELF_TRANSFER)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType =
        filterType === "ALL" || tx.direction === filterType;

      const query = searchQuery.toLowerCase().trim();
      const fromId =
        typeof tx.fromAccount === "object" ? tx.fromAccount?._id : tx.fromAccount || "";
      const toId =
        typeof tx.toAccount === "object" ? tx.toAccount?._id : tx.toAccount || "";
      const txId = tx._id || "";

      const matchesSearch =
        !query ||
        txId.toLowerCase().includes(query) ||
        fromId.toLowerCase().includes(query) ||
        toId.toLowerCase().includes(query);

      return matchesType && matchesSearch;
    });
  }, [transactions, filterType, searchQuery]);

  // Metric totals calculation
  const metrics = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, tx) => {
        const amt = Number(tx.amount) || 0;
        if (tx.direction === "SENT") acc.totalSent += amt;
        if (tx.direction === "RECEIVED") acc.totalReceived += amt;
        if (tx.direction === "SELF_TRANSFER") acc.totalSelf += amt;
        return acc;
      },
      { totalSent: 0, totalReceived: 0, totalSelf: 0 }
    );
  }, [filteredTransactions]);

  // Safe Account Identifier extractors
  const getAccId = (acc) =>
    typeof acc === "object" && acc !== null ? acc._id : acc || "N/A";
  const getAccType = (acc) =>
    typeof acc === "object" && acc !== null ? acc.accountType : "N/A";
  const getCurrency = (acc) =>
    typeof acc === "object" && acc !== null ? acc.currency : "INR";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <p className="text-slate-400 text-sm mt-1">
            Audit log of debits, credits, and internal transfers.
          </p>
        </div>

        {/* Account Selector & Refresh Button */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <select
            value={selectedAccountId}
            onChange={(e) => {
              setSelectedAccountId(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="ALL">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc._id} value={acc._id}>
                {acc.accountType} ({acc._id.slice(-4)})
              </option>
            ))}
          </select>

          <button
            onClick={fetchTransactions}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition flex items-center gap-2"
          >
            Refresh Log
          </button>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Received
          </p>
          <p className="text-xl font-mono font-bold text-emerald-400 mt-1">
            +₹{metrics.totalReceived.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Sent
          </p>
          <p className="text-xl font-mono font-bold text-rose-400 mt-1">
            -₹{metrics.totalSent.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Self Transfers
          </p>
          <p className="text-xl font-mono font-bold text-blue-400 mt-1">
            ₹{metrics.totalSelf.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Search & Direction Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        <input
          type="text"
          placeholder="Search by Transaction or Account ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full md:w-80 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
        />

        <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
          {[
            { key: "ALL", label: "All" },
            { key: "SENT", label: "Sent" },
            { key: "RECEIVED", label: "Received" },
            { key: "SELF_TRANSFER", label: "Self Transfer" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`flex-1 md:flex-none px-3.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
                filterType === tab.key
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {error && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs text-center">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-12 bg-slate-950/60 border border-slate-800/80 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <p className="text-sm font-medium text-slate-400">
              No transactions recorded
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                  <th className="py-3 px-4 font-semibold">Direction</th>
                  <th className="py-3 px-4 font-semibold">From Account</th>
                  <th className="py-3 px-4 font-semibold">To Account</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">
                    Amount
                  </th>
                  <th className="py-3 px-4 font-semibold text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredTransactions.map((tx) => {
                  const fromId = getAccId(tx.fromAccount);
                  const toId = getAccId(tx.toAccount);
                  const fromType = getAccType(tx.fromAccount);
                  const toType = getAccType(tx.toAccount);
                  const currency = getCurrency(tx.fromAccount);

                  const dateStr = tx.createdAt
                    ? new Date(tx.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "N/A";

                  return (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-800/30 transition"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            tx.direction === "SENT"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : tx.direction === "RECEIVED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {tx.direction}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <span className="block text-white text-xs font-sans">
                          {fromType}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {fromId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        <span className="block text-white text-xs font-sans">
                          {toType}
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          {toId}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {dateStr}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-400 bg-emerald-500/10">
                          {tx.status}
                        </span>
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap ${
                          tx.direction === "SENT"
                            ? "text-rose-400"
                            : tx.direction === "RECEIVED"
                            ? "text-emerald-400"
                            : "text-blue-400"
                        }`}
                      >
                        {tx.direction === "SENT"
                          ? "-"
                          : tx.direction === "RECEIVED"
                          ? "+"
                          : ""}
                        {currency === "INR" ? "₹" : "$"}
                        {Number(tx.amount || 0).toLocaleString("en-IN")}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server Pagination Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Total Transactions:{" "}
            <strong className="text-white">{totalTransactions}</strong> | Page{" "}
            <strong className="text-white">{page}</strong> of{" "}
            <strong className="text-white">{totalPages}</strong>
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 transition"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                Transaction Details
              </h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Transaction ID</p>
                <p className="font-mono text-slate-200 bg-slate-950 p-2 rounded border border-slate-800 mt-1 break-all">
                  {selectedTx._id}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-500 font-medium">From Account</p>
                  <p className="font-mono text-slate-200 mt-0.5 break-all">
                    {getAccId(selectedTx.fromAccount)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">To Account</p>
                  <p className="font-mono text-slate-200 mt-0.5 break-all">
                    {getAccId(selectedTx.toAccount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <p className="text-slate-500 font-medium">Amount</p>
                  <p className="text-sm font-mono font-bold text-white mt-0.5">
                    ₹{Number(selectedTx.amount || 0).toLocaleString("en-IN")}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">
                    Direction / Status
                  </p>
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                    {selectedTx.direction} ({selectedTx.status})
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedTx(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}