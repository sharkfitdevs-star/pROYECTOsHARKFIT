#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// ensure we load models relative to project root
require(path.resolve(__dirname, '../src/models/User'));
const User = require('../src/models/User');

async function main() {
  const [,, identifier, role] = process.argv;
  if (!identifier || !role) {
    console.error('Usage: node tools/set-role.js <username|email> <role>');
    process.exit(1);
  }

  const allowed = ['user', 'staff', 'owner'];
  if (!allowed.includes(role)) {
    console.error(`ERROR: role must be one of ${allowed.join(', ')}`);
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    const query = {
      $or: [
        { username: identifier },
        { email: identifier }
      ]
    };
    const user = await User.findOne(query);
    if (!user) {
      console.error(`User not found: ${identifier}`);
      process.exit(1);
    }
    user.role = role;
    await user.save();
    console.log(`✅ Role actualizado: ${user.username} => ${role}`);
  } catch (err) {
    console.error('Error setting role:', err.message);
    process.exit(1);
  } finally {
    try { await mongoose.disconnect(); } catch {};
  }
}

if (require.main === module) {
  main();
}
