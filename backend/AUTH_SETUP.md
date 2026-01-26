# Teacher Authentication System Setup

This document explains the authentication system implemented for the TeacherMate.ai backend.

## Features

- **JWT-based Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password hashing for security
- **Profile Picture Upload**: AWS S3 (LocalStack) integration for profile pictures
- **Protected Routes**: Middleware for protecting authenticated endpoints

## Database Schema

The `Teacher` table now includes:
- `id`: Primary key
- `name`: Teacher's full name
- `email`: Unique email address (used for login)
- `institution`: Optional institution name
- `pfp_url`: Profile picture URL (stored in S3)
- `password_hash`: Bcrypt hashed password

## API Endpoints

### 1. Signup
**POST** `/auth/signup`

Create a new teacher account.

**Form Data:**
- `teacher_name` (required): Teacher's full name
- `email` (required): Valid email address
- `password` (required): Minimum 6 characters
- `institution` (optional): Institution name
- `pfp` (optional): Profile picture file (jpg, jpeg, png, gif, webp)

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

### 2. Login
**POST** `/auth/login`

Login with email and password.

**Form Data:**
- `email` (required): Email address
- `password` (required): Password

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

### 3. Get Current Teacher
**GET** `/auth/me`

Get current authenticated teacher information.

**Headers:**
- `Authorization: Bearer <access_token>`

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

### 4. Update Profile
**PUT** `/auth/me`

Update teacher profile information.

**Headers:**
- `Authorization: Bearer <access_token>`

**Form Data:**
- `teacher_name` (optional): New name
- `institution` (optional): New institution
- `pfp` (optional): New profile picture

**Response:**
```json
{
  "id": 1,
  "teacher_name": "John Doe Updated",
  "email": "john@example.com",
  "institution": "XYZ University",
  "pfp_url": "http://localstack:4566/teacher-pfp-bucket/..."
}
```

### 5. Delete Profile Picture
**DELETE** `/auth/me/pfp`

Delete teacher profile picture.

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "message": "Profile picture deleted successfully"
}
```

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
uv sync
```

### 2. Update Environment Variables

Copy `.env.sample` to `.env` and update the values:

```bash
cp .env.sample .env
```

Make sure to change the `JWT_SECRET_KEY` in production!

### 3. Run Database Migrations

```bash
alembic upgrade head
```

### 4. Start Services with Docker Compose

From the root directory:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- LocalStack (for S3)
- FastAPI backend

### 5. Test the API

You can test the endpoints using curl, Postman, or any HTTP client.

**Example: Signup**
```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -F "teacher_name=John Doe" \
  -F "email=john@example.com" \
  -F "password=securepass123" \
  -F "institution=ABC University"
```

**Example: Login**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -F "email=john@example.com" \
  -F "password=securepass123"
```

**Example: Get Current Teacher**
```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Using Authentication in Other Routes

To protect any route, use the `get_current_teacher` dependency:

```python
from fastapi import APIRouter, Depends
from auth.dependencies import get_current_teacher
from db_service.db_schema import Teacher

router = APIRouter()

@router.get("/protected-route")
async def protected_route(
    current_teacher: Teacher = Depends(get_current_teacher)
):
    return {
        "message": f"Hello {current_teacher.name}!",
        "teacher_id": current_teacher.id
    }
```

## Security Notes

1. **JWT Secret**: Always use a strong, random secret key in production
2. **HTTPS**: Use HTTPS in production to protect tokens in transit
3. **Token Expiration**: Tokens expire after 7 days by default
4. **Password Requirements**: Minimum 6 characters (consider increasing in production)
5. **S3 in Production**: Replace LocalStack with real AWS S3 in production

## LocalStack S3 Configuration

LocalStack mimics AWS S3 behavior locally. The configuration:
- Endpoint: `http://localstack:4566`
- Bucket: `teacher-pfp-bucket` (auto-created)
- Access: Public read (configure as needed)

In production, replace with real AWS S3:
```env
AWS_ENDPOINT_URL=""  # Leave empty for real AWS
AWS_ACCESS_KEY_ID="your-real-key"
AWS_SECRET_ACCESS_KEY="your-real-secret"
AWS_DEFAULT_REGION="us-east-1"
S3_BUCKET_NAME="your-production-bucket"
```

## Troubleshooting

### LocalStack not starting
- Ensure Docker is running
- Check LocalStack logs: `docker-compose logs localstack`
- Verify port 4566 is not in use

### Database connection errors
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Run migrations: `alembic upgrade head`

### JWT token errors
- Verify `JWT_SECRET_KEY` is set in `.env`
- Check token expiration
- Ensure `Authorization` header format: `Bearer <token>`

## Next Steps

Now that the backend authentication is set up, you can:
1. Integrate with React Native frontend
2. Add password reset functionality
3. Implement refresh tokens
4. Add email verification
5. Set up role-based access control
