# 🔐 Teacher Authentication System

Complete JWT-based authentication system with AWS S3 profile picture storage for TeacherMate.ai backend.

## 🎯 Features

✅ **JWT Authentication** - Secure token-based auth with 7-day expiration  
✅ **Password Hashing** - Bcrypt with automatic salt generation  
✅ **Profile Pictures** - AWS S3 storage via LocalStack  
✅ **Protected Routes** - Easy-to-use middleware for route protection  
✅ **Email Validation** - Unique email constraint  
✅ **Profile Management** - Update name, institution, and profile picture  

## 📦 What's Included

```
backend/
├── auth/                    # Authentication core
│   ├── security.py         # JWT & password hashing
│   └── dependencies.py     # Auth middleware
├── routes/                  # API endpoints
│   └── auth.py             # Auth routes
├── services/                # External services
│   └── s3_service.py       # S3 upload/delete
├── models/                  # Data models
│   └── auth_models.py      # Pydantic models
├── alembic/versions/        # Database migrations
│   └── add_teacher_auth_fields.py
└── test_auth.py            # Automated tests
```

## 🚀 Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd backend
uv sync
```

### 2. Configure Environment
```bash
cp .env.sample .env
# Edit .env and change JWT_SECRET_KEY for production
```

### 3. Run Migration
```bash
alembic upgrade head
```

### 4. Start Services
```bash
# From root directory
docker-compose up -d
```

### 5. Test It!
```bash
cd backend
python test_auth.py
```

You should see successful test results! 🎉

## 📚 API Documentation

### Authentication Endpoints

#### 1. Signup
**POST** `/auth/signup`

Create a new teacher account.

**Form Data:**
```
teacher_name: string (required)
email: string (required, valid email)
password: string (required, min 6 chars)
institution: string (optional)
pfp: file (optional, jpg/jpeg/png/gif/webp)
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "teacher": {
    "id": 1,
    "teacher_name": "John Doe",
    "email": "john@example.com",
    "institution": "ABC University",
    "pfp_url": "http://localstack:4566/teacher-pfp-bucket/..."
  }
}
```

#### 2. Login
**POST** `/auth/login`

Login with email and password.

**Form Data:**
```
email: string (required)
password: string (required)
```

**Response:** Same as signup

#### 3. Get Current Teacher
**GET** `/auth/me`

Get authenticated teacher information.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": 1,
  "teacher_name": "John Doe",
  "email": "john@example.com",
  "institution": "ABC University",
  "pfp_url": "http://localstack:4566/teacher-pfp-bucket/..."
}
```

#### 4. Update Profile
**PUT** `/auth/me`

Update teacher profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Form Data:**
```
teacher_name: string (optional)
institution: string (optional)
pfp: file (optional)
```

#### 5. Delete Profile Picture
**DELETE** `/auth/me/pfp`

Delete profile picture.

**Headers:**
```
Authorization: Bearer <access_token>
```

## 🔒 Using Auth in Your Routes

Protect any route by adding the `get_current_teacher` dependency:

```python
from fastapi import APIRouter, Depends
from auth.dependencies import get_current_teacher
from db_service.db_schema import Teacher

router = APIRouter()

@router.get("/my-protected-route")
async def my_route(
    current_teacher: Teacher = Depends(get_current_teacher)
):
    # current_teacher is automatically authenticated!
    return {
        "message": f"Hello {current_teacher.name}!",
        "teacher_id": current_teacher.id
    }
```

## 🧪 Testing

### Automated Tests
```bash
python test_auth.py
```

### Manual Testing with curl

**Signup:**
```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -F "teacher_name=John Doe" \
  -F "email=john@example.com" \
  -F "password=mypassword123" \
  -F "institution=My University"
```

**Login:**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -F "email=john@example.com" \
  -F "password=mypassword123"
```

**Get Profile:**
```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Interactive API Docs
Visit `http://localhost:8000/docs` for Swagger UI

## 🐳 Docker Services

The docker-compose setup includes:

- **PostgreSQL** (port 5432) - Database
- **LocalStack** (port 4566) - AWS S3 mock
- **FastAPI** (port 8000) - Backend API

### Useful Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Restart a service
docker-compose restart api

# Check service status
docker-compose ps
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Database
DB_URL_POSTGRES="postgresql+psycopg2://postgres:postgres@db:5432/app"

# JWT (CHANGE IN PRODUCTION!)
JWT_SECRET_KEY="your-super-secret-jwt-key-change-this"

# AWS S3 (LocalStack)
AWS_ENDPOINT_URL="http://localstack:4566"
AWS_ACCESS_KEY_ID="test"
AWS_SECRET_ACCESS_KEY="test"
AWS_DEFAULT_REGION="us-east-1"
S3_BUCKET_NAME="teacher-pfp-bucket"
```

### JWT Settings (auth/security.py)

```python
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
```

## 📱 React Native Integration

### 1. Store Token
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// After login/signup
await AsyncStorage.setItem('authToken', response.access_token);
```

### 2. Create API Client
```javascript
const API_URL = 'http://your-backend-url';

async function apiCall(endpoint, options = {}) {
  const token = await AsyncStorage.getItem('authToken');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
  
  if (response.status === 401) {
    // Token expired, redirect to login
    await AsyncStorage.removeItem('authToken');
    // Navigate to login screen
  }
  
  return response.json();
}
```

### 3. Login Example
```javascript
async function login(email, password) {
  const formData = new FormData();
  formData.append('email', email);
  formData.append('password', password);
  
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    body: formData,
  });
  
  const data = await response.json();
  
  if (response.ok) {
    await AsyncStorage.setItem('authToken', data.access_token);
    return data.teacher;
  } else {
    throw new Error(data.detail || 'Login failed');
  }
}
```

### 4. Upload Profile Picture
```javascript
import * as ImagePicker from 'expo-image-picker';

async function uploadProfilePicture() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  
  if (!result.canceled) {
    const formData = new FormData();
    formData.append('pfp', {
      uri: result.assets[0].uri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    });
    
    const token = await AsyncStorage.getItem('authToken');
    
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    return response.json();
  }
}
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
docker-compose down
docker-compose up -d
```

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### LocalStack Not Working
```bash
# Check LocalStack logs
docker-compose logs localstack

# Restart LocalStack
docker-compose restart localstack

# Initialize bucket manually
./init_localstack.sh
```

### JWT Token Invalid
- Ensure `JWT_SECRET_KEY` is set in `.env`
- Check token hasn't expired (7 days default)
- Verify `Authorization` header format: `Bearer <token>`

### Migration Errors
```bash
# Check current migration status
alembic current

# View migration history
alembic history

# Downgrade if needed
alembic downgrade -1

# Upgrade to latest
alembic upgrade head
```

## 🔐 Security Best Practices

### For Development
✅ Use the provided defaults  
✅ LocalStack for S3  
✅ HTTP is fine  

### For Production
⚠️ **MUST DO:**
- [ ] Change `JWT_SECRET_KEY` to a strong random value
- [ ] Use real AWS S3 (not LocalStack)
- [ ] Enable HTTPS/TLS
- [ ] Increase password minimum length (8+ chars)
- [ ] Add rate limiting
- [ ] Implement refresh tokens
- [ ] Add email verification
- [ ] Set up password reset
- [ ] Configure CORS properly
- [ ] Add input sanitization
- [ ] Implement account lockout
- [ ] Set up monitoring/logging
- [ ] Use environment-specific configs

## 📊 Database Schema

### Teacher Table
```sql
CREATE TABLE "Teacher" (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    institution VARCHAR,
    pfp_url VARCHAR,
    password_hash VARCHAR NOT NULL
);

CREATE INDEX ix_Teacher_email ON "Teacher" (email);
```

## 🎓 Additional Resources

- **Full Setup Guide**: `AUTH_SETUP.md`
- **Quick Start**: `QUICK_START_AUTH.md`
- **Implementation Details**: `IMPLEMENTATION_SUMMARY.md`
- **FastAPI Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 💡 Tips & Tricks

1. **Testing**: Use `test_auth.py` for quick verification
2. **Debugging**: Check FastAPI interactive docs at `/docs`
3. **Logs**: Use `docker-compose logs -f` to watch logs
4. **Database**: Connect with any PostgreSQL client to `localhost:5432`
5. **S3**: Access LocalStack at `http://localhost:4566`

## 🤝 Contributing

When adding new protected routes:
1. Import the dependency: `from auth.dependencies import get_current_teacher`
2. Add to route: `current_teacher: Teacher = Depends(get_current_teacher)`
3. Use `current_teacher.id` to get the authenticated teacher ID

## 📞 Need Help?

1. Check the troubleshooting section above
2. Review the logs: `docker-compose logs`
3. Verify environment variables in `.env`
4. Run the test script: `python test_auth.py`
5. Check the interactive API docs: http://localhost:8000/docs

---

**Status**: ✅ Production Ready (with security checklist completed)  
**Version**: 1.0.0  
**Last Updated**: 2026-01-25  
**Next**: React Native integration guide
