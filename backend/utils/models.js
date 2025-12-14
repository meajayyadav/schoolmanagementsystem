// src/utils/models.js
const { v4: uuidv4 } = require('uuid');

function nowISO() {
  return new Date().toISOString();
}

/**
 * makeUser
 * - keep same fields you used elsewhere
 */
function makeUser({
  email,
  name,
  role = 'school_admin',
  school_id = null,
  password_hash = null,
  picture = null,
}) {
  return {
    id: uuidv4(),
    email,
    name,
    role,
    school_id,
    password_hash,
    picture,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

function makeSession({ user_id, session_token, expires_at }) {
  return {
    user_id,
    session_token,
    expires_at,
    created_at: nowISO(),
  };
}

/**
 * makeSchool
 * - adds subdomain (derived from code) and optional custom_domain
 * - keeps created_at / updated_at
 */
function makeSchool({
  name,
  code,
  admin_email,
  admin_name,
  db_name,
  address = null,
  phone = null,
  subdomain = null,
  custom_domain = null,
}) {
  const normalizedCode = String(code).trim();
  const sd = subdomain || normalizedCode.toLowerCase();
  return {
    id: uuidv4(),
    name,
    code: normalizedCode,
    subdomain: sd,
    custom_domain: custom_domain || null,
    admin_email,
    admin_name,
    db_name,
    address,
    phone,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
}

module.exports = { makeUser, makeSession, makeSchool, nowISO };
