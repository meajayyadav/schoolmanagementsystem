// src/routes/libraryRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');
const {
  addBook,
  getBooks,
  issueBook,
  getStudentLoans,
} = require('../controllers/libraryController');

// 📚 Add a new book
router.post('/books', requireAuthMiddleware, addBook);

// 📖 Get all books
router.get('/books', requireAuthMiddleware, getBooks);

// 🧾 Issue a book
router.post('/loans', requireAuthMiddleware, issueBook);

// 👩‍🎓 Get a student's loans
router.get('/loans/student/:student_id', requireAuthMiddleware, getStudentLoans);

module.exports = router;
