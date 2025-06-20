import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

const MAX_DESCRIPTION_LENGTH = 500;

const MyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [file, setFile] = useState(null);

  const [newCourse, setNewCourse] = useState({
    title: '',
    description: ''
  });

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role);
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const endpoint = userRole === 'instructor' 
        ? `${API_URL}/api/Courses/instructor`
        : `${API_URL}/api/Courses/student`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      setCourses(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError(err.message);
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
        throw new Error(errorText || 'Failed to create course');
      }

      const createdCourse = await response.json();
      setCourses(prev => [...prev, createdCourse]);
      setShowCreateModal(false);
      setNewCourse({ title: '', description: '' });
      setFile(null);
      setError('');
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
      const response = await fetch(`${API_URL}/api/Courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete course');
      }

      setCourses(courses.filter(course => course.id !== courseId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center">
            <span className="text-gray-600">Loading courses...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Courses</h1>
          {userRole === 'instructor' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Create Course
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Course List */}
        <div className="space-y-4">
          {courses.length === 0 ? (
            <div className="text-gray-500 text-center py-4">
              No courses available.
            </div>
          ) : (
            courses.map(course => (
              <div key={course.id} className="border rounded p-4">
                <h2 className="text-xl font-bold mb-2">{course.title}</h2>
                <p className="text-gray-600 mb-2">{course.description}</p>
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
                  {userRole === 'instructor' && (
                    <>
                      <button
                        onClick={() => navigate(`/course/edit/${course.id}`)}
                        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Course Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Create New Course</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
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
                  />
                </div>
                <div>
                  <label className="block mb-1">Description:</label>
                  <div className="relative">
                    <textarea
                      value={newCourse.description}
                      onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                      className="w-full p-2 border rounded"
                      rows="3"
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      required
                    />
                    <div className="text-sm text-gray-500 text-right mt-1">
                      {newCourse.description.length}/{MAX_DESCRIPTION_LENGTH} characters
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block mb-1">Upload File (PDF/MP4) – optional:</label>
                  <input
                    type="file"
                    accept=".pdf,.mp4"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default MyCourses; 