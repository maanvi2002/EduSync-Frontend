import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuth } from '../utils/auth';
import { Link } from 'react-router-dom';


const Navbar = () => {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out? 🥹')) {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  return (
    <nav className="bg-green-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="font-bold text-xl">EduSync</div>
        <div className="flex items-center space-x-4">
          
          <span className="text-sm">
            {userRole === 'instructor' ? 'Instructor' : 'Student'} Dashboard
          </span>
          <button
            onClick={handleSignOut}
            className="bg-red-500 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 