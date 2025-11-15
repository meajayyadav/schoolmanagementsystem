// src/routes/timetableRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createTimetable,
  getTimetableByClass,
  getAllTimetables,
  getTimetableById,
  updateTimetable,
  deleteTimetable,
  getTimetableByFilter
} = require('../controllers/timetableController');

// Super admin: get all timetables
router.get('/', requireAuthMiddleware, getAllTimetables);

// Get timetable by filter criteria
router.get('/filter', requireAuthMiddleware, getTimetableByFilter);

// Get single timetable entry by ID
router.get('/:id', requireAuthMiddleware, getTimetableById);

// School-specific routes
router.get('/class/:class_id', requireAuthMiddleware, getTimetableByClass);
router.post('/', requireAuthMiddleware, createTimetable);
router.put('/:id', requireAuthMiddleware, updateTimetable);
router.delete('/:id', requireAuthMiddleware, deleteTimetable);

module.exports = router;