// src/routes/reportCardRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  getReportCardFilters,
  getStudentReportCards,
  generatePdfReportCard
} = require('../controllers/reportCardController');

// Get filter options
router.get('/filters', requireAuthMiddleware, getReportCardFilters);

// Get student report cards
router.get('/students', requireAuthMiddleware, getStudentReportCards);

// Generate PDF report cards
router.post('/generate-pdf', requireAuthMiddleware, generatePdfReportCard);

module.exports = router;