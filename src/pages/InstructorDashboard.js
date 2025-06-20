import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

const InstructorDashboard = () => {
  const [myCourses, setMyCourses] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [file, setFile] = useState(null);

  const [newCourse, setNewCourse] = useState({ 
    title: '', 
    description: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Debug - No token found, redirecting to login');
        navigate('/login');
        return;
      }

      // Validate token format
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const tokenExpiration = tokenPayload.exp * 1000; // Convert to milliseconds
        
        console.log('Debug - Token info:', {
          exp: new Date(tokenExpiration).toISOString(),
          isExpired: Date.now() > tokenExpiration,
          role: tokenPayload.role,
          email: tokenPayload.email
        });

        if (Date.now() > tokenExpiration) {
          console.log('Debug - Token expired');
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
      } catch (tokenError) {
        console.error('Debug - Token validation error:', tokenError);
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }

      // Try multiple endpoint formats
      const endpoints = [
        `${API_URL}/api/Courses`,
        `${API_URL}/api/Course`,
        `${API_URL}/api/Courses/GetAll`,
        `${API_URL}/api/Course/GetAll`
      ];

      let response = null;
      let successfulEndpoint = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`Debug - Trying endpoint: ${endpoint}`);
          console.log('Debug - Request headers:', {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          });

          const attemptResponse = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            },
            credentials: 'include' // Include cookies if any
          });

          console.log(`Debug - Response for ${endpoint}:`, {
            status: attemptResponse.status,
            statusText: attemptResponse.statusText,
            headers: Object.fromEntries(attemptResponse.headers.entries())
          });

          if (attemptResponse.ok) {
            response = attemptResponse;
            successfulEndpoint = endpoint;
            break;
          } else {
            const errorText = await attemptResponse.text();
            console.log(`Debug - Endpoint ${endpoint} failed:`, {
              status: attemptResponse.status,
              error: errorText
            });
          }
        } catch (endpointError) {
          console.log(`Debug - Endpoint ${endpoint} error:`, endpointError);
        }
      }

      if (!response) {
        throw new Error('Failed to fetch courses: No working endpoint found. Please check your authentication.');
      }

      console.log(`Debug - Successfully fetched from: ${successfulEndpoint}`);
      const responseText = await response.text();
      console.log('Debug - Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Error parsing course data:', e);
        throw new Error('Invalid course data received from server');
      }

      if (!Array.isArray(data)) {
        console.error('Invalid data format:', data);
        throw new Error('Invalid course data format received from server');
      }
      
      // Get the current user's email from the JWT token
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const userEmail = tokenPayload.email || localStorage.getItem('userEmail');
      const currentUsername = userEmail ? userEmail.split('@')[0].toLowerCase() : '';
      
      console.log('Debug - Current user:', {
        email: userEmail,
        username: currentUsername,
        role: tokenPayload.role
      });
      
      // Filter courses where the instructor matches the current user
      const instructorCourses = data.filter(course => {
        const instructorUsername = course.instructorName ? course.instructorName.toLowerCase() : '';
        const isMatch = instructorUsername === currentUsername;
        console.log('Debug - Course match:', {
          course: course.title,
          instructorUsername,
          currentUsername,
          isMatch
        });
        return isMatch;
      });
      
      console.log('Debug - Filtered instructor courses:', instructorCourses);
      
      setMyCourses(instructorCourses);
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.message.includes('401') || err.message.includes('authentication')) {
        setError('Authentication failed. Please try logging in again.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(err.message || 'Failed to fetch courses');
      }
      setMyCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const formData = new FormData();
      formData.append('title', newCourse.title);
      formData.append('description', newCourse.description);
      if (file) formData.append('file', file);

      const response = await fetch(`${API_URL}/api/Courses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create course: ${errorText}`);
      }

      const createdCourse = await response.json();
      setMyCourses([...myCourses, createdCourse]);
      setNewCourse({ title: '', description: '' });
      setFile(null);
      setShowCreateForm(false);
      alert('Course created successfully!');
    } catch (err) {
      setError(err.message || 'Error creating course');
    }
  };


  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/Courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include' // Include cookies if any
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete course: ${errorText}`);
      }

      setMyCourses(myCourses.filter(course => course.id !== courseId));
      
      // Show success message
      alert('Course deleted successfully!');
    } catch (err) {
      console.error('Delete course error:', err);
      if (err.message.includes('401') || err.message.includes('authentication')) {
        setError('Authentication failed. Please try logging in again.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(err.message);
      }
    }
  };

  const handleEditCourse = (courseId) => {
    navigate(`/edit-course/${courseId}`);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4">Loading...</div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Courses</h1>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Create Course
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {showCreateForm && (
          <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Course</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block mb-1">Title:</label>
                <input
                  type="text"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                  placeholder="Enter course title"
                />
              </div>
              <div>
                <label className="block mb-1">Description:</label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows="3"
                  required
                  placeholder="Enter course description"
                />
              </div>
              <div>
                <label className="block mb-1">Upload File (optional – PDF/MP4):</label>
                <input
                  type="file"
                  accept=".pdf,.mp4"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
          {myCourses.length === 0 ? (
            <p className="text-gray-500">You haven't created any courses yet.</p>
          ) : (
            <div className="grid gap-4">
              {myCourses.map(course => (
                <div key={course.id} className="bg-white shadow rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-2">{course.title}</h2>
                  <p className="text-gray-600 mb-4">{course.description}</p>
                  {course.mediaUrl && (
                    <p className="text-sm text-gray-500 mb-4">
                      Course Media: {course.mediaUrl}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => handleEditCourse(course.id)}
                      className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InstructorDashboard;
