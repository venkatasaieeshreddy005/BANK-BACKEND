import { useState, useEffect } from "react";
import api from "../services/api";

export default function MyBills() {
  const [bills, setBills] = useState([]);
  const [userAccounts, setUserAccounts] = useState([]); // New state for user accounts
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState({});

  // Slide-over drawer state
  const [selectedSplitDetails, setSelectedSplitDetails] = useState(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [activeBillId, setActiveBillId] = useState(null);

  const fetchMyBills = async () => {
    try {
      setLoading(true);
      const res = await api.get("/bills");
      const billData = Array.isArray(res.data)
        ? res.data
        : res.data?.bills || [];
      setBills(billData);
    } catch (err) {
      console.error("Failed to fetch bill requests:", err);
      setMessage({
        type: "error",
        text: "Failed to load incoming bills.",
      });
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch accounts belonging to the user
  const fetchUserAccounts = async () => {
    try {
      const res = await api.get("/accounts"); // Ensure this matches your backend route
      const accountData = Array.isArray(res.data)
        ? res.data
        : res.data?.accounts || [];
      setUserAccounts(accountData);
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  };

  useEffect(() => {
    fetchMyBills();
    fetchUserAccounts();
  }, []);

  const handleAccountChange = (billId, accountId) => {
    setSelectedAccounts((prev) => ({
      ...prev,
      [billId]: accountId,
    }));
  };

  const handlePayBill = async (billId) => {
    setProcessingId(billId);
    setMessage(null);

    try {
      const fromAccount = selectedAccounts[billId];
      const payload = fromAccount ? { fromAccount } : {};

      const res = await api.post(`/bills/${billId}/pay`, payload);

      setMessage({
        type: "success",
        text: res.data?.message || "Payment processed successfully!",
      });

      fetchMyBills();
    } catch (err) {
      setMessage({
        type: "error",
        text:
          err.response?.data?.message ||
          "Payment failed. Please check account status or balance.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDetails = async (splitBillId) => {
    try {
      setFetchingDetails(true);
      setActiveBillId(splitBillId);
      const res = await api.get(`/split-bills/${splitBillId}`);
      setSelectedSplitDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch split bill details:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Could not load bill breakdown.",
      });
    } finally {
      setFetchingDetails(false);
    }
  };

  const closeDrawer = () => {
    setSelectedSplitDetails(null);
    setActiveBillId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-7xl mx-auto font-sans relative overflow-x-hidden">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Bills & Split Requests</h1>
        <p className="text-slate-400 text-sm mt-1">
          Review pending bill requests and settle split shares via secure escrow.
        </p>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl mb-6 border text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Content Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4">Pending & Past Bills</h3>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-slate-800/60 rounded-xl" />
            <div className="h-24 bg-slate-800/60 rounded-xl" />
          </div>
        ) : bills.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            No bills or split payment requests found.
          </p>
        ) : (
          <div className="space-y-4">
            {bills.map((bill) => {
              const splitBillId =
                bill.sourceSplitBill || bill.splitBill?._id || bill.splitBill;

              return (
                <div
                  key={bill._id}
                  className="bg-slate-950 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:border-slate-700"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-base">
                        {bill.title || "Bill Request"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                          bill.status === "PAID"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : bill.status === "CANCELLED"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {bill.status || "UNPAID"}
                      </span>

                      {bill.description ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase">
                          {bill.description}
                        </span>
                      ) : splitBillId ? (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase">
                          Split Bill
                        </span>
                      ) : null}
                    </div>

                    {splitBillId && (
                      <p className="text-xs text-slate-400 font-mono mb-1">
                        Split Bill ID: {splitBillId}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 font-mono">
                      Receiver Account: {bill.receiverAccount}
                    </p>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">
                        Amount Due
                      </p>
                      <p className="text-xl font-bold font-mono text-emerald-400">
                        ₹{bill.amount}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {splitBillId && (
                        <button
                          onClick={() => handleViewDetails(splitBillId)}
                          disabled={
                            fetchingDetails && activeBillId === splitBillId
                          }
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition disabled:opacity-50"
                        >
                          {fetchingDetails && activeBillId === splitBillId
                            ? "Loading..."
                            : "View Details"}
                        </button>
                      )}

                      {bill.status === "UNPAID" && (
                        <>
                          {/* Account Selection Dropdown */}
                          <select
                            value={selectedAccounts[bill._id] || ""}
                            onChange={(e) =>
                              handleAccountChange(bill._id, e.target.value)
                            }
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500 w-full sm:w-44"
                          >
                            <option value="">Default Account</option>
                            {userAccounts.map((acc) => (
                              <option key={acc._id || acc.id} value={acc._id || acc.id}>
                                {acc.accountName || acc.accountNumber || acc.type || acc._id} 
                                {acc.balance !== undefined ? ` (₹${acc.balance})` : ""}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handlePayBill(bill._id)}
                            disabled={processingId === bill._id}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 font-semibold text-xs rounded-xl transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
                          >
                            {processingId === bill._id
                              ? "Processing..."
                              : "Pay Now"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side Slide-Over Details Panel */}
      {selectedSplitDetails && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={closeDrawer}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-white p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold">Split Bill Details</h2>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      ID: {selectedSplitDetails.splitBill?._id}
                    </p>
                  </div>
                  <button
                    onClick={closeDrawer}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Description</span>
                    <span className="text-xs font-semibold text-white">
                      {selectedSplitDetails.splitBill?.description || "N/A"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total Bill</span>
                    <span className="text-sm font-bold font-mono text-emerald-400">
                      ₹{selectedSplitDetails.splitBill?.totalAmount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Split Type</span>
                    <span className="text-xs font-semibold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">
                      {selectedSplitDetails.splitBill?.splitType}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Overall Status</span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded border uppercase ${
                        selectedSplitDetails.splitBill?.status === "SETTLED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}
                    >
                      {selectedSplitDetails.splitBill?.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-900 flex justify-between items-center text-[11px] text-slate-500 font-mono">
                    <span>Receiver Account:</span>
                    <span className="truncate max-w-[180px]">
                      {selectedSplitDetails.splitBill?.receiverAccount}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Participants (
                    {selectedSplitDetails.participants?.length || 0})
                  </h4>

                  <div className="space-y-2">
                    {selectedSplitDetails.participants?.map((participant) => (
                      <div
                        key={participant._id}
                        className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-semibold text-slate-200">
                            {participant.user?.name || "User"}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {participant.user?.email}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-bold font-mono text-white">
                            ₹{participant.share}
                          </p>
                          <span
                            className={`text-[10px] font-semibold uppercase ${
                              participant.status === "PAID"
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }`}
                          >
                            {participant.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800">
                <button
                  onClick={closeDrawer}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}