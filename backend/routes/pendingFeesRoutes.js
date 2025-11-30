const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  getPendingFeesByClass,
  getPendingFeesByMonth,
  getAllPendingFees,
  getClasses,
  sendWhatsAppReminder,
  generateUPIQRCode,
  getUPIInfo
} = require('../controllers/pendingFeesController');

// Get all pending fees (single list)
router.get('/all', requireAuthMiddleware, getAllPendingFees);

// Get classes for filter dropdown
router.get('/classes', requireAuthMiddleware, getClasses);

// Get pending fees by class
router.get('/by-class', requireAuthMiddleware, getPendingFeesByClass);

// Get pending fees by month
router.get('/by-month', requireAuthMiddleware, getPendingFeesByMonth);

// Send WhatsApp reminder
router.post('/send-reminder', requireAuthMiddleware, sendWhatsAppReminder);

// Generate UPI QR code
router.get('/qr-code', requireAuthMiddleware, generateUPIQRCode);

// Get UPI information
router.get('/upi-info', requireAuthMiddleware, getUPIInfo);

module.exports = router;