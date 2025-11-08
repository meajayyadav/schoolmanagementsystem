// src/routes/examRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createExam,
  getExams,
  getExamById,
  deleteExam,
} = require('../controllers/examController');

// ➕ Create exam
router.post('/', requireAuthMiddleware, createExam);

// 📋 Get all exams
router.get('/', requireAuthMiddleware, getExams);

// 🔍 Get single exam by ID
router.get('/:exam_id', requireAuthMiddleware, getExamById);

// ❌ Delete exam
router.delete('/:exam_id', requireAuthMiddleware, deleteExam);

module.exports = router;
