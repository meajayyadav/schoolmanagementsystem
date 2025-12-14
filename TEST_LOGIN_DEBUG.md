# Test Login and Check Backend Logs

## Your Data is Correct ✅

The verification script shows:
- ✅ DPS users are in `school_dps_db` with correct `school_id`
- ✅ SVM users are in `school_svm_db` with correct `school_id`
- ✅ No duplicate users

## Next Step: Check Backend Logs

The issue must be in code execution. Let's debug:

### 1. Restart Backend Server

Make sure you restart the backend to load the latest code:

```bash
cd backend
# Stop current server (Ctrl+C)
npm start
```

### 2. Test Login and Watch Backend Console

**Test 1: DPS User at DPS Subdomain**
- Open: `http://dps.localhost:3000/`
- Try to login with DPS user credentials
- **Watch backend console** - you should see:

```
[TENANT] Detected localhost subdomain: dps from host: dps.localhost:3000
[TENANT] School resolved: Code=dps, ID=b8053743-fa4b-423e-ade2-e7a1555a841b, DB=school_dps_db
[LOGIN] Subdomain detected: dps, School ID: b8053743-fa4b-423e-ade2-e7a1555a841b, School Code: dps
[LOGIN] User found: <dps_user_email>, Role: <role>, School ID: b8053743-fa4b-423e-ade2-e7a1555a841b
```

**Test 2: SVM User at DPS Subdomain (Should FAIL)**
- Open: `http://dps.localhost:3000/`
- Try to login with SVM user credentials
- **Watch backend console** - you should see:

```
[TENANT] Detected localhost subdomain: dps from host: dps.localhost:3000
[TENANT] School resolved: Code=dps, ID=b8053743-fa4b-423e-ade2-e7a1555a841b, DB=school_dps_db
[LOGIN] Subdomain detected: dps, School ID: b8053743-fa4b-423e-ade2-e7a1555a841b, School Code: dps
[LOGIN] User <svm_user_email> not found in school database dps
```

**OR if user exists in DPS database (wrong!):**

```
[LOGIN] User found: <svm_user_email>, Role: <role>, School ID: ae219e70-6560-4a5a-9913-16e76eb3db20
[LOGIN] Access denied: User school_id (ae219e70-6560-4a5a-9913-16e76eb3db20) does not match requested school (b8053743-fa4b-423e-ade2-e7a1555a841b)
```

## What to Look For

### If you DON'T see `[TENANT]` logs:
- The tenantResolver isn't running
- Check if `tenantResolver` middleware is applied to auth routes
- Check if the host header is being received correctly

### If you see `[TENANT]` but `req.schoolId` is null:
- The subdomain detection isn't working
- Check the host header value in logs

### If you see user found but login succeeds:
- The validation check might be skipped
- Check if user is `super_admin` (they can login from any subdomain)
- Check if the validation code is being executed

## Quick Check: Are Users Super Admins?

Super admins can login from any subdomain. Check:

```javascript
// In MongoDB
use school_dps_db
db.users.find({}, { email: 1, role: 1 })

use school_svm_db
db.users.find({}, { email: 1, role: 1 })
```

If any user has `role: "super_admin"`, they can login from any subdomain (this is by design).

## Expected Behavior

### DPS User:
- ✅ Can login at `http://dps.localhost:3000/`
- ❌ Cannot login at `http://svm.localhost:3000/`

### SVM User:
- ✅ Can login at `http://svm.localhost:3000/`
- ❌ Cannot login at `http://dps.localhost:3000/`

### Super Admin:
- ✅ Can login at any subdomain (by design)

## If Still Not Working

1. **Copy the exact backend console output** when you try to login
2. **Check the user roles** - are they super_admin?
3. **Verify the host header** - is it `dps.localhost:3000` or something else?
4. **Check if backend code was saved and restarted**

