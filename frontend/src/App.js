import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Login from './components/common/Login';
import ProjectsList from './components/projects/ProjectsList';
import ProjectDetails from './components/projects/ProjectDetails';
import CreateProject from './components/projects/CreateProject';
import EditProject from './components/projects/EditProject';
import UserProfile from './components/users/UserProfile';
import TaskDetails from './components/tasks/TaskDetails';
import TaskForm from './components/tasks/TaskForm';
import TaskEditForm from './components/tasks/TaskEditForm';
import TimeLogForm from './components/tasks/TimeLogForm';
import MyTasks from './components/tasks/MyTasks';
import RegisterUser from './components/admin/RegisterUser';
import UsersList from './components/admin/UsersList';
import AdminDashboard from './components/admin/AdminDashboard';
import CreateUser from './components/admin/CreateUser';
import EditUser from './components/admin/EditUser';
import UserDetails from './components/admin/UserDetails';
import OrganizationRegister from './components/organization/OrganizationRegister';
import InvoicesList from './components/invoices/InvoicesList';
import CreateInvoice from './components/invoices/CreateInvoice';
import InvoiceDetails from './components/invoices/InvoiceDetails';
import EditInvoice from './components/invoices/EditInvoice';
import AdminPayslipManagement from './components/payslips/AdminPayslipManagement';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated on app load
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status', {
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.log('Not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        
        <Routes>
          <Route 
            path="/login" 
            element={
              user ? <Navigate to="/profile" replace /> : <Login onLogin={handleLogin} />
            } 
          />
          
          <Route 
            path="/register" 
            element={
              user ? <Navigate to="/profile" replace /> : <OrganizationRegister />
            } 
          />
          
          <Route 
            path="/" 
            element={<Navigate to={user ? "/profile" : "/login"} replace />} 
          />
          
          {/* Protected routes */}
          {user ? (
            <>
              <Route path="/profile" element={<UserProfile user={user} onUserUpdate={checkAuthStatus} />} />
              <Route path="/my-tasks" element={<MyTasks user={user} />} />
              <Route path="/projects" element={<ProjectsList user={user} />} />
              <Route path="/projects/new" element={<CreateProject user={user} />} />
              <Route path="/projects/:id/details" element={<ProjectDetails user={user} />} />
              <Route path="/projects/:id/edit" element={<EditProject user={user} />} />
              <Route path="/tasks/:id/details" element={<TaskDetails user={user} />} />
              <Route path="/projects/:projectId/tasks/new" element={<TaskForm />} />
              <Route path="/tasks/:id/edit" element={<TaskEditForm />} />
              <Route path="/timelogs/task/:id/new" element={<TimeLogForm />} />
              <Route path="/admin/dashboard" element={<AdminDashboard user={user} />} />
              <Route path="/admin/register" element={<RegisterUser />} />
              <Route path="/admin/users" element={<UsersList />} />
              <Route path="/admin/users/create" element={<CreateUser />} />
              <Route path="/admin/users/:userId/edit" element={<EditUser />} />
              <Route path="/admin/users/:userId/details" element={<UserDetails />} />
              <Route path="/invoices" element={<InvoicesList user={user} />} />
              <Route path="/invoices/new" element={<CreateInvoice user={user} />} />
              <Route path="/invoices/:id/details" element={<InvoiceDetails user={user} />} />
              <Route path="/invoices/:id/edit" element={<EditInvoice user={user} />} />
              <Route path="/admin/payslips" element={<AdminPayslipManagement user={user} />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" replace />} />
          )}
        </Routes>
      </div>
    </Router>
  );
};

export default App;