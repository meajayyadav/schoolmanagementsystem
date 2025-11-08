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
} = require('../controllers/studentController');

// /api/students
router.post('/', requireAuthMiddleware, upload.single('picture'), createStudent);
router.put('/:id', requireAuthMiddleware, upload.single('picture'), updateStudent);
router.delete('/:id', requireAuthMiddleware, deleteStudent);
router.get('/', requireAuthMiddleware, listStudents);
router.get('/:id', requireAuthMiddleware, getStudent);

module.exports = router;
