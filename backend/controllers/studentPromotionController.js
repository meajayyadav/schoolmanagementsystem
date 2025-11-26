const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Promote students to next class/academic year
 * POST /api/students/promote
 */
async function promoteStudents(req, res) {
  try {
    const user = req.user;
    const {
      from_class_id,
      to_class_id,
      academic_year,
      student_ids = 'all',
      promotion_type = 'annual' // annual, custom
    } = req.body;

    const centralDb = getCentralDb();

    // Validate required fields
    if (!from_class_id || !to_class_id || !academic_year) {
      return res.status(400).json({
        success: false,
        detail: 'from_class_id, to_class_id, and academic_year are required'
      });
    }

    // Get school info
    let schoolIdOrCode = user.school_id;
    if (user.role === 'super_admin') {
      schoolIdOrCode = req.body.school_id;
      if (!schoolIdOrCode) {
        return res.status(400).json({
          success: false,
          detail: 'school_id required for super admin'
        });
      }
    }

    const school = await centralDb.collection('schools').findOne(
      { $or: [{ id: schoolIdOrCode }, { code: schoolIdOrCode }] },
      { projection: { _id: 0 } }
    );
    if (!school) {
      return res.status(404).json({
        success: false,
        detail: 'School not found'
      });
    }

    const schoolDb = getSchoolDbByName(school.db_name);

    // Validate classes exist
    const [fromClass, toClass] = await Promise.all([
      schoolDb.collection('classes').findOne({ id: from_class_id }),
      schoolDb.collection('classes').findOne({ id: to_class_id })
    ]);

    if (!fromClass) {
      return res.status(404).json({
        success: false,
        detail: 'Source class not found'
      });
    }

    if (!toClass) {
      return res.status(404).json({
        success: false,
        detail: 'Target class not found'
      });
    }

    // Get students for promotion
    let students;
    if (student_ids === 'all') {
      students = await schoolDb.collection('students').find({
        class_id: from_class_id,
        status: 'active'
      }).toArray();
    } else {
      students = await schoolDb.collection('students').find({
        id: { $in: student_ids },
        status: 'active'
      }).toArray();
    }

    if (students.length === 0) {
      return res.status(404).json({
        success: false,
        detail: 'No active students found for promotion'
      });
    }

    // Perform promotion
    const promotionResults = {
      successful: [],
      failed: []
    };

    const promotionBatchId = `PROMO_${Date.now()}`;
    const promotionDate = new Date().toISOString();

    for (const student of students) {
      try {
        // Create academic history record if it doesn't exist
        if (!student.academic_history) {
          student.academic_history = [];
        }

        // Mark current academic record as completed
        const currentAcademicRecord = student.academic_history.find(
          record => record.status === 'studying'
        );

        if (currentAcademicRecord) {
          await schoolDb.collection('students').updateOne(
            { id: student.id, 'academic_history.academic_year': currentAcademicRecord.academic_year },
            {
              $set: {
                'academic_history.$.status': 'completed',
                'academic_history.$.completed_at': promotionDate,
                'academic_history.$.promoted_to': to_class_id
              }
            }
          );
        }

        // Add new academic year record
        const newAcademicRecord = {
          academic_year: academic_year,
          class_id: to_class_id,
          class_name: toClass.name,
          class_section: toClass.section || student.class_section,
          status: 'studying',
          enrolled_at: promotionDate,
          promoted_from: from_class_id
        };

        // Update student with new class and academic history
        await schoolDb.collection('students').updateOne(
          { id: student.id },
          {
            $set: {
              class_id: to_class_id,
              class_name: toClass.name,
              class_section: toClass.section || student.class_section,
              grade_level: toClass.grade_level || student.grade_level,
              updated_at: promotionDate
            },
            $push: {
              academic_history: newAcademicRecord
            }
          }
        );

        // Add promotion history
        const promotionRecord = {
          promotion_id: uuidv4(),
          from_class_id: from_class_id,
          from_class_name: fromClass.name,
          to_class_id: to_class_id,
          to_class_name: toClass.name,
          academic_year: academic_year,
          promoted_at: promotionDate,
          promoted_by: user.id,
          promotion_type: promotion_type
        };

        await schoolDb.collection('students').updateOne(
          { id: student.id },
          {
            $push: {
              promotion_history: promotionRecord
            }
          }
        );

        promotionResults.successful.push({
          student_id: student.id,
          student_name: student.name,
          roll_number: student.roll_number
        });

      } catch (error) {
        console.error(`Failed to promote student ${student.id}:`, error);
        promotionResults.failed.push({
          student_id: student.id,
          student_name: student.name,
          error: error.message
        });
      }
    }

    // Create promotion batch record
    const promotionBatch = {
      batch_id: promotionBatchId,
      from_class_id,
      from_class_name: fromClass.name,
      to_class_id,
      to_class_name: toClass.name,
      academic_year,
      promotion_type,
      total_students: students.length,
      successful_promotions: promotionResults.successful.length,
      failed_promotions: promotionResults.failed.length,
      promoted_by: user.id,
      promoted_at: promotionDate,
      school_id: school.id
    };

    await schoolDb.collection('promotion_batches').insertOne(promotionBatch);

    return res.json({
      success: true,
      data: promotionResults,
      batch_id: promotionBatchId,
      message: `Successfully promoted ${promotionResults.successful.length} out of ${students.length} students`
    });

  } catch (error) {
    console.error('Promote students error:', error);
    return res.status(500).json({
      success: false,
      detail: 'Internal server error',
      error: error.message
    });
  }
}

/**
 * Get student academic history
 * GET /api/students/:id/academic-history
 */
async function getStudentAcademicHistory(req, res) {
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
    if (!school) {
      return res.status(404).json({
        success: false,
        detail: 'School not found'
      });
    }

    const schoolDb = getSchoolDbByName(school.db_name);
    const student = await schoolDb.collection('students').findOne(
      { id },
      {
        projection: {
          _id: 0,
          id: 1,
          name: 1,
          roll_number: 1,
          current_class_id: 1,
          class_name: 1,
          academic_history: 1,
          promotion_history: 1
        }
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        detail: 'Student not found'
      });
    }

    // Sort academic history by academic year (newest first)
    if (student.academic_history) {
      student.academic_history.sort((a, b) => {
        const yearA = a.academic_year.split('-')[0];
        const yearB = b.academic_year.split('-')[0];
        return parseInt(yearB) - parseInt(yearA);
      });
    }

    // Sort promotion history by date (newest first)
    if (student.promotion_history) {
      student.promotion_history.sort((a, b) => 
        new Date(b.promoted_at) - new Date(a.promoted_at)
      );
    }

    return res.json({
      success: true,
      data: student
    });

  } catch (error) {
    console.error('Get academic history error:', error);
    return res.status(500).json({
      success: false,
      detail: 'Internal server error'
    });
  }
}

/**
 * Get promotion batches history
 * GET /api/students/promotion-batches
 */
async function getPromotionBatches(req, res) {
  try {
    const user = req.user;
    const { school_id, academic_year, page = 1, limit = 10 } = req.query;
    const centralDb = getCentralDb();

    let schoolIdToUse = user.school_id;
    if (user.role === 'super_admin' && school_id) {
      schoolIdToUse = school_id;
    }

    const school = await centralDb.collection('schools').findOne(
      { $or: [{ id: schoolIdToUse }, { code: schoolIdToUse }] },
      { projection: { _id: 0 } }
    );
    if (!school) {
      return res.status(404).json({
        success: false,
        detail: 'School not found'
      });
    }

    const schoolDb = getSchoolDbByName(school.db_name);

    // Build filter
    const filter = { school_id: school.id };
    if (academic_year) {
      filter.academic_year = academic_year;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [batches, total] = await Promise.all([
      schoolDb.collection('promotion_batches')
        .find(filter)
        .sort({ promoted_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      schoolDb.collection('promotion_batches').countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: batches,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('Get promotion batches error:', error);
    return res.status(500).json({
      success: false,
      detail: 'Internal server error'
    });
  }
}

/**
 * Bulk update student class (for manual adjustments)
 * POST /api/students/bulk-update-class
 */
async function bulkUpdateStudentClass(req, res) {
  try {
    const user = req.user;
    const { student_ids, class_id, academic_year } = req.body;
    const centralDb = getCentralDb();

    if (!student_ids || !class_id || !academic_year) {
      return res.status(400).json({
        success: false,
        detail: 'student_ids, class_id, and academic_year are required'
      });
    }

    let schoolIdToUse = user.school_id;
    if (user.role === 'super_admin') {
      schoolIdToUse = req.body.school_id;
      if (!schoolIdToUse) {
        return res.status(400).json({
          success: false,
          detail: 'school_id required for super admin'
        });
      }
    }

    const school = await centralDb.collection('schools').findOne(
      { $or: [{ id: schoolIdToUse }, { code: schoolIdToUse }] },
      { projection: { _id: 0 } }
    );
    if (!school) {
      return res.status(404).json({
        success: false,
        detail: 'School not found'
      });
    }

    const schoolDb = getSchoolDbByName(school.db_name);

    // Validate class exists
    const classInfo = await schoolDb.collection('classes').findOne({ id: class_id });
    if (!classInfo) {
      return res.status(404).json({
        success: false,
        detail: 'Class not found'
      });
    }

    const updateDate = new Date().toISOString();
    const results = {
      successful: [],
      failed: []
    };

    for (const studentId of student_ids) {
      try {
        const student = await schoolDb.collection('students').findOne({ id: studentId });
        if (!student) {
          results.failed.push({
            student_id: studentId,
            error: 'Student not found'
          });
          continue;
        }

        // Update student class
        await schoolDb.collection('students').updateOne(
          { id: studentId },
          {
            $set: {
              class_id: class_id,
              class_name: classInfo.name,
              class_section: classInfo.section || student.class_section,
              grade_level: classInfo.grade_level,
              updated_at: updateDate
            }
          }
        );

        results.successful.push({
          student_id: studentId,
          student_name: student.name
        });

      } catch (error) {
        console.error(`Failed to update student ${studentId}:`, error);
        results.failed.push({
          student_id: studentId,
          error: error.message
        });
      }
    }

    return res.json({
      success: true,
      data: results,
      message: `Successfully updated ${results.successful.length} out of ${student_ids.length} students`
    });

  } catch (error) {
    console.error('Bulk update class error:', error);
    return res.status(500).json({
      success: false,
      detail: 'Internal server error'
    });
  }
}

module.exports = {
  promoteStudents,
  getStudentAcademicHistory,
  getPromotionBatches,
  bulkUpdateStudentClass
};