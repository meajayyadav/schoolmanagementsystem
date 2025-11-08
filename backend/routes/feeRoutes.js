const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createFee,
  getAllFees,
  getFeesByStudent,
  payFee,
  deleteFee,
} = require('../controllers/feeController');

// ➕ Create new fee record
router.post('/', requireAuthMiddleware, createFee);

// 🌍 Super Admin: Get all fees across schools
router.get('/', requireAuthMiddleware, getAllFees);

// 💳 Get fees for a specific student
router.get('/student/:student_id', requireAuthMiddleware, getFeesByStudent);

// ✅ Mark a fee as paid
router.patch('/:fee_id/pay', requireAuthMiddleware, payFee);

// ❌ Delete fee (super admin only)
router.delete('/:school_id/:fee_id', requireAuthMiddleware, deleteFee);

module.exports = router;
