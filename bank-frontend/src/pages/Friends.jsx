import { useState, useEffect } from "react";
import api from "../services/api";

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [friendId, setFriendId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await api.get("/friends");
      setFriends(res.data?.friends || res.data || []);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    if (!friendId.trim()) return;

    setMessage({ type: "", text: "" });
    setSubmitting(true);

    try {
      await api.post("/friends", { friendId: friendId.trim() });
      setMessage({ type: "success", text: "Friend added successfully!" });
      setFriendId("");
      fetchFriends();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to add friend. Please verify User ID.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveFriend = async (targetFriendId) => {
    if (!window.confirm("Are you sure you want to remove this friend?")) return;

    setMessage({ type: "", text: "" });
    setDeletingId(targetFriendId);

    try {
      await api.delete(`/friends/${targetFriendId}`);
      setMessage({ type: "success", text: "Friend removed successfully." });
      fetchFriends();
    } catch (err) {
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to remove friend.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white">Friends</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage your connections and add new friends to your network.
        </p>
      </div>

      {/* Add New Friend Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-base font-semibold text-white mb-4">Add New Friend</h2>

        {message.text && (
          <div
            className={`p-3 rounded-lg text-xs mb-4 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleAddFriend} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            placeholder="Enter Friend's User ID or Email"
            value={friendId}
            onChange={(e) => setFriendId(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
          />
          <button
            type="submit"
            disabled={submitting || !friendId.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-sm transition disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {submitting ? "Adding..." : "Add Friend"}
          </button>
        </form>
      </div>

      {/* Friends List Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-base font-semibold text-white mb-4">Your Friends List</h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-800 rounded-lg">
            <p className="text-slate-400 text-sm">No friends added yet.</p>
            <p className="text-slate-600 text-xs mt-1">Use the field above to send a request or connection ID.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((item, idx) => {
              const friend = item.friend || item;
              const targetId = friend._id || item._id;

              return (
                <div
                  key={targetId || idx}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                      {friend.name ? friend.name[0].toUpperCase() : "F"}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-medium text-white truncate">{friend.name || "Friend User"}</p>
                      <p className="text-xs text-slate-400 truncate">{friend.email || `ID: ${targetId}`}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRemoveFriend(targetId)}
                      disabled={deletingId === targetId}
                      title="Remove Friend"
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition text-xs font-medium cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === targetId ? "..." : "Remove"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}