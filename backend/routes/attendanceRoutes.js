// src/routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  markAttendance,
  listAttendance,
  getStudentsByClass,
} = require('../controllers/attendanceController');

// ➕ Mark attendance (teacher / school admin)
router.post('/', requireAuthMiddleware, markAttendance);

// 📋 List attendance (filters, pagination, multi-tenant)
router.get('/', requireAuthMiddleware, listAttendance);

// 🧑‍🏫 Get all students of a specific class (for attendance marking)
router.get('/class/:class_id', requireAuthMiddleware, getStudentsByClass);

module.exports = router;
