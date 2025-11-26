const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  promoteStudents,
  getStudentAcademicHistory,
  getPromotionBatches,
  bulkUpdateStudentClass
} = require('../controllers/studentPromotionController');

// 🎓 Promote students to next class/academic year
router.post('/promote', requireAuthMiddleware, promoteStudents);

// 📚 Get student academic history
router.get('/:id/academic-history', requireAuthMiddleware, getStudentAcademicHistory);

// 📋 Get promotion batches history
router.get('/promotion-batches', requireAuthMiddleware, getPromotionBatches);

// 🔄 Bulk update student class (manual adjustments)
router.post('/bulk-update-class', requireAuthMiddleware, bulkUpdateStudentClass);

module.exports = router;