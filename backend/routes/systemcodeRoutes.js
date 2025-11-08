const express = require("express");
const router = express.Router();
const { requireAuthMiddleware } = require("../middleware/auth");
const {
  createSystemCode,
  getSystemCodes,
  updateSystemCode,
  deleteSystemCode,
} = require("../controllers/systemcodeController");

// CRUD Routes
router.post("/", requireAuthMiddleware, createSystemCode);
router.get("/", requireAuthMiddleware, getSystemCodes);
router.put("/:id", requireAuthMiddleware, updateSystemCode);
router.delete("/:id", requireAuthMiddleware, deleteSystemCode);

module.exports = router;
