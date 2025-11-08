const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  toggleUserActive,
  uploadProfilePicture,
  updateUserProfile,
  resetPassword,
} = require('../controllers/userController');

// ✅ Create + Get
router.post('/', requireAuthMiddleware, createUser);
router.get('/', requireAuthMiddleware, getUsers);

// ✅ Update + Toggle
router.put('/:id', requireAuthMiddleware, updateUser); // for admin updates
// userRoutes.js
router.put('/:id/toggle', requireAuthMiddleware, toggleUserActive);


// ✅ Self update
router.put('/:id/profile', requireAuthMiddleware, updateUserProfile);

// ✅ Upload picture
router.post(
  '/:id/upload-picture',
  requireAuthMiddleware,
  upload.single('picture'),
  uploadProfilePicture
);

// ✅ Reset password
// router.post('/:id/reset-password', requireAuthMiddleware, resetPassword);
router.put('/:id/reset-password', requireAuthMiddleware, resetPassword);

// ✅ Delete user
router.delete('/:id', requireAuthMiddleware, deleteUser);

module.exports = router;
