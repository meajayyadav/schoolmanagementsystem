// src/routes/examRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
} = require('../controllers/examController');

// ➕ Create exam
router.post('/', requireAuthMiddleware, createExam);

// 📋 Get all exams
router.get('/', requireAuthMiddleware, getExams);

// 🔍 Get single exam by ID
router.get('/:exam_id', requireAuthMiddleware, getExamById);

// ✏️ Update exam
router.put('/:exam_id', requireAuthMiddleware, updateExam);

// ❌ Delete exam
router.delete('/:exam_id', requireAuthMiddleware, deleteExam);

module.exports = router;