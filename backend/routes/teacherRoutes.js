const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher,
  toggleTeacherStatus,
} = require('../controllers/teacherController');

// CRUD
router.post('/', requireAuthMiddleware, createTeacher);
router.get('/', requireAuthMiddleware, getTeachers);
router.put('/:id', requireAuthMiddleware, updateTeacher);
router.delete('/:id', requireAuthMiddleware, deleteTeacher);

// Toggle Active / Deactive
router.patch('/:id/toggle-status', requireAuthMiddleware, toggleTeacherStatus);

module.exports = router;
