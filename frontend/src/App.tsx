import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { Layout } from './components/layout/Layout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SkeletonLoader } from './components/common/SkeletonLoader';

// Dashboard removed — / redirects to /team
const Team      = lazy(() => import('./pages/Team'));
const Tasks     = lazy(() => import('./pages/Tasks'));
const Chat      = lazy(() => import('./pages/Chat'));
const AITools   = lazy(() => import('./pages/AITools'));
const Documents = lazy(() => import('./pages/Documents'));
const Login     = lazy(() => import('./pages/Login'));
const Register  = lazy(() => import('./pages/Register'));

function PageLoader() {
  return (
    <div className="p-6 space-y-4">
      <SkeletonLoader variant="text" lines={1} className="w-48" />
      <SkeletonLoader variant="chart" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <Layout>
                    <ErrorBoundary>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route path="/"          element={<Navigate to="/team" replace />} />
                          <Route path="/team"      element={<Team />} />
                          <Route path="/tasks"     element={<Tasks />} />
                          <Route path="/chat"      element={<Chat />} />
                          <Route path="/ai"        element={<AITools />} />
                          <Route path="/documents" element={<Documents />} />
                          <Route path="*"          element={<Navigate to="/team" replace />} />
                        </Routes>
                      </Suspense>
                    </ErrorBoundary>
                  </Layout>
                </PrivateRoute>
              }
            />
          </Routes>
        </Suspense>
      </AnimatePresence>
    </ErrorBoundary>
  );
}
