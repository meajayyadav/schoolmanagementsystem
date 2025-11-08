// src/routes/reportCardRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createReportCard,
  getStudentReportCards,
} = require('../controllers/reportCardController');

// 📝 Create report card
router.post('/', requireAuthMiddleware, createReportCard);

// 👩‍🎓 Get a student's report cards
router.get('/student/:student_id', requireAuthMiddleware, getStudentReportCards);

module.exports = router;
