# Profile & Signup Updates

## Changes Made

### 1. Signup Screen Enhancement
- ✅ Added profile picture upload functionality
- ✅ Users can tap the camera icon to select an image from their gallery
- ✅ Image preview shown after selection
- ✅ Profile picture is optional during signup
- ✅ Uses expo-image-picker for image selection

### 2. Profile Screen
- ✅ Displays user profile picture (or default icon if none)
- ✅ Shows all user information:
  - Full Name
  - Email
  - Institution (if provided)
  - User ID
- ✅ Logout button with confirmation dialog
- ✅ Clean black and white design matching the auth screens

### 3. Updated Files

**New:**
- `app/screens/profile/profile-screen.tsx` - Complete profile screen with logout

**Modified:**
- `app/app/(auth)/signup.tsx` - Added image picker and upload
- `app/services/api/auth-service.ts` - Added pfp parameter to signup

## Features

### Profile Picture Upload
```typescript
// In signup screen
const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  // Image is sent to backend during signup
};
```

### Profile Display
- Shows profile picture from backend URL
- Falls back to user icon if no picture
- Displays all user data in organized cards
- Logout button with confirmation

### Logout Flow
1. User taps logout button
2. Confirmation dialog appears
3. On confirm:
   - Clears auth token from AsyncStorage
   - Clears teacher data from AsyncStorage
   - Redirects to login screen

## Installation

No additional dependencies needed - expo-image-picker is already in package.json.

Just run:
```bash
cd app
npm install
```

## Usage

### Access Profile Screen
The profile screen is already integrated in the bottom navigation. Users can:
1. Tap the profile tab in bottom navigation
2. View their information
3. Tap logout to sign out

### Upload Profile Picture
During signup:
1. Tap the camera icon circle
2. Grant photo library permissions
3. Select an image
4. Image is cropped to 1:1 aspect ratio
5. Uploaded during account creation

## Backend Integration

The profile picture is sent as multipart/form-data to:
- `POST /auth/signup` with `pfp` field

The backend stores it in S3 (LocalStack) and returns the URL in the response.
