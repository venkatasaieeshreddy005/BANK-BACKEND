/**
 * ADAPT NOTE: replace the body of this function with your real
 * notification write (push/socket/DB row) once that exists. Every
 * call site in this feature already passes the right shape of data,
 * so you only need to change this one file.
 */
async function sendNotification(userId, message, meta = {}) {
  // Placeholder — logs for now so the split-bill flow is testable
  // end-to-end before the notification system exists.
  console.log(`[notify] -> user:${userId} :: ${message}`, meta);
}

module.exports = { sendNotification };
