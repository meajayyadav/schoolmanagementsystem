// src/controllers/authController.js
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { getCentralDb, getSchoolDbByName } = require('../db');
const { hashPassword, verifyPassword, createJwtToken } = require('../helpers/crypto');
const { makeUser, makeSession } = require('../utils/models');
const { requireAuthMiddleware } = require('../middleware/auth');

const JWT_EXPIRATION_DAYS = parseInt(process.env.JWT_EXPIRATION_DAYS || '7', 10);

function isoPlusDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// -------- Register --------
async function registerUser(req, res) {
  try {
    const data = req.body;
    const centralDb = getCentralDb();
    let db = centralDb;

    if (data.role && data.role !== 'super_admin') {
      if (!data.school_id) return res.status(400).json({ detail: 'school_id required for non-super admin users' });
      const school = await centralDb.collection('schools').findOne({ id: data.school_id });
      if (!school) return res.status(404).json({ detail: 'School not found' });
      db = getSchoolDbByName(school.db_name);
    }

    const existing = await db.collection('users').findOne({ email: data.email });
    if (existing) return res.status(400).json({ detail: 'Email already registered' });

    const user = makeUser({
      email: data.email,
      name: data.name,
      role: data.role,
      school_id: data.school_id || null,
      password_hash: hashPassword(data.password)
    });

    await db.collection('users').insertOne(user);

    const sessionToken = createJwtToken({ user_id: user.id, school_id: user.school_id });
    const session = makeSession({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: isoPlusDays(JWT_EXPIRATION_DAYS)
    });

    await db.collection('user_sessions').insertOne(session);

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: JWT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ user, session_token: sessionToken });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

// -------- Login --------
// -------- Login --------
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    const centralDb = getCentralDb();

    // Support both email and mobile number as username
    const username = email; // The 'email' field can contain either email or mobile number
    
    let db = centralDb;
    // Try to find user by email first, then by mobile_number
    let user = await db.collection('users').findOne({ 
      $or: [
        { email: username },
        { mobile_number: username }
      ]
    });

    // Try to find user in school DBs if not found in central
    if (!user) {
      const schools = await centralDb.collection('schools').find({}).toArray();
      for (const school of schools) {
        const schoolDb = getSchoolDbByName(school.db_name);
        const found = await schoolDb.collection('users').findOne({ 
          $or: [
            { email: username },
            { mobile_number: username }
          ]
        });
        if (found) {
          user = found;
          db = schoolDb;
          break;
        }
      }
    }

    // No user found or password mismatch
    if (!user || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ detail: 'Invalid credentials' });
    }

    // ❌ Check if user is inactive
    if (user.is_active === false) {
      return res.status(403).json({ detail: 'Your account is inactive. Please contact admin.' });
    }

    // ✅ Create session if active
    const sessionToken = createJwtToken({ user_id: user.id, school_id: user.school_id });
    const session = makeSession({
      user_id: user.id,
      session_token: sessionToken,
      expires_at: isoPlusDays(JWT_EXPIRATION_DAYS)
    });

    await db.collection('user_sessions').insertOne(session);

    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: JWT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ user, session_token: sessionToken });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

// -------- Logout --------
async function logoutUser(req, res) {
  try {
    const token = req.cookies.session_token;
    if (!token) {
      return res.status(200).json({ detail: 'Already logged out' });
    }

    // Attempt to find session in any DB (central or school)
    const centralDb = getCentralDb();

    // Try to delete from central
    await centralDb.collection('user_sessions').deleteOne({ session_token: token });

    // Try to delete from each school DB (in case session was stored there)
    const schools = await centralDb.collection('schools').find({}).toArray();
    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);
      await schoolDb.collection('user_sessions').deleteOne({ session_token: token });
    }

    // Clear cookie
    res.clearCookie('session_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });

    return res.json({ detail: 'Logged out successfully' });
  } catch (err) {
    console.error('logout error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

// -------- Profile --------
async function getProfile(req, res) {
  res.json(req.user);
}

module.exports = { registerUser, loginUser, getProfile,logoutUser };
