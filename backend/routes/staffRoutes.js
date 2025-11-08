// src/routes/staffRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const { createStaff, getAllStaff } = require('../controllers/staffController');

// ➕ Add staff member
router.post('/', requireAuthMiddleware, createStaff);

// 📋 Get all staff
router.get('/', requireAuthMiddleware, getAllStaff);

module.exports = router;
