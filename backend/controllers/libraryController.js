// src/controllers/libraryController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Add a new book to the library
 * POST /api/library/books
 */
async function addBook(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'school_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const payload = {
      ...req.body,
      id: req.body.id || uuidv4(),
      created_at: new Date().toISOString(),
    };

    await schoolDb.collection('library_books').insertOne(payload);
    return res.json(payload);
  } catch (err) {
    console.error('addBook error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get all books in the library
 * GET /api/library/books
 */
async function getBooks(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const books = await schoolDb
      .collection('library_books')
      .find({}, { projection: { _id: 0 } })
      .toArray();

    return res.json(books);
  } catch (err) {
    console.error('getBooks error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Issue (loan) a book to a student
 * POST /api/library/loans
 */
async function issueBook(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'school_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const payload = {
      ...req.body,
      id: req.body.id || uuidv4(),
      created_at: new Date().toISOString(),
    };

    // Decrement available count
    await schoolDb
      .collection('library_books')
      .updateOne({ id: payload.book_id }, { $inc: { available: -1 } });

    await schoolDb.collection('library_loans').insertOne(payload);

    return res.json(payload);
  } catch (err) {
    console.error('issueBook error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get all books borrowed by a student
 * GET /api/library/loans/student/:student_id
 */
async function getStudentLoans(req, res) {
  try {
    const user = req.user;
    const { student_id } = req.params;

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: user.school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const loans = await schoolDb
      .collection('library_loans')
      .find({ student_id }, { projection: { _id: 0 } })
      .toArray();

    return res.json(loans);
  } catch (err) {
    console.error('getStudentLoans error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  addBook,
  getBooks,
  issueBook,
  getStudentLoans,
};
