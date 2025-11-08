const { v4: uuidv4 } = require('uuid');
const { getCentralDb, getSchoolDbByName } = require('../db');
const { hashPassword } = require('../helpers/crypto');
const { makeUser } = require('../utils/models');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');


// ✅ Create User in School Database
async function createUser(req, res) {
  try {
    const { name, email, password, role, school_id } = req.body;
    if (!email || !password || !name || !role || !school_id)
      return res.status(400).json({ detail: 'Missing required fields' });

    const centralDb = getCentralDb();
    const school = await centralDb.collection('schools').findOne({ id: school_id });
    if (!school) return res.status(404).json({ detail: 'School not found' });

    const db = getSchoolDbByName(school.db_name);

    const existing = await db.collection('users').findOne({ email });
    if (existing) return res.status(400).json({ detail: 'Email already exists' });

    const user = makeUser({
      id: uuidv4(),
      name,
      email,
      role,
      school_id,
      password_hash: hashPassword(password),
      created_at: new Date(),
      is_active: true
    });

    await db.collection('users').insertOne(user);
    res.json({ user });
  } catch (err) {
    console.error('createUser error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

// ✅ Get Users (Filtered by school / role / name)
async function getUsers(req, res) {
  try {
    const { school_id, name, email, role, page = 1, limit = 10 } = req.query;
    const centralDb = getCentralDb();

    let db;
    let school = null;

    // ✅ accept both id or code
    if (school_id) {
      school = await centralDb.collection('schools').findOne({
        $or: [{ id: school_id }, { code: school_id }]
      });

      if (!school) return res.status(404).json({ detail: 'School not found' });
      db = getSchoolDbByName(school.db_name);
    } else {
      db = centralDb;
    }

    const query = {};
    if (name) query.name = { $regex: name, $options: 'i' };
    if (email) query.email = { $regex: email, $options: 'i' };
    if (role) query.role = role;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      db.collection('users')
        .find(query, { projection: { password_hash: 0 } })
        .skip(skip)
        .limit(Number(limit))
        .toArray(),
      db.collection('users').countDocuments(query),
    ]);

    // Add school name for clarity in frontend
    if (school) {
      data.forEach((u) => (u.school_name = school.name));
    }

    res.json({ data, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('getUsers error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}


// ✅ Toggle User Active/Inactive
async function toggleUserActive(req, res) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const centralDb = getCentralDb();
    const schools = await centralDb.collection('schools').find({}).toArray();

    for (const school of schools) {
      const db = getSchoolDbByName(school.db_name);
      const result = await db.collection('users').updateOne({ id }, { $set: { is_active } });
      if (result.modifiedCount > 0)
        return res.json({ detail: `User ${is_active ? 'activated' : 'deactivated'} successfully` });
    }

    res.status(404).json({ detail: 'User not found' });
  } catch (err) {
    console.error('toggleUserActive error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}
// ✅ Upload Profile Picture — supports both central & school DBs
async function uploadProfilePicture(req, res) {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ detail: 'No file uploaded' });

    const pictureUrl = `/uploads/${req.file.filename}`;
    const centralDb = getCentralDb();

    // 🧩 First, try updating in central DB (super admins)
    const centralResult = await centralDb
      .collection('users')
      .updateOne({ id }, { $set: { picture: pictureUrl } });

    if (centralResult.modifiedCount > 0) {
      return res.json({
        detail: 'Profile picture uploaded successfully (central)',
        picture: pictureUrl,
      });
    }

    // 🏫 Otherwise, try updating in school DBs
    const schools = await centralDb.collection('schools').find({}).toArray();
    let updated = false;

    for (const school of schools) {
      const db = getSchoolDbByName(school.db_name);
      const result = await db.collection('users').updateOne(
        { id },
        { $set: { picture: pictureUrl } }
      );
      if (result.modifiedCount > 0) {
        updated = true;
        break;
      }
    }

    if (!updated) return res.status(404).json({ detail: 'User not found' });

    res.json({
      detail: 'Profile picture uploaded successfully',
      picture: pictureUrl,
    });
  } catch (err) {
    console.error('uploadProfilePicture error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}


// update user details
async function updateUserProfile(req, res) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ detail: 'Name and email are required' });
    }

    const centralDb = getCentralDb();

    // 🧩 First: Try updating in central DB (for super admins)
    const centralResult = await centralDb
      .collection('users')
      .updateOne(
        { $or: [{ id }, { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }] },
        { $set: { name, email } }
      );

    if (centralResult.modifiedCount > 0) {
      return res.json({ detail: 'Profile updated successfully (central)' });
    }

    // 🏫 Otherwise, try updating in school databases
    const schools = await centralDb.collection('schools').find({}).toArray();
    let updated = false;

    for (const school of schools) {
      const db = getSchoolDbByName(school.db_name);
      const result = await db
        .collection('users')
        .updateOne(
          { $or: [{ id }, { _id: ObjectId.isValid(id) ? new ObjectId(id) : null }] },
          { $set: { name, email } }
        );

      if (result.modifiedCount > 0) {
        updated = true;
        break;
      }
    }

    if (!updated) {
      return res.status(404).json({ detail: 'User not found' });
    }

    res.json({ detail: 'Profile updated successfully' });
  } catch (err) {
    console.error('updateUserProfile error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}
async function updateUser(req, res) {
  try {
    const user = req.user; // from middleware
    const { id } = req.params;
    const { name, email, role, school_id } = req.body;

    if (user.role !== 'super_admin' && user.role !== 'school_admin') {
      return res.status(403).json({ detail: 'Permission denied' });
    }

    const centralDb = getCentralDb();
    const schools = await centralDb.collection('schools').find({}).toArray();
    let updated = false;

    for (const school of schools) {
      const db = getSchoolDbByName(school.db_name);
      const result = await db.collection('users').updateOne(
        { id },
        { $set: { name, email, role, school_id } }
      );
      if (result.modifiedCount > 0) {
        updated = true;
        break;
      }
    }

    if (!updated) {
      const centralResult = await centralDb.collection('users').updateOne(
        { id },
        { $set: { name, email, role, school_id } }
      );
      if (centralResult.modifiedCount > 0) updated = true;
    }

    if (!updated) return res.status(404).json({ detail: 'User not found' });
    res.json({ detail: 'User updated successfully' });
  } catch (err) {
    console.error('updateUser error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

// ✅ Reset Password by Super Admin / School Admin
async function resetPassword(req, res) {
  try {
    console.log("🧩 resetPassword request:", req.params, req.body, req.user);
    const user = req.user;
    const { id } = req.params;
    const { new_password } = req.body;

    if (!new_password) {
      return res.status(400).json({ detail: 'New password required' });
    }

    if (user.role !== 'super_admin' && user.role !== 'school_admin') {
      return res.status(403).json({ detail: 'Only admins can reset passwords' });
    }

    const centralDb = getCentralDb();
    const hashed = hashPassword(new_password);
    let updated = false;

    // 🔍 Try central first
    const centralResult = await centralDb.collection('users').updateOne(
      { id },
      { $set: { password_hash: hashed } }
    );
    console.log("Central result:", centralResult);

    if (centralResult.modifiedCount > 0) {
      updated = true;
    }

    // 🔍 Then try school DBs
    if (!updated) {
      const schools = await centralDb.collection('schools').find({}).toArray();
      for (const school of schools) {
        const db = getSchoolDbByName(school.db_name);
        const result = await db
          .collection('users')
          .updateOne({ id }, { $set: { password_hash: hashed } });
        console.log(`Tried ${school.db_name} result:`, result.modifiedCount);
        if (result.modifiedCount > 0) {
          updated = true;
          break;
        }
      }
    }

    if (!updated) return res.status(404).json({ detail: 'User not found' });
    res.json({ detail: 'Password reset successfully' });
  } catch (err) {
    console.error('resetPassword error', err);
    res.status(500).json({ detail: 'Internal server error', error: err.message });
  }
}

// module.exports = { updateUserProfile };


module.exports = {
  createUser,
  getUsers,
  updateUser,
  deleteUser: () => {},
  toggleUserActive,
  uploadProfilePicture,
  updateUserProfile,
  resetPassword,

};
