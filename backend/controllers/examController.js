// src/controllers/examController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * POST /api/exams
 * Create a new exam
 */
async function createExam(req, res) {
  try {
    const user = req.user;

    // Allow both school_admin and super_admin
    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Access denied: only school admins and super admins can create exams' });
    }

    const centralDb = getCentralDb();
    
    let school;
    let schoolId;

    // For super_admin, use school_id from request body
    if (user.role === 'super_admin') {
      if (!req.body.school_id) {
        return res.status(400).json({ detail: 'School ID is required for super admin' });
      }
      schoolId = req.body.school_id;
    } else {
      // For school_admin, use their assigned school
      schoolId = user.school_id;
      
      // Prevent school admins from creating exams for other schools
      if (req.body.school_id && req.body.school_id !== user.school_id) {
        return res.status(403).json({ 
          detail: 'School admins can only create exams for their own school' 
        });
      }
    }

    school = await centralDb
      .collection('schools')
      .findOne({ id: schoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const payload = {
      ...req.body,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: user.id,
      school_id: schoolId, // Use the determined school_id
      status: req.body.status || 'scheduled'
    };

    console.log('Creating exam:', {
      user_id: user.id,
      user_role: user.role,
      school_id: schoolId,
      exam_name: payload.name
    });

    await schoolDb.collection('exams').insertOne(payload);
    return res.status(201).json(payload);
  } catch (err) {
    console.error('createExam error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * GET /api/exams
 * Get list of exams
 */
async function getExams(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    let schools = [];
    let exams = [];

    console.log('Getting exams for user:', {
      user_id: user.id,
      user_role: user.role,
      user_school_id: user.school_id
    });

    if (user.role === 'super_admin') {
      // Super admin can see all schools' exams
      schools = await centralDb
        .collection('schools')
        .find({}, { projection: { _id: 0, id: 1, db_name: 1, name: 1 } })
        .toArray();

      // Get exams from all schools
      for (const school of schools) {
        const schoolDb = getSchoolDbByName(school.db_name);
        const schoolExams = await schoolDb
          .collection('exams')
          .find({}, { projection: { _id: 0 } })
          .sort({ created_at: -1 })
          .toArray();
        
        // Add school info to each exam
        const examsWithSchool = schoolExams.map(exam => ({
          ...exam,
          school_name: school.name
        }));
        
        exams = exams.concat(examsWithSchool);
      }

      console.log(`Super admin found ${exams.length} exams across ${schools.length} schools`);
    } else {
      // School admin only sees their school's exams
      const school = await centralDb
        .collection('schools')
        .findOne({ id: user.school_id }, { projection: { _id: 0 } });

      if (!school) return res.status(404).json({ detail: 'School not found' });

      const schoolDb = getSchoolDbByName(school.db_name);
      exams = await schoolDb
        .collection('exams')
        .find({ school_id: user.school_id }, { projection: { _id: 0 } })
        .sort({ created_at: -1 })
        .toArray();

      console.log(`School admin found ${exams.length} exams for school ${user.school_id}`);
    }

    return res.json(exams);
  } catch (err) {
    console.error('getExams error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * GET /api/exams/:exam_id
 * Get a single exam by ID
 */
async function getExamById(req, res) {
  try {
    const user = req.user;
    const { exam_id } = req.params;
    const centralDb = getCentralDb();

    let exam = null;

    console.log('Getting exam by ID:', {
      exam_id,
      user_id: user.id,
      user_role: user.role,
      user_school_id: user.school_id
    });

    if (user.role === 'super_admin') {
      // Super admin can access any exam from any school
      const schools = await centralDb
        .collection('schools')
        .find({}, { projection: { _id: 0, id: 1, db_name: 1, name: 1 } })
        .toArray();

      for (const school of schools) {
        const schoolDb = getSchoolDbByName(school.db_name);
        exam = await schoolDb
          .collection('exams')
          .findOne({ id: exam_id }, { projection: { _id: 0 } });
        
        if (exam) {
          exam.school_name = school.name;
          console.log(`Super admin found exam in school: ${school.name}`);
          break;
        }
      }
    } else {
      // School admin can only access their school's exams
      const school = await centralDb
        .collection('schools')
        .findOne({ id: user.school_id }, { projection: { _id: 0 } });

      if (!school) {
        console.log('School not found for user:', user.school_id);
        return res.status(404).json({ detail: 'School not found' });
      }

      const schoolDb = getSchoolDbByName(school.db_name);
      exam = await schoolDb
        .collection('exams')
        .findOne({ 
          id: exam_id, 
          school_id: user.school_id 
        }, { projection: { _id: 0 } });

      if (!exam) {
        console.log('Exam not found for school admin:', {
          exam_id,
          user_school_id: user.school_id,
          school_db: school.db_name
        });
        
        // Check if exam exists in other schools for debugging
        const allSchools = await centralDb
          .collection('schools')
          .find({}, { projection: { _id: 0, id: 1, db_name: 1, name: 1 } })
          .toArray();

        for (const s of allSchools) {
          const sDb = getSchoolDbByName(s.db_name);
          const foundExam = await sDb
            .collection('exams')
            .findOne({ id: exam_id }, { projection: { _id: 0 } });
          
          if (foundExam) {
            console.log('Exam found in different school:', {
              exam_school_id: foundExam.school_id,
              exam_school_name: s.name,
              user_school_id: user.school_id
            });
            break;
          }
        }

        return res.status(404).json({ 
          detail: `Exam not found in your school. You can only access exams from school ID: ${user.school_id}` 
        });
      }

      console.log('School admin found exam:', exam.name);
    }

    if (!exam) {
      console.log('Exam not found in any school:', exam_id);
      return res.status(404).json({ detail: 'Exam not found' });
    }

    return res.json(exam);
  } catch (err) {
    console.error('getExamById error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * PUT /api/exams/:exam_id
 * Update an exam
 */
async function updateExam(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Access denied: only school admins and super admins can update exams' });
    }

    const { exam_id } = req.params;
    const centralDb = getCentralDb();

    let school;
    let schoolId;
    let query;
    let originalExam = null;

    console.log('Updating exam:', {
      exam_id,
      user_id: user.id,
      user_role: user.role,
      user_school_id: user.school_id,
      request_body: req.body
    });

    if (user.role === 'super_admin') {
      // For super admin, find which school this exam belongs to
      const schools = await centralDb
        .collection('schools')
        .find({}, { projection: { _id: 0, id: 1, db_name: 1 } })
        .toArray();

      let examSchool = null;

      // Search for the exam in all schools
      for (const s of schools) {
        const schoolDb = getSchoolDbByName(s.db_name);
        const exam = await schoolDb
          .collection('exams')
          .findOne({ id: exam_id }, { projection: { _id: 0 } });
        
        if (exam) {
          examSchool = s;
          originalExam = exam;
          schoolId = exam.school_id;
          console.log(`Super admin found exam in school: ${s.db_name}`);
          break;
        }
      }

      if (!examSchool || !originalExam) {
        console.log('Super admin: Exam not found in any school:', exam_id);
        return res.status(404).json({ detail: 'Exam not found' });
      }
      
      school = examSchool;
      query = { id: exam_id };
    // In your updateExam function, replace the school admin section with this:
} else {
  // For school admin, only allow updates to their school's exams
  schoolId = user.school_id;
  school = await centralDb
    .collection('schools')
    .findOne({ id: schoolId }, { projection: { _id: 0 } });

  if (!school) {
    console.log('School admin: School not found:', schoolId);
    return res.status(404).json({ detail: 'School not found' });
  }

  const schoolDb = getSchoolDbByName(school.db_name);
  
  // First, check if exam exists
  originalExam = await schoolDb
    .collection('exams')
    .findOne({ id: exam_id, school_id: schoolId }, { projection: { _id: 0 } });
  
  if (!originalExam) {
    console.log('School admin: Exam not found in their school:', {
      exam_id,
      user_school_id: schoolId,
      school_db: school.db_name
    });
    return res.status(404).json({ 
      detail: `Exam not found in your school. You can only update exams from school ID: ${schoolId}` 
    });
  }
  
  console.log('School admin found exam to update:', originalExam.name);
  
  // Simple update - don't include school_id in update data
  const updateData = {
    name: req.body.name,
    description: req.body.description,
    class_id: req.body.class_id,
    subject_id: req.body.subject_id,
    exam_date: req.body.exam_date,
    start_time: req.body.start_time,
    end_time: req.body.end_time,
    total_marks: req.body.total_marks,
    passing_marks: req.body.passing_marks,
    instructions: req.body.instructions,
    status: req.body.status,
    updated_at: new Date().toISOString()
  };

  const result = await schoolDb.collection('exams').updateOne(
    { id: exam_id, school_id: schoolId },
    { $set: updateData }
  );

  console.log('Update result:', {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount
  });

  if (result.matchedCount === 0) {
    return res.status(404).json({ detail: 'Exam not found' });
  }

  // Return the updated exam
  const updatedExam = await schoolDb.collection('exams').findOne(
    { id: exam_id, school_id: schoolId },
    { projection: { _id: 0 } }
  );

  return res.json(updatedExam);
}

    const schoolDb = getSchoolDbByName(school.db_name);

    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // For school admin, ensure they don't change the school_id
    if (user.role === 'school_admin' && req.body.school_id && req.body.school_id !== schoolId) {
      return res.status(403).json({ 
        detail: 'School admins cannot change the school of an exam' 
      });
    }

    // For super admin, if changing schools, we need to handle database transfer
    if (user.role === 'super_admin' && req.body.school_id && req.body.school_id !== schoolId) {
      console.log('Super admin changing school for exam:', {
        from_school: schoolId,
        to_school: req.body.school_id
      });

      // Get the target school
      const targetSchool = await centralDb
        .collection('schools')
        .findOne({ id: req.body.school_id }, { projection: { _id: 0 } });

      if (!targetSchool) {
        return res.status(404).json({ detail: 'Target school not found' });
      }

      const targetSchoolDb = getSchoolDbByName(targetSchool.db_name);

      // Create updated exam data for the new school
      const updatedExam = {
        ...originalExam,
        ...updateData,
        school_id: req.body.school_id,
        updated_at: new Date().toISOString()
      };

      // Delete from original school and insert into new school
      await schoolDb.collection('exams').deleteOne({ id: exam_id });
      await targetSchoolDb.collection('exams').insertOne(updatedExam);

      console.log('Super admin successfully moved exam to new school');
      return res.json(updatedExam);
    }

    // Regular update (no school change)
    const result = await schoolDb.collection('exams').findOneAndUpdate(
      query,
      { $set: updateData },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!result.value) {
      console.log('Update failed - exam not found after update attempt');
      return res.status(404).json({ detail: 'Exam not found' });
    }

    console.log('Exam updated successfully:', result.value.name);
    return res.json(result.value);
  } catch (err) {
    console.error('updateExam error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * DELETE /api/exams/:exam_id
 * Delete an exam
 */
async function deleteExam(req, res) {
  try {
    const user = req.user;

    if (user.role !== 'school_admin' && user.role !== 'super_admin') {
      return res.status(403).json({ detail: 'Only school admins and super admins can delete exams' });
    }

    const { exam_id } = req.params;
    const centralDb = getCentralDb();

    let school;
    let query;

    console.log('Deleting exam:', {
      exam_id,
      user_id: user.id,
      user_role: user.role,
      user_school_id: user.school_id
    });

    if (user.role === 'super_admin') {
      // For super admin, find which school this exam belongs to
      const schools = await centralDb
        .collection('schools')
        .find({}, { projection: { _id: 0, id: 1, db_name: 1 } })
        .toArray();

      let examSchool = null;
      for (const s of schools) {
        const schoolDb = getSchoolDbByName(s.db_name);
        const exam = await schoolDb
          .collection('exams')
          .findOne({ id: exam_id }, { projection: { _id: 0 } });
        
        if (exam) {
          examSchool = s;
          console.log(`Super admin found exam to delete in school: ${s.db_name}`);
          break;
        }
      }

      if (!examSchool) {
        console.log('Super admin: Exam not found for deletion:', exam_id);
        return res.status(404).json({ detail: 'Exam not found' });
      }
      
      school = examSchool;
      query = { id: exam_id };
    } else {
      // For school admin, only allow deletion of their school's exams
      school = await centralDb
        .collection('schools')
        .findOne({ id: user.school_id }, { projection: { _id: 0 } });

      if (!school) {
        console.log('School admin: School not found for deletion:', user.school_id);
        return res.status(404).json({ detail: 'School not found' });
      }
      
      query = { id: exam_id, school_id: user.school_id };
    }

    const schoolDb = getSchoolDbByName(school.db_name);

    const result = await schoolDb.collection('exams').deleteOne(query);

    if (result.deletedCount === 0) {
      console.log('Delete failed - no exam found matching query:', query);
      return res.status(404).json({ detail: 'Exam not found or already deleted' });
    }

    console.log('Exam deleted successfully:', exam_id);
    return res.json({ detail: 'Exam deleted successfully' });
  } catch (err) {
    console.error('deleteExam error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
// src/controllers/examController.js - Add these functions

/**
 * Get students registered for a specific exam
 * GET /api/exams/:id/students
 */
async function getExamStudents(req, res) {
  try {
    const user = req.user;
    const { id: exam_id } = req.params;
    const { class_id, section, subject_id, school_id } = req.query;

    const centralDb = getCentralDb();
    
    // Determine which school to use
    let targetSchoolId = user.school_id;
    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0, db_name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get the exam to check if it's completed
    const exam = await schoolDb
      .collection('exams')
      .findOne({ id: exam_id });

    if (!exam) {
      return res.status(404).json({ detail: 'Exam not found' });
    }

    // Check if exam is completed (optional - you can remove this if you want all exams)
    if (exam.status !== 'completed' && exam.is_completed !== true) {
      return res.status(400).json({ 
        detail: 'Exam is not marked as completed',
        exam_status: exam.status,
        is_completed: exam.is_completed
      });
    }

    // Get students registered for this exam from exam_registrations collection
    const examRegistrations = await schoolDb
      .collection('exam_registrations')
      .find({ 
        exam_id,
        ...(class_id && { class_id }),
        ...(section && { section }),
        ...(subject_id && { subject_id })
      })
      .toArray();

    // If no registrations found, return empty array
    if (examRegistrations.length === 0) {
      return res.json([]);
    }

    // Get student details
    const studentIds = examRegistrations.map(reg => reg.student_id);
    const students = await schoolDb
      .collection('students')
      .find({ 
        id: { $in: studentIds },
        status: 'active'
      }, { 
        projection: { 
          _id: 0, 
          id: 1, 
          roll_number: 1, 
          full_name: 1 
        } 
      })
      .sort({ roll_number: 1 })
      .toArray();

    return res.json(students);
  } catch (err) {
    console.error('getExamStudents error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get completed exams only
 * GET /api/exams/completed
 */
async function getCompletedExams(req, res) {
  try {
    const user = req.user;
    const { school_id } = req.query;

    const centralDb = getCentralDb();
    
    let targetSchoolId = user.school_id;
    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0, db_name: 1 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get only completed exams
    const completedExams = await schoolDb
      .collection('exams')
      .find({
        $or: [
          { status: 'completed' },
          { is_completed: true }
        ]
      }, {
        projection: { _id: 0, id: 1, name: 1, exam_type: 1, status: 1, is_completed: 1 }
      })
      .toArray();

    return res.json(completedExams);
  } catch (err) {
    console.error('getCompletedExams error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
module.exports = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  deleteExam,
};
