# Quick Start Guide - Authentication System

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd backend
uv sync
```

### Step 2: Update Environment Variables

```bash
# Copy the sample env file
cp .env.sample .env

# Edit .env and set your JWT secret (important for production!)
# For development, the defaults work fine
```

### Step 3: Run Database Migration

```bash
# Apply the new Teacher table schema
alembic upgrade head
```

### Step 4: Start All Services

From the root directory:

```bash
docker-compose up -d
```

This starts:
- ✅ PostgreSQL (port 5432)
- ✅ LocalStack S3 (port 4566)
- ✅ FastAPI Backend (port 8000)

### Step 5: Test the Authentication

```bash
cd backend
python test_auth.py
```

You should see successful test results! 🎉

## 📝 Quick API Examples

### Signup (Create Account)

```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -F "teacher_name=John Doe" \
  -F "email=john@example.com" \
  -F "password=mypassword123" \
  -F "institution=My University"
```

### Login

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -F "email=john@example.com" \
  -F "password=mypassword123"
```

Save the `access_token` from the response!

### Get Your Profile

```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### Upload Profile Picture

```bash
curl -X PUT "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -F "pfp=@/path/to/your/photo.jpg"
```

## 🔐 Using Auth in Your Routes

Protect any route by adding the `get_current_teacher` dependency:

```python
from fastapi import APIRouter, Depends
from auth.dependencies import get_current_teacher
from db_service.db_schema import Teacher

router = APIRouter()

@router.get("/my-protected-route")
async def my_route(current_teacher: Teacher = Depends(get_current_teacher)):
    # current_teacher is automatically authenticated!
    return {
        "message": f"Hello {current_teacher.name}!",
        "teacher_id": current_teacher.id,
        "email": current_teacher.email
    }
```

## 📱 React Native Integration (Next Step)

Once the backend is running, you can integrate with React Native:

1. Store the `access_token` in AsyncStorage
2. Add it to request headers: `Authorization: Bearer ${token}`
3. Handle 401 errors (token expired) by redirecting to login

Example React Native code coming in the next step!

## 🐛 Troubleshooting

**Port already in use?**
```bash
# Stop existing services
docker-compose down

# Start fresh
docker-compose up -d
```

**Database connection error?**
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs db
```

**LocalStack not working?**
```bash
# Check LocalStack logs
docker-compose logs localstack

# Restart LocalStack
docker-compose restart localstack
```

## 📚 Full Documentation

See `AUTH_SETUP.md` for complete documentation including:
- Detailed API reference
- Security best practices
- Production deployment guide
- Advanced configuration options

## ✅ What's Included

- ✅ JWT authentication with 7-day expiration
- ✅ Bcrypt password hashing
- ✅ Profile picture upload to S3 (LocalStack)
- ✅ Protected route middleware
- ✅ Email uniqueness validation
- ✅ Profile update endpoints
- ✅ Comprehensive error handling

Ready to integrate with React Native? Let me know! 🚀
