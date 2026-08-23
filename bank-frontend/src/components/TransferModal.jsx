import { useState } from "react";
import api from "../services/api";

export default function TransferModal({ isOpen, onClose, onSuccess }) {
  const [recipientAccount, setRecipientAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleTransfer = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/transaction/transfer", {
        toAccountId: recipientAccount,
        amount: Number(amount),
      });

      onSuccess();
      onClose();
      setAmount("");
      setRecipientAccount("");
    } catch (err) {
      setError(err.response?.data?.message || "Transfer failed. Check recipient ID and balance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Send Money</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Recipient Account ID</label>
            <input
              type="text"
              required
              placeholder="e.g. 6a770ad97eaff95729fc7fea"
              value={recipientAccount}
              onChange={(e) => setRecipientAccount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 uppercase font-semibold mb-2">Amount (₹)</label>
            <input
              type="number"
              required
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 font-mono text-lg font-bold"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}