import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Transfer() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Form State
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState(searchParams.get("toAccount") || "");
  const [amount, setAmount] = useState("");
  const [selectedFriend, setSelectedFriend] = useState("");

  // Data State
  const [userAccounts, setUserAccounts] = useState([]);
  const [friends, setFriends] = useState([]);

  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [accRes, friendsRes] = await Promise.allSettled([
          api.get("/accounts"),
          api.get("/friends"),
        ]);

        if (accRes.status === "fulfilled") {
          const accountsList = accRes.value.data?.accounts || accRes.value.data || [];
          setUserAccounts(accountsList);
          if (accountsList.length > 0) {
            setFromAccount(accountsList[0]._id || accountsList[0].id || "");
          }
        }

        if (friendsRes.status === "fulfilled") {
          setFriends(friendsRes.value.data?.friends || friendsRes.value.data || []);
        }
      } catch (err) {
        console.error("Failed to load transfer data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Handle auto-filling To Account from friend selection
  const handleSelectFriend = (e) => {
    const value = e.target.value;
    setSelectedFriend(value);
    if (value) {
      setToAccount(value);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!fromAccount) {
      setMessage({ type: "error", text: "Please select a source account." });
      return;
    }

    if (!toAccount.trim()) {
      setMessage({ type: "error", text: "Please specify a recipient account ID." });
      return;
    }

    setLoading(true);

    // Generate standard UUID or timestamp-based key for backend idempotency
    const idempotencyKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      await api.post("/transactions/send", {
        fromAccount,
        toAccount: toAccount.trim(),
        amount: Number(amount),
        idempotencyKey,
      });

      setMessage({ type: "success", text: "Transaction executed successfully!" });
      setAmount("");
      setToAccount("");
      setSelectedFriend("");
      setTimeout(() => navigate("/transactions"), 1500);
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Transfer failed. Please check account details.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 pb-4 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white">Transfer Money</h1>
        <p className="text-slate-400 text-sm mt-1">
          Execute double-entry ledger transfers across accounts.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        {message.text && (
          <div
            className={`p-4 rounded-lg text-sm mb-6 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleTransfer} className="space-y-5">
          {/* Source Account */}
          <div>
            <label className="block text-xs text-slate-400 mb-2 font-medium">From Account</label>
            {loadingData ? (
              <div className="h-10 bg-slate-950 border border-slate-800 rounded-lg animate-pulse" />
            ) : userAccounts.length === 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-xs">
                No bank accounts found. Please create an account before sending money.
              </div>
            ) : (
              <select
                required
                value={fromAccount}
                onChange={(e) => setFromAccount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {userAccounts.map((acc) => {
                  const accId = acc._id || acc.id;
                  const type = acc.accountType || acc.type || "Account";
                  const balance = acc.balance !== undefined ? `$${acc.balance.toLocaleString()}` : "";
                  return (
                    <option key={accId} value={accId}>
                      {type} ({accId}) {balance ? `- Balance: ${balance}` : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

          {/* Recipient Account & Optional Friend Selector */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs text-slate-400 font-medium">To Account (Account ID)</label>
              {friends.length > 0 && (
                <span className="text-[11px] text-slate-500">Select friend to auto-fill</span>
              )}
            </div>

            {/* Quick Friend Selector Dropdown */}
            {friends.length > 0 && (
              <div className="mb-2">
                <select
                  value={selectedFriend}
                  onChange={handleSelectFriend}
                  className="w-full bg-slate-950/70 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Choose from Friends List (Optional) --</option>
                  {friends.map((item) => {
                    const friendObj = item.friend || item;
                    const friendAccId = friendObj.accountId || friendObj.primaryAccount || friendObj._id;
                    const name = friendObj.name || friendObj.email || "Friend";
                    return (
                      <option key={friendObj._id || item._id} value={friendAccId}>
                        {name} ({friendAccId})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Manual Account ID Input */}
            <input
              type="text"
              required
              placeholder="e.g. 6a873f7efbb52efdbaed893c"
              value={toAccount}
              onChange={(e) => {
                setToAccount(e.target.value);
                setSelectedFriend("");
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500 placeholder:font-sans placeholder:text-slate-600"
            />
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs text-slate-400 mb-2 font-medium">Amount ($)</label>
            <input
              type="number"
              min="1"
              step="any"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading || userAccounts.length === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition disabled:opacity-50 mt-4"
          >
            {loading ? "Processing Transfer..." : "Confirm Ledger Transfer"}
          </button>
        </form>
      </div>
    </div>
  );
}