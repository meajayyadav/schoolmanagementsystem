// src/routes/announcementRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  createAnnouncement,
  listAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getUnreadCount,
  markAsRead,
  markAllAsRead
} = require('../controllers/announcementController');

router.post('/', requireAuthMiddleware, createAnnouncement);
router.get('/', requireAuthMiddleware, listAnnouncements);
router.get('/unread-count', requireAuthMiddleware, getUnreadCount);
router.get('/:id', requireAuthMiddleware, getAnnouncement);
router.put('/:id', requireAuthMiddleware, updateAnnouncement);   // ✅ Update
router.delete('/:id', requireAuthMiddleware, deleteAnnouncement); // ✅ Delete
router.post('/:id/mark-read', requireAuthMiddleware, markAsRead);
router.post('/mark-all-read', requireAuthMiddleware, markAllAsRead);

module.exports = router;
