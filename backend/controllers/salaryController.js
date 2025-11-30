// src/controllers/salaryController.js
const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create a new salary record
 * POST /api/salary
 */
async function createSalary(req, res) {
  try {
    const user = req.user;
    const {
      school_id,
      employee_id,
      employee_type, // 'teacher' or 'staff'
      employee_name,
      amount,
      salary_month,
      payment_date,
      payment_method,
      status, // 'paid' or 'pending'
      deductions,
      bonuses,
      notes,
      bank_account,
      transaction_id
    } = req.body;

    // Validation
    if (!employee_id || !employee_type || !amount || !salary_month) {
      return res.status(400).json({
        detail: 'Employee ID, employee type, amount, and salary month are required'
      });
    }

    if (!['teacher', 'staff'].includes(employee_type)) {
      return res.status(400).json({
        detail: 'Employee type must be either "teacher" or "staff"'
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
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Verify employee exists
    let employee = null;
    if (employee_type === 'teacher') {
      employee = await schoolDb
        .collection('teachers')
        .findOne({ id: employee_id }, { projection: { _id: 0, id: 1, name: 1, email: 1 } });
    } else {
      employee = await schoolDb
        .collection('staff')
        .findOne({ id: employee_id }, { projection: { _id: 0, id: 1, name: 1, email: 1 } });
    }

    if (!employee) {
      return res.status(404).json({ detail: `${employee_type} not found` });
    }

    // Check if salary already exists for this employee and month
    const existingSalary = await schoolDb
      .collection('salaries')
      .findOne({
        employee_id,
        employee_type,
        salary_month
      });

    if (existingSalary) {
      return res.status(400).json({
        detail: `Salary record already exists for ${employee.name} for ${new Date(salary_month).toLocaleString('default', { month: 'long', year: 'numeric' })}`
      });
    }

    // Calculate net salary
    const baseAmount = parseFloat(amount);
    const deductionsAmount = deductions ? parseFloat(deductions) : 0;
    const bonusesAmount = bonuses ? parseFloat(bonuses) : 0;
    const netAmount = baseAmount - deductionsAmount + bonusesAmount;

    const payload = {
      id: uuidv4(),
      employee_id,
      employee_type,
      employee_name: employee_name || employee.name,
      employee_email: employee.email || '',
      amount: baseAmount,
      deductions: deductionsAmount,
      bonuses: bonusesAmount,
      net_amount: netAmount,
      salary_month,
      payment_date: payment_date || (status === 'paid' ? new Date().toISOString() : null),
      payment_method: payment_method || 'cash',
      status: status || 'pending',
      bank_account: bank_account || '',
      transaction_id: transaction_id || '',
      notes: notes || '',
      created_at: new Date().toISOString(),
      created_by: user.id,
      school_id: school.id
    };

    await schoolDb.collection('salaries').insertOne(payload);

    return res.json({
      message: 'Salary record created successfully',
      data: payload
    });
  } catch (err) {
    console.error('createSalary error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get all salary records with filtering and pagination
 * GET /api/salary
 */
async function getAllSalaries(req, res) {
  try {
    const user = req.user;
    const {
      employee_id,
      employee_type,
      status,
      salary_month,
      payment_method,
      page = 1,
      limit = 10,
      school_id
    } = req.query;

    const centralDb = getCentralDb();
    let schools = [];

    // Determine which schools to query
    if (user.role === 'super_admin') {
      if (school_id) {
        const school = await centralDb
          .collection('schools')
          .findOne({ $or: [{ id: school_id }, { code: school_id }] }, { projection: { _id: 0 } });
        if (school) schools = [school];
      } else {
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
          total_employees: 0
        }
      });
    }

    // Collect salaries from all applicable schools
    const allSalaries = [];
    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    const employeeSet = new Set();

    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);

      // Build filter
      const filter = {};
      if (employee_id) filter.employee_id = employee_id;
      if (employee_type) filter.employee_type = employee_type;
      if (status) filter.status = status;
      if (salary_month) filter.salary_month = salary_month;
      if (payment_method) filter.payment_method = payment_method;

      const salaries = await schoolDb
        .collection('salaries')
        .find(filter, { projection: { _id: 0 } })
        .sort({ created_at: -1 })
        .toArray();

      salaries.forEach(salary => {
        allSalaries.push({
          ...salary,
          school_name: school.name,
          school_id: school.id
        });

        // Calculate statistics
        totalAmount += salary.net_amount;
        if (salary.status === 'paid') {
          paidAmount += salary.net_amount;
        } else {
          pendingAmount += salary.net_amount;
        }
        employeeSet.add(salary.employee_id);
      });
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedSalaries = allSalaries.slice(startIndex, endIndex);

    return res.json({
      data: paginatedSalaries,
      total: allSalaries.length,
      page: parseInt(page),
      totalPages: Math.ceil(allSalaries.length / limit),
      summary: {
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        total_employees: employeeSet.size
      }
    });
  } catch (err) {
    console.error('getAllSalaries error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get salary by ID
 * GET /api/salary/:id
 */
async function getSalaryById(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const { school_id } = req.query;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const salary = await schoolDb
      .collection('salaries')
      .findOne({ id }, { projection: { _id: 0 } });

    if (!salary) return res.status(404).json({ detail: 'Salary record not found' });

    return res.json(salary);
  } catch (err) {
    console.error('getSalaryById error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Update salary record
 * PUT /api/salary/:id
 */
async function updateSalary(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const {
      amount,
      deductions,
      bonuses,
      salary_month,
      payment_date,
      payment_method,
      status,
      bank_account,
      transaction_id,
      notes,
      school_id
    } = req.body;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Get existing salary
    const existingSalary = await schoolDb
      .collection('salaries')
      .findOne({ id }, { projection: { _id: 0 } });

    if (!existingSalary) {
      return res.status(404).json({ detail: 'Salary record not found' });
    }

    // Calculate net amount
    const baseAmount = amount !== undefined ? parseFloat(amount) : existingSalary.amount;
    const deductionsAmount = deductions !== undefined ? parseFloat(deductions) : (existingSalary.deductions || 0);
    const bonusesAmount = bonuses !== undefined ? parseFloat(bonuses) : (existingSalary.bonuses || 0);
    const netAmount = baseAmount - deductionsAmount + bonusesAmount;

    const updateData = {
      updated_at: new Date().toISOString(),
      updated_by: user.id
    };

    if (amount !== undefined) updateData.amount = baseAmount;
    if (deductions !== undefined) updateData.deductions = deductionsAmount;
    if (bonuses !== undefined) updateData.bonuses = bonusesAmount;
    if (netAmount !== undefined) updateData.net_amount = netAmount;
    if (salary_month) updateData.salary_month = salary_month;
    if (payment_date) updateData.payment_date = payment_date;
    if (payment_method) updateData.payment_method = payment_method;
    if (status) updateData.status = status;
    if (bank_account !== undefined) updateData.bank_account = bank_account;
    if (transaction_id !== undefined) updateData.transaction_id = transaction_id;
    if (notes !== undefined) updateData.notes = notes;

    // If status is being set to 'paid' and payment_date is not provided, set it to now
    if (status === 'paid' && !payment_date && existingSalary.status !== 'paid') {
      updateData.payment_date = new Date().toISOString();
    }

    const result = await schoolDb.collection('salaries').updateOne(
      { id },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ detail: 'Salary record not found or no changes made' });
    }

    const updatedSalary = await schoolDb
      .collection('salaries')
      .findOne({ id }, { projection: { _id: 0 } });

    return res.json({
      message: 'Salary record updated successfully',
      data: updatedSalary
    });
  } catch (err) {
    console.error('updateSalary error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Delete salary record
 * DELETE /api/salary/:id
 */
async function deleteSalary(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const { school_id } = req.query;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);
    const result = await schoolDb.collection('salaries').deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ detail: 'Salary record not found' });
    }

    return res.json({ message: 'Salary record deleted successfully' });
  } catch (err) {
    console.error('deleteSalary error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Pay salary (mark as paid)
 * PATCH /api/salary/:id/pay
 */
async function paySalary(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const { payment_method, payment_date, transaction_id, bank_account, notes, school_id } = req.body;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const result = await schoolDb.collection('salaries').updateOne(
      { id },
      {
        $set: {
          status: 'paid',
          payment_method: payment_method || 'cash',
          payment_date: payment_date || new Date().toISOString(),
          transaction_id: transaction_id || '',
          bank_account: bank_account || '',
          notes: notes || '',
          paid_by: user.id,
          updated_at: new Date().toISOString()
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ detail: 'Salary record not found or already paid' });
    }

    const updatedSalary = await schoolDb
      .collection('salaries')
      .findOne({ id }, { projection: { _id: 0 } });

    return res.json({
      message: 'Salary paid successfully',
      data: updatedSalary
    });
  } catch (err) {
    console.error('paySalary error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get salary statistics
 * GET /api/salary/statistics
 */
async function getSalaryStatistics(req, res) {
  try {
    const user = req.user;
    const { school_id, salary_month, employee_type } = req.query;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    // Build filter
    const filter = {};
    if (salary_month) filter.salary_month = salary_month;
    if (employee_type) filter.employee_type = employee_type;

    const allSalaries = await schoolDb
      .collection('salaries')
      .find(filter, { projection: { _id: 0 } })
      .toArray();

    // Calculate statistics
    const statistics = {
      total_paid: 0,
      total_pending: 0,
      total_amount: 0,
      employee_type_breakdown: {
        teacher: { count: 0, amount: 0 },
        staff: { count: 0, amount: 0 }
      },
      monthly_breakdown: {},
      payment_method_breakdown: {},
      overall_stats: {
        total_records: allSalaries.length,
        paid_records: 0,
        pending_records: 0
      }
    };

    allSalaries.forEach(salary => {
      statistics.total_amount += salary.net_amount;

      if (salary.status === 'paid') {
        statistics.total_paid += salary.net_amount;
        statistics.overall_stats.paid_records++;

        // Payment method breakdown
        const method = salary.payment_method || 'cash';
        if (!statistics.payment_method_breakdown[method]) {
          statistics.payment_method_breakdown[method] = 0;
        }
        statistics.payment_method_breakdown[method] += salary.net_amount;
      } else {
        statistics.total_pending += salary.net_amount;
        statistics.overall_stats.pending_records++;
      }

      // Employee type breakdown
      if (salary.employee_type === 'teacher') {
        statistics.employee_type_breakdown.teacher.count++;
        statistics.employee_type_breakdown.teacher.amount += salary.net_amount;
      } else {
        statistics.employee_type_breakdown.staff.count++;
        statistics.employee_type_breakdown.staff.amount += salary.net_amount;
      }

      // Monthly breakdown
      if (salary.salary_month) {
        const monthKey = new Date(salary.salary_month).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!statistics.monthly_breakdown[monthKey]) {
          statistics.monthly_breakdown[monthKey] = { paid: 0, pending: 0, total: 0 };
        }
        statistics.monthly_breakdown[monthKey].total += salary.net_amount;
        if (salary.status === 'paid') {
          statistics.monthly_breakdown[monthKey].paid += salary.net_amount;
        } else {
          statistics.monthly_breakdown[monthKey].pending += salary.net_amount;
        }
      }
    });

    return res.json(statistics);
  } catch (err) {
    console.error('getSalaryStatistics error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Get employees (teachers/staff) for salary assignment
 * GET /api/salary/employees
 */
async function getEmployees(req, res) {
  try {
    const user = req.user;
    const { employee_type, school_id } = req.query;

    const centralDb = getCentralDb();
    let targetSchoolId = user.school_id;

    if (user.role === 'super_admin' && school_id) {
      targetSchoolId = school_id;
    }

    const school = await centralDb
      .collection('schools')
      .findOne({ $or: [{ id: targetSchoolId }, { code: targetSchoolId }] }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const employees = [];

    if (!employee_type || employee_type === 'teacher') {
      const teachers = await schoolDb
        .collection('teachers')
        .find({ is_active: true }, { projection: { _id: 0, id: 1, name: 1, email: 1 } })
        .toArray();
      teachers.forEach(t => {
        employees.push({
          id: t.id,
          name: t.name,
          email: t.email || '',
          type: 'teacher'
        });
      });
    }

    if (!employee_type || employee_type === 'staff') {
      const staff = await schoolDb
        .collection('staff')
        .find({}, { projection: { _id: 0, id: 1, name: 1, email: 1 } })
        .toArray();
      staff.forEach(s => {
        employees.push({
          id: s.id,
          name: s.name,
          email: s.email || '',
          type: 'staff'
        });
      });
    }

    return res.json(employees);
  } catch (err) {
    console.error('getEmployees error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

module.exports = {
  createSalary,
  getAllSalaries,
  getSalaryById,
  updateSalary,
  deleteSalary,
  paySalary,
  getSalaryStatistics,
  getEmployees
};

