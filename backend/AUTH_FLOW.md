# Authentication Flow Diagram

## 🔄 Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEACHER AUTHENTICATION FLOW                  │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ React Native │
│    Client    │
└──────┬───────┘
       │
       │ 1. POST /auth/signup
       │    (teacher_name, email, password, institution, pfp)
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ routes/auth.py                                             │  │
│  │  ├─ Validate email uniqueness                             │  │
│  │  ├─ Validate password length (min 6)                      │  │
│  │  └─ Validate file type (if pfp provided)                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ services/s3_service.py                                     │  │
│  │  ├─ Upload pfp to S3 (LocalStack)                         │  │
│  │  └─ Return pfp_url                                        │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ auth/security.py                                           │  │
│  │  └─ Hash password with bcrypt                             │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ db_service/db_schema.py                                    │  │
│  │  └─ Create Teacher record in PostgreSQL                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ auth/security.py                                           │  │
│  │  └─ Create JWT token (expires in 7 days)                  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 2. Response: { access_token, teacher }
       ▼
┌──────────────┐
│ React Native │
│  ├─ Store token in AsyncStorage                                   │
│  └─ Navigate to home screen                                       │
└──────────────┘


═══════════════════════════════════════════════════════════════════


┌──────────────┐
│ React Native │
│    Client    │
└──────┬───────┘
       │
       │ 3. POST /auth/login
       │    (email, password)
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ routes/auth.py                                             │  │
│  │  └─ Find teacher by email                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ auth/security.py                                           │  │
│  │  └─ Verify password with bcrypt                           │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ auth/security.py                                           │  │
│  │  └─ Create JWT token (expires in 7 days)                  │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 4. Response: { access_token, teacher }
       ▼
┌──────────────┐
│ React Native │
│  ├─ Store token in AsyncStorage                                   │
│  └─ Navigate to home screen                                       │
└──────────────┘


═══════════════════════════════════════════════════════════════════


┌──────────────┐
│ React Native │
│    Client    │
└──────┬───────┘
       │
       │ 5. GET /auth/me
       │    Headers: { Authorization: "Bearer <token>" }
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ auth/dependencies.py                                       │  │
│  │  ├─ Extract token from Authorization header               │  │
│  │  └─ Decode JWT token                                      │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ auth/security.py                                           │  │
│  │  ├─ Verify token signature                                │  │
│  │  ├─ Check expiration                                      │  │
│  │  └─ Extract teacher_id from token                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ db_service/db_schema.py                                    │  │
│  │  └─ Fetch Teacher by ID                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ routes/auth.py                                             │  │
│  │  └─ Return teacher info                                   │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 6. Response: { id, teacher_name, email, institution, pfp_url }
       ▼
┌──────────────┐
│ React Native │
│  └─ Display teacher profile                                       │
└──────────────┘


═══════════════════════════════════════════════════════════════════


┌──────────────┐
│ React Native │
│    Client    │
└──────┬───────┘
       │
       │ 7. PUT /auth/me
       │    Headers: { Authorization: "Bearer <token>" }
       │    Body: { teacher_name, institution, pfp }
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                         FastAPI Backend                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ auth/dependencies.py                                       │  │
│  │  └─ Authenticate teacher (same as above)                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ services/s3_service.py                                     │  │
│  │  ├─ Delete old pfp (if exists)                            │  │
│  │  ├─ Upload new pfp to S3                                  │  │
│  │  └─ Return new pfp_url                                    │  │
│  └────────────────────────────────────────────────────────────┘  │
│         │                                                          │
│         ▼                                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ db_service/db_schema.py                                    │  │
│  │  └─ Update Teacher record                                 │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
       │
       │ 8. Response: { updated teacher info }
       ▼
┌──────────────┐
│ React Native │
│  └─ Update UI with new info                                       │
└──────────────┘
```

## 🔑 JWT Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": 1,              // teacher_id
    "exp": 1738195200      // expiration timestamp
  },
  "signature": "..."
}
```

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                        Teacher Table                         │
├─────────────────────────────────────────────────────────────┤
│ id              │ SERIAL PRIMARY KEY                         │
│ name            │ VARCHAR NOT NULL                           │
│ email           │ VARCHAR UNIQUE NOT NULL (indexed)          │
│ institution     │ VARCHAR                                    │
│ pfp_url         │ VARCHAR                                    │
│ password_hash   │ VARCHAR NOT NULL                           │
└─────────────────────────────────────────────────────────────┘
```

## 🪣 S3 Storage Structure

```
teacher-pfp-bucket/
└── teacher-pfp/
    ├── uuid-1.jpg
    ├── uuid-2.png
    ├── uuid-3.jpeg
    └── ...
```

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Security Layers                         │
├─────────────────────────────────────────────────────────────┤
│ 1. HTTPS/TLS          │ Encrypt data in transit             │
│ 2. JWT Signature      │ Verify token authenticity           │
│ 3. Token Expiration   │ Limit token lifetime (7 days)       │
│ 4. Bcrypt Hashing     │ Secure password storage             │
│ 5. Email Uniqueness   │ Prevent duplicate accounts          │
│ 6. File Validation    │ Only allow image uploads            │
│ 7. CORS               │ Control API access                  │
└─────────────────────────────────────────────────────────────┘
```

## 🚨 Error Handling Flow

```
┌──────────────┐
│   Request    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Is token present?                                            │
│  ├─ No  → 401 Unauthorized                                  │
│  └─ Yes → Continue                                          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Is token valid?                                              │
│  ├─ No  → 401 Invalid credentials                           │
│  └─ Yes → Continue                                          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Is token expired?                                            │
│  ├─ Yes → 401 Token expired                                 │
│  └─ No  → Continue                                          │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ Does teacher exist?                                          │
│  ├─ No  → 401 Teacher not found                             │
│  └─ Yes → ✅ Authenticated                                  │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Component Interaction

```
┌─────────────────────────────────────────────────────────────────┐
│                     Component Interaction                        │
└─────────────────────────────────────────────────────────────────┘

    React Native Client
           │
           │ HTTP Requests
           ▼
    ┌──────────────┐
    │   FastAPI    │
    │   Server     │
    └──────┬───────┘
           │
           ├─────────────────┬─────────────────┬──────────────────┐
           │                 │                 │                  │
           ▼                 ▼                 ▼                  ▼
    ┌──────────┐      ┌──────────┐     ┌──────────┐      ┌──────────┐
    │   Auth   │      │    S3    │     │   DB     │      │  Routes  │
    │  Module  │      │ Service  │     │ Service  │      │          │
    └──────────┘      └──────────┘     └──────────┘      └──────────┘
         │                  │                 │                  │
         │                  │                 │                  │
         ▼                  ▼                 ▼                  ▼
    JWT & Bcrypt      LocalStack S3     PostgreSQL        Business
                                                           Logic
```

## 🔄 Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        Token Lifecycle                           │
└─────────────────────────────────────────────────────────────────┘

1. Login/Signup
   └─> Create JWT token (7 days expiration)
        └─> Store in AsyncStorage

2. API Requests
   └─> Add token to Authorization header
        └─> Backend validates token
             └─> Process request

3. Token Expiration (after 7 days)
   └─> Backend returns 401
        └─> Client clears token
             └─> Redirect to login

4. Logout
   └─> Client removes token from AsyncStorage
        └─> Redirect to login
```

## 🎯 Best Practices Implemented

✅ **Separation of Concerns**: Auth logic separated from business logic  
✅ **Dependency Injection**: Easy to test and maintain  
✅ **Error Handling**: Comprehensive error messages  
✅ **Security**: Multiple layers of protection  
✅ **Scalability**: Stateless JWT authentication  
✅ **Maintainability**: Clear code structure  
✅ **Documentation**: Comprehensive docs and examples  

---

**For more details, see:**
- `README_AUTH.md` - Complete documentation
- `AUTH_SETUP.md` - Detailed setup guide
- `QUICK_START_AUTH.md` - Quick start guide
