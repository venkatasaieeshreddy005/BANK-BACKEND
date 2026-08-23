import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import api from "../services/api";

export default function SplitBill() {
  const navigate = useNavigate(); // Initialize navigate hook
  const [receiverAccount, setReceiverAccount] = useState("");
  const [description, setDescription] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [splitType, setSplitType] = useState("EQUAL");

  // Host and Friends list state
  const [hostUserId, setHostUserId] = useState("");
  const [friendsList, setFriendsList] = useState([]);
  const [fetchingFriends, setFetchingFriends] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);

  // Manual fallback input for custom Friend User ID
  const [manualFriendInput, setManualFriendInput] = useState("");

  // Object storing user ID -> share amount for CUSTOM split
  const [customSharesMap, setCustomSharesMap] = useState({});

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Fetch host profile and friends list on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setFetchingFriends(true);
        const [userRes, friendsRes] = await Promise.all([
          api.get("/auth/me").catch(() => null),
          api.get("/friends").catch(() => null),
        ]);

        if (userRes?.data?.user?._id) {
          setHostUserId(userRes.data.user._id);
        }

        if (friendsRes?.data) {
          const rawList = friendsRes.data.friends || friendsRes.data || [];
          setFriendsList(rawList);
        }
      } catch (err) {
        console.warn("Could not fetch initial data:", err);
      } finally {
        setFetchingFriends(false);
      }
    };

    fetchInitialData();
  }, []);

  const toggleSelectFriend = (friendObj) => {
    const fId = friendObj._id || friendObj.userId || friendObj.accountId;
    if (!fId) return;

    if (selectedFriendIds.includes(fId)) {
      setSelectedFriendIds(selectedFriendIds.filter((id) => id !== fId));
      const updatedMap = { ...customSharesMap };
      delete updatedMap[fId];
      setCustomSharesMap(updatedMap);
      setStatusMessage(null);
    } else {
      if (selectedFriendIds.length >= 3) {
        setStatusMessage({ type: "error", text: "Maximum 3 friends allowed per split bill." });
        return;
      }
      setSelectedFriendIds([...selectedFriendIds, fId]);
      setStatusMessage(null);
    }
  };

  const addManualFriend = () => {
    const trimmed = manualFriendInput.trim();
    if (!trimmed) return;

    if (trimmed === hostUserId) {
      setStatusMessage({ type: "error", text: "You cannot add yourself as a friend." });
      return;
    }
    if (selectedFriendIds.includes(trimmed)) {
      setStatusMessage({ type: "error", text: "Friend ID already selected." });
      return;
    }
    if (selectedFriendIds.length >= 3) {
      setStatusMessage({ type: "error", text: "Maximum 3 friends allowed per split bill." });
      return;
    }

    setSelectedFriendIds([...selectedFriendIds, trimmed]);
    setManualFriendInput("");
    setStatusMessage(null);
  };

  const removeFriend = (idToRemove) => {
    setSelectedFriendIds(selectedFriendIds.filter((id) => id !== idToRemove));
    const updatedMap = { ...customSharesMap };
    delete updatedMap[idToRemove];
    setCustomSharesMap(updatedMap);
  };

  const handleCustomShareChange = (userId, value) => {
    setCustomSharesMap((prev) => ({
      ...prev,
      [userId]: value,
    }));
  };

  const numericTotal = Number(totalAmount) || 0;
  const participantCount = selectedFriendIds.length + 1;
  const equalPerPerson = numericTotal > 0 ? (numericTotal / participantCount).toFixed(2) : 0;

  const allParticipantIds = hostUserId ? [hostUserId, ...selectedFriendIds] : [...selectedFriendIds];
  const totalCustomSum = allParticipantIds.reduce((sum, id) => {
    return sum + (Number(customSharesMap[id]) || 0);
  }, 0);

  const handleCreateSplit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!receiverAccount.trim()) {
      setStatusMessage({ type: "error", text: "Receiver Account ID is required." });
      return;
    }

    if (selectedFriendIds.length === 0) {
      setStatusMessage({ type: "error", text: "Select at least one friend to split with." });
      return;
    }

    if (!hostUserId) {
      setStatusMessage({ type: "error", text: "Host User ID is missing. Ensure you are logged in." });
      return;
    }

    let payload = {
      receiverAccount: receiverAccount.trim(),
      totalAmount: numericTotal,
      description: description.trim(),
      splitType,
      friendIds: selectedFriendIds,
    };

    if (splitType === "CUSTOM") {
      const customShares = allParticipantIds.map((uid) => ({
        userId: uid,
        share: Math.floor(Number(customSharesMap[uid]) || 0),
      }));

      if (totalCustomSum !== numericTotal) {
        setStatusMessage({
          type: "error",
          text: `Custom shares sum (₹${totalCustomSum}) must equal Total Amount (₹${numericTotal}).`,
        });
        return;
      }

      payload.customShares = customShares;
    }

    setLoading(true);

    try {
      await api.post("/split-bills", payload);
      
      // Redirect to the my-bills page after a successful request
      navigate("/my-bills"); // Adjust this route path if your app uses a different URL structure
      
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to create split bill.",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Split Bill</h1>
        <p className="text-slate-400 text-sm mt-1">
          Divide payments equally or with custom amounts backed by escrow safety.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl mb-6 border text-sm font-medium ${
            statusMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      <form onSubmit={handleCreateSplit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        {/* Receiver Account & Description */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Receiver Account ID *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 6a77120d7ea495a05e56f750"
              value={receiverAccount}
              onChange={(e) => setReceiverAccount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Description / Title
            </label>
            <input
              type="text"
              placeholder="Friday Dinner, Rent, Tickets..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Total Amount & Split Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Total Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="1200"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">
              Split Type
            </label>
            <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setSplitType("EQUAL")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  splitType === "EQUAL" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                EQUAL
              </button>
              <button
                type="button"
                onClick={() => setSplitType("CUSTOM")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
                  splitType === "CUSTOM" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                CUSTOM
              </button>
            </div>
          </div>
        </div>

        {/* Fetch & Display Friends Selection Grid */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase">
              Select Friends (Max 3)
            </label>
            <span className="text-xs text-slate-400 font-mono">
              Selected: {selectedFriendIds.length}/3
            </span>
          </div>

          {fetchingFriends ? (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 text-center animate-pulse">
              Loading friends...
            </div>
          ) : friendsList.length === 0 ? (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-500 text-center">
              No friends found in your list.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {friendsList.map((item, idx) => {
                const friendObj = item.friend || item;
                const fId = friendObj._id || friendObj.userId || friendObj.accountId || `friend-${idx}`;
                const isSelected = selectedFriendIds.includes(fId);

                return (
                  <div
                    key={fId}
                    onClick={() => toggleSelectFriend(friendObj)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-blue-600/10 border-blue-500 text-white"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="truncate">
                      <p className="text-sm font-semibold truncate text-slate-200">
                        {friendObj.name || friendObj.username || "Friend"}
                      </p>
                      <p className="text-xs font-mono text-slate-500 truncate">{fId}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Optional Manual Friend ID Entry */}
        <div className="pt-2 border-t border-slate-800/60">
          <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">
            Or Add Friend by User ID Manually
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Friend User ID"
              value={manualFriendInput}
              onChange={(e) => setManualFriendInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={addManualFriend}
              disabled={selectedFriendIds.length >= 3}
              className="px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium rounded-xl transition text-xs"
            >
              Add ID
            </button>
          </div>
        </div>

        {/* Selected Friends Badges */}
        {selectedFriendIds.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">Selected Friend IDs:</p>
            <div className="flex flex-wrap gap-2">
              {selectedFriendIds.map((id) => (
                <span
                  key={id}
                  className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 text-blue-400"
                >
                  {id}
                  <button
                    type="button"
                    onClick={() => removeFriend(id)}
                    className="text-rose-400 hover:text-rose-300 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOM Share Allocation Inputs */}
        {splitType === "CUSTOM" && selectedFriendIds.length > 0 && (
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-semibold text-slate-300">Custom Share Breakdown</h4>
              <span
                className={`text-xs font-mono font-bold ${
                  totalCustomSum === numericTotal ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                Allocated: ₹{totalCustomSum} / ₹{numericTotal}
              </span>
            </div>

            {/* Host Share */}
            <div className="flex items-center justify-between gap-4 bg-slate-900 p-3 rounded-lg">
              <span className="text-xs text-slate-300 font-mono">You (Host: {hostUserId || "Me"})</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">₹</span>
                <input
                  type="number"
                  placeholder="0"
                  value={customSharesMap[hostUserId] || ""}
                  onChange={(e) => handleCustomShareChange(hostUserId, e.target.value)}
                  className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-right font-mono text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Friends Shares */}
            {selectedFriendIds.map((fid) => (
              <div key={fid} className="flex items-center justify-between gap-4 bg-slate-900 p-3 rounded-lg">
                <span className="text-xs text-slate-300 font-mono">Friend: {fid}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">₹</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={customSharesMap[fid] || ""}
                    onChange={(e) => handleCustomShareChange(fid, e.target.value)}
                    className="w-28 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-right font-mono text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EQUAL Share Summary Preview */}
        {splitType === "EQUAL" && selectedFriendIds.length > 0 && numericTotal > 0 && (
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs text-slate-400 flex justify-between items-center">
            <span>
              Splitting ₹{numericTotal} equally among {participantCount} people:
            </span>
            <span className="text-emerald-400 font-bold font-mono text-sm">
              ~₹{equalPerPerson} / person
            </span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || selectedFriendIds.length === 0}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 font-semibold text-sm rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
        >
          {loading ? "Creating Split Bill..." : "Initiate Split Bill"}
        </button>
      </form>
    </div>
  );
}