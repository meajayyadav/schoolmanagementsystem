// In your auth routes file (likely routes/auth.js)
const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getProfile, 
  logoutUser, 
  refreshToken, 
  checkSession 
} = require('../controllers/authController');
const { requireAuthMiddleware } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/refresh', refreshToken); // New route
router.get('/check-session', checkSession); // New route
router.get('/me', requireAuthMiddleware, getProfile);

module.exports = router;
