# Refactoring Guide

## Overview
The `index.tsx` file has been refactored from a 1453-line monolithic file into a clean, modular architecture with separation of concerns.

## New Structure

```
app/
├── app/(tabs)/
│   ├── index.tsx              # Main entry point (clean, ~70 lines)
│   └── index-old.tsx          # Original file (backup)
│
├── screens/
│   ├── home/
│   │   └── home-screen.tsx    # Home dashboard
│   ├── evaluation/
│   │   └── evaluation-screen.tsx  # Answer sheet upload
│   ├── profile/
│   │   └── profile-screen.tsx     # User profile
│   └── co-mapper/
│       ├── co-mapper-container.tsx    # CO Mapper main container
│       ├── co-creation-screen.tsx     # Create new CO
│       ├── my-cos-screen.tsx          # List of COs
│       ├── co-details-screen.tsx      # CO mapping details
│       └── student-sheet-screen.tsx   # Student answer sheet
│
├── components/
│   ├── shared/
│   │   ├── header.tsx              # App header
│   │   └── bottom-navigation.tsx   # Bottom tab navigation
│   └── co/
│       └── drawer-menu.tsx         # CO Mapper drawer menu
│
├── services/
│   └── api/
│       └── co-service.ts           # All CO-related API calls
│
├── hooks/
│   └── use-image-picker.ts         # Image picker hook
│
└── constants/
    └── api.ts                      # API endpoints & configuration
```

## Key Improvements

### 1. **Separation of Concerns**
- **Screens**: Each screen is now a separate component
- **Services**: API calls are centralized in service files
- **Components**: Reusable UI components extracted
- **Hooks**: Custom hooks for shared logic
- **Constants**: Configuration centralized

### 2. **API Service Layer**
All API calls are now in `services/api/co-service.ts`:
- `fetchSubjects(semester)` - Get subjects for a semester
- `createCO(data)` - Create a new CO
- `fetchMyCOs()` - Get all COs for teacher
- `fetchCODetails(subjectId)` - Get CO mapping details
- `deleteCO(coId)` - Delete a CO

### 3. **Reusable Hooks**
`use-image-picker.ts` provides:
- `pickFromGallery()` - Pick image from gallery
- `pickFromCamera()` - Capture image from camera

### 4. **Shared Components**
- `Header` - App header with menu button
- `BottomNavigation` - Tab navigation
- `DrawerMenu` - CO Mapper side menu

### 5. **Type Safety**
All components and services have proper TypeScript interfaces:
```typescript
interface Subject { name: string }
interface CO { id: number; ia: string; name: string; branch: string; sem: number }
interface CODetail { q_no: string; co_no: string }
```

## Configuration

### API Endpoints
Update `app/constants/api.ts` to change the backend URL:
```typescript
const BASE_URL = 'http://10.0.2.2:8000';  // Android emulator
// const BASE_URL = 'http://localhost:8000';  // iOS simulator
// const BASE_URL = 'http://192.168.1.5:8000';  // Physical device
```

### Teacher ID
Update the teacher ID in `app/constants/api.ts`:
```typescript
export const TEACHER_ID = 1; // Replace with actual auth system
```

## Benefits

1. **Maintainability**: Each file has a single responsibility
2. **Testability**: Components and services can be tested independently
3. **Reusability**: Components and hooks can be reused across the app
4. **Scalability**: Easy to add new features without touching existing code
5. **Readability**: Code is organized and easy to understand
6. **Type Safety**: Full TypeScript support with proper interfaces

## Migration Notes

- The original file is backed up as `index-old.tsx`
- All functionality remains the same
- No breaking changes to the UI or behavior
- All styles are preserved in their respective components

## Next Steps

Consider these additional improvements:
1. Add error boundaries for better error handling
2. Implement proper authentication and user context
3. Add loading states and skeleton screens
4. Implement proper state management (Redux/Zustand)
5. Add unit tests for services and components
6. Add E2E tests for critical flows
7. Implement proper form validation
8. Add analytics tracking
9. Implement offline support
10. Add proper logging and monitoring
