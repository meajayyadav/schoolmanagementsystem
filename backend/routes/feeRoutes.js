// src/routes/feeRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createFee,
  getAllFees,
  getFeesByStudent,
  payFee,
  updateFeePayment,
  deleteFee,
  getFeeStatistics,
  getFeeTypes
} = require('../controllers/feeController');

// ➕ Create new fee record
router.post('/', requireAuthMiddleware, createFee);

// 🌍 Get all fees with advanced filtering
router.get('/', requireAuthMiddleware, getAllFees);

// 📊 Get fee statistics and analytics
router.get('/statistics', requireAuthMiddleware, getFeeStatistics);

// 🏷️ Get fee types configuration
router.get('/types', requireAuthMiddleware, getFeeTypes);

// 👨‍🎓 Get fees for a specific student
router.get('/student/:student_id', requireAuthMiddleware, getFeesByStudent);

// 💳 Mark a fee as paid
router.patch('/:fee_id/pay', requireAuthMiddleware, payFee);

// 🔄 Update fee payment status (more flexible than pay endpoint)
router.patch('/:fee_id/payment', requireAuthMiddleware, updateFeePayment);

// ❌ Delete fee (super admin only)
router.delete('/:school_id/:fee_id', requireAuthMiddleware, deleteFee);

module.exports = router;