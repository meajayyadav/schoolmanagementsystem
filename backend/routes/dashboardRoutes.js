const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboardController');

router.get('/stats', requireAuthMiddleware, getDashboardStats);


module.exports = router;
