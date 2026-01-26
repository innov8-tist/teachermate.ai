# 🎯 Authentication Setup Checklist

Use this checklist to ensure everything is set up correctly.

## ✅ Pre-Setup

- [ ] Docker is installed and running
- [ ] Python 3.12+ is installed
- [ ] `uv` package manager is installed
- [ ] PostgreSQL client (optional, for debugging)

## 📦 Installation Steps

### 1. Install Dependencies
```bash
cd backend
uv sync
```
- [ ] All dependencies installed successfully
- [ ] No error messages

### 2. Environment Configuration
```bash
cp .env.sample .env
```
- [ ] `.env` file created
- [ ] `JWT_SECRET_KEY` is set (change for production!)
- [ ] Database URL is correct
- [ ] AWS/LocalStack settings are configured

### 3. Database Migration
```bash
alembic upgrade head
```
- [ ] Migration completed successfully
- [ ] No error messages
- [ ] Teacher table has new columns (email, institution, pfp_url, password_hash)

### 4. Docker Services
```bash
# From root directory
docker-compose up -d
```
- [ ] PostgreSQL container is running
- [ ] LocalStack container is running
- [ ] FastAPI container is running
- [ ] All health checks pass

Check with:
```bash
docker-compose ps
```

### 5. Verify Services

**PostgreSQL:**
```bash
docker-compose logs db | tail -20
```
- [ ] No error messages
- [ ] Database is ready to accept connections

**LocalStack:**
```bash
docker-compose logs localstack | tail -20
```
- [ ] S3 service is running
- [ ] No error messages

**FastAPI:**
```bash
docker-compose logs api | tail -20
```
- [ ] Server started successfully
- [ ] No import errors
- [ ] Listening on port 8000

### 6. Test Authentication
```bash
cd backend
python test_auth.py
```
- [ ] Signup test passes
- [ ] Login test passes
- [ ] Get current teacher test passes
- [ ] Update profile test passes
- [ ] Invalid token test passes

## 🧪 Manual Testing

### Test 1: Signup
```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -F "teacher_name=Test Teacher" \
  -F "email=test@example.com" \
  -F "password=testpass123" \
  -F "institution=Test University"
```
- [ ] Returns 201 status code
- [ ] Returns access_token
- [ ] Returns teacher object with all fields

### Test 2: Login
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -F "email=test@example.com" \
  -F "password=testpass123"
```
- [ ] Returns 200 status code
- [ ] Returns access_token
- [ ] Returns teacher object

### Test 3: Get Profile
```bash
# Replace YOUR_TOKEN with actual token from login
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns 200 status code
- [ ] Returns teacher information
- [ ] All fields are present

### Test 4: Interactive Docs
Visit: http://localhost:8000/docs
- [ ] Swagger UI loads
- [ ] Auth endpoints are visible
- [ ] Can test endpoints from UI

## 🔍 Verification Checklist

### Database
```bash
# Connect to PostgreSQL
docker exec -it $(docker-compose ps -q db) psql -U postgres -d app
```

Run in psql:
```sql
\dt                          -- List tables
\d "Teacher"                 -- Describe Teacher table
SELECT * FROM "Teacher";     -- View teachers
```
- [ ] Teacher table exists
- [ ] Has columns: id, name, email, institution, pfp_url, password_hash
- [ ] Email has unique constraint
- [ ] Test teacher record exists

### S3 (LocalStack)
```bash
# List buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# List bucket contents
aws --endpoint-url=http://localhost:4566 s3 ls s3://teacher-pfp-bucket/
```
- [ ] teacher-pfp-bucket exists
- [ ] Can list bucket contents

### API Endpoints
- [ ] GET `/` returns welcome message
- [ ] POST `/auth/signup` works
- [ ] POST `/auth/login` works
- [ ] GET `/auth/me` requires authentication
- [ ] PUT `/auth/me` requires authentication
- [ ] DELETE `/auth/me/pfp` requires authentication

## 🔐 Security Checklist

### Development
- [ ] JWT_SECRET_KEY is set (any value is fine)
- [ ] LocalStack is used for S3
- [ ] HTTP is acceptable

### Production (Before Deployment)
- [ ] JWT_SECRET_KEY is a strong random value (32+ characters)
- [ ] Real AWS S3 is configured (not LocalStack)
- [ ] HTTPS/TLS is enabled
- [ ] CORS is properly configured
- [ ] Password minimum length is 8+ characters
- [ ] Rate limiting is implemented
- [ ] Email verification is added
- [ ] Password reset is implemented
- [ ] Refresh tokens are implemented
- [ ] Account lockout after failed attempts
- [ ] Input sanitization is in place
- [ ] Monitoring/logging is set up

## 📱 React Native Integration Checklist

- [ ] AsyncStorage is installed
- [ ] API client is created
- [ ] Auth context is set up
- [ ] Login screen is implemented
- [ ] Signup screen is implemented
- [ ] Profile screen is implemented
- [ ] Token is stored after login/signup
- [ ] Token is sent with all API requests
- [ ] 401 errors redirect to login
- [ ] Logout clears token

## 🐛 Troubleshooting

If something doesn't work, check:

1. **Docker Issues**
   ```bash
   docker-compose down
   docker-compose up -d
   docker-compose logs -f
   ```

2. **Database Issues**
   ```bash
   alembic current
   alembic upgrade head
   docker-compose restart db
   ```

3. **LocalStack Issues**
   ```bash
   docker-compose restart localstack
   ./init_localstack.sh
   ```

4. **API Issues**
   ```bash
   docker-compose logs api
   docker-compose restart api
   ```

## ✅ Final Verification

Run all tests:
```bash
# Automated tests
python test_auth.py

# Check all services
docker-compose ps

# View logs
docker-compose logs --tail=50
```

All green? You're ready to integrate with React Native! 🎉

## 📚 Next Steps

1. Read `README_AUTH.md` for complete documentation
2. Review `AUTH_FLOW.md` to understand the flow
3. Check `QUICK_START_AUTH.md` for quick reference
4. Start integrating with React Native frontend

## 🎓 Learning Resources

- FastAPI Docs: https://fastapi.tiangolo.com/
- JWT: https://jwt.io/
- Bcrypt: https://en.wikipedia.org/wiki/Bcrypt
- AWS S3: https://aws.amazon.com/s3/
- LocalStack: https://localstack.cloud/

---

**Need Help?**
- Check the troubleshooting section
- Review the logs
- Read the documentation files
- Test with `test_auth.py`

**Status**: Ready for React Native integration ✅
