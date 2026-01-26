# Authentication Setup

## Installation

Install the required dependency:

```bash
cd app
npm install @react-native-async-storage/async-storage
```

## Features

- **Login/Signup Screens**: Minimal black and white design
- **Global State Management**: Auth context with AsyncStorage persistence
- **Protected Routes**: Automatic redirect to login if not authenticated
- **Token Management**: JWT token storage and retrieval

## Usage

### Using Auth Context

```typescript
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  const { teacher, token, login, logout } = useAuth();
  
  // Access current teacher
  console.log(teacher?.teacher_name);
  
  // Logout
  await logout();
}
```

### API Service

The auth service handles login and signup:

```typescript
import { authService } from '@/services/api/auth-service';

// Login
const response = await authService.login({ email, password });

// Signup
const response = await authService.signup({
  teacher_name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  institution: 'MIT'
});
```

## Routes

- `/auth/login` - Login screen
- `/auth/signup` - Signup screen
- `/(tabs)` - Protected main app (requires authentication)

## State Persistence

Authentication state is automatically persisted using AsyncStorage:
- Token stored at `@auth_token`
- Teacher data stored at `@teacher_data`

## Backend Integration

Make sure your backend is running on:
- Android Emulator: `http://10.0.2.2:8000`
- iOS Simulator: `http://localhost:8000`
- Physical Device: Update `BASE_URL` in `constants/api.ts` with your computer's IP
