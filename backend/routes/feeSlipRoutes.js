const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  getFeeSlips,
  getFeeSlipById,
  downloadFeeSlip,
  getFeeSlipStats
} = require('../controllers/feeSlipController');

// 📋 Get all paid fee slips with filters
router.get('/slips', requireAuthMiddleware, getFeeSlips);

// 📊 Get fee slip statistics
router.get('/slips/stats', requireAuthMiddleware, getFeeSlipStats);

// 👁️ Get single fee slip by ID
router.get('/slips/:id', requireAuthMiddleware, getFeeSlipById);

// 📥 Download fee slip as PDF
router.get('/slips/:id/download', requireAuthMiddleware, downloadFeeSlip);

module.exports = router;