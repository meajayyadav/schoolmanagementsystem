const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getProfile, logoutUser } = require('../controllers/authController');
const { requireAuthMiddleware } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser); // ✅ added here
router.get('/me', requireAuthMiddleware, getProfile);

module.exports = router;
