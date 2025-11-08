// src/controllers/schoolController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');
const { hashPassword } = require('../helpers/crypto');
const { makeUser, makeSchool } = require('../utils/models');

function isoPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

const JWT_EXPIRATION_DAYS = parseInt(process.env.JWT_EXPIRATION_DAYS || '7', 10);

/**
 * -------- Create School (Super Admin only) --------
 */
async function createSchool(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super admins can create schools' });
    }

    const data = req.body;
    const centralDb = getCentralDb();

    // check for duplicate code
    const existing = await centralDb.collection('schools').findOne({ code: data.code });
    if (existing) {
      return res.status(400).json({ detail: 'School code already exists' });
    }

    // create DB name for the school
    const db_name = `school_${data.code.toLowerCase()}_db`;

    // create school object
    const schoolObj = makeSchool({
      name: data.name,
      code: data.code,
      admin_email: data.admin_email,
      admin_name: data.admin_name,
      db_name,
      address: data.address || null,
      phone: data.phone || null,
    });

    // insert into central database
    await centralDb.collection('schools').insertOne(schoolObj);

    // create the school DB and admin user
    const schoolDb = getSchoolDbByName(db_name);
    const adminUser = makeUser({
      email: data.admin_email,
      name: data.admin_name,
      role: 'school_admin',
      school_id: schoolObj.id,
      password_hash: hashPassword(data.admin_password),
    });
    await schoolDb.collection('users').insertOne(adminUser);

    return res.json(schoolObj);
  } catch (err) {
    console.error('create school error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * -------- Get All Schools (Super Admin only) --------
 */
async function getAllSchools(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super admins can view all schools' });
    }

    const centralDb = getCentralDb();
    const schools = await centralDb.collection('schools').find({}, { projection: { _id: 0 } }).toArray();
    return res.json(schools);
  } catch (err) {
    console.error('get schools error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * -------- Get Single School (Super Admin or School Admin) --------
 */
async function getSchoolById(req, res) {
  try {
    const user = req.user;
    const sid = req.params.school_id;

    if (user.role !== 'super_admin' && user.school_id !== sid) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: sid }, { projection: { _id: 0 } });

    if (!school) {
      return res.status(404).json({ detail: 'School not found' });
    }

    return res.json(school);
  } catch (err) {
    console.error('get school error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
/**
 * -------- Update School --------
 */
async function updateSchool(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super admins can update schools' });
    }

    const { school_id } = req.params;
    const updates = req.body;

    const centralDb = getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: school_id });

    if (!school) {
      return res.status(404).json({ detail: 'School not found' });
    }

    // Prevent changing code directly (could break DB references)
    if (updates.code && updates.code !== school.code) {
      return res.status(400).json({ detail: 'School code cannot be changed' });
    }

    await centralDb.collection('schools').updateOne(
      { id: school_id },
      { $set: { ...updates } }
    );

    const updated = await centralDb.collection('schools').findOne({ id: school_id }, { projection: { _id: 0 } });
    return res.json(updated);
  } catch (err) {
    console.error('update school error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * -------- Delete School --------
 */
async function deleteSchool(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super admins can delete schools' });
    }

    const { school_id } = req.params;
    const centralDb = getCentralDb();

    const school = await centralDb.collection('schools').findOne({ id: school_id });
    if (!school) {
      return res.status(404).json({ detail: 'School not found' });
    }

    // Delete from central DB
    await centralDb.collection('schools').deleteOne({ id: school_id });

    // Optionally, drop the school DB (CAREFUL: irreversible)
    const schoolDb = getSchoolDbByName(school.db_name);
    await schoolDb.dropDatabase();

    return res.json({ detail: 'School deleted successfully' });
  } catch (err) {
    console.error('delete school error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
module.exports = { createSchool, getAllSchools, getSchoolById, updateSchool, deleteSchool };
