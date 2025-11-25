const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  getReportsData,
  getReportTemplates,
  exportReport,
  scheduleReport
} = require('../controllers/reportController');

// 📊 Get reports data with advanced filtering
router.get('/', requireAuthMiddleware, getReportsData);

// 📋 Get available report templates and configurations
router.get('/templates', requireAuthMiddleware, getReportTemplates);

// 💾 Export report in various formats (PDF, Excel, CSV)
router.post('/export', requireAuthMiddleware, exportReport);

// ⏰ Schedule automated report generation
router.post('/schedule', requireAuthMiddleware, scheduleReport);

module.exports = router;