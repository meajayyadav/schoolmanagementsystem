// src/routes/classRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createClass,
  listClasses,
  getClass,
  updateClass,
  deleteClass,
  toggleClassStatus,
  getClassesBySchool
} = require('../controllers/classController');

// CRUD
router.post('/', requireAuthMiddleware, createClass);
router.get('/', requireAuthMiddleware, listClasses);
router.get('/:class_id', requireAuthMiddleware, getClass);
router.put('/:class_id', requireAuthMiddleware, updateClass);
router.delete('/:class_id', requireAuthMiddleware, deleteClass);
router.put('/:class_id/toggle', requireAuthMiddleware, toggleClassStatus);
router.get('/school/:school_id', requireAuthMiddleware, getClassesBySchool);

module.exports = router;
