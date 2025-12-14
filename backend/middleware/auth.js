// src/middleware/auth.js
const { getCentralDb, getSchoolDbByName } = require('../db');
const { verifyJwtToken } = require('../helpers/crypto');

// -----------------------
// GET CURRENT USER
// -----------------------
async function getCurrentUserFromReq(req) {
  const centralDb = getCentralDb();
  const token =
    (req.cookies && req.cookies.session_token) ||
    (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) return null;

  // ---- JWT AUTH CHECK ----
  const decoded = verifyJwtToken(token);

  if (decoded && decoded.user_id) {
    // Check central database
    const user = await centralDb
      .collection('users')
      .findOne({ id: decoded.user_id }, { projection: { _id: 0 } });

    if (user) return user;

    // If not in central, check school DBs
    const schools = await centralDb
      .collection('schools')
      .find({}, { projection: { _id: 0 } })
      .toArray();

    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);
      const u = await schoolDb
        .collection('users')
        .findOne({ id: decoded.user_id }, { projection: { _id: 0 } });

      if (u) return u;
    }
  }

  // ---- LEGACY SESSION TABLE CHECK ----
  let session = await centralDb.collection('user_sessions').findOne({ session_token: token });

  if (session) {
    let expiresAt = new Date(session.expires_at);

    if (expiresAt < new Date()) {
      await centralDb.collection('user_sessions').deleteOne({ session_token: token });
      return null;
    }

    const user = await centralDb
      .collection('users')
      .findOne({ id: session.user_id }, { projection: { _id: 0 } });

    if (user) return user;
  }

  // Check school DBs session tables
  const schools = await centralDb
    .collection('schools')
    .find({}, { projection: { _id: 0 } })
    .toArray();

  for (const school of schools) {
    const schoolDb = getSchoolDbByName(school.db_name);

    session = await schoolDb.collection('user_sessions').findOne({
      session_token: token,
    });

    if (session) {
      let expiresAt = new Date(session.expires_at);

      if (expiresAt < new Date()) {
        await schoolDb.collection('user_sessions').deleteOne({ session_token: token });
        return null;
      }

      const user = await schoolDb
        .collection('users')
        .findOne({ id: session.user_id }, { projection: { _id: 0 } });

      if (user) return user;
    }
  }

  return null;
}

// -----------------------
// AUTH REQUIRED
// -----------------------
function requireAuthMiddleware(req, res, next) {
  getCurrentUserFromReq(req)
    .then((user) => {
      if (!user) return res.status(401).json({ detail: 'Not authenticated' });
      req.user = user;
      next();
    })
    .catch((err) => {
      console.error('Auth error:', err);
      res.status(500).json({ detail: 'Internal auth error' });
    });
}

// -----------------------
// ROLE-BASED ACCESS CONTROL
// -----------------------
function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super admin access only' });
  }
  next();
}

function requireSchoolAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'school_admin') {
    return res.status(403).json({ error: 'School admin access only' });
  }
  next();
}

function requireTeacher(req, res, next) {
  if (!req.user || req.user.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher access only' });
  }
  next();
}

function requireParent(req, res, next) {
  if (!req.user || req.user.role !== 'parent') {
    return res.status(403).json({ error: 'Parent access only' });
  }
  next();
}

function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Student access only' });
  }
  next();
}

// Export everything
module.exports = {
  getCurrentUserFromReq,
  requireAuthMiddleware,

  // Role-based middlewares
  requireSuperAdmin,
  requireSchoolAdmin,
  requireTeacher,
  requireParent,
  requireStudent,
};
