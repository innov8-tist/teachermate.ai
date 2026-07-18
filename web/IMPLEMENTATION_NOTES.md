# Implementation Notes

## Authentication Flow

### Login Process
1. User enters email and password
2. Form validation checks for empty fields
3. API call to `/auth/login` with FormData
4. On success:
   - Token stored in localStorage
   - User data stored in localStorage
   - Redirect to dashboard
5. On error:
   - Display error message
   - Keep form filled for retry

### Registration Process
1. User fills registration form:
   - Full name (required)
   - Email (required, validated)
   - Password (required, min 6 chars)
   - Confirm password (required, must match)
   - Institution (optional)
   - Profile picture (optional, max 5MB)
2. Client-side validation:
   - Email format check
   - Password length check
   - Password match check
   - Image file type and size validation
3. API call to `/auth/signup` with FormData
4. On success: Same as login
5. On error: Display specific error message

### Protected Routes
- Dashboard checks authentication on mount
- Redirects to login if no valid token
- Uses `authStorage.isAuthenticated()` helper

## State Management

### Authentication State
- Token: `localStorage.getItem('auth_token')`
- User: `localStorage.getItem('auth_user')` (JSON)

### Form State
- Login: email, password, showPassword, isLoading, error
- Register: formData object, profilePicture, previewUrl, showPassword, showConfirmPassword, isLoading, error

## Error Handling

### API Errors
- Network errors: "An unexpected error occurred"
- 400 Bad Request: Display backend error message
- 401 Unauthorized: "Incorrect email or password"
- 500 Server Error: Display backend error message

### Validation Errors
- Empty fields: "Please fill in all fields"
- Invalid email: "Please enter a valid email address"
- Short password: "Password must be at least 6 characters"
- Password mismatch: "Passwords do not match"
- Large file: "Image size should be less than 5MB"
- Invalid file type: "Please select a valid image file"

## UI/UX Features

### Accessibility
- Semantic HTML (label, input associations)
- ARIA roles for alerts
- Keyboard navigation support
- Focus indicators on all interactive elements
- High contrast ratios (WCAG AA compliant)

### Visual Feedback
- Loading states with spinner icons
- Disabled states during API calls
- Success: Immediate redirect
- Error: Prominent error banner
- Profile picture preview with remove option

### Password Fields
- Toggle visibility with eye icon
- Icons positioned absolutely within input
- Tab index -1 for toggle button (doesn't interfere with form flow)

## Future Enhancements

### Recommended Features
1. **Forgot Password**: Password reset flow
2. **Email Verification**: Verify email on signup
3. **Remember Me**: Persistent login option
4. **OAuth**: Google/Microsoft sign-in
5. **2FA**: Two-factor authentication
6. **Session Management**: Auto logout on token expiry
7. **Profile Editing**: Update profile from dashboard
8. **Loading Skeleton**: Better loading states

### Performance
- Lazy load routes with TanStack Router
- Optimize images with compression
- Add service worker for offline support
- Implement proper caching strategies

### Security
- Implement CSRF protection
- Add rate limiting feedback
- Sanitize all user inputs
- Implement content security policy
- Add security headers

## Testing Checklist

- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Register new account
- [ ] Register with existing email
- [ ] Upload profile picture
- [ ] Large profile picture (>5MB)
- [ ] Invalid file type
- [ ] Password mismatch
- [ ] Empty form submission
- [ ] Navigation between pages
- [ ] Logout functionality
- [ ] Protected route access
- [ ] Token persistence after refresh
- [ ] Responsive design (mobile/tablet/desktop)
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

## Common Issues

### Route Type Errors
If you see TypeScript errors about route types:
```bash
npm run dev  # Start dev server to generate route types
```

### API Connection Issues
Check backend is running:
```bash
# Backend should be running on http://localhost:8000
curl http://localhost:8000/docs
```

### CORS Errors
Ensure backend allows requests from http://localhost:5173

### Build Failures
Clear cache and rebuild:
```bash
rm -rf dist node_modules
npm install
npm run build
```
