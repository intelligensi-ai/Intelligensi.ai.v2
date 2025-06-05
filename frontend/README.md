# Intelligensi.ai Frontend

Modern React-based frontend for the Intelligensi.ai platform, built with TypeScript, Firebase, and Material-UI.

## Prerequisites

- Node.js (v16 or later)
- npm (v8 or later) or Yarn
- Firebase CLI (for deployment)
- Git

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/Intelligensi.ai.v2.git
cd Intelligensi.ai.v2/frontend
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Update the environment variables in `.env.local` with your Firebase and Supabase credentials:
   ```env
   # Firebase Configuration
   REACT_APP_FIREBASE_API_KEY=your_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
   REACT_APP_FIREBASE_PROJECT_ID=your_project_id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id

   # API Configuration (use local for development)
   REACT_APP_API_BASE_URL=http://localhost:5001/intelligensi-ai-v2/us-central1

   # Supabase Configuration
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 4. Start the Development Server

```bash
npm start
# or
yarn start
```

This will start the development server at [http://localhost:3000](http://localhost:3000). The page will automatically reload when you make changes.

## Available Scripts

### `npm start` or `yarn start`

Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm test` or `yarn test`

Launches the test runner in interactive watch mode.

### `npm run build` or `yarn build`

Builds the app for production to the `build` folder, bundling React in production mode and optimizing the build for best performance.

### `npm run lint` or `yarn lint`

Runs ESLint to check for code quality issues.

## Development

### Project Structure

- `src/` - Main source code
  - `components/` - Reusable UI components
  - `pages/` - Page components
  - `services/` - API and service integrations
  - `theme/` - MUI theme configuration
  - `utils/` - Utility functions and helpers
  - `App.tsx` - Main application component
  - `index.tsx` - Application entry point

### Code Style

- Follow the [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use TypeScript for type safety
- Prefer functional components with hooks
- Use MUI components where possible

## Deployment

### Production Build

```bash
npm run build
# or
yarn build
```

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
