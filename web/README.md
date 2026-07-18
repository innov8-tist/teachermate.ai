# TeacherMate Web Application

A modern, accessible web application for teachers built with React, TypeScript, TanStack Router, and Tailwind CSS.

## Features

### Authentication
- ✅ Professional login and registration pages
- ✅ Secure token-based authentication
- ✅ Profile picture upload support
- ✅ Password visibility toggle
- ✅ Form validation with helpful error messages

### CO Mapper
- ✅ Create CO (Course Outcome) mappings
- ✅ Upload CO mapping images
- ✅ View all CO mappings in card layout
- ✅ Download Excel reports
- ✅ Delete CO mappings
- ✅ Subject, semester, and IA tracking

### Dashboard
- ✅ Left sidebar navigation
- ✅ CO Mapper tab
- ✅ Profile tab
- ✅ User information display
- ✅ Quick logout

### Design
- ✅ Clean blue and white color theme
- ✅ Large, readable fonts optimized for elderly users
- ✅ Responsive design
- ✅ Accessible UI components

## Prerequisites

- Node.js 18+ or Bun
- Backend server running on http://localhost:8000

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5173 in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Environment Variables

Create a `.env` file with the following:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   └── CreateCODialog.tsx  # CO creation dialog
│   ├── lib/
│   │   ├── api.ts           # Auth API client
│   │   ├── co-api.ts        # CO Mapper API client
│   │   ├── auth.ts          # Authentication utilities
│   │   └── utils.ts         # Helper functions
│   ├── routes/
│   │   ├── index.tsx        # Home page
│   │   ├── login.tsx        # Login page
│   │   ├── register.tsx     # Registration page
│   │   ├── dashboard.tsx    # Dashboard layout
│   │   └── dashboard/
│   │       ├── index.tsx    # Dashboard redirect
│   │       ├── co-mapper.tsx # CO Mapper page
│   │       └── profile.tsx  # Profile page
│   └── main.tsx             # Application entry point
```

## Features Overview

### CO Mapper
The CO Mapper allows teachers to:
- Create course outcome mappings by uploading CO images
- Track assessments (IA1, IA2, IA3)
- Manage semester and student counts
- Download Excel reports with student marks
- Delete old mappings

### Profile
View your:
- Full name
- Email address
- Institution
- Profile picture

## API Integration

The application connects to the backend API at `VITE_API_BASE_URL`:

### Authentication Endpoints
- `POST /auth/login` - Teacher login
- `POST /auth/signup` - Teacher registration
- `GET /auth/me` - Get current teacher info

### CO Mapper Endpoints
- `GET /subject_fetch/:semester` - Get subjects
- `POST /co_creation` - Create CO mapping
- `GET /co_fetch/:teacherId` - Get teacher's COs
- `GET /co_fetch_details/:subjectId` - Get CO details
- `DELETE /co_delete/:coId` - Delete CO mapping
- `GET /co_download_excel/:subjectId` - Download Excel

## Technology Stack

- **React 19**: Latest features and performance
- **TypeScript**: Type safety and better DX
- **TanStack Router**: Type-safe routing with file-based structure
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Modern, accessible icons
- **Vite**: Fast build tool and HMR

## Design Decisions

### Color Theme (Blue & White Only)
- **Primary**: Blue 600 (#2563eb)
- **Background**: White (#ffffff)
- **Accents**: Blue 50-100 for subtle backgrounds
- **No dark mode**: Single theme for consistency

### Accessibility for Elderly Teachers
- **Large fonts**: Minimum 16px (base), with larger headings
- **High contrast**: Blue on white with excellent readability
- **Clear labels**: Descriptive, bold labels above inputs
- **Large touch targets**: 48px+ height for buttons and inputs
- **Simple navigation**: Clear calls-to-action and visual hierarchy

## Building for Production

```bash
npm run build
```

The build output will be in the `dist/` directory, ready for deployment.

## License

Private - TeacherMate.ai
