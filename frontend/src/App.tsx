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
import CrmPage from './pages/CrmPage';
import LoyaltyPage from './pages/LoyaltyPage';
import GiftCardsPage from './pages/GiftCardsPage';
import HrPage from './pages/HrPage';
import PayrollPage from './pages/PayrollPage';
import ExpensePage from './pages/ExpensePage';
import CateringPage from './pages/CateringPage';
import QuotationPage from './pages/QuotationPage';
import MobileVanPage from './pages/MobileVanPage';

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
        path="/crm"
        element={
          <ProtectedRoute>
            <Layout>
              <CrmPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/loyalty"
        element={
          <ProtectedRoute>
            <Layout>
              <LoyaltyPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gift-cards"
        element={
          <ProtectedRoute>
            <Layout>
              <GiftCardsPage />
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
      <Route path="/hr" element={<ProtectedRoute><Layout><HrPage /></Layout></ProtectedRoute>} />
      <Route path="/payroll" element={<ProtectedRoute><Layout><PayrollPage /></Layout></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Layout><ExpensePage /></Layout></ProtectedRoute>} />
      <Route path="/catering" element={<ProtectedRoute><Layout><CateringPage /></Layout></ProtectedRoute>} />
      <Route path="/quotations" element={<ProtectedRoute><Layout><QuotationPage /></Layout></ProtectedRoute>} />
      <Route path="/mobile-van" element={<ProtectedRoute><Layout><MobileVanPage /></Layout></ProtectedRoute>} />
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
