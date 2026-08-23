
async function sendNotification(userId, message, meta = {}) {
  
  console.log(`[notify] -> user:${userId} :: ${message}`, meta);
}

module.exports = { sendNotification };
