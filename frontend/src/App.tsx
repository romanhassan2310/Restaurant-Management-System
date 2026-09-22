import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import PosPage from './pages/PosPage';
import LoginPage from './pages/LoginPage';
import InventoryPage from './pages/InventoryPage';
import ShiftPage from './pages/ShiftPage';
import PaymentsPage from './pages/PaymentsPage';
import KitchenPage from './pages/KitchenPage';
import TablesPage from './pages/TablesPage';
import WaiterPage from './pages/WaiterPage';
import QrOrderPage from './pages/QrOrderPage';
import ProcurementPage from './pages/ProcurementPage';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/qr/:token" element={<QrOrderPage />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pos"
        element={
          <ProtectedRoute>
            <Layout>
              <PosPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <Layout>
              <InventoryPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/shifts"
        element={
          <ProtectedRoute>
            <Layout>
              <ShiftPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <Layout>
              <PaymentsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/kitchen"
        element={
          <ProtectedRoute>
            <Layout>
              <KitchenPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/tables" element={<ProtectedRoute><Layout><TablesPage /></Layout></ProtectedRoute>} />
      <Route path="/waiter" element={<ProtectedRoute><Layout><WaiterPage /></Layout></ProtectedRoute>} />
      <Route path="/procurement" element={<ProtectedRoute><Layout><ProcurementPage /></Layout></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
