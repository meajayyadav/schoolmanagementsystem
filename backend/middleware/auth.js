// src/middleware/auth.js
const cookieParser = require('cookie-parser');
const { getCentralDb, getSchoolDbByName } = require('../db');
const { verifyJwtToken } = require('../helpers/crypto');
const { ObjectId } = require('mongodb');

// helper to extract token from cookie or Bearer header
async function getCurrentUserFromReq(req) {
  const centralDb = getCentralDb();
  const token = (req.cookies && req.cookies.session_token) || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (!token) return null;

  // 1) check central_db.user_sessions
  let session = await centralDb.collection('user_sessions').findOne({ session_token: token });
  if (session) {
    let expiresAt = session.expires_at;
    if (typeof expiresAt === 'string') expiresAt = new Date(expiresAt);
    if (expiresAt < new Date()) {
      await centralDb.collection('user_sessions').deleteOne({ session_token: token });
      return null;
    }
    const user = await centralDb.collection('users').findOne({ id: session.user_id }, { projection: { _id: 0 } });
    if (user) return user;
  }

  // 2) check all schools - scan list of schools in central_db and check their dbs
  const schools = await centralDb.collection('schools').find({}, { projection: { _id: 0 } }).toArray();
  for (const school of schools) {
    const schoolDb = getSchoolDbByName(school.db_name);
    session = await schoolDb.collection('user_sessions').findOne({ session_token: token });
    if (session) {
      let expiresAt = session.expires_at;
      if (typeof expiresAt === 'string') expiresAt = new Date(expiresAt);
      if (expiresAt < new Date()) {
        await schoolDb.collection('user_sessions').deleteOne({ session_token: token });
        return null;
      }
      const user = await schoolDb.collection('users').findOne({ id: session.user_id }, { projection: { _id: 0 } });
      if (user) return user;
    }
  }

  // 3) token might be a JWT (for backward compatibility) — try to decode
  const decoded = verifyJwtToken(token);
  if (decoded && decoded.user_id) {
    // look up user in central db or schools (similar to above)
    const user = await centralDb.collection('users').findOne({ id: decoded.user_id }, { projection: { _id: 0 } });
    if (user) return user;
    for (const school of schools) {
      const schoolDb = getSchoolDbByName(school.db_name);
      const u = await schoolDb.collection('users').findOne({ id: decoded.user_id }, { projection: { _id: 0 } });
      if (u) return u;
    }
  }

  return null;
}

function requireAuthMiddleware(req, res, next) {
  getCurrentUserFromReq(req)
    .then(user => {
      if (!user) return res.status(401).json({ detail: 'Not authenticated' });
      req.user = user;
      next();
    })
    .catch(err => {
      console.error('Auth error:', err);
      res.status(500).json({ detail: 'Internal auth error' });
    });
}

module.exports = {
  getCurrentUserFromReq,
  requireAuthMiddleware
};
