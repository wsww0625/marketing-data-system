import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, createTrpcClient } from './trpc';
import { AuthProvider, useAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Import from './pages/Import';
import Screening from './pages/Screening';
import AudiencePool from './pages/AudiencePool';
import Spaces from './pages/Spaces';
import Channels from './pages/Channels';
import Reports from './pages/Reports';
import SendRecords from './pages/SendRecords';
import SendCountImport from './pages/SendCountImport';
import CopywritingLibrary from './pages/CopywritingLibrary';
import ChannelAnalysis from './pages/ChannelAnalysis';
import Duplicates from './pages/Duplicates';
import CrossDedup from './pages/CrossDedup';
import DataMatch from './pages/DataMatch';
import BatchManagement from './pages/BatchManagement';
import AuditLogs from './pages/AuditLogs';
import UserManagement from './pages/UserManagement';

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="import" element={<ProtectedRoute adminOnly><Import /></ProtectedRoute>} />
        <Route path="screening" element={<ProtectedRoute adminOnly><Screening /></ProtectedRoute>} />
        <Route path="audience-pool" element={<AudiencePool />} />
        <Route path="spaces" element={<Spaces />} />
        <Route path="channels" element={<Channels />} />
        <Route path="reports" element={<Reports />} />
        <Route path="send-records" element={<SendRecords />} />
        <Route path="send-count" element={<ProtectedRoute adminOnly><SendCountImport /></ProtectedRoute>} />
        <Route path="copywriting" element={<CopywritingLibrary />} />
        <Route path="channel-analysis" element={<ChannelAnalysis />} />
        <Route path="duplicates" element={<ProtectedRoute adminOnly><Duplicates /></ProtectedRoute>} />
        <Route path="cross-dedup" element={<ProtectedRoute adminOnly><CrossDedup /></ProtectedRoute>} />
        <Route path="data-match" element={<DataMatch />} />
        <Route path="batch-management" element={<ProtectedRoute adminOnly><BatchManagement /></ProtectedRoute>} />
        <Route path="audit-logs" element={<ProtectedRoute adminOnly><AuditLogs /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  }));
  const [trpcClient] = useState(() => createTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
