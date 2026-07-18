# Auth Module Refactor Analysis

## Current State Analysis

### Current Structure
```
backend/
├── auth/
│   ├── __init__.py
│   ├── dependencies.py    # JWT middleware & get_current_teacher
│   └── security.py        # Password hashing, JWT creation/decode
├── routes/
│   └── auth.py           # All auth endpoints (signup, login, /me, etc.)
├── models/
│   └── auth_models.py    # Pydantic schemas for request/response
└── db_service/
    └── db_schema.py      # SQLAlchemy Teacher model
```

### Issues Identified

#### 1. **Inconsistent Architecture**
- Auth logic scattered across multiple locations
- No clear separation of concerns
- Routes file contains business logic (should be in service layer)
- Direct database queries in route handlers
- S3 file upload logic mixed with auth logic

#### 2. **Missing Layers**
- ❌ **No Service Layer**: Routes directly interact with DB and external services
- ❌ **No Repository Pattern**: Database queries scattered everywhere
- ❌ **No Validators**: Email/password validation done inline in routes
- ❌ **No DTOs**: Using Form(...) instead of proper request models
- ❌ **No Exception Handling**: Generic HTTPExceptions everywhere

#### 3. **Code Quality Issues**
- Mixed responsibilities in routes (auth + file upload + validation)
- Hardcoded validation logic (password length, file extensions)
- No proper error messages or constants
- Debug print statements in production code
- No logging infrastructure

#### 4. **Security Concerns**
- Password validation too simple (only length check)
- No rate limiting
- No email verification
- No refresh tokens
- JWT secret key has weak default
- No password strength requirements

#### 5. **Testing Challenges**
- Tight coupling makes unit testing difficult
- No dependency injection patterns
- Hard to mock database and S3 operations

---

## Proposed Architecture (Clean Architecture / Layered Approach)

### New Structure
```
backend/
└── modules/
    └── auth/
        ├── __init__.py
        ├── router.py              # FastAPI routes (thin layer)
        ├── service.py             # Business logic
        ├── repository.py          # Database operations
        ├── schemas.py             # Pydantic models (request/response)
        ├── models.py              # SQLAlchemy models (moved from db_service)
        ├── dependencies.py        # FastAPI dependencies
        ├── security.py            # Password hashing, JWT utilities
        ├── validators.py          # Input validation logic
        ├── exceptions.py          # Custom exceptions
        └── constants.py           # Configuration constants
```

### Layer Responsibilities

#### **1. Router Layer** (`router.py`)
- Define FastAPI routes
- Handle HTTP request/response
- Validate input using Pydantic schemas
- Call service layer
- Return responses
- **Should NOT**: contain business logic, database queries, or external service calls

#### **2. Service Layer** (`service.py`)
- Business logic implementation
- Orchestrate operations across repositories
- Handle file uploads (S3)
- Transaction management
- Error handling and business rules
- **Should NOT**: know about HTTP or databases directly

#### **3. Repository Layer** (`repository.py`)
- Database operations (CRUD)
- Query building
- Data mapping between ORM and domain models
- **Should NOT**: contain business logic

#### **4. Schemas** (`schemas.py`)
- Request/response models (Pydantic)
- DTOs (Data Transfer Objects)
- Validation rules

#### **5. Models** (`models.py`)
- SQLAlchemy ORM models
- Database schema definition

#### **6. Dependencies** (`dependencies.py`)
- FastAPI dependency injection
- Authentication middleware
- Current user retrieval

#### **7. Security** (`security.py`)
- Password hashing/verification
- JWT token creation/validation
- Security utilities

#### **8. Validators** (`validators.py`)
- Complex validation logic
- Email format checks
- Password strength validation
- Business rule validation

#### **9. Exceptions** (`exceptions.py`)
- Custom exception classes
- Error codes and messages
- Centralized error handling

#### **10. Constants** (`constants.py`)
- Configuration values
- Magic numbers/strings
- Allowed file types, etc.

---

## Benefits of Proposed Architecture

### 1. **Separation of Concerns**
- Each file has single responsibility
- Easy to locate specific functionality
- Changes isolated to relevant layer

### 2. **Testability**
- Easy to mock dependencies
- Unit test each layer independently
- Clear interfaces between layers

### 3. **Maintainability**
- Clear structure for new developers
- Consistent patterns across codebase
- Easy to add new features

### 4. **Reusability**
- Service layer can be used by multiple routes
- Repository can be used by multiple services
- Security utilities shared across modules

### 5. **Scalability**
- Easy to add new auth methods (OAuth, SSO)
- Simple to implement caching
- Can extract to microservice later

---

## Migration Strategy

### Phase 1: Extract Service Layer
1. Create `AuthService` class
2. Move business logic from routes to service
3. Keep routes thin

### Phase 2: Extract Repository Layer
4. Create `AuthRepository` class
5. Move database queries to repository
6. Abstract database access

### Phase 3: Improve Validation
7. Create validators module
8. Add password strength validation
9. Add email validation rules

### Phase 4: Error Handling
10. Create custom exceptions
11. Centralize error messages
12. Add proper logging

### Phase 5: Security Improvements
13. Add refresh token support
14. Implement rate limiting
15. Add email verification (optional)

---

## Example Code Structure

### router.py (Thin)
```python
@router.post("/signup", response_model=TokenResponse)
async def signup(
    request: SignupRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    """Register new teacher"""
    return await auth_service.signup(request)
```

### service.py (Business Logic)
```python
class AuthService:
    def __init__(self, repository: AuthRepository, s3_service: S3Service):
        self.repository = repository
        self.s3_service = s3_service
    
    async def signup(self, request: SignupRequest) -> TokenResponse:
        # Validate email not exists
        if await self.repository.email_exists(request.email):
            raise EmailAlreadyExistsException()
        
        # Validate password strength
        validate_password_strength(request.password)
        
        # Upload profile picture if provided
        pfp_url = await self._upload_profile_picture(request.pfp)
        
        # Create teacher
        teacher = await self.repository.create_teacher(
            name=request.teacher_name,
            email=request.email,
            password_hash=get_password_hash(request.password),
            institution=request.institution,
            pfp_url=pfp_url
        )
        
        # Generate token
        access_token = create_access_token({"sub": teacher.id})
        
        return TokenResponse(
            access_token=access_token,
            teacher=TeacherResponse.from_orm(teacher)
        )
```

### repository.py (Database)
```python
class AuthRepository:
    def __init__(self, db: Session):
        self.db = db
    
    async def email_exists(self, email: str) -> bool:
        return self.db.query(Teacher).filter(Teacher.email == email).first() is not None
    
    async def create_teacher(self, **kwargs) -> Teacher:
        teacher = Teacher(**kwargs)
        self.db.add(teacher)
        self.db.commit()
        self.db.refresh(teacher)
        return teacher
    
    async def get_by_email(self, email: str) -> Optional[Teacher]:
        return self.db.query(Teacher).filter(Teacher.email == email).first()
    
    async def get_by_id(self, teacher_id: int) -> Optional[Teacher]:
        return self.db.query(Teacher).filter(Teacher.id == teacher_id).first()
```

---

## Decision Required

Before proceeding, please confirm:

1. ✅ Do you want to adopt the **modules/auth/** structure?
2. ✅ Should we follow the **3-layer architecture** (Router → Service → Repository)?
3. ✅ Keep all auth code in one module vs splitting across backend?
4. ✅ Move Teacher model from `db_service/` to `modules/auth/`?
5. ✅ Should other modules (CO, Evaluation, Analytics) follow the same pattern?

Once confirmed, I'll proceed with the refactor!
