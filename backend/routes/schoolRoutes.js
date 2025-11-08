const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createSchool,
  getAllSchools,
  getSchoolById,
  updateSchool,
  deleteSchool
} = require('../controllers/schoolController');

router.post('/', requireAuthMiddleware, createSchool);
router.get('/', requireAuthMiddleware, getAllSchools);
router.get('/:school_id', requireAuthMiddleware, getSchoolById);
router.put('/:school_id', requireAuthMiddleware, updateSchool);
router.delete('/:school_id', requireAuthMiddleware, deleteSchool);


module.exports = router;
