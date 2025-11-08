// controllers/subjectController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

async function getSubjects(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();
    let db = centralDb;

    // 🏫 Use the correct school DB for non-super admins
    if (user.role !== 'super_admin') {
      const school = await centralDb.collection('schools').findOne({ id: user.school_id });
      if (!school) return res.status(404).json({ detail: 'School not found' });
      db = getSchoolDbByName(school.db_name);
    }

    const subjects = await db.collection('subjects').find({}).toArray();
    res.json(subjects);
  } catch (err) {
    console.error('getSubjects error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

async function createSubject(req, res) {
  try {
    const user = req.user;
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ detail: 'Name and code are required' });

    const centralDb = getCentralDb();
    let db = centralDb;

    if (user.role !== 'super_admin') {
      const school = await centralDb.collection('schools').findOne({ id: user.school_id });
      if (!school) return res.status(404).json({ detail: 'School not found' });
      db = getSchoolDbByName(school.db_name);
    }

    const existing = await db.collection('subjects').findOne({ code });
    if (existing) return res.status(400).json({ detail: 'Subject code already exists' });

    const subject = {
      id: uuidv4(),
      name,
      code,
      description: description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await db.collection('subjects').insertOne(subject);
    res.json({ detail: 'Subject created successfully', subject });
  } catch (err) {
    console.error('createSubject error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

async function updateSubject(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const { name, code, description } = req.body;

    const centralDb = getCentralDb();
    let db = centralDb;

    if (user.role !== 'super_admin') {
      const school = await centralDb.collection('schools').findOne({ id: user.school_id });
      if (!school) return res.status(404).json({ detail: 'School not found' });
      db = getSchoolDbByName(school.db_name);
    }

    const result = await db.collection('subjects').updateOne(
      { id },
      { $set: { name, code, description, updated_at: new Date().toISOString() } }
    );

    if (!result.matchedCount) return res.status(404).json({ detail: 'Subject not found' });
    res.json({ detail: 'Subject updated successfully' });
  } catch (err) {
    console.error('updateSubject error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

async function deleteSubject(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    const centralDb = getCentralDb();
    let db = centralDb;

    if (user.role !== 'super_admin') {
      const school = await centralDb.collection('schools').findOne({ id: user.school_id });
      if (!school) return res.status(404).json({ detail: 'School not found' });
      db = getSchoolDbByName(school.db_name);
    }

    const result = await db.collection('subjects').deleteOne({ id });
    if (!result.deletedCount) return res.status(404).json({ detail: 'Subject not found' });

    res.json({ detail: 'Subject deleted successfully' });
  } catch (err) {
    console.error('deleteSubject error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
