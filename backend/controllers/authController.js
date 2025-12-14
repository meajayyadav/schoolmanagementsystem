// src/controllers/authController.js
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const { getCentralDb, getSchoolDbByName, isDbConnected } = require('../db');
const { hashPassword, verifyPassword, createJwtToken } = require('../helpers/crypto');
const { makeUser, makeSession } = require('../utils/models');
const { requireAuthMiddleware } = require('../middleware/auth');

// Change from days to hours for session expiration
const SESSION_EXPIRATION_HOURS = parseInt(process.env.SESSION_EXPIRATION_HOURS || '1', 10);
const COOKIE_MAX_AGE_DAYS = parseInt(process.env.COOKIE_MAX_AGE_DAYS || '1', 10);

function isoPlusHours(hours) {
  const d = new Date();
  d.setTime(d.getTime() + (hours * 60 * 60 * 1000));
  return d.toISOString();
}

// Add cleanup function for expired sessions
async function cleanupExpiredSessions() {
  try {
    // Check if database is connected
    if (!isDbConnected()) {
      console.log('Database not connected yet, skipping session cleanup');
      return;
    }

    const centralDb = getCentralDb();
    if (!centralDb) {
      console.log('Central DB not available, skipping session cleanup');
      return;
    }

    const now = new Date().toISOString();
    
    console.log(`Running session cleanup at ${now}`);
    
    // Clean central DB sessions
    const centralResult = await centralDb.collection('user_sessions').deleteMany({ 
      expires_at: { $lt: now } 
    });
    
    if (centralResult.deletedCount > 0) {
      console.log(`Cleaned ${centralResult.deletedCount} expired sessions from central DB`);
    }

    // Clean school DBs
    try {
      const schools = await centralDb.collection('schools').find({}).toArray();
      for (const school of schools) {
        const schoolDb = getSchoolDbByName(school.db_name);
        if (schoolDb) {
          const schoolResult = await schoolDb.collection('user_sessions').deleteMany({ 
            expires_at: { $lt: now } 
          });
          
          if (schoolResult.deletedCount > 0) {
            console.log(`Cleaned ${schoolResult.deletedCount} expired sessions from ${school.db_name}`);
          }
        }
      }
    } catch (schoolErr) {
      console.log('Error cleaning school DB sessions:', schoolErr.message);
    }
  } catch (err) {
    console.error('Session cleanup error:', err.message);
  }
}

// Initialize cleanup after server starts
let cleanupInterval = null;

function startSessionCleanup() {
  // Initial cleanup after 5 seconds (to ensure DB is connected)
  setTimeout(() => {
    cleanupExpiredSessions();
  }, 5000);
  
  // Set up periodic cleanup every 15 minutes
  cleanupInterval = setInterval(cleanupExpiredSessions, 15 * 60 * 1000);
  
  console.log('Session cleanup scheduler started');
}

function stopSessionCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    console.log('Session cleanup scheduler stopped');
  }
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
      expires_at: isoPlusHours(SESSION_EXPIRATION_HOURS) // 1 hour expiration
    });

    await db.collection('user_sessions').insertOne(session);

    // Cookie can have longer lifespan (1 day) but session will expire in 1 hour
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ 
      user, 
      session_token: sessionToken,
      expires_in: `${SESSION_EXPIRATION_HOURS} hour(s)`
    });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

// -------- Login --------
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    const centralDb = getCentralDb();

    // Support both email and mobile number as username
    const username = email; // The 'email' field can contain either email or mobile number
    
    // ✅ SECURITY: If request comes from a school subdomain, validate user belongs to that school
    const requestedSchoolId = req.schoolId; // Set by tenantResolver middleware
    const requestedSchoolDb = req.schoolDb; // Set by tenantResolver middleware
    const requestedSchoolCode = req.schoolCode; // Set by tenantResolver middleware
    const requestedSubdomain = req.schoolSubdomain; // Set by tenantResolver middleware
    
    // Check host header to detect subdomain even if tenantResolver didn't set values
    const hostHeader = req.headers.host || req.hostname || '';
    const host = hostHeader.split(':')[0].toLowerCase();
    const isSubdomainRequest = host.includes('.localhost') && !host.startsWith('localhost');
    
    // Debug: Log what we received from tenantResolver
    console.log(`[LOGIN] Request received - Host: ${host}, IsSubdomain: ${isSubdomainRequest}, SchoolId: ${requestedSchoolId}, SchoolCode: ${requestedSchoolCode}, Subdomain: ${requestedSubdomain}, HasDB: ${!!requestedSchoolDb}`);
    
    // ✅ SAFETY: If subdomain detected but tenantResolver didn't set values, reject login
    if (isSubdomainRequest && (!requestedSchoolId || !requestedSchoolDb)) {
      console.log(`[LOGIN] ❌ ERROR: Subdomain detected (${host}) but tenantResolver did not set school values. Rejecting login for security.`);
      return res.status(403).json({ 
        detail: 'Invalid school subdomain. Please contact administrator.' 
      });
    }
    
    let db = centralDb;
    let user = null;

    // ✅ STRICT: If request is from a school subdomain, ONLY search in that school's database
    // NEVER search in other databases when subdomain is present
    if (requestedSchoolId && requestedSchoolDb && requestedSubdomain) {
      console.log(`[LOGIN] ✅ Subdomain login detected: ${requestedSubdomain} -> School: ${requestedSchoolCode} (ID: ${requestedSchoolId})`);
      
      // CRITICAL: ONLY search in the specific school's database - ABSOLUTELY NO OTHER DATABASES
      user = await requestedSchoolDb.collection('users').findOne({ 
        $or: [
          { email: username },
          { mobile_number: username }
        ]
      });

      // If user NOT found in the requested school's database, IMMEDIATELY reject
      if (!user) {
        console.log(`[LOGIN] ❌ BLOCKED: User "${username}" not found in ${requestedSchoolCode} database (${requestedSchoolDb.databaseName})`);
        return res.status(401).json({ 
          detail: 'Invalid credentials or user does not belong to this school.' 
        });
      }

      console.log(`[LOGIN] User found in ${requestedSchoolCode} DB: ${user.email}, Role: ${user.role}, User School ID: ${user.school_id}, Required School ID: ${requestedSchoolId}`);

      // ✅ VALIDATION: For non-super_admin users, STRICTLY validate school_id match
      if (user.role !== 'super_admin') {
        // Check if school_id is missing
        if (!user.school_id) {
          console.log(`[LOGIN] ❌ BLOCKED: User ${username} has no school_id set`);
          return res.status(403).json({ 
            detail: 'User account is not associated with any school. Please contact administrator.' 
          });
        }
        
        // STRICT: school_id MUST match exactly
        if (String(user.school_id) !== String(requestedSchoolId)) {
          console.log(`[LOGIN] ❌ BLOCKED: User school_id mismatch! User has "${user.school_id}" but required "${requestedSchoolId}"`);
          return res.status(403).json({ 
            detail: 'Access denied. You can only login through your school\'s portal.' 
          });
        }
        
        console.log(`[LOGIN] ✅ VALIDATED: User ${user.email} belongs to ${requestedSchoolCode} school`);
      } else {
        console.log(`[LOGIN] ⚠️  Super admin login allowed from any subdomain: ${user.email}`);
      }
      
      // Set database to the school's database
      db = requestedSchoolDb;
    } else {
      // No subdomain - this is main domain login (for super_admin or backward compatibility)
      console.log(`[LOGIN] Main domain login (no subdomain detected)`);
      // No subdomain specified - search in central DB first (for super_admin)
      user = await db.collection('users').findOne({ 
        $or: [
          { email: username },
          { mobile_number: username }
        ]
      });

      // If not found in central, search all school DBs (for backward compatibility)
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
      expires_at: isoPlusHours(SESSION_EXPIRATION_HOURS) // 1 hour expiration
    });

    await db.collection('user_sessions').insertOne(session);

    // Cookie can have longer lifespan (1 day) but session will expire in 1 hour
    res.cookie('session_token', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ 
      user, 
      session_token: sessionToken,
      expires_in: `${SESSION_EXPIRATION_HOURS} hour(s)`
    });
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

// -------- Refresh Token (Optional: Keep session alive without re-login) --------
async function refreshToken(req, res) {
  try {
    const token = req.cookies.session_token;
    if (!token) {
      return res.status(401).json({ detail: 'No session token found' });
    }

    const centralDb = getCentralDb();
    
    // First check central DB
    let session = await centralDb.collection('user_sessions').findOne({ session_token: token });
    let db = centralDb;
    let user = null;

    if (session) {
      user = await centralDb.collection('users').findOne({ id: session.user_id }, { projection: { _id: 0 } });
    } else {
      // Check school DBs
      const schools = await centralDb.collection('schools').find({}).toArray();
      for (const school of schools) {
        const schoolDb = getSchoolDbByName(school.db_name);
        session = await schoolDb.collection('user_sessions').findOne({ session_token: token });
        if (session) {
          user = await schoolDb.collection('users').findOne({ id: session.user_id }, { projection: { _id: 0 } });
          db = schoolDb;
          break;
        }
      }
    }

    if (!session || !user) {
      return res.status(401).json({ detail: 'Invalid or expired session' });
    }

    // Check if user is inactive
    if (user.is_active === false) {
      return res.status(403).json({ detail: 'Your account is inactive. Please contact admin.' });
    }

    // Create new session token
    const newSessionToken = createJwtToken({ user_id: user.id, school_id: user.school_id });
    
    // Update session in database
    await db.collection('user_sessions').updateOne(
      { session_token: token },
      { 
        $set: { 
          session_token: newSessionToken,
          expires_at: isoPlusHours(SESSION_EXPIRATION_HOURS),
          updated_at: new Date().toISOString()
        }
      }
    );

    // Set new cookie
    res.cookie('session_token', newSessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
      path: '/'
    });

    res.json({ 
      user, 
      session_token: newSessionToken,
      expires_in: `${SESSION_EXPIRATION_HOURS} hour(s)`
    });
  } catch (err) {
    console.error('refresh token error', err);
    res.status(500).json({ detail: 'Internal server error' });
  }
}

// -------- Profile --------
async function getProfile(req, res) {
  res.json(req.user);
}

// -------- Check Session --------
async function checkSession(req, res) {
  try {
    const token = req.cookies.session_token;
    if (!token) {
      return res.status(401).json({ valid: false, detail: 'No session token' });
    }

    const centralDb = getCentralDb();
    
    // Check JWT expiration first
    const { verifyJwtToken } = require('../helpers/crypto');
    const decoded = verifyJwtToken(token);
    
    if (!decoded) {
      return res.status(401).json({ valid: false, detail: 'Token expired or invalid' });
    }

    // Check session in database
    let session = await centralDb.collection('user_sessions').findOne({ session_token: token });
    let user = null;

    if (session) {
      user = await centralDb.collection('users').findOne({ id: session.user_id }, { projection: { _id: 0 } });
    } else {
      // Check school DBs
      const schools = await centralDb.collection('schools').find({}).toArray();
      for (const school of schools) {
        const schoolDb = getSchoolDbByName(school.db_name);
        session = await schoolDb.collection('user_sessions').findOne({ session_token: token });
        if (session) {
          user = await schoolDb.collection('users').findOne({ id: session.user_id }, { projection: { _id: 0 } });
          break;
        }
      }
    }

    if (!session || !user) {
      return res.status(401).json({ valid: false, detail: 'Session not found' });
    }

    // Check if session is expired
    let expiresAt = session.expires_at;
    if (typeof expiresAt === 'string') expiresAt = new Date(expiresAt);
    if (expiresAt < new Date()) {
      return res.status(401).json({ valid: false, detail: 'Session expired' });
    }

    // Calculate remaining time
    const remainingMs = expiresAt - new Date();
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

    res.json({ 
      valid: true, 
      user,
      expires_at: session.expires_at,
      expires_in: `${remainingHours}h ${remainingMinutes}m`,
      remaining_ms: remainingMs
    });
  } catch (err) {
    console.error('check session error', err);
    res.status(500).json({ valid: false, detail: 'Internal server error' });
  }
}

module.exports = { 
  registerUser, 
  loginUser, 
  getProfile,
  logoutUser,
  refreshToken,
  checkSession,
  cleanupExpiredSessions,
  startSessionCleanup,
  stopSessionCleanup
};