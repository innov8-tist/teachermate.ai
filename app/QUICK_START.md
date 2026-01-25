# Quick Start Guide

## 🚀 Getting Started with the Refactored Code

### 1. Understanding the New Structure (2 minutes)

```
app/
├── constants/api.ts          👈 Configure your API here
├── services/api/             👈 All API calls here
├── hooks/                    👈 Reusable hooks here
├── components/shared/        👈 Shared UI components
└── screens/                  👈 All screens here
```

### 2. Configuration (1 minute)

Edit `app/constants/api.ts`:

```typescript
// Change this to your backend URL
const BASE_URL = 'http://10.0.2.2:8000';  // Android emulator
// const BASE_URL = 'http://localhost:8000';  // iOS simulator
// const BASE_URL = 'http://192.168.1.5:8000';  // Physical device

// Change this to actual teacher ID
export const TEACHER_ID = 1;
```

### 3. Run the App (1 minute)

```bash
cd app
npm start
```

### 4. Test Basic Functionality (5 minutes)

1. ✅ App loads with splash screen
2. ✅ Home screen shows stats
3. ✅ Click "Upload Answer Schema" → Goes to CO Mapper
4. ✅ Select semester → Subjects load
5. ✅ Upload image → Image displays
6. ✅ Submit → Success message

## 📁 Where to Find Things

### Need to change API endpoints?
→ `constants/api.ts`

### Need to modify API calls?
→ `services/api/co-service.ts`

### Need to change a screen?
→ `screens/[screen-name]/`

### Need to modify shared components?
→ `components/shared/`

### Need to add a new screen?
1. Create file in `screens/[new-screen]/`
2. Import in `index.tsx`
3. Add to navigation

## 🔧 Common Tasks

### Add a New API Endpoint

1. Add to `constants/api.ts`:
```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints
  NEW_ENDPOINT: `${BASE_URL}/new-endpoint`,
};
```

2. Add to `services/api/co-service.ts`:
```typescript
export const coService = {
  // ... existing methods
  async newMethod(): Promise<Data> {
    const response = await fetch(API_ENDPOINTS.NEW_ENDPOINT);
    return await response.json();
  },
};
```

3. Use in component:
```typescript
const data = await coService.newMethod();
```

### Add a New Screen

1. Create `screens/new-screen/new-screen.tsx`:
```typescript
import React from 'react';
import { View, Text } from 'react-native';

export const NewScreen: React.FC = () => {
  return (
    <View>
      <Text>New Screen</Text>
    </View>
  );
};
```

2. Import in `index.tsx`:
```typescript
import { NewScreen } from '@/screens/new-screen/new-screen';
```

3. Add to navigation:
```typescript
{activeTab === 'newScreen' && <NewScreen />}
```

### Add a New Reusable Component

1. Create `components/shared/new-component.tsx`:
```typescript
import React from 'react';
import { View, Text } from 'react-native';

interface NewComponentProps {
  title: string;
}

export const NewComponent: React.FC<NewComponentProps> = ({ title }) => {
  return (
    <View>
      <Text>{title}</Text>
    </View>
  );
};
```

2. Use anywhere:
```typescript
import { NewComponent } from '@/components/shared/new-component';

<NewComponent title="Hello" />
```

## 🐛 Troubleshooting

### API not connecting?
1. Check `constants/api.ts` has correct URL
2. Verify backend is running
3. Check network permissions

### Image picker not working?
1. Check permissions in `app.json`
2. Test on physical device
3. Check console for errors

### Screen not displaying?
1. Check import path
2. Verify component is exported
3. Check navigation logic

### TypeScript errors?
```bash
npm run type-check
```

## 📖 Documentation Files

- `REFACTORING_GUIDE.md` - Complete guide to the refactoring
- `ARCHITECTURE.md` - Architecture diagrams and explanations
- `REFACTORING_SUMMARY.md` - Summary of changes
- `BEFORE_AFTER.md` - Before/after comparison
- `MIGRATION_CHECKLIST.md` - Testing checklist
- `QUICK_START.md` - This file

## 🎯 Key Files to Know

| File | Purpose | When to Edit |
|------|---------|--------------|
| `constants/api.ts` | API config | Change backend URL |
| `services/api/co-service.ts` | API calls | Add/modify API calls |
| `hooks/use-image-picker.ts` | Image picking | Modify image picker logic |
| `components/shared/header.tsx` | App header | Change header UI |
| `components/shared/bottom-navigation.tsx` | Tab nav | Add/remove tabs |
| `screens/home/home-screen.tsx` | Home screen | Modify home screen |
| `screens/co-mapper/co-creation-screen.tsx` | CO creation | Modify CO creation |

## 💡 Tips

1. **Use the service layer** - Don't make API calls directly in components
2. **Reuse hooks** - Use `useImagePicker` instead of duplicating code
3. **Keep components small** - If a component gets too big, split it
4. **Use TypeScript** - Define interfaces for all data
5. **Follow the pattern** - Look at existing screens for examples

## 🚦 Quick Health Check

Run these commands to verify everything is working:

```bash
# Check for TypeScript errors
npm run type-check

# Check for linting issues
npm run lint

# Start the app
npm start
```

All green? You're good to go! 🎉

## 📞 Need Help?

1. Check the documentation files
2. Look at `index-old.tsx` for reference
3. Check console for errors
4. Compare with existing screens

## 🎓 Learning Path

1. **Day 1**: Read this file + `REFACTORING_SUMMARY.md`
2. **Day 2**: Explore the file structure
3. **Day 3**: Make a small change (e.g., add a button)
4. **Day 4**: Add a new screen
5. **Day 5**: Add a new API endpoint

## ✨ Best Practices

1. ✅ Keep components focused (one responsibility)
2. ✅ Use TypeScript interfaces
3. ✅ Handle errors properly
4. ✅ Add loading states
5. ✅ Test on multiple devices
6. ✅ Document complex logic
7. ✅ Use meaningful variable names
8. ✅ Keep files under 200 lines

## 🎉 You're Ready!

The refactored code is:
- ✅ Organized
- ✅ Maintainable
- ✅ Testable
- ✅ Scalable
- ✅ Well-documented

Happy coding! 🚀
