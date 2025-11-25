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

    // Parse fee fields
    const admission_fee = req.body.admission_fee ? parseFloat(req.body.admission_fee) : 0;
    const monthly_fee = req.body.monthly_fee ? parseFloat(req.body.monthly_fee) : 0;

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
      admission_fee: admission_fee,
      monthly_fee: monthly_fee,
      picture: picturePath,
      school_id: school.id,
      created_at: new Date().toISOString(),
      status: 'active'
    };

    await schoolDb.collection('students').insertOne(payload);
    return res.json({ detail: 'Student created successfully', student: payload });
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
    
    // Handle fee fields
    if (req.body.admission_fee !== undefined) {
      updateData.admission_fee = parseFloat(req.body.admission_fee) || 0;
    }
    if (req.body.monthly_fee !== undefined) {
      updateData.monthly_fee = parseFloat(req.body.monthly_fee) || 0;
    }
    
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
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const filter = {};

    // ✅ TEACHER: restrict to assigned classes only
    if (user.role === 'teacher') {
      const teacher = await schoolDb.collection('teachers').findOne({ user_id: user.id });
      if (!teacher) {
        return res.status(403).json({ detail: 'No teacher profile found for your account' });
      }

      if (!teacher.classes_assigned || teacher.classes_assigned.length === 0) {
        return res.json({ data: [], detail: 'No classes assigned to your account' });
      }

      // ✅ Convert teacher's assigned class names → class IDs
      const classRecords = await schoolDb.collection('classes')
        .find({ name: { $in: teacher.classes_assigned } })
        .project({ id: 1 })
        .toArray();

      const classIds = classRecords.map(cls => cls.id);

      if (classIds.length === 0) {
        return res.json({ data: [], detail: 'No matching classes found for your account' });
      }

      // ✅ Filter students by matching class_id
      filter.class_id = { $in: classIds };
    }

    // ✅ Optional filters
    if (req.query.class_id) filter.class_id = req.query.class_id;
    if (req.query.student_id) filter.id = req.query.student_id;
    if (req.query.name) filter.name = new RegExp(req.query.name, 'i');
    if (req.query.roll_number) filter.roll_number = new RegExp(req.query.roll_number, 'i');

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ✅ Fetch students with pagination
    const students = await schoolDb.collection('students')
      .find(filter)
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await schoolDb.collection('students').countDocuments(filter);

    if (students.length === 0) {
      return res.json({ 
        data: [],
        total: 0,
        page,
        totalPages: 0
      });
    }

    // ✅ Fetch related class details (names)
    const classIds = [...new Set(students.map(s => s.class_id).filter(Boolean))];
    const classes = await schoolDb
      .collection('classes')
      .find({ id: { $in: classIds } })
      .project({ id: 1, name: 1, section: 1, admission_fee: 1, monthly_fee: 1 })
      .toArray();

    const classMap = Object.fromEntries(classes.map(c => [c.id, {
      name: c.name,
      section: c.section,
      admission_fee: c.admission_fee,
      monthly_fee: c.monthly_fee
    }]));

    // ✅ Append class_name and other class fields to each student
    const enrichedStudents = students.map(s => {
      const classInfo = classMap[s.class_id] || { name: 'Unknown', section: '' };
      return {
        ...s,
        class_name: classInfo.name,
        class_section: s.class_section || classInfo.section,
        // Use student's fees if available, otherwise fall back to class fees
        admission_fee: s.admission_fee !== undefined ? s.admission_fee : classInfo.admission_fee,
        monthly_fee: s.monthly_fee !== undefined ? s.monthly_fee : classInfo.monthly_fee
      };
    });

    return res.json({ 
      data: enrichedStudents,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
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
    
    // Fetch class information if class_id exists
    if (student.class_id) {
      const classInfo = await schoolDb.collection('classes').findOne(
        { id: student.class_id },
        { projection: { name: 1, section: 1, admission_fee: 1, monthly_fee: 1 } }
      );
      
      if (classInfo) {
        student.class_name = classInfo.name;
        student.class_section = student.class_section || classInfo.section;
        // Use student's fees if available, otherwise fall back to class fees
        student.admission_fee = student.admission_fee !== undefined ? student.admission_fee : classInfo.admission_fee;
        student.monthly_fee = student.monthly_fee !== undefined ? student.monthly_fee : classInfo.monthly_fee;
      }
    }

    return res.json(student);
  } catch (err) {
    console.error('getStudent error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get students by class
 * GET /api/students/class/:classId
 */
async function getStudentsByClass(req, res) {
  try {
    const user = req.user;
    const { classId } = req.params;
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
    
    const students = await schoolDb.collection('students')
      .find({ class_id: classId })
      .toArray();

    return res.json({ data: students });
  } catch (err) {
    console.error('getStudentsByClass error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  createStudent,
  updateStudent,
  deleteStudent,
  listStudents,
  getStudent,
  getStudentsByClass
};
