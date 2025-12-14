# Verify User Setup for Subdomain Login

## School Records (Confirmed ✅)

### DPS School
- **ID**: `b8053743-fa4b-423e-ade2-e7a1555a841b`
- **Code**: `dps`
- **Subdomain**: `dps`
- **Database**: `school_dps_db`

### SVM School
- **ID**: `ae219e70-6560-4a5a-9913-16e76eb3db20`
- **Code**: `svm`
- **Subdomain**: `svm`
- **Database**: `school_svm_db`

## What to Check

### 1. Verify Users are in Correct Databases

Run these queries in MongoDB:

```javascript
// Check DPS database - should only have DPS users
use school_dps_db
db.users.find({}, { email: 1, name: 1, school_id: 1, role: 1 })

// Check SVM database - should only have SVM users
use school_svm_db
db.users.find({}, { email: 1, name: 1, school_id: 1, role: 1 })
```

**Expected:**
- `school_dps_db.users` should have users with `school_id: "b8053743-fa4b-423e-ade2-e7a1555a841b"`
- `school_svm_db.users` should have users with `school_id: "ae219e70-6560-4a5a-9913-16e76eb3db20"`

### 2. Verify User school_id Values

Check that each user has the correct `school_id`:

```javascript
// DPS users should have this school_id
use school_dps_db
db.users.find({ school_id: { $ne: "b8053743-fa4b-423e-ade2-e7a1555a841b" } }, { email: 1, school_id: 1 })

// SVM users should have this school_id
use school_svm_db
db.users.find({ school_id: { $ne: "ae219e70-6560-4a5a-9913-16e76eb3db20" } }, { email: 1, school_id: 1 })
```

**If any users are found, they have wrong school_id!**

### 3. Check for Duplicate Users

Check if users exist in both databases:

```javascript
// Get all user emails from DPS
use school_dps_db
var dpsEmails = db.users.distinct("email")

// Get all user emails from SVM
use school_svm_db
var svmEmails = db.users.distinct("email")

// Check for duplicates (run in same session)
dpsEmails.filter(email => svmEmails.includes(email))
```

**If any emails are returned, those users exist in both databases!**

## Fix Commands

### If users are in wrong database:

```javascript
// Move SVM user from DPS database to SVM database
use school_dps_db
var wrongUser = db.users.findOne({ email: "svm_user@example.com" })
if (wrongUser) {
  // Remove from DPS database
  db.users.deleteOne({ email: "svm_user@example.com" })
  
  // Add to SVM database (update school_id first)
  wrongUser.school_id = "ae219e70-6560-4a5a-9913-16e76eb3db20"
  use school_svm_db
  db.users.insertOne(wrongUser)
}
```

### If users have wrong school_id:

```javascript
// Fix DPS users
use school_dps_db
db.users.updateMany(
  { school_id: { $ne: "b8053743-fa4b-423e-ade2-e7a1555a841b" } },
  { $set: { school_id: "b8053743-fa4b-423e-ade2-e7a1555a841b" } }
)

// Fix SVM users
use school_svm_db
db.users.updateMany(
  { school_id: { $ne: "ae219e70-6560-4a5a-9913-16e76eb3db20" } },
  { $set: { school_id: "ae219e70-6560-4a5a-9913-16e76eb3db20" } }
)
```

### If users have null school_id:

```javascript
// Fix DPS users with null school_id
use school_dps_db
db.users.updateMany(
  { school_id: null },
  { $set: { school_id: "b8053743-fa4b-423e-ade2-e7a1555a841b" } }
)

// Fix SVM users with null school_id
use school_svm_db
db.users.updateMany(
  { school_id: null },
  { $set: { school_id: "ae219e70-6560-4a5a-9913-16e76eb3db20" } }
)
```

## Test After Fix

1. **Restart backend server**
2. **Test DPS login** at `http://dps.localhost:3000/`
   - Should work for DPS users ✅
   - Should block SVM users ❌
3. **Test SVM login** at `http://svm.localhost:3000/`
   - Should work for SVM users ✅
   - Should block DPS users ❌

## Expected Backend Logs

When SVM user tries to login at `dps.localhost:3000`:

```
[TENANT] Detected localhost subdomain: dps from host: dps.localhost:3000
[TENANT] School resolved: Code=dps, ID=b8053743-fa4b-423e-ade2-e7a1555a841b, DB=school_dps_db
[LOGIN] Subdomain detected: dps, School ID: b8053743-fa4b-423e-ade2-e7a1555a841b, School Code: dps
[LOGIN] User found: svm_user@example.com, Role: school_admin, School ID: ae219e70-6560-4a5a-9913-16e76eb3db20
[LOGIN] Access denied: User school_id (ae219e70-6560-4a5a-9913-16e76eb3db20) does not match requested school (b8053743-fa4b-423e-ade2-e7a1555a841b)
```

If you see "User not found in school database", it means the user doesn't exist in `school_dps_db` (which is correct), but the old code might have been searching all databases.

