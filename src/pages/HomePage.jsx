import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', textAlign: 'center' }}>
      <h1>Welcome to EduSync</h1>
      <p>Please login or register to continue.</p>
      <div style={{ marginTop: '30px' }}>
        <Link to="/login">
          <button style={{ padding: '10px 20px', marginRight: '15px' }}>Login</button>
        </Link>
        <Link to="/register">
          <button style={{ padding: '10px 20px' }}>Register</button>
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
