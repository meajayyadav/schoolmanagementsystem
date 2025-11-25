// routes/bulkUpload.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  downloadTemplate,
  bulkUploadStudents,
} = require('../controllers/bulkUploadController');

// /api/bulk-upload
router.get('/students/template', requireAuthMiddleware, downloadTemplate);
router.post('/students', requireAuthMiddleware, upload.single('file'), bulkUploadStudents);

module.exports = router;