# Debug Subdomain Login Issue

## Problem
Users from both schools (SVM and DPS) can login from `http://dps.localhost:3000/`

## Expected Behavior
- Only DPS school users should be able to login from `http://dps.localhost:3000/`
- SVM school users should be blocked with error message

## Debugging Steps

### 1. Check Backend Logs

When you try to login, check your backend console. You should see logs like:

```
[TENANT] Detected localhost subdomain: dps from host: dps.localhost:3000
[TENANT] School resolved: Code=dps, ID=<school-id>, DB=school_dps_db
[LOGIN] Subdomain detected: dps, School ID: <school-id>, School Code: dps
[LOGIN] User found: user@example.com, Role: school_admin, School ID: <user-school-id>
```

### 2. Verify School Records in Database

Check your `central_db.schools` collection. Both schools should have:

```javascript
// DPS School
{
  "id": "...",
  "code": "dps",
  "subdomain": "dps",
  "db_name": "school_dps_db"
}

// SVM School  
{
  "id": "...",
  "code": "svm",
  "subdomain": "svm",
  "db_name": "school_svm_db"
}
```

### 3. Verify User Records

Check that users are in the correct databases:

**In `school_dps_db.users`:**
- DPS users should have `school_id` matching DPS school's `id`
- Should NOT have SVM users

**In `school_svm_db.users`:**
- SVM users should have `school_id` matching SVM school's `id`
- Should NOT have DPS users

### 4. Test the Fix

1. **Restart backend server** (to load new code)
2. **Try to login with DPS user** at `http://dps.localhost:3000/`
   - Should work ✅
3. **Try to login with SVM user** at `http://dps.localhost:3000/`
   - Should be blocked ❌
   - Should see error: "Access denied. You can only login through your school's portal."

### 5. Check What's Happening

If SVM users can still login, check:

1. **Are users in the wrong database?**
   - Check if SVM users exist in `school_dps_db`
   - If yes, they need to be moved to `school_svm_db`

2. **Do users have correct school_id?**
   - Check user records: `user.school_id` should match their school's `id`
   - If `school_id` is null or wrong, update it

3. **Is tenantResolver working?**
   - Check backend logs for `[TENANT]` messages
   - Should see school being resolved correctly

## Quick Fix Commands

### Check if user exists in wrong database:
```javascript
// In MongoDB shell or Compass
use school_dps_db
db.users.find({ email: "svm_user@example.com" })

use school_svm_db  
db.users.find({ email: "dps_user@example.com" })
```

### Fix user school_id:
```javascript
// Get school IDs first
use central_db
db.schools.find({}, { id: 1, code: 1, name: 1 })

// Update user's school_id
use school_dps_db
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { school_id: "<dps-school-id>" } }
)
```

## What the Code Does Now

1. **TenantResolver** detects `dps.localhost` and sets:
   - `req.schoolId` = DPS school's ID
   - `req.schoolDb` = `school_dps_db` database
   - `req.schoolCode` = "dps"

2. **Login Function**:
   - ONLY searches in `school_dps_db` (not other databases)
   - If user not found → Reject login
   - If user found → Validate `user.school_id === req.schoolId`
   - If mismatch → Reject with error message

## If Still Not Working

1. Check backend logs for `[TENANT]` and `[LOGIN]` messages
2. Verify school records have correct `subdomain` field
3. Verify users are in correct databases
4. Verify users have correct `school_id` values
5. Make sure backend server was restarted after code changes

