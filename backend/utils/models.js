// src/utils/models.js
const { v4: uuidv4 } = require('uuid');

function nowISO() {
  return new Date().toISOString();
}

function makeUser({ email, name, role, school_id = null, password_hash = null, picture = null }) {
  return {
    id: uuidv4(),
    email,
    name,
    role,
    school_id,
    password_hash,
    picture,
    created_at: nowISO()
  };
}

function makeSession({ user_id, session_token, expires_at }) {
  return {
    user_id,
    session_token,
    expires_at,
    created_at: nowISO()
  };
}

function makeSchool({ name, code, admin_email, admin_name, db_name, address = null, phone = null }) {
  return {
    id: uuidv4(),
    name,
    code,
    admin_email,
    admin_name,
    db_name,
    address,
    phone,
    created_at: nowISO()
  };
}

module.exports = { makeUser, makeSession, makeSchool, nowISO };
