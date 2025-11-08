// src/routes/announcementRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
} = require('../controllers/announcementController');

router.post('/', requireAuthMiddleware, createAnnouncement);
router.get('/', requireAuthMiddleware, listAnnouncements);
router.get('/:id', requireAuthMiddleware, getAnnouncement);

module.exports = router;
