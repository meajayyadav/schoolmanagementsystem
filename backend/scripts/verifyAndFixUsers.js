// Script to verify and fix user database assignments
// Run with: node scripts/verifyAndFixUsers.js

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URL = process.env.MONGO_URL;
const CENTRAL_DB_NAME = process.env.DB_NAME || 'central_db';

const SCHOOLS = {
  dps: {
    id: 'b8053743-fa4b-423e-ade2-e7a1555a841b',
    code: 'dps',
    subdomain: 'dps',
    db_name: 'school_dps_db'
  },
  svm: {
    id: 'ae219e70-6560-4a5a-9913-16e76eb3db20',
    code: 'svm',
    subdomain: 'svm',
    db_name: 'school_svm_db'
  }
};

async function verifyAndFix() {
  let client;
  try {
    client = new MongoClient(MONGO_URL);
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const centralDb = client.db(CENTRAL_DB_NAME);

    // Verify schools exist
    console.log('📋 Verifying schools...');
    for (const [key, school] of Object.entries(SCHOOLS)) {
      const found = await centralDb.collection('schools').findOne({ id: school.id });
      if (found) {
        console.log(`  ✅ ${school.code.toUpperCase()}: Found (${found.name})`);
      } else {
        console.log(`  ❌ ${school.code.toUpperCase()}: NOT FOUND!`);
        return;
      }
    }
    console.log('');

    // Check each school database
    for (const [key, school] of Object.entries(SCHOOLS)) {
      console.log(`\n🔍 Checking ${school.code.toUpperCase()} database (${school.db_name})...`);
      const schoolDb = client.db(school.db_name);
      const users = await schoolDb.collection('users').find({}).toArray();

      console.log(`  Total users: ${users.length}`);

      // Check for users with wrong school_id
      const wrongSchoolId = users.filter(u => u.school_id !== school.id);
      if (wrongSchoolId.length > 0) {
        console.log(`  ⚠️  Found ${wrongSchoolId.length} users with wrong school_id:`);
        wrongSchoolId.forEach(u => {
          console.log(`     - ${u.email} (has school_id: ${u.school_id}, should be: ${school.id})`);
        });
      }

      // Check for users with null school_id
      const nullSchoolId = users.filter(u => !u.school_id);
      if (nullSchoolId.length > 0) {
        console.log(`  ⚠️  Found ${nullSchoolId.length} users with null school_id:`);
        nullSchoolId.forEach(u => {
          console.log(`     - ${u.email}`);
        });
      }

      // Check for correct users
      const correctUsers = users.filter(u => u.school_id === school.id);
      console.log(`  ✅ ${correctUsers.length} users with correct school_id`);

      // Check for super_admin (they can be in any database)
      const superAdmins = users.filter(u => u.role === 'super_admin');
      if (superAdmins.length > 0) {
        console.log(`  ℹ️  ${superAdmins.length} super_admin users (can login from any subdomain)`);
      }
    }

    // Check for duplicate users across databases
    console.log('\n🔍 Checking for duplicate users across databases...');
    const dpsDb = client.db(SCHOOLS.dps.db_name);
    const svmDb = client.db(SCHOOLS.svm.db_name);
    
    const dpsEmails = await dpsDb.collection('users').distinct('email');
    const svmEmails = await svmDb.collection('users').distinct('email');
    
    const duplicates = dpsEmails.filter(email => svmEmails.includes(email));
    if (duplicates.length > 0) {
      console.log(`  ⚠️  Found ${duplicates.length} users in BOTH databases:`);
      duplicates.forEach(email => {
        console.log(`     - ${email}`);
      });
    } else {
      console.log('  ✅ No duplicate users found');
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log('  If you see warnings above, users need to be fixed.');
    console.log('  Users should:');
    console.log('    1. Be in the correct database (DPS users in school_dps_db, SVM users in school_svm_db)');
    console.log('    2. Have correct school_id matching their school');
    console.log('    3. Not exist in multiple databases');

    console.log('\n💡 To fix issues, update user records manually or use the fix commands in VERIFY_USER_SETUP.md');

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ Connection closed');
    }
  }
}

verifyAndFix();

