// src/routes/libraryRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuthMiddleware } = require('../middleware/auth');

const {
  addBook,
  getBooks,
  getBookById,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  getAllLoans,
  getStudentLoans,
} = require('../controllers/libraryController');

// BOOKS
router.post('/books', requireAuthMiddleware, addBook);
router.get('/books', requireAuthMiddleware, getBooks);
router.get('/books/:id', requireAuthMiddleware, getBookById);
router.put('/books/:id', requireAuthMiddleware, updateBook);
router.delete('/books/:id', requireAuthMiddleware, deleteBook);

// LOANS
router.post('/loans', requireAuthMiddleware, issueBook);
router.put('/loans/:id/return', requireAuthMiddleware, returnBook);
router.get('/loans', requireAuthMiddleware, getAllLoans);
router.get('/loans/student/:student_id', requireAuthMiddleware, getStudentLoans);

module.exports = router;
