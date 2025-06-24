# Thoughts Application

## Overview

This is a full-stack web application called "Thoughts" - a multi-tenant platform for managing thoughts/notes within clinical organizations. The application features role-based access control with admin and user roles, allowing clinics to manage their users and collect thoughts from their members.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server:

- **Frontend**: React SPA with TypeScript using Vite as the build tool
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Session-based authentication with express-session
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management

## Key Components

### Frontend Architecture
- Built with React 18 and TypeScript
- Uses Wouter for client-side routing
- TanStack Query for server state management and caching
- shadcn/ui component library with Radix UI primitives
- Tailwind CSS for styling with a custom design system
- React Hook Form with Zod validation for form handling

### Backend Architecture
- Express.js server with TypeScript
- Session-based authentication with PostgreSQL session store
- RESTful API design with proper middleware structure
- File upload support with multer
- Comprehensive error handling and logging

### Database Schema
The application uses three main entities:
- **Users**: Stores user information with role-based access (admin/user)
- **Clinics**: Multi-tenant clinic management
- **Thoughts**: User-generated content linked to clinics and authors

All tables include proper foreign key relationships and timestamps.

### Authentication & Authorization
- Session-based authentication using express-session
- Role-based access control (admin/user)
- Middleware for protecting routes and checking permissions
- Password change functionality with proper validation

## Data Flow

1. **User Authentication**: Users log in through the frontend, which sends credentials to the backend
2. **Session Management**: Backend creates secure sessions stored in PostgreSQL
3. **API Requests**: Frontend makes authenticated requests using TanStack Query
4. **Data Validation**: Both frontend (Zod) and backend validate all data
5. **Database Operations**: Drizzle ORM handles all database interactions
6. **Response Handling**: Structured API responses with proper error handling

## External Dependencies

### Frontend Dependencies
- React ecosystem (React, React DOM, React Router via Wouter)
- UI components (Radix UI primitives, shadcn/ui)
- State management (TanStack Query)
- Form handling (React Hook Form, Hookform Resolvers)
- Validation (Zod)
- Styling (Tailwind CSS, class-variance-authority, clsx)
- Date handling (date-fns)
- Icons (Lucide React)

### Backend Dependencies
- Express.js with TypeScript support
- Database (Drizzle ORM, @neondatabase/serverless, connect-pg-simple)
- Session management (express-session)
- File handling (multer)
- Validation (Zod integration with Drizzle)

### Development Dependencies
- Vite for frontend bundling and development
- ESBuild for backend bundling
- TypeScript for type safety
- PostCSS and Autoprefixer for CSS processing

## Deployment Strategy

The application is configured for deployment with the following setup:
- **Development**: Uses `npm run dev` to start both frontend and backend in development mode
- **Production Build**: `npm run build` creates optimized bundles for both client and server
- **Production Start**: `npm run start` serves the production build
- **Database**: Uses PostgreSQL 16 module
- **Port Configuration**: Backend runs on port 5000 with external port 80
- **Environment**: Supports both development and production environments

The build process:
1. Frontend is built with Vite and outputs to `dist/public`
2. Backend is bundled with ESBuild to `dist/index.js`
3. Static files are served from the dist directory in production

## How to install and run

1. Clone the repository
```bash
git clone https://github.com/Ahmedsaid07/thoughts-app.git
cd thoughts-app
2. Install dependencies
bash
Copy
Edit
npm install
cd client
npm install
cd ..
3. Setup environment variables
Create a .env file in the root:

ini
Copy
Edit
DATABASE_URL=postgres://user:pass@localhost:5432/thoughts
JWT_SECRET=your_jwt_secret
UPLOAD_DIR=./uploads
VITE_API_URL=https://your-backend.up.railway.app/api
4. Run the app in development
bash
Copy
Edit
# In one terminal
npm run server

# In another terminal
cd client && npm run dev