// src/controllers/schoolController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');
const { hashPassword } = require('../helpers/crypto');
const { makeUser, makeSchool } = require('../utils/models');

/**
 * Create School (Super Admin only)
 */
async function createSchool(req, res) {
  try {
    const user = req.user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super admins can create schools' });
    }

    const data = req.body || {};
    const centralDb = await getCentralDb();

    // required fields
    const required = ['name', 'code', 'admin_email', 'admin_name', 'admin_password'];
    for (const f of required) {
      if (!data[f]) return res.status(400).json({ detail: `Missing required field: ${f}` });
    }

    const code = String(data.code).trim();
    const subdomain = code.toLowerCase();
    const custom_domain = data.custom_domain ? String(data.custom_domain).toLowerCase() : null;

    // check duplicates
    const duplicateQuery = {
      $or: [
        { code },
        { subdomain },
      ],
    };
    if (custom_domain) duplicateQuery.$or.push({ custom_domain });

    const existing = await centralDb.collection('schools').findOne(duplicateQuery);
    if (existing) {
      if (existing.code === code) return res.status(400).json({ detail: 'School code already exists' });
      if (existing.subdomain === subdomain) return res.status(400).json({ detail: 'Subdomain already exists' });
      if (custom_domain && existing.custom_domain === custom_domain) return res.status(400).json({ detail: 'Custom domain already in use' });
      return res.status(400).json({ detail: 'School already exists' });
    }

    const db_name = data.db_name || `school_${subdomain}_db`;

    const schoolObj = makeSchool({
      name: data.name,
      code,
      admin_email: data.admin_email,
      admin_name: data.admin_name,
      db_name,
      address: data.address || null,
      phone: data.phone || null,
      subdomain,
      custom_domain,
      logo: data.logo || null,
      background_image: data.background_image || null,
      tagline: data.tagline || null,
    });

    await centralDb.collection('schools').insertOne(schoolObj);

    // create admin user in the school's DB
    const schoolDb = getSchoolDbByName(db_name);
    const adminUser = makeUser({
      email: data.admin_email,
      name: data.admin_name,
      role: 'school_admin',
      school_id: schoolObj.id,
      password_hash: hashPassword(data.admin_password),
    });

    await schoolDb.collection('users').insertOne(adminUser);

    // return school object (omit internal DB handles)
    return res.status(201).json(schoolObj);
  } catch (err) {
    console.error('createSchool error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get All Schools (Super Admin only)
 */
async function getAllSchools(req, res) {
  try {
    const user = req.user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super admins can view all schools' });
    }

    const centralDb = await getCentralDb();
    const schools = await centralDb.collection('schools').find({}, { projection: { _id: 0 } }).toArray();
    return res.json(schools);
  } catch (err) {
    console.error('getAllSchools error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get Single School (Super Admin or School Admin)
 */
async function getSchoolById(req, res) {
  try {
    const user = req.user;
    const sid = req.params.school_id;

    if (!user) return res.status(401).json({ detail: 'Unauthorized' });
    if (user.role !== 'super_admin' && user.school_id !== sid) {
      return res.status(403).json({ detail: 'Access denied' });
    }

    const centralDb = await getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: sid }, { projection: { _id: 0 } });

    if (!school) {
      return res.status(404).json({ detail: 'School not found' });
    }

    return res.json(school);
  } catch (err) {
    console.error('getSchoolById error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get School by Subdomain (Public endpoint for login page)
 * Returns school info including logo and background for display on login page
 */
async function getSchoolBySubdomain(req, res) {
  try {
    const subdomain = req.params.subdomain?.toLowerCase();
    if (!subdomain) {
      return res.status(400).json({ detail: 'Subdomain is required' });
    }

    const centralDb = await getCentralDb();
    const school = await centralDb.collection('schools').findOne(
      { subdomain: subdomain },
      { 
        projection: { 
          _id: 0,
          id: 1,
          name: 1,
          code: 1,
          subdomain: 1,
          logo: 1,
          background_image: 1,
          tagline: 1,
          address: 1,
          phone: 1
        } 
      }
    );

    if (!school) {
      return res.status(404).json({ detail: 'School not found' });
    }

    return res.json(school);
  } catch (err) {
    console.error('getSchoolBySubdomain error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Update School (Super Admin only)
 */
async function updateSchool(req, res) {
  try {
    const user = req.user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super admins can update schools' });
    }

    const { school_id } = req.params;
    const updates = { ...(req.body || {}) };

    // Prevent changing code or subdomain (subdomain tied to code)
    if (updates.code) delete updates.code;
    if (updates.subdomain) delete updates.subdomain;

    const centralDb = await getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: school_id });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    // If updating custom_domain, ensure uniqueness
    if (updates.custom_domain) {
      const existing = await centralDb.collection('schools').findOne({
        custom_domain: updates.custom_domain,
        id: { $ne: school_id },
      });
      if (existing) return res.status(400).json({ detail: 'Custom domain already in use' });
    }

    updates.updated_at = new Date().toISOString();

    await centralDb.collection('schools').updateOne({ id: school_id }, { $set: updates });

    const updated = await centralDb.collection('schools').findOne({ id: school_id }, { projection: { _id: 0 } });
    return res.json(updated);
  } catch (err) {
    console.error('updateSchool error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Delete School (Super Admin only)
 */
async function deleteSchool(req, res) {
  try {
    const user = req.user;
    if (!user || user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Only super admins can delete schools' });
    }

    const { school_id } = req.params;
    const centralDb = await getCentralDb();

    const school = await centralDb.collection('schools').findOne({ id: school_id });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    // Remove central record
    await centralDb.collection('schools').deleteOne({ id: school_id });

    // Drop the school DB (irreversible). Keep this behavior, but ensure you have backups.
    try {
      const schoolDb = getSchoolDbByName(school.db_name);
      await schoolDb.dropDatabase();
    } catch (dropErr) {
      // log and continue
      console.error('Failed to drop school DB', dropErr);
    }

    return res.json({ detail: 'School deleted successfully' });
  } catch (err) {
    console.error('deleteSchool error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  createSchool,
  getAllSchools,
  getSchoolById,
  getSchoolBySubdomain,
  updateSchool,
  deleteSchool,
};
