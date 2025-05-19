const express = require("express");
const { searchPostController } = require("../contollers/search");
const { authenticateRequest } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateRequest);

router.get("/posts", searchPostController);

module.exports = router;