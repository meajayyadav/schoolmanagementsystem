const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');

/**
 * Create a new fee record
 */
async function createFee(req, res) {
  try {
    const user = req.user;
    const { school_id } = req.body;

    const centralDb = getCentralDb();

    // 🧑‍🏫 Allow both super_admin and school_admin
    if (user.role !== 'super_admin' && user.role !== 'school_admin') {
      return res.status(403).json({ detail: 'Access denied' });
    }

    // Super admin can specify any school, school_admin uses own
    const targetSchoolId = user.role === 'super_admin' ? school_id : user.school_id;
    if (!targetSchoolId) return res.status(400).json({ detail: 'school_id required' });

    const school = await centralDb
      .collection('schools')
      .findOne({ id: targetSchoolId }, { projection: { _id: 0 } });

    if (!school) return res.status(404).json({ detail: 'School not found' });

    const schoolDb = getSchoolDbByName(school.db_name);

    const payload = {
      ...req.body,
      id: req.body.id || uuidv4(),
      created_at: new Date().toISOString(),
      paid: false,
    };

    await schoolDb.collection('fees').insertOne(payload);
    return res.json(payload);
  } catch (err) {
    console.error('createFee error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}

/**
 * Super Admin: View all schools’ fees
 */
/**
 * Super Admin: View all schools’ fees
 * School Admin: View only their school’s fees
 */
async function getAllFees(req, res) {
  try {
    const user = req.user;
    const centralDb = getCentralDb();

    let schools = [];

    if (user.role === 'super_admin') {
      // 🧑‍💼 Super admin sees all schools
      schools = await centralDb
        .collection('schools')
        .find({}, { projection: { _id: 0 } })
        .toArray();
    } else if (user.role === 'school_admin') {
      // 🏫 School admin sees only their school
      if (!user.school_id) {
        return res.status(400).json({ detail: 'school_id required for this role' });
      }

      const school = await centralDb
        .collection('schools')
        .findOne({ id: user.school_id }, { projection: { _id: 0 } });

      if (!school) return res.status(404).json({ detail: 'School not found' });

      schools = [school];
    } else {
      // ❌ Others can’t access
      return res.status(403).json({ detail: 'Access denied' });
    }

    // 🧮 Fetch fees from all applicable schools
    const allFees = [];
    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);
      const fees = await schoolDb
        .collection('fees')
        .find({}, { projection: { _id: 0 } })
        .toArray();

      fees.forEach((fee) =>
        allFees.push({
          ...fee,
          school_name: school.name,
          school_id: school.id,
        })
      );
    }

    return res.json({ total: allFees.length, data: allFees });
  } catch (err) {
    console.error('getAllFees error', err);
    return res.status(500).json({ detail: 'Internal server error' });
  }
}



/**
 * School Admin / Student / Super Admin: View fees for one student
 */
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
 * Mark a fee as paid
 */
async function payFee(req, res) {
  try {
    const user = req.user;
    const { fee_id } = req.params;
    const payment_method = req.body.payment_method;

    if (!payment_method)
      return res.status(400).json({ detail: 'payment_method required' });

    const centralDb = getCentralDb();
    const targetSchoolId =
      user.role === 'super_admin'
        ? req.body.school_id || user.school_id
        : user.school_id;

    if (!targetSchoolId)
      return res.status(400).json({ detail: 'school_id required' });

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
          payment_date: new Date().toISOString().split('T')[0],
        },
      }
    );

    if (result.modifiedCount === 0)
      return res.status(404).json({ detail: 'Fee not found' });

    return res.json({ detail: 'Payment successful' });
  } catch (err) {
    console.error('payFee error', err);
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

module.exports = {
  createFee,
  getAllFees,
  getFeesByStudent,
  payFee,
  deleteFee,
};
