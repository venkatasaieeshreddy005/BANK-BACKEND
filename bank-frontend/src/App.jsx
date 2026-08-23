import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import MyAccounts from "./pages/MyAccounts";
import Transfer from "./pages/Transfer";
import MyBills from "./pages/MyBills";
import SplitBill from "./pages/SplitBill";
import Friends from "./pages/Friends";
import Transactions from "./pages/Transactions";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes wrapped in Sidebar Layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/accounts" element={<MyAccounts />} />
              <Route path="/transfer" element={<Transfer />} />
              <Route path="/my-bills" element={<MyBills />} />
              <Route path="/split-bill" element={<SplitBill />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/transactions" element={<Transactions />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}