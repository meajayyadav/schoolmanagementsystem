// src/helpers/crypto.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
// Keep hours-based expiration as you had
const JWT_EXPIRATION_HOURS = parseInt(process.env.JWT_EXPIRATION_HOURS || '24', 10);
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10', 10);

function hashPassword(password) {
  // synchronous helper (consistent with your earlier code)
  const salt = bcrypt.genSaltSync(SALT_ROUNDS);
  return bcrypt.hashSync(password, salt);
}

function verifyPassword(password, hashed) {
  return bcrypt.compareSync(password, hashed);
}

function createJwtToken(payloadObj) {
  const payload = { ...payloadObj };
  const expiresIn = `${JWT_EXPIRATION_HOURS}h`; // e.g., "24h"
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn });
}

function verifyJwtToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createJwtToken,
  verifyJwtToken,
};
