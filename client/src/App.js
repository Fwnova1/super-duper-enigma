import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import './custom.css';

// Components
import NavigationBar from './components/layout/NavigationBar';
import Dashboard from './components/pages/Dashboard';
import PatientList from './components/pages/PatientList';
import PatientDetail from './components/pages/PatientDetail';
import AddPatient from './components/pages/AddPatient';
import UploadData from './components/pages/UploadData';
import Reports from './components/pages/Reports';
import UserManagement from './components/pages/UserManagement';
import Login from './components/pages/Login';
import Register from './components/pages/Register';
import EditPatient from './components/pages/EditPatient';
import MyPatients from './components/pages/MyPatients';
import UserSettings from './components/pages/UserSettings';
import ActiveReferrals from './components/pages/ActiveReferrals';
import PendingAssignments from './components/pages/PendingAssignments';
import DietitianList from './components/pages/DietitianList';

// Private Route component with role support
const PrivateRoute = ({ children, requireRole = [] }) => {
  const user = JSON.parse(localStorage.getItem('user'));
  
  // If no user is authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  // If specific roles are required, check user's role
  if (requireRole.length > 0 && !requireRole.includes(user.role)) {
    return <Navigate to="/" />;
  }
  
  return children;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <Router>
      <div className="App">
        <NavigationBar 
          isAuthenticated={isAuthenticated} 
          user={user} 
          onLogout={handleLogout} 
        />
        <Container fluid className="px-4 py-4">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Admin-only route for user registration */}
            <Route 
              path="/register" 
              element={
                <PrivateRoute requireRole={['admin']}>
                  <Register />
                </PrivateRoute>
              } 
            />
            
            {/* Dashboard - accessible to all authenticated users */}
            <Route 
              path="/" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            
            {/* Patient routes - accessible to dietitians and admins */}
            <Route 
              path="/patients" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <PatientList />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/patients/add" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <AddPatient />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/patients/:id" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <PatientDetail />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/patients/edit/:id" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <EditPatient />
                </PrivateRoute>
              } 
            />
            
            {/* Upload data - accessible to dietitians and admins */}
            <Route 
              path="/upload" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <UploadData />
                </PrivateRoute>
              } 
            />
            
            {/* Reports - accessible to dietitians and admins */}
            <Route 
              path="/reports" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <Reports />
                </PrivateRoute>
              } 
            />
            
            {/* User management - admin only */}
            <Route 
              path="/users" 
              element={
                <PrivateRoute requireRole={['admin']}>
                  <UserManagement />
                </PrivateRoute>
              } 
            />
            
            {/* Dietitian List - accessible to dietitians and admins */}
            <Route 
              path="/dietitians" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <DietitianList />
                </PrivateRoute>
              } 
            />
            
            {/* My Patients - accessible to dietitians */}
            <Route 
              path="/mypatients" 
              element={
                <PrivateRoute requireRole={['dietitian']}>
                  <MyPatients />
                </PrivateRoute>
              } 
            />
            
            {/* Pending Assignments - accessible to dietitians only */}
            <Route 
              path="/pending-assignments" 
              element={
                <PrivateRoute requireRole={['dietitian']}>
                  <PendingAssignments />
                </PrivateRoute>
              } 
            />
            
            {/* Active Referrals - accessible to dietitians and admins */}
            <Route 
              path="/active-referrals" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <ActiveReferrals />
                </PrivateRoute>
              } 
            />
            
            {/* User Settings - accessible to all authenticated users */}
            <Route 
              path="/settings" 
              element={
                <PrivateRoute requireRole={['admin', 'dietitian']}>
                  <UserSettings />
                </PrivateRoute>
              } 
            />
          </Routes>
        </Container>
      </div>
    </Router>
  );
}

export default App;
