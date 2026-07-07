# University CMS - Monorepo

A modern monorepo setup with **NestJS backend** and **Next.js frontend** using **pnpm workspaces**.

## 📁 Project Structure

```
university-cms/
├── backend/          # NestJS backend application
├── frontend/         # Next.js frontend application
├── package.json      # Root workspace configuration
└── pnpm-workspace.yaml
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

Install pnpm globally:
```bash
npm install -g pnpm
```

### Installation

1. Navigate to the project root:
```bash
cd university-cms
```

2. Install all dependencies:
```bash
pnpm install
```

### Running the Project

Run both backend and frontend simultaneously:
```bash
pnpm dev
```

This command will start:
- **Backend**: NestJS server on `http://localhost:3001`
- **Frontend**: Next.js app on `http://localhost:3000`

### Individual Commands

**Backend only:**
```bash
cd backend
pnpm dev
```

**Frontend only:**
```bash
cd frontend
pnpm dev
```

### Other Available Scripts

Build the project:
```bash
pnpm build
```

Start production servers:
```bash
pnpm start
```

## 📚 Backend (NestJS)

- **Port**: 3001
- **API Endpoints**:
  - `GET /` - Welcome message
  - `GET /api/health` - Health check

### Backend Development

Navigate to backend folder:
```bash
cd backend
```

Available commands:
- `pnpm dev` - Run in watch mode
- `pnpm build` - Build the application
- `pnpm start:prod` - Run production build
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests

## 🎨 Frontend (Next.js)

- **Port**: 3000
- **Features**: 
  - React 18
  - TypeScript
  - Tailwind CSS
  - Zustand for state management
  - Axios for HTTP requests

### Frontend Development

Navigate to frontend folder:
```bash
cd frontend
```

Available commands:
- `pnpm dev` - Run development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Type check with TypeScript

## 🔗 Communication

- Frontend runs on port `3000`
- Backend runs on port `3001`
- Frontend can reach backend at `http://localhost:3001`

### Backend API Configuration

The frontend is pre-configured to communicate with the backend using the `API_BASE_URL` environment variable. 

Create a `.env.local` file in the frontend folder:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📦 Adding Dependencies

To add a dependency to a specific workspace:

```bash
# Add to backend
pnpm add -w @nestjs/new-package --filter=@university-cms/backend

# Add to frontend
pnpm add axios --filter=@university-cms/frontend
```

To add a dependency to all workspaces:
```bash
pnpm add -w shared-package -r
```

## 🛠️ Development Workflow

1. Both apps run in parallel with `pnpm dev`
2. Changes to backend code trigger automatic restart
3. Changes to frontend code trigger hot module replacement (HMR)
4. Check the browser console and terminal for errors

## 📝 Notes

- This is a private monorepo workspace
- Both applications are configured to run on different ports to avoid conflicts
- CORS is enabled on the backend for frontend requests
- TypeScript is configured for both backend and frontend

## 🤝 Contributing

Make sure to follow the linting rules:
```bash
pnpm lint
```

## 📄 License

UNLICENSED
