// src/routes/gradeRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const { addGrade, listGrades, getGradesByStudent } = require('../controllers/gradeController');

// Add a grade
router.post('/', requireAuthMiddleware, addGrade);

// List grades (filters & pagination)
router.get('/', requireAuthMiddleware, listGrades);

// Get grades for a student (alternative)
router.get('/student/:student_id', requireAuthMiddleware, getGradesByStudent);

module.exports = router;
