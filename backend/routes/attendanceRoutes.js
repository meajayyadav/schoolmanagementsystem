// src/routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const { markAttendance, listAttendance } = require('../controllers/attendanceController');

// ➕ Mark attendance
router.post('/', requireAuthMiddleware, markAttendance);

// 📋 List attendance (with filters, pagination)
router.get('/', requireAuthMiddleware, listAttendance);

module.exports = router;
