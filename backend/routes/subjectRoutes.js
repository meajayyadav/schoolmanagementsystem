// routes/subjectRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');

router.get('/', requireAuthMiddleware, getSubjects);
router.post('/', requireAuthMiddleware, createSubject);
router.put('/:id', requireAuthMiddleware, updateSubject);
router.delete('/:id', requireAuthMiddleware, deleteSubject);

module.exports = router;
