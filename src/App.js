import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
//import UploadCourse from './pages/UploadCourse';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import InstructorDashboard from './pages/InstructorDashboard';
import CourseDetails from './pages/CourseDetails';
import AssessmentResults from './pages/AssessmentResults';
import TakeAssessment from './pages/TakeAssessment';
import EditCourse from './pages/EditCourse';
import { isAuthenticated } from './utils/auth';
import './App.css';

// Navigation guard component
const AuthGuard = ({ children }) => {
  //const navigate = useNavigate();
  const location = useLocation();
  
  //useEffect(() => {
    if (
      !isAuthenticated() && 
      !['/', '/login', '/register'].includes(location.pathname)
    ) {
       return <Navigate to="/login" replace />;
    }
      return children;

};

const PublicRoute = ({ children }) => {
  if (isAuthenticated()) {
    const userRole = localStorage.getItem('userRole') || '';
    return <Navigate to={`/${userRole.toLowerCase()}-dashboard`} replace />;
  }
  return children;
};

const RoleBasedRoute = ({ children, allowedRole }) => {
  const userRole = localStorage.getItem('userRole') || '';
  
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  
  if (userRole !== allowedRole) {
    return <Navigate to={`/${userRole.toLowerCase()}-dashboard`} replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <AuthGuard>
        <Routes>
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } 
          />
          
          <Route
            path="/student-dashboard"
            element={
              <RoleBasedRoute allowedRole="student">
                <StudentDashboard />
              </RoleBasedRoute>
            }
          />
          
          <Route
            path="/instructor-dashboard"
            element={
              <RoleBasedRoute allowedRole="instructor">
                <InstructorDashboard />
              </RoleBasedRoute>
            }
          />
          
          <Route
            path="/course/:courseId"
            element={<CourseDetails />}
          />

          <Route
            path="/edit-course/:courseId"
            element={
              <RoleBasedRoute allowedRole="instructor">
                <EditCourse />
              </RoleBasedRoute>
            }
          />

          <Route
            path="/assessment/:assessmentId/results"
            element={<AssessmentResults />}
          />

          <Route
            path="/assessment/:assessmentId/take"
            element={<TakeAssessment />}
          />
          
          
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthGuard>
    </Router>
  );
}

export default App;
