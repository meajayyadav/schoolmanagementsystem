// src/utils/menu.js
const { v4: uuidv4 } = require('uuid');
const { nowISO } = require('./models');

const makeMenu = ({ 
  name, 
  path, 
  icon, 
  roles, 
  order = 0, 
  is_active = true, 
  school_id = null, 
  created_by 
}) => {
  return {
    id: uuidv4(),
    name,
    path,
    icon,
    roles: Array.isArray(roles) ? roles : [roles],
    order,
    is_active,
    school_id,
    created_by,
    created_at: nowISO(),
    updated_at: nowISO()
  };
};

module.exports = { makeMenu };