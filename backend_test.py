#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class SchoolManagementAPITester:
    def __init__(self, base_url="https://learnstack-20.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_data = None
        self.school_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            self.failed_tests.append({"name": name, "details": details})
            print(f"❌ {name} - {details}")

    def make_request(self, method, endpoint, data=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            headers['Authorization'] = f'Bearer {self.session_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            return success, response.json() if response.content else {}, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    def test_super_admin_registration(self):
        """Test super admin registration"""
        timestamp = int(datetime.now().timestamp())
        test_data = {
            "email": f"superadmin_{timestamp}@test.com",
            "password": "TestPass123!",
            "name": f"Super Admin {timestamp}",
            "role": "super_admin"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', test_data, 200)
        
        if success and 'user' in response and 'session_token' in response:
            self.session_token = response['session_token']
            self.user_data = response['user']
            self.log_test("Super Admin Registration", True)
            return True
        else:
            self.log_test("Super Admin Registration", False, f"Status: {status}, Response: {response}")
            return False

    def test_login(self):
        """Test login with registered user"""
        if not self.user_data:
            self.log_test("Login Test", False, "No user data available")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', login_data, 200)
        
        if success and 'user' in response and 'session_token' in response:
            self.session_token = response['session_token']
            self.log_test("Login", True)
            return True
        else:
            self.log_test("Login", False, f"Status: {status}, Response: {response}")
            return False

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        success, response, status = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success and 'email' in response and 'role' in response:
            self.log_test("Auth Me", True)
            return True
        else:
            self.log_test("Auth Me", False, f"Status: {status}, Response: {response}")
            return False

    def test_create_school(self):
        """Test school creation (Super Admin only)"""
        timestamp = int(datetime.now().timestamp())
        school_data = {
            "name": f"Test School {timestamp}",
            "code": f"TS{timestamp}",
            "admin_email": f"admin_{timestamp}@testschool.com",
            "admin_name": f"School Admin {timestamp}",
            "admin_password": "AdminPass123!",
            "address": "123 Test Street",
            "phone": "+1234567890"
        }
        
        success, response, status = self.make_request('POST', 'schools', school_data, 200)
        
        if success and 'id' in response:
            self.school_id = response['id']
            self.log_test("Create School", True)
            return True
        else:
            self.log_test("Create School", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_schools(self):
        """Test getting all schools"""
        success, response, status = self.make_request('GET', 'schools', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("Get Schools", True)
            return True
        else:
            self.log_test("Get Schools", False, f"Status: {status}, Response: {response}")
            return False

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response, status = self.make_request('GET', 'dashboard/stats', expected_status=200)
        
        if success and ('total_schools' in response or 'total_students' in response):
            self.log_test("Dashboard Stats", True)
            return True
        else:
            self.log_test("Dashboard Stats", False, f"Status: {status}, Response: {response}")
            return False

    def test_school_admin_login(self):
        """Test school admin login"""
        if not self.school_id:
            self.log_test("School Admin Login", False, "No school created")
            return False
            
        # Get the school admin credentials from the created school
        timestamp = int(datetime.now().timestamp())
        login_data = {
            "email": f"admin_{timestamp}@testschool.com",
            "password": "AdminPass123!"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', login_data, 200)
        
        if success and 'user' in response and response['user']['role'] == 'school_admin':
            # Store the school admin session for further tests
            self.school_admin_token = response['session_token']
            self.log_test("School Admin Login", True)
            return True
        else:
            self.log_test("School Admin Login", False, f"Status: {status}, Response: {response}")
            return False

    def test_students_endpoint(self):
        """Test students endpoint"""
        # Switch to school admin token if available
        original_token = self.session_token
        if hasattr(self, 'school_admin_token'):
            self.session_token = self.school_admin_token
            
        success, response, status = self.make_request('GET', 'students', expected_status=200)
        
        # Restore original token
        self.session_token = original_token
        
        if success and isinstance(response, list):
            self.log_test("Get Students", True)
            return True
        else:
            self.log_test("Get Students", False, f"Status: {status}, Response: {response}")
            return False

    def test_classes_endpoint(self):
        """Test classes endpoint"""
        # Switch to school admin token if available
        original_token = self.session_token
        if hasattr(self, 'school_admin_token'):
            self.session_token = self.school_admin_token
            
        success, response, status = self.make_request('GET', 'classes', expected_status=200)
        
        # Restore original token
        self.session_token = original_token
        
        if success and isinstance(response, list):
            self.log_test("Get Classes", True)
            return True
        else:
            self.log_test("Get Classes", False, f"Status: {status}, Response: {response}")
            return False

    def test_announcements_endpoint(self):
        """Test announcements endpoint"""
        success, response, status = self.make_request('GET', 'announcements', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("Get Announcements", True)
            return True
        else:
            self.log_test("Get Announcements", False, f"Status: {status}, Response: {response}")
            return False

    def test_library_books_endpoint(self):
        """Test library books endpoint"""
        success, response, status = self.make_request('GET', 'library/books', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("Get Library Books", True)
            return True
        else:
            self.log_test("Get Library Books", False, f"Status: {status}, Response: {response}")
            return False

    def test_exams_endpoint(self):
        """Test exams endpoint"""
        success, response, status = self.make_request('GET', 'exams', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("Get Exams", True)
            return True
        else:
            self.log_test("Get Exams", False, f"Status: {status}, Response: {response}")
            return False

    def test_staff_endpoint(self):
        """Test staff endpoint"""
        success, response, status = self.make_request('GET', 'staff', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_test("Get Staff", True)
            return True
        else:
            self.log_test("Get Staff", False, f"Status: {status}, Response: {response}")
            return False

    def test_logout(self):
        """Test logout functionality"""
        success, response, status = self.make_request('POST', 'auth/logout', expected_status=200)
        
        if success and 'message' in response:
            self.session_token = None
            self.log_test("Logout", True)
            return True
        else:
            self.log_test("Logout", False, f"Status: {status}, Response: {response}")
            return False

    def test_protected_route_without_auth(self):
        """Test that protected routes require authentication"""
        # Clear session token
        temp_token = self.session_token
        self.session_token = None
        
        success, response, status = self.make_request('GET', 'schools', expected_status=401)
        
        # Restore session token
        self.session_token = temp_token
        
        if status == 401:
            self.log_test("Protected Route Without Auth", True)
            return True
        else:
            self.log_test("Protected Route Without Auth", False, f"Expected 401, got {status}")
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting School Management System Backend Tests")
        print("=" * 60)
        
        # Authentication Tests
        print("\n📋 Authentication Tests")
        if not self.test_super_admin_registration():
            print("❌ Cannot proceed without super admin registration")
            return self.get_results()
            
        self.test_login()
        self.test_auth_me()
        
        # Authorization Tests
        print("\n🔒 Authorization Tests")
        self.test_protected_route_without_auth()
        
        # School Management Tests
        print("\n🏫 School Management Tests")
        self.test_create_school()
        self.test_get_schools()
        self.test_school_admin_login()
        
        # Dashboard Tests
        print("\n📊 Dashboard Tests")
        self.test_dashboard_stats()
        
        # Entity Endpoints Tests
        print("\n📚 Entity Endpoints Tests")
        self.test_students_endpoint()
        self.test_classes_endpoint()
        self.test_announcements_endpoint()
        self.test_library_books_endpoint()
        self.test_exams_endpoint()
        self.test_staff_endpoint()
        
        # Cleanup Tests
        print("\n🧹 Cleanup Tests")
        self.test_logout()
        
        return self.get_results()

    def get_results(self):
        """Get test results summary"""
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n✅ Success Rate: {success_rate:.1f}%")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": len(self.failed_tests),
            "success_rate": success_rate,
            "failed_test_details": self.failed_tests
        }

def main():
    """Main test execution"""
    tester = SchoolManagementAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results["failed_tests"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())