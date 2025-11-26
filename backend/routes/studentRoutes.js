const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createStudent,
  updateStudent,
  deleteStudent,
  listStudents,
  getStudent,
  getStudentsByClass
} = require('../controllers/studentController');

// Import promotion routes
const promotionRoutes = require('./studentPromotionRoutes');

// Basic student CRUD routes
router.post('/', requireAuthMiddleware, upload.single('picture'), createStudent);
router.put('/:id', requireAuthMiddleware, upload.single('picture'), updateStudent);
router.delete('/:id', requireAuthMiddleware, deleteStudent);
router.get('/', requireAuthMiddleware, listStudents);
router.get('/:id', requireAuthMiddleware, getStudent);
router.get('/class/:classId', requireAuthMiddleware, getStudentsByClass);

// Use promotion routes
router.use('/', promotionRoutes);

module.exports = router;
