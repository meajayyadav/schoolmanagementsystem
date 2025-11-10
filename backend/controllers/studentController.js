const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create a student
 * POST /api/students
 */
async function createStudent(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    let schoolIdOrCode = user.school_id;
    if (user.role === 'super_admin') {
      schoolIdOrCode = req.body.school_id;
      if (!schoolIdOrCode)
        return res.status(400).json({ detail: 'school_id (or school code) is required for super admin' });
    }

    const school = await centralDb.collection('schools').findOne(
      { $or: [{ id: schoolIdOrCode }, { code: schoolIdOrCode }] },
      { projection: { _id: 0 } }
    );
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const picturePath = req.file ? `/uploads/${req.file.filename}` : null;

    const payload = {
      id: uuidv4(),
      name: req.body.name,
      roll_number: req.body.roll_number,
      class_id: req.body.class_id,
      grade_level: req.body.grade_level,
      class_section: req.body.class_section,
      enrollment_date: req.body.enrollment_date
        ? new Date(req.body.enrollment_date).toISOString()
        : new Date().toISOString(),
      father_name: req.body.father_name || '',
      date_of_birth: req.body.date_of_birth
        ? new Date(req.body.date_of_birth).toISOString()
        : null,
      picture: picturePath,
      school_id: school.id,
      created_at: new Date().toISOString(),
    };

    await schoolDb.collection('students').insertOne(payload);
    return res.json({ detail: 'Student created successfully', data: payload });
  } catch (err) {
    console.error('createStudent error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Update student
 * PUT /api/students/:id
 */
async function updateStudent(req, res) {
  try {
    const user = req.user;
    const studentId = req.params.id;
    const centralDb = getCentralDb();

    let schoolIdOrCode = user.school_id;
    if (user.role === 'super_admin') {
      schoolIdOrCode = req.body.school_id || req.query.school_id;
      if (!schoolIdOrCode)
        return res.status(400).json({ detail: 'school_id required for super admin' });
    }

    const school = await centralDb.collection('schools').findOne(
      { $or: [{ id: schoolIdOrCode }, { code: schoolIdOrCode }] },
      { projection: { _id: 0 } }
    );
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const existing = await schoolDb.collection('students').findOne({ id: studentId });
    if (!existing) return res.status(404).json({ detail: 'Student not found' });

    const updateData = { ...req.body };
    if (req.file) {
      // delete old image
      if (existing.picture) {
        const oldPath = path.join(__dirname, '..', existing.picture);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updateData.picture = `/uploads/${req.file.filename}`;
    }
    if (updateData.enrollment_date)
      updateData.enrollment_date = new Date(updateData.enrollment_date).toISOString();
    if (updateData.date_of_birth)
      updateData.date_of_birth = new Date(updateData.date_of_birth).toISOString();

    await schoolDb.collection('students').updateOne({ id: studentId }, { $set: updateData });
    return res.json({ detail: 'Student updated successfully' });
  } catch (err) {
    console.error('updateStudent error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Delete student
 * DELETE /api/students/:id
 */
async function deleteStudent(req, res) {
  try {
    const user = req.user;
    const studentId = req.params.id;
    const centralDb = getCentralDb();

    let schoolIdOrCode = user.school_id;
    if (user.role === 'super_admin') {
      schoolIdOrCode = req.query.school_id;
      if (!schoolIdOrCode)
        return res.status(400).json({ detail: 'school_id required for super admin' });
    }

    const school = await centralDb.collection('schools').findOne(
      { $or: [{ id: schoolIdOrCode }, { code: schoolIdOrCode }] },
      { projection: { _id: 0 } }
    );
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const existing = await schoolDb.collection('students').findOne({ id: studentId });
    if (!existing) return res.status(404).json({ detail: 'Student not found' });

    if (existing.picture) {
      const imgPath = path.join(__dirname, '..', existing.picture);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await schoolDb.collection('students').deleteOne({ id: studentId });
    return res.json({ detail: 'Student deleted successfully' });
  } catch (err) {
    console.error('deleteStudent error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * List students
 * GET /api/students
 */
async function listStudents(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    let schoolIdOrCode = user.school_id;
    if (user.role === 'super_admin') {
      schoolIdOrCode = req.query.school_id;
      if (!schoolIdOrCode) {
        return res.status(400).json({ detail: 'school_id required for super admin' });
      }
    }

    const school = await centralDb.collection('schools').findOne({
      $or: [{ id: schoolIdOrCode }, { code: schoolIdOrCode }],
    });
    if (!school) {
      return res.status(404).json({ detail: 'School not found' });
    }

    const schoolDb = getSchoolDbByName(school.db_name);

    // 🟢 SAFE FILTER SECTION (add this)
    const filter = {};
    if (req.query.class_id) {
      filter.class_id = req.query.class_id;
    }

    // Optional: filter by student_id or search by name
    if (req.query.student_id) filter.id = req.query.student_id;
    if (req.query.name) filter.name = new RegExp(req.query.name, 'i');

    const students = await schoolDb.collection('students').find(filter).toArray();

    return res.json({ data: students });
  } catch (err) {
    console.error('listStudents error:', err);
    res.status(500).json({ detail: 'Failed to load students' });
  }
}


/**
 * Get student by ID
 * GET /api/students/:id
 */
async function getStudent(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const { school_id } = req.query;
    const centralDb = getCentralDb();

    let schoolIdToUse = user.school_id;
    if (user.role === 'super_admin' && school_id) {
      schoolIdToUse = school_id;
    }

    const school = await centralDb.collection('schools').findOne(
      { $or: [{ id: schoolIdToUse }, { code: schoolIdToUse }] },
      { projection: { _id: 0 } }
    );
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const student = await schoolDb.collection('students').findOne({ id }, { projection: { _id: 0 } });
    if (!student) return res.status(404).json({ detail: 'Student not found' });
    return res.json(student);
  } catch (err) {
    console.error('getStudent error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}


module.exports = {
  createStudent,
  updateStudent,
  deleteStudent,
  listStudents,
  getStudent,
};
