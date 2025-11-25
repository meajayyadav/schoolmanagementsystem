// src/routes/examMarksRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  getFilters,
  getStudentsForMarks,
  getMarkDistribution,
  saveMarks,
  saveBulkMarks,
  getExistingMarks,
  checkExamStatus
} = require('../controllers/examMarksController');

// Get filter options
router.get('/filters', requireAuthMiddleware, getFilters);

// Get students for marks entry
router.get('/students', requireAuthMiddleware, getStudentsForMarks);

// Get mark distribution
router.get('/distribution', requireAuthMiddleware, getMarkDistribution);

// Get existing marks
router.get('/', requireAuthMiddleware, getExistingMarks);

// Check exam status - ADD THIS ROUTE PROPERLY
router.get('/check-status', requireAuthMiddleware, checkExamStatus);

// Save individual marks
router.post('/', requireAuthMiddleware, saveMarks);

// Save bulk marks
router.post('/bulk', requireAuthMiddleware, saveBulkMarks);

module.exports = router;