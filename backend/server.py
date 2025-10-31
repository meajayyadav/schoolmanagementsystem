from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
# Central database for super admin and school registry
central_db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# Auth URLs
EMERGENT_AUTH_URL = "https://auth.emergentagent.com"
EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str  # super_admin, school_admin, teacher, student, parent
    school_id: Optional[str] = None
    password_hash: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class School(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # unique school code
    admin_email: str
    admin_name: str
    db_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    grade_level: str
    class_section: str
    roll_number: str
    enrollment_date: datetime
    parent_ids: List[str] = []
    date_of_birth: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Teacher(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subjects: List[str] = []
    classes_assigned: List[str] = []
    employee_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Parent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    children_ids: List[str] = []
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Class(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    grade: str
    section: str
    teacher_id: Optional[str] = None
    subjects: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Attendance(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    date: str  # YYYY-MM-DD format
    status: str  # present, absent, late, excused
    marked_by: str  # teacher user_id
    remarks: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Grade(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    subject: str
    exam_type: str  # quiz, midterm, final, assignment
    marks: float
    max_marks: float
    teacher_id: str
    date: str
    remarks: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Timetable(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    class_id: str
    day: str  # Monday, Tuesday, etc.
    periods: List[Dict[str, Any]] = []  # [{"time": "09:00-10:00", "subject": "Math", "teacher_id": "..."}]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Fee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    fee_type: str  # tuition, transport, library, etc.
    amount: float
    due_date: str
    paid: bool = False
    payment_date: Optional[str] = None
    payment_method: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Announcement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    created_by: str  # user_id
    target_roles: List[str] = []  # empty means all
    priority: str = "normal"  # low, normal, high
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LibraryBook(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    author: str
    isbn: Optional[str] = None
    quantity: int
    available: int
    category: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LibraryLoan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    book_id: str
    student_id: str
    issue_date: str
    due_date: str
    return_date: Optional[str] = None
    status: str = "issued"  # issued, returned, overdue
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Exam(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    class_id: str
    subjects: List[Dict[str, Any]] = []  # [{"subject": "Math", "date": "2025-01-15", "time": "09:00-12:00"}]
    start_date: str
    end_date: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReportCard(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    exam_id: str
    grades: Dict[str, Any] = {}  # {"Math": {"marks": 85, "grade": "A"}}
    total_marks: float
    percentage: float
    rank: Optional[int] = None
    remarks: Optional[str] = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Staff(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    position: str
    department: str
    employee_id: str
    join_date: str
    salary: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Input Models
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str
    school_id: Optional[str] = None

class SchoolCreate(BaseModel):
    name: str
    code: str
    admin_email: str
    admin_name: str
    admin_password: str
    address: Optional[str] = None
    phone: Optional[str] = None

class SessionIdRequest(BaseModel):
    session_id: str
    school_id: Optional[str] = None

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, school_id: Optional[str] = None) -> str:
    payload = {
        "user_id": user_id,
        "school_id": school_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(session_token: Optional[str] = Cookie(None), authorization: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    token = session_token
    if not token and authorization:
        token = authorization.credentials
    
    if not token:
        return None
    
    # Check in central database first (super admin)
    session = await central_db.user_sessions.find_one({"session_token": token})
    if session:
        expires_at = session["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if expires_at < datetime.now(timezone.utc):
            await central_db.user_sessions.delete_one({"session_token": token})
            return None
        user = await central_db.users.find_one({"id": session["user_id"]}, {"_id": 0})
        if user:
            return User(**user)
    
    # Check all school databases
    schools = await central_db.schools.find({}, {"_id": 0}).to_list(1000)
    for school in schools:
        school_db = client[school["db_name"]]
        session = await school_db.user_sessions.find_one({"session_token": token})
        if session:
            expires_at = session["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expires_at < datetime.now(timezone.utc):
                await school_db.user_sessions.delete_one({"session_token": token})
                return None
            user = await school_db.users.find_one({"id": session["user_id"]}, {"_id": 0})
            if user:
                return User(**user)
    
    return None

async def require_auth(user: Optional[User] = Depends(get_current_user)) -> User:
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

def get_school_db(school_id: str):
    # This would be called after verifying school exists
    school = central_db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return client[school["db_name"]]

# Authentication Routes
@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    # For super_admin, register in central DB
    if data.role == "super_admin":
        db = central_db
    else:
        if not data.school_id:
            raise HTTPException(status_code=400, detail="school_id required for non-super admin users")
        school = await central_db.schools.find_one({"id": data.school_id}, {"_id": 0})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        db = client[school["db_name"]]
    
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=data.email,
        name=data.name,
        role=data.role,
        school_id=data.school_id,
        password_hash=hash_password(data.password)
    )
    
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    session_token = create_jwt_token(user.id, data.school_id)
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    )
    
    session_dict = session.model_dump()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    return {"user": user, "session_token": session_token}

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    # Try central DB first
    user = await central_db.users.find_one({"email": data.email}, {"_id": 0})
    db = central_db
    
    # If not found, check all schools
    if not user:
        schools = await central_db.schools.find({}, {"_id": 0}).to_list(1000)
        for school in schools:
            school_db = client[school["db_name"]]
            user = await school_db.users.find_one({"email": data.email}, {"_id": 0})
            if user:
                db = school_db
                break
    
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_obj = User(**user)
    session_token = create_jwt_token(user_obj.id, user_obj.school_id)
    
    session = UserSession(
        user_id=user_obj.id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    )
    
    session_dict = session.model_dump()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    return {"user": user_obj, "session_token": session_token}

@api_router.post("/auth/google")
async def google_auth(data: SessionIdRequest, response: Response):
    headers = {"X-Session-ID": data.session_id}
    resp = requests.get(EMERGENT_SESSION_URL, headers=headers)
    
    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid session ID")
    
    user_data = resp.json()
    
    # Determine which DB to use
    if data.school_id:
        school = await central_db.schools.find_one({"id": data.school_id}, {"_id": 0})
        if not school:
            raise HTTPException(status_code=404, detail="School not found")
        db = client[school["db_name"]]
        role = "school_admin"  # Default role for school login
    else:
        db = central_db
        role = "super_admin"
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if not existing_user:
        # Create new user
        user = User(
            email=user_data["email"],
            name=user_data["name"],
            role=role,
            school_id=data.school_id,
            picture=user_data.get("picture")
        )
        user_dict = user.model_dump()
        user_dict['created_at'] = user_dict['created_at'].isoformat()
        await db.users.insert_one(user_dict)
    else:
        user = User(**existing_user)
    
    session_token = user_data["session_token"]
    session = UserSession(
        user_id=user.id,
        session_token=session_token,
        expires_at=datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    )
    
    session_dict = session.model_dump()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    await db.user_sessions.insert_one(session_dict)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_DAYS * 24 * 60 * 60,
        path="/"
    )
    
    return {"user": user, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_auth)):
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, user: User = Depends(require_auth), session_token: Optional[str] = Cookie(None)):
    if session_token:
        # Remove from central DB
        await central_db.user_sessions.delete_one({"session_token": session_token})
        
        # Remove from school DB if applicable
        if user.school_id:
            school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
            if school:
                school_db = client[school["db_name"]]
                await school_db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# School Management Routes (Super Admin only)
@api_router.post("/schools", response_model=School)
async def create_school(data: SchoolCreate, user: User = Depends(require_auth)):
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can create schools")
    
    existing = await central_db.schools.find_one({"code": data.code})
    if existing:
        raise HTTPException(status_code=400, detail="School code already exists")
    
    db_name = f"school_{data.code.lower()}_db"
    school = School(
        name=data.name,
        code=data.code,
        admin_email=data.admin_email,
        admin_name=data.admin_name,
        db_name=db_name,
        address=data.address,
        phone=data.phone
    )
    
    school_dict = school.model_dump()
    school_dict['created_at'] = school_dict['created_at'].isoformat()
    await central_db.schools.insert_one(school_dict)
    
    # Create school database and admin user
    school_db = client[db_name]
    admin_user = User(
        email=data.admin_email,
        name=data.admin_name,
        role="school_admin",
        school_id=school.id,
        password_hash=hash_password(data.admin_password)
    )
    
    admin_dict = admin_user.model_dump()
    admin_dict['created_at'] = admin_dict['created_at'].isoformat()
    await school_db.users.insert_one(admin_dict)
    
    return school

@api_router.get("/schools", response_model=List[School])
async def get_schools(user: User = Depends(require_auth)):
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admins can view all schools")
    
    schools = await central_db.schools.find({}, {"_id": 0}).to_list(1000)
    return schools

@api_router.get("/schools/{school_id}", response_model=School)
async def get_school(school_id: str, user: User = Depends(require_auth)):
    if user.role != "super_admin" and user.school_id != school_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    return School(**school)

# Student Management Routes
@api_router.post("/students", response_model=Student)
async def create_student(data: Student, user: User = Depends(require_auth)):
    if user.role not in ["super_admin", "school_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    school_db = client[school["db_name"]]
    student_dict = data.model_dump()
    student_dict['enrollment_date'] = student_dict['enrollment_date'].isoformat()
    student_dict['created_at'] = student_dict['created_at'].isoformat()
    await school_db.students.insert_one(student_dict)
    
    return data

@api_router.get("/students", response_model=List[Student])
async def get_students(user: User = Depends(require_auth)):
    if not user.school_id:
        raise HTTPException(status_code=400, detail="No school associated")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    school_db = client[school["db_name"]]
    
    if user.role == "parent":
        parent = await school_db.parents.find_one({"user_id": user.id}, {"_id": 0})
        if not parent:
            return []
        students = await school_db.students.find({"id": {"$in": parent["children_ids"]}}, {"_id": 0}).to_list(1000)
    else:
        students = await school_db.students.find({}, {"_id": 0}).to_list(1000)
    
    return students

@api_router.get("/students/{student_id}", response_model=Student)
async def get_student(student_id: str, user: User = Depends(require_auth)):
    if not user.school_id:
        raise HTTPException(status_code=400, detail="No school associated")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    student = await school_db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return Student(**student)

# Attendance Routes
@api_router.post("/attendance", response_model=Attendance)
async def mark_attendance(data: Attendance, user: User = Depends(require_auth)):
    if user.role not in ["teacher", "school_admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can mark attendance")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    attendance_dict = data.model_dump()
    attendance_dict['created_at'] = attendance_dict['created_at'].isoformat()
    await school_db.attendance.insert_one(attendance_dict)
    
    return data

@api_router.get("/attendance/student/{student_id}", response_model=List[Attendance])
async def get_student_attendance(student_id: str, user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    attendance = await school_db.attendance.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    return attendance

# Grade Routes
@api_router.post("/grades", response_model=Grade)
async def add_grade(data: Grade, user: User = Depends(require_auth)):
    if user.role not in ["teacher", "school_admin"]:
        raise HTTPException(status_code=403, detail="Only teachers can add grades")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    grade_dict = data.model_dump()
    grade_dict['created_at'] = grade_dict['created_at'].isoformat()
    await school_db.grades.insert_one(grade_dict)
    
    return data

@api_router.get("/grades/student/{student_id}", response_model=List[Grade])
async def get_student_grades(student_id: str, user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    grades = await school_db.grades.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    return grades

# Class Routes
@api_router.post("/classes", response_model=Class)
async def create_class(data: Class, user: User = Depends(require_auth)):
    if user.role not in ["school_admin"]:
        raise HTTPException(status_code=403, detail="Only school admins can create classes")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    class_dict = data.model_dump()
    class_dict['created_at'] = class_dict['created_at'].isoformat()
    await school_db.classes.insert_one(class_dict)
    
    return data

@api_router.get("/classes", response_model=List[Class])
async def get_classes(user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    classes = await school_db.classes.find({}, {"_id": 0}).to_list(1000)
    return classes

# Timetable Routes
@api_router.post("/timetable", response_model=Timetable)
async def create_timetable(data: Timetable, user: User = Depends(require_auth)):
    if user.role not in ["school_admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    timetable_dict = data.model_dump()
    timetable_dict['created_at'] = timetable_dict['created_at'].isoformat()
    await school_db.timetable.insert_one(timetable_dict)
    
    return data

@api_router.get("/timetable/class/{class_id}", response_model=List[Timetable])
async def get_class_timetable(class_id: str, user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    timetable = await school_db.timetable.find({"class_id": class_id}, {"_id": 0}).to_list(1000)
    return timetable

# Fee Routes
@api_router.post("/fees", response_model=Fee)
async def create_fee(data: Fee, user: User = Depends(require_auth)):
    if user.role not in ["school_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    fee_dict = data.model_dump()
    fee_dict['created_at'] = fee_dict['created_at'].isoformat()
    await school_db.fees.insert_one(fee_dict)
    
    return data

@api_router.get("/fees/student/{student_id}", response_model=List[Fee])
async def get_student_fees(student_id: str, user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    fees = await school_db.fees.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    return fees

@api_router.patch("/fees/{fee_id}/pay")
async def pay_fee(fee_id: str, payment_method: str, user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    result = await school_db.fees.update_one(
        {"id": fee_id},
        {"$set": {"paid": True, "payment_date": datetime.now(timezone.utc).date().isoformat(), "payment_method": payment_method}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Fee not found")
    
    return {"message": "Payment successful"}

# Announcement Routes
@api_router.post("/announcements", response_model=Announcement)
async def create_announcement(data: Announcement, user: User = Depends(require_auth)):
    if user.role not in ["school_admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    announcement_dict = data.model_dump()
    announcement_dict['created_at'] = announcement_dict['created_at'].isoformat()
    await school_db.announcements.insert_one(announcement_dict)
    
    return data

@api_router.get("/announcements", response_model=List[Announcement])
async def get_announcements(user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    query = {}
    if user.role != "school_admin":
        query = {"$or": [{"target_roles": []}, {"target_roles": user.role}]}
    
    announcements = await school_db.announcements.find(query, {"_id": 0}).to_list(1000)
    return announcements

# Library Routes
@api_router.post("/library/books", response_model=LibraryBook)
async def add_library_book(data: LibraryBook, user: User = Depends(require_auth)):
    if user.role not in ["school_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    book_dict = data.model_dump()
    book_dict['created_at'] = book_dict['created_at'].isoformat()
    await school_db.library_books.insert_one(book_dict)
    
    return data

@api_router.get("/library/books", response_model=List[LibraryBook])
async def get_library_books(user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    books = await school_db.library_books.find({}, {"_id": 0}).to_list(1000)
    return books

@api_router.post("/library/loans", response_model=LibraryLoan)
async def issue_book(data: LibraryLoan, user: User = Depends(require_auth)):
    if user.role not in ["school_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    # Update book availability
    await school_db.library_books.update_one(
        {"id": data.book_id},
        {"$inc": {"available": -1}}
    )
    
    loan_dict = data.model_dump()
    loan_dict['created_at'] = loan_dict['created_at'].isoformat()
    await school_db.library_loans.insert_one(loan_dict)
    
    return data

@api_router.get("/library/loans/student/{student_id}", response_model=List[LibraryLoan])
async def get_student_loans(student_id: str, user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    loans = await school_db.library_loans.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    return loans

# Exam Routes
@api_router.post("/exams", response_model=Exam)
async def create_exam(data: Exam, user: User = Depends(require_auth)):
    if user.role not in ["school_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    exam_dict = data.model_dump()
    exam_dict['created_at'] = exam_dict['created_at'].isoformat()
    await school_db.exams.insert_one(exam_dict)
    
    return data

@api_router.get("/exams", response_model=List[Exam])
async def get_exams(user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    exams = await school_db.exams.find({}, {"_id": 0}).to_list(1000)
    return exams

# Report Card Routes
@api_router.post("/report-cards", response_model=ReportCard)
async def create_report_card(data: ReportCard, user: User = Depends(require_auth)):
    if user.role not in ["school_admin", "teacher"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    report_dict = data.model_dump()
    report_dict['generated_at'] = report_dict['generated_at'].isoformat()
    await school_db.report_cards.insert_one(report_dict)
    
    return data

@api_router.get("/report-cards/student/{student_id}", response_model=List[ReportCard])
async def get_student_report_cards(student_id: str, user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    reports = await school_db.report_cards.find({"student_id": student_id}, {"_id": 0}).to_list(1000)
    return reports

# Staff Routes
@api_router.post("/staff", response_model=Staff)
async def add_staff(data: Staff, user: User = Depends(require_auth)):
    if user.role not in ["school_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    staff_dict = data.model_dump()
    staff_dict['created_at'] = staff_dict['created_at'].isoformat()
    await school_db.staff.insert_one(staff_dict)
    
    return data

@api_router.get("/staff", response_model=List[Staff])
async def get_staff(user: User = Depends(require_auth)):
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    staff = await school_db.staff.find({}, {"_id": 0}).to_list(1000)
    return staff

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: User = Depends(require_auth)):
    if user.role == "super_admin":
        total_schools = await central_db.schools.count_documents({})
        return {"total_schools": total_schools}
    
    school = await central_db.schools.find_one({"id": user.school_id}, {"_id": 0})
    school_db = client[school["db_name"]]
    
    total_students = await school_db.students.count_documents({})
    total_teachers = await school_db.users.count_documents({"role": "teacher"})
    total_classes = await school_db.classes.count_documents({})
    
    return {
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_classes": total_classes
    }

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()