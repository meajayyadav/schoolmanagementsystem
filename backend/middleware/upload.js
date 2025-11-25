// backend/middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

// File filter for different upload types
const fileFilter = (req, file, cb) => {
  // For student picture uploads (existing functionality)
  if (req.route.path === '/' || req.route.path === '/:id') {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for student pictures'), false);
    }
  }
  // For bulk upload (new functionality)
  else if (req.route.path === '/students') {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/csv', // .csv
      'application/vnd.ms-excel' // .xls
    ];
    
    const allowedExtensions = ['.xlsx', '.csv', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel (.xlsx, .xls) and CSV files are allowed for bulk upload'), false);
    }
  }
  // Default allow for other routes
  else {
    cb(null, true);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for all files
  }
});

// Error handling middleware for multer
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ detail: 'File too large. Maximum size is 10MB' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ detail: 'Too many files or unexpected field' });
    }
  } else if (err) {
    return res.status(400).json({ detail: err.message });
  }
  next();
};

module.exports = upload;
module.exports.handleUploadErrors = handleUploadErrors;