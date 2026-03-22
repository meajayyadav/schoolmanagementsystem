// src/helpers/crypto.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION_DAYS = parseInt(process.env.JWT_EXPIRATION_DAYS || '7', 10);

function hashPassword(password) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

function verifyPassword(password, hashed) {
  return bcrypt.compareSync(password, hashed);
}

function createJwtToken(payloadObj) {
  const payload = { ...payloadObj };
  // set expiration in seconds
  const expiresIn = `${JWT_EXPIRATION_DAYS}d`;
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
  verifyJwtToken
};
