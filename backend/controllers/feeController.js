// src/controllers/feeController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create a new fee record with enhanced validation
 */
async function createFee(req, res) {
  try {
    const user = req.user;
    const { 
      school_id, 
      student_id, 
      amount, 
      description, 
      due_date, 
      fee_type, 
      academic_year,
      fee_month,
      payment_date,
      paid,
      payment_method,
      fee_breakdown
    } = req.body;

    // Validation
    if (!student_id || !amount || !fee_type) {
      return res.status(400).json({ 
        detail: 'Student ID, amount, and fee type are required' 
      });
    }

    const centralDb = getCentralDb();

    // Determine target school
    let targetSchoolId = user.school_id;
    if (user.role === 'super_admin') {
      if (!school_id) {
        return res.status(400).json({ detail: 'school_id required for super admin' });
      }
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Verify student exists
    const student = await schoolDb
      .collection('students')
      .findOne({ id: student_id }, { projection: { _id: 0, id: 1, name: 1, class_id: 1 } });

    if (!student) {
      return res.status(404).json({ detail: 'Student not found' });
    }

    // For consolidated fees, check if a fee already exists for this student and month
    if (fee_type === 'CONSOLIDATED_FEE' && fee_month) {
      const existingFee = await schoolDb
        .collection('fees')
        .findOne({ 
          student_id, 
          fee_month,
          fee_type: 'CONSOLIDATED_FEE'
        });

      if (existingFee) {
        return res.status(400).json({ 
          detail: `A consolidated fee record already exists for ${student.name} for ${new Date(fee_month).toLocaleString('default', { month: 'long', year: 'numeric' })}` 
        });
      }
    }

    const payload = {
      id: uuidv4(),
      student_id,
      student_name: student.name,
      class_id: student.class_id,
      amount: parseFloat(amount),
      description: description || '',
      fee_type,
      academic_year: academic_year || '2024-2025',
      due_date: due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      fee_month: fee_month || null, // Add fee_month field
      paid: paid || false,
      payment_method: payment_method || '',
      payment_date: payment_date || null, // Add payment_date field
      created_at: new Date().toISOString(),
      created_by: user.id,
      school_id: targetSchoolId
    };

    // Add fee breakdown if provided
    if (fee_breakdown) {
      payload.fee_breakdown = fee_breakdown;
    }

    await schoolDb.collection('fees').insertOne(payload);
    
    return res.json({
      message: 'Fee record created successfully',
      data: payload
    });
  } catch (err) {
    console.error('createFee error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get all fees with advanced filtering and pagination
 */
async function getAllFees(req, res) {
  try {
    const user = req.user;
    const { 
      student_id, 
      status, 
      fee_type, 
      class_id, 
      academic_year,
      fee_month,
      page = 1, 
      limit = 10,
      school_id 
    } = req.query;

    const centralDb = getCentralDb();
    let schools = [];

    // Determine which schools to query
    if (user.role === 'super_admin') {
      if (school_id) {
        // Specific school requested
        const school = await centralDb
          .collection('schools')
          .findOne({ id: school_id }, { projection: { _id: 0 } });
        if (school) schools = [school];
      } else {
        // All schools
        schools = await centralDb
          .collection('schools')
          .find({}, { projection: { _id: 0 } })
          .toArray();
      }
    } else if (user.role === 'school_admin') {
      const school = await centralDb
        .collection('schools')
        .findOne({ id: user.school_id }, { projection: { _id: 0 } });
      if (school) schools = [school];
    } else {
      return res.status(403).json({ detail: 'Access denied' });
    }

    if (schools.length === 0) {
      return res.json({
        data: [],
        total: 0,
        page: parseInt(page),
        totalPages: 0,
        summary: {
          total_amount: 0,
          paid_amount: 0,
          pending_amount: 0,
          total_students: 0
        }
      });
    }

    // Collect fees from all applicable schools
    const allFees = [];
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    const studentSet = new Set();

    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);
      
      // Build filter
      const filter = {};
      if (student_id) filter.student_id = student_id;
      if (fee_type) filter.fee_type = fee_type;
      if (class_id) filter.class_id = class_id;
      if (academic_year) filter.academic_year = academic_year;
      if (fee_month) filter.fee_month = fee_month;
      if (status === 'paid') filter.paid = true;
      if (status === 'pending') filter.paid = false;

      const fees = await schoolDb
        .collection('fees')
        .find(filter, { projection: { _id: 0 } })
        .sort({ created_at: -1 })
        .toArray();

      fees.forEach(fee => {
        allFees.push({
          ...fee,
          school_name: school.name,
          school_id: school.id
        });

        // Calculate statistics
        totalAmount += fee.amount;
        if (fee.paid) {
          paidAmount += fee.amount;
        } else {
          pendingAmount += fee.amount;
        }
        studentSet.add(fee.student_id);
      });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedFees = allFees.slice(startIndex, endIndex);

    return res.json({
      data: paginatedFees,
      total: allFees.length,
      page: parseInt(page),
      totalPages: Math.ceil(allFees.length / limit),
      summary: {
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        total_students: studentSet.size
      }
    });
  } catch (err) {
    console.error('getAllFees error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Update fee payment status
 */
async function updateFeePayment(req, res) {
  try {
    const user = req.user;
    const { fee_id } = req.params;
    const { 
      paid, 
      payment_method, 
      payment_date, 
      transaction_id, 
      notes 
    } = req.body;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;
    
    if (user.role === 'super_admin' && req.body.school_id) {
      targetSchoolId = req.body.school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const updateData = {
      paid: paid !== undefined ? paid : true,
      payment_method: payment_method || 'cash',
      payment_date: payment_date || new Date().toISOString(),
      paid_by: user.id,
      updated_at: new Date().toISOString()
    };

    if (transaction_id) updateData.transaction_id = transaction_id;
    if (notes) updateData.payment_notes = notes;

    const result = await schoolDb.collection('fees').updateOne(
      { id: fee_id },
      {
        $set: updateData
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ detail: 'Fee not found' });
    }

    return res.json({ 
      message: 'Fee payment updated successfully',
      payment_date: updateData.payment_date
    });
  } catch (err) {
    console.error('updateFeePayment error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get fee statistics and analytics
 */
async function getFeeStatistics(req, res) {
  try {
    const user = req.user;
    const { school_id, academic_year } = req.query;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;
    
    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Build filter for academic year
    const filter = {};
    if (academic_year) filter.academic_year = academic_year;

    const allFees = await schoolDb
      .collection('fees')
      .find(filter, { projection: { _id: 0, amount: 1, paid: 1, fee_type: 1, created_at: 1, fee_month: 1 } })
      .toArray();

    // Calculate statistics
    const statistics = {
      total_collection: 0,
      pending_collection: 0,
      fee_type_breakdown: {},
      monthly_collection: {},
      overall_stats: {
        total_fees: allFees.length,
        paid_fees: 0,
        pending_fees: 0
      }
    };

    allFees.forEach(fee => {
      statistics.total_collection += fee.amount;
      
      if (fee.paid) {
        statistics.overall_stats.paid_fees++;
      } else {
        statistics.pending_collection += fee.amount;
        statistics.overall_stats.pending_fees++;
      }

      // Fee type breakdown
      if (!statistics.fee_type_breakdown[fee.fee_type]) {
        statistics.fee_type_breakdown[fee.fee_type] = {
          total: 0,
          paid: 0,
          pending: 0
        };
      }
      statistics.fee_type_breakdown[fee.fee_type].total += fee.amount;
      if (fee.paid) {
        statistics.fee_type_breakdown[fee.fee_type].paid += fee.amount;
      } else {
        statistics.fee_type_breakdown[fee.fee_type].pending += fee.amount;
      }

      // Monthly collection - use fee_month if available, otherwise created_at
      const monthKey = fee.fee_month 
        ? new Date(fee.fee_month).toLocaleString('default', { month: 'short', year: 'numeric' })
        : new Date(fee.created_at).toLocaleString('default', { month: 'short', year: 'numeric' });
      
      if (!statistics.monthly_collection[monthKey]) {
        statistics.monthly_collection[monthKey] = 0;
      }
      if (fee.paid) {
        statistics.monthly_collection[monthKey] += fee.amount;
      }
    });

    return res.json(statistics);
  } catch (err) {
    console.error('getFeeStatistics error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get fee types configuration
 */
async function getFeeTypes(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();
    
    let targetSchoolId = user.school_id;
    if (user.role === 'super_admin' && req.query.school_id) {
      targetSchoolId = req.query.school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get fee types from configuration or use defaults
    const feeTypesConfig = await schoolDb
      .collection('fee_types')
      .find({}, { projection: { _id: 0 } })
      .toArray();

    const defaultFeeTypes = [
      { id: 'tuition', name: 'Tuition Fee', amount: 0, description: 'Regular tuition fee' },
      { id: 'admission', name: 'Admission Fee', amount: 0, description: 'One-time admission charge' },
      { id: 'exam', name: 'Examination Fee', amount: 0, description: 'Term examination charges' },
      { id: 'transport', name: 'Transport Fee', amount: 0, description: 'School bus transportation' },
      { id: 'hostel', name: 'Hostel Fee', amount: 0, description: 'Boarding charges' },
      { id: 'library', name: 'Library Fee', amount: 0, description: 'Library maintenance' },
      { id: 'sports', name: 'Sports Fee', amount: 0, description: 'Sports equipment and activities' },
      { id: 'lab', name: 'Laboratory Fee', amount: 0, description: 'Science lab maintenance' },
      { id: 'development', name: 'Development Fee', amount: 0, description: 'Infrastructure development' },
      { id: 'other', name: 'Other Charges', amount: 0, description: 'Miscellaneous charges' }
    ];

    return res.json(feeTypesConfig.length > 0 ? feeTypesConfig : defaultFeeTypes);
  } catch (err) {
    console.error('getFeeTypes error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

async function getFeesByStudent(req, res) {
  try {
    const user = req.user;
    const { student_id } = req.params;

    const centralDb = getCentralDb();
    const targetSchoolId =
      user.role === 'super_admin'
        ? req.query.school_id || user.school_id
        : user.school_id;

    if (!targetSchoolId)
      return res.status(400).json({ detail: 'school_id required' });

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const fees = await schoolDb
      .collection('fees')
      .find({ student_id }, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .toArray();

    return res.json(fees);
  } catch (err) {
    console.error('getFeesByStudent error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Delete fee record (Super Admin only)
 */
async function deleteFee(req, res) {
  try {
    const user = req.user;
    if (user.role !== 'super_admin')
      return res.status(403).json({ detail: 'Access denied' });

    const { fee_id, school_id } = req.params;
    const centralDb = getCentralDb();
    const school = await centralDb
      .collection('schools')
      .findOne({ id: school_id }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const result = await schoolDb.collection('fees').deleteOne({ id: fee_id });

    if (result.deletedCount === 0)
      return res.status(404).json({ detail: 'Fee not found' });

    return res.json({ detail: 'Fee deleted successfully' });
  } catch (err) {
    console.error('deleteFee error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Enhanced payFee function
 */
async function payFee(req, res) {
  try {
    const user = req.user;
    const { fee_id } = req.params;
    const { payment_method, transaction_id, notes } = req.body;

    if (!payment_method) {
      return res.status(400).json({ detail: 'payment_method required' });
    }

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;
    
    if (user.role === 'super_admin' && req.body.school_id) {
      targetSchoolId = req.body.school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const result = await schoolDb.collection('fees').updateOne(
      { id: fee_id },
      {
        $set: {
          paid: true,
          payment_method,
          transaction_id: transaction_id || '',
          payment_notes: notes || '',
          payment_date: new Date().toISOString(),
          paid_by: user.id
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ detail: 'Fee not found or already paid' });
    }

    return res.json({ 
      message: 'Payment recorded successfully',
      payment_date: new Date().toISOString()
    });
  } catch (err) {
    console.error('payFee error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  createFee,
  getAllFees,
  getFeesByStudent,
  payFee,
  updateFeePayment,
  deleteFee,
  getFeeStatistics,
  getFeeTypes
};