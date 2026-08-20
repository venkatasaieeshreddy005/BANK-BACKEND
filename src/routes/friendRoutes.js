const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth.js");



const {
  addFriend,
  listFriends,
  removeFriend,
} = require("../controller/friendController");

router.use(authMiddleware);

router.post("/", addFriend);
router.get("/", listFriends);
router.delete("/:friendId", removeFriend);

module.exports = router;
