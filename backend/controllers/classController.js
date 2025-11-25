// src/controllers/classController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create a new class (School Admin / Super Admin)
 * POST /api/classes
 */
async function createClass(req, res) {
  try {
    const user = req.user;
    const { name, section, subjects = [], admission_fee, monthly_fee, school_id } = req.body;

    if (!name)
      return res.status(400).json({ detail: 'Class name is required' });

    const centralDb = getCentralDb();

    let targetSchoolId = user.role === 'super_admin' ? school_id : user.school_id;
    if (!targetSchoolId)
      return res.status(400).json({ detail: 'School ID required' });

    const school = await centralDb.collection('schools').findOne({
      $or: [{ id: targetSchoolId }, { code: targetSchoolId }],
    });

    if (!school)
      return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const classData = {
      id: uuidv4(),
      name,
      section: section || '',
      subjects: Array.isArray(subjects) ? subjects : [],
      admission_fee: parseFloat(admission_fee) || 0,
      monthly_fee: parseFloat(monthly_fee) || 0,
      created_at: new Date().toISOString(),
      is_active: true,
    };

    await schoolDb.collection('classes').insertOne(classData);

    return res.json({ message: 'Class created successfully', class: classData });
  } catch (err) {
    console.error('createClass error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
/**
 * List all classes
 * GET /api/classes
 * - super_admin must provide school_id
 * - school_admin auto-detected
 */
/**
 * List all classes with filters & pagination
 * GET /api/classes
 * Query params: name, grade, section, page, limit, school_id (for super_admin)
 */
async function listClasses(req, res) {
  try {
    const user = req.user;
    const { name, grade, section, page = 1, limit = 10, school_id } = req.query;

    const centralDb = getCentralDb();
    let school;

    // 🏫 Determine which school database to query
    if (user.role === 'super_admin') {
      if (!school_id) return res.status(400).json({ detail: 'School ID required' });
      school = await centralDb.collection('schools').findOne({
        $or: [{ id: school_id }, { code: school_id }],
      });
    } else {
      school = await centralDb.collection('schools').findOne({ id: user.school_id });
    }

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // 🔍 Build filter object dynamically
    const filter = {};
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (grade) filter.grade = { $regex: grade, $options: 'i' };
    if (section) filter.section = { $regex: section, $options: 'i' };

    // 🧮 Pagination setup
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await schoolDb.collection('classes').countDocuments(filter);

    const classes = await schoolDb
      .collection('classes')
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const totalPages = Math.ceil(total / parseInt(limit));

    return res.json({
      data: classes,
      total,
      totalPages,
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error('listClasses error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}


/**
 * Get class by ID
 * GET /api/classes/:class_id
 */
async function getClass(req, res) {
  try {
    const user = req.user;
    const { class_id } = req.params;
    const { school_id } = req.query;

    const centralDb = getCentralDb();

    let school;
    if (user.role === 'super_admin') {
      if (!school_id) return res.status(400).json({ detail: 'School ID required' });
      school = await centralDb.collection('schools').findOne({
        $or: [{ id: school_id }, { code: school_id }],
      });
    } else {
      school = await centralDb.collection('schools').findOne({ id: user.school_id });
    }

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const classData = await schoolDb.collection('classes').findOne({ id: class_id }, { projection: { _id: 0 } });

    if (!classData) return res.status(404).json({ detail: 'Class not found' });

    return res.json(classData);
  } catch (err) {
    console.error('getClass error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Update class
 * PUT /api/classes/:class_id
 */
async function updateClass(req, res) {
  try {
    const user = req.user;
    const { class_id } = req.params;
    const { name, section, subjects, admission_fee, monthly_fee, is_active } = req.body;

    const centralDb = getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: user.school_id });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const updateData = {};

    if (name) updateData.name = name;
    if (section) updateData.section = section;
    if (subjects) updateData.subjects = subjects;
    if (admission_fee !== undefined) updateData.admission_fee = parseFloat(admission_fee);
    if (monthly_fee !== undefined) updateData.monthly_fee = parseFloat(monthly_fee);
    if (typeof is_active === 'boolean') updateData.is_active = is_active;

    const result = await schoolDb.collection('classes').updateOne({ id: class_id }, { $set: updateData });

    if (result.modifiedCount === 0) return res.status(404).json({ detail: 'Class not found' });

    return res.json({ message: 'Class updated successfully' });
  } catch (err) {
    console.error('updateClass error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
// PUT /api/classes/:class_id/toggle
async function toggleClassStatus(req, res) {
  const { class_id } = req.params;
  const { is_active } = req.body;
  const user = req.user;

  const centralDb = getCentralDb();
  const school = await centralDb.collection('schools').findOne({ id: user.school_id });
  if (!school) return res.status(404).json({ detail: 'School not found' });

  const schoolDb = getSchoolDbByName(school.db_name);
  await schoolDb.collection('classes').updateOne({ id: class_id }, { $set: { is_active } });

  res.json({ detail: 'Status updated successfully' });
}

/**
 * Delete class
 * DELETE /api/classes/:class_id
 */
async function deleteClass(req, res) {
  try {
    const user = req.user;
    const { class_id } = req.params;

    const centralDb = getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: user.school_id });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const result = await schoolDb.collection('classes').deleteOne({ id: class_id });

    if (result.deletedCount === 0)
      return res.status(404).json({ detail: 'Class not found' });

    return res.json({ message: 'Class deleted successfully' });
  } catch (err) {
    console.error('deleteClass error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
// Add to src/controllers/classController.js

/**
 * GET /api/classes/school/:school_id
 * Get classes by school ID (for super admin)
 */
async function getClassesBySchool(req, res) {
  try {
    const user = req.user;
    const { school_id } = req.params;

    if (user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Access denied: only super admins can access this endpoint' });
    }

    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ 
        $or: [{ id: school_id }, { code: school_id }]
      }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const classes = await schoolDb
      .collection('classes')
      .find({}, { projection: { _id: 0 } })
      .sort({ name: 1 })
      .toArray();

    return res.json(classes);
  } catch (err) {
    console.error('getClassesBySchool error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
module.exports = {
  createClass,
  listClasses,
  getClass,
  updateClass,
  deleteClass,
  toggleClassStatus,
  getClassesBySchool
};
