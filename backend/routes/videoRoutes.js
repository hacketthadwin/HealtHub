const express = require("express");
const router = express.Router();
const { auth } = require("../middlewares/authMiddleware");
const { getHealthVideos, getHealthTopics } = require("../controller/videoController");

router.get("/videos/health", auth, getHealthVideos);
router.get("/videos/topics", auth, getHealthTopics);

module.exports = router;
