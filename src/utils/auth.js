export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userEmail');
  // Clear browser history to prevent going back
  window.history.pushState(null, '', '/login');
}; 