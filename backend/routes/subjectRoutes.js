// routes/subjectRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectsBySchool
} = require('../controllers/subjectController');

router.get('/', requireAuthMiddleware, getSubjects);
router.post('/', requireAuthMiddleware, createSubject);
router.put('/:id', requireAuthMiddleware, updateSubject);
router.delete('/:id', requireAuthMiddleware, deleteSubject);
router.get('/school/:school_id', requireAuthMiddleware, getSubjectsBySchool);

module.exports = router;
