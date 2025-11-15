// src/controllers/libraryController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Utility: Resolve school_id based on role
 */
function resolveSchoolId(req) {
  const user = req.user;

  // Super Admin → must send school_id in query
  if (user.role === 'super_admin') {
    return req.query.school_id || null;
  }

  // School Admin / Student → use their own school
  return user.school_id;
}

/**
 * Utility: Get school DB by school_id (role-aware)
 */
async function getSchoolDbFromRequest(req) {
  const centralDb = getCentralDb();
  const school_id = resolveSchoolId(req);

  if (!school_id) return { error: 'school_id is required' };

  const school = await centralDb
    .collection('schools')
    .findOne({ id: school_id }, { projection: { _id: 0 } });

  if (!school) return { error: 'School not found' };

  return { schoolDb: getSchoolDbByName(school.db_name), school_id };
}

/**
 * Add a new book
 */
async function addBook(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const { schoolDb, school_id, error } = await getSchoolDbFromRequest(req);
    if (error) return res.status(404).json({ detail: error });

    const payload = {
      ...req.body,
      id: req.body.id || uuidv4(),
      school_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await schoolDb.collection('library_books').insertOne(payload);
    return res.status(201).json(payload);
  } catch (err) {
    console.error('addBook error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get all books
 */
async function getBooks(req, res) {
  try {
    const { schoolDb, school_id, error } = await getSchoolDbFromRequest(req);
    if (error) return res.status(404).json({ detail: error });

    const books = await schoolDb
      .collection('library_books')
      .find({ school_id }, { projection: { _id: 0 } })
      .toArray();

    return res.json(books);
  } catch (err) {
    console.error('getBooks error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get a specific book
 */
async function getBookById(req, res) {
  try {
    const { schoolDb, school_id, error } = await getSchoolDbFromRequest(req);
    if (error) return res.status(404).json({ detail: error });

    const book = await schoolDb
      .collection('library_books')
      .findOne({ id: req.params.id, school_id }, { projection: { _id: 0 } });

    if (!book) return res.status(404).json({ detail: 'Book not found' });

    return res.json(book);
  } catch (err) {
    console.error('getBookById error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Update a book
 */
async function updateBook(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const { schoolDb, school_id, error } = await getSchoolDbFromRequest(req);
    if (error) return res.status(404).json({ detail: error });

    const existing = await schoolDb
      .collection('library_books')
      .findOne({ id: req.params.id, school_id });

    if (!existing) return res.status(404).json({ detail: 'Book not found' });

    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString(),
    };

    delete updateData.id;
    delete updateData.school_id;
    delete updateData.created_at;

    await schoolDb.collection('library_books')
      .updateOne({ id: req.params.id, school_id }, { $set: updateData });

    const updatedBook = await schoolDb.collection('library_books')
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    return res.json(updatedBook);
  } catch (err) {
    console.error('updateBook error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Delete a book
 */
async function deleteBook(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const { schoolDb, school_id, error } = await getSchoolDbFromRequest(req);
    if (error) return res.status(404).json({ detail: error });

    const activeLoans = await schoolDb
      .collection('library_loans')
      .find({ book_id: req.params.id, school_id, status: 'active' })
      .toArray();

    if (activeLoans.length > 0) {
      return res.status(400).json({ detail: "Cannot delete book with active loans" });
    }

    const result = await schoolDb.collection('library_books')
      .deleteOne({ id: req.params.id, school_id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Book not found' });
    }

    return res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    console.error('deleteBook error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Issue a book
 */
async function issueBook(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const { schoolDb, school_id, error } = await getSchoolDbFromRequest(req);
    if (error) return res.status(404).json({ detail: error });

    const book = await schoolDb.collection('library_books')
      .findOne({ id: req.body.book_id, school_id });

    if (!book) return res.status(404).json({ detail: 'Book not found' });
    if (book.available <= 0)
      return res.status(400).json({ detail: 'Book not available' });

    const payload = {
      ...req.body,
      id: uuidv4(),
      school_id,
      issued_by: user.id,
      issued_date: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
    };

    await schoolDb.collection('library_books')
      .updateOne({ id: req.body.book_id, school_id }, { $inc: { available: -1 } });

    await schoolDb.collection('library_loans').insertOne(payload);

    return res.status(201).json(payload);
  } catch (err) {
    console.error('issueBook error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Return a book
 */
async function returnBook(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin' && user.role !== 'super_admin' && user.role !== 'student') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const { schoolDb, school_id, error } = await getSchoolDbFromRequest(req);
    if (error) return res.status(404).json({ detail: error });

    const loan = await schoolDb.collection('library_loans')
      .findOne({ id: req.params.id, school_id });

    if (!loan) return res.status(404).json({ detail: 'Loan not found' });

    if (user.role === 'student' && loan.student_id !== user.id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    if (loan.status === 'returned') {
      return res.status(400).json({ detail: 'Already returned' });
    }

    await schoolDb.collection('library_loans')
      .updateOne({ id: req.params.id }, {
        $set: {
          status: 'returned',
          returned_date: new Date().toISOString(),
          returned_by: user.id
        }
      });

    await schoolDb.collection('library_books')
      .updateOne({ id: loan.book_id, school_id }, { $inc: { available: 1 } });

    return res.json({ message: 'Book returned successfully' });
  } catch (err) {
    console.error('returnBook error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get all loans
 */
async function getAllLoans(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const { schoolDb, school_id, error } = await getSchoolDbFromRequest(req);
    if (error) return res.status(404).json({ detail: error });

    const loans = await schoolDb.collection('library_loans')
      .find({ school_id }, { projection: { _id: 0 } })
      .toArray();

    return res.json(loans);
  } catch (err) {
    console.error('getAllLoans error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get student loans
 */
async function getStudentLoans(req, res) {
  try {
    const user = req.user;
    const { student_id } = req.params;

    const { schoolDb, school_id, error } = await getSchoolDbFromRequest(req);
    if (error) return res.status(404).json({ detail: error });

    if (user.role === 'student' && user.id !== student_id) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const loans = await schoolDb.collection('library_loans')
      .find({ school_id, student_id }, { projection: { _id: 0 } })
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
  getBookById,
  updateBook,
  deleteBook,
  issueBook,
  returnBook,
  getAllLoans,
  getStudentLoans,
};
