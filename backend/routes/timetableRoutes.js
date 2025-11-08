// src/routes/timetableRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createTimetable,
  getTimetableByClass,
  getAllTimetables,
} = require('../controllers/timetableController');

// Super admin: get all timetables
router.get('/', requireAuthMiddleware, getAllTimetables);

// School-specific
router.get('/class/:class_id', requireAuthMiddleware, getTimetableByClass);
router.post('/', requireAuthMiddleware, createTimetable);

module.exports = router;
