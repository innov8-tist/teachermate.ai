# Application Architecture

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      index.tsx (Main)                        │
│  - State management (activeTab, showMenu, etc.)             │
│  - Tab navigation logic                                      │
│  - Splash screen handling                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─────────────────────────────────┐
                              │                                 │
                    ┌─────────▼─────────┐          ┌──────────▼──────────┐
                    │      Header       │          │  BottomNavigation   │
                    │  - Menu button    │          │  - Tab switching    │
                    │  - App title      │          │  - Active state     │
                    │  - Profile icon   │          └─────────────────────┘
                    └───────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┬─────────────────────┐
        │                     │                     │                     │
┌───────▼────────┐  ┌────────▼─────────┐  ┌───────▼────────┐  ┌────────▼─────────┐
│  HomeScreen    │  │ EvaluationScreen │  │ ProfileScreen  │  │  COMapperContainer│
│  - Stats cards │  │ - Image picker   │  │ - User info    │  │  - Sub-navigation │
│  - Menu cards  │  │ - Submit button  │  │ - Coming soon  │  └──────────┬────────┘
└────────────────┘  └──────────────────┘  └────────────────┘             │
                                                                           │
                    ┌──────────────────────────────────────────────────────┤
                    │                     │                                │
        ┌───────────▼──────────┐  ┌──────▼──────────┐  ┌────────────────▼─────────┐
        │ COCreationScreen     │  │  MyCOsScreen    │  │  CODetailsScreen         │
        │ - Semester selector  │  │  - CO list      │  │  - Question mappings     │
        │ - Subject selector   │  │  - Delete CO    │  │  - CO numbers            │
        │ - IA selector        │  └─────────────────┘  └──────────────────────────┘
        │ - Image upload       │           │
        └──────────────────────┘  ┌────────▼────────────┐
                                  │ StudentSheetScreen  │
                                  │ - Camera/Gallery    │
                                  │ - Image preview     │
                                  └─────────────────────┘
```

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         User Interaction                          │
└────────────────────────────────┬─────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Screen Component      │
                    │  (e.g., COCreationScreen)│
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Custom Hook          │
                    │  (e.g., useImagePicker) │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    API Service          │
                    │  (e.g., coService)      │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Backend API          │
                    │  (FastAPI Server)       │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Response             │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    Update UI            │
                    │  (setState, Alert)      │
                    └─────────────────────────┘
```

## Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      coService                               │
├─────────────────────────────────────────────────────────────┤
│  fetchSubjects(semester)                                     │
│    └─> GET /subject_fetch/{semester}                        │
│                                                              │
│  createCO(data)                                              │
│    └─> POST /co_creation                                    │
│        └─> FormData: subject_name, sem, ia_number, co_image │
│                                                              │
│  fetchMyCOs()                                                │
│    └─> GET /co_fetch/{teacherId}                            │
│                                                              │
│  fetchCODetails(subjectId)                                   │
│    └─> GET /co_fetch_details/{subjectId}                    │
│                                                              │
│  deleteCO(coId)                                              │
│    └─> DELETE /co_delete/{coId}                             │
└─────────────────────────────────────────────────────────────┘
```

## State Management

### Main App State (index.tsx)
```typescript
- isLoading: boolean           // Splash screen state
- activeTab: TabType           // Current active tab
- showMenu: boolean            // Drawer menu visibility
- coSubScreen: COSubScreen     // CO Mapper sub-screen
```

### CO Creation State
```typescript
- selectedSemester: string
- subjects: Subject[]
- subjectName: string
- selectedOption: '1' | '2' | null
- uploadedImage: string | null
- isSubmitting: boolean
```

### My COs State
```typescript
- myCOs: CO[]
```

### CO Details State
```typescript
- coDetails: CODetail[]
```

### Evaluation State
```typescript
- selectedImage: string | null
```

## File Organization

```
app/
├── constants/
│   └── api.ts                    # API configuration
│       ├── BASE_URL
│       ├── API_ENDPOINTS
│       └── TEACHER_ID
│
├── hooks/
│   └── use-image-picker.ts       # Image picker logic
│       ├── pickFromGallery()
│       └── pickFromCamera()
│
├── services/
│   └── api/
│       ├── co-service.ts         # CO API calls
│       └── index.ts              # Service exports
│
├── components/
│   ├── shared/
│   │   ├── header.tsx            # App header
│   │   └── bottom-navigation.tsx # Tab navigation
│   └── co/
│       └── drawer-menu.tsx       # CO drawer menu
│
└── screens/
    ├── home/
    │   └── home-screen.tsx       # Dashboard
    ├── evaluation/
    │   └── evaluation-screen.tsx # Answer sheets
    ├── profile/
    │   └── profile-screen.tsx    # User profile
    └── co-mapper/
        ├── co-mapper-container.tsx    # Container
        ├── co-creation-screen.tsx     # Create CO
        ├── my-cos-screen.tsx          # List COs
        ├── co-details-screen.tsx      # CO details
        ├── student-sheet-screen.tsx   # Student sheet
        └── index.ts                   # Exports
```

## Benefits of This Architecture

1. **Single Responsibility**: Each file has one clear purpose
2. **Loose Coupling**: Components don't depend on each other directly
3. **High Cohesion**: Related code is grouped together
4. **Easy Testing**: Each layer can be tested independently
5. **Scalability**: Easy to add new features
6. **Maintainability**: Changes are localized
7. **Reusability**: Components and services can be reused
8. **Type Safety**: Full TypeScript support throughout
