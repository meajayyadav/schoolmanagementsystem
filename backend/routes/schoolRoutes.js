// routes/schoolRoutes.js
const express = require('express');
const router = express.Router();

const { requireAuthMiddleware, requireSuperAdmin } = require('../middleware/auth');

const {
  createSchool,
  getAllSchools,
  getSchoolById,
  getSchoolBySubdomain,
  updateSchool,
  deleteSchool
} = require('../controllers/schoolController');

// Public endpoint to get school info by subdomain (for login page)
router.get('/by-subdomain/:subdomain', getSchoolBySubdomain);

// Super admin only can manage schools
router.post('/', requireAuthMiddleware, requireSuperAdmin, createSchool);
router.get('/', requireAuthMiddleware, requireSuperAdmin, getAllSchools);
router.get('/:school_id', requireAuthMiddleware, requireSuperAdmin, getSchoolById);
router.put('/:school_id', requireAuthMiddleware, requireSuperAdmin, updateSchool);
router.delete('/:school_id', requireAuthMiddleware, requireSuperAdmin, deleteSchool);

module.exports = router;
