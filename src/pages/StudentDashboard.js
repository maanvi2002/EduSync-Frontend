import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

const StudentDashboard = () => {
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // First check if API is available
      try {
        const response = await fetch(`${API_URL}/api/Courses`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`API returned status ${response.status}`);
        }

        // Get available courses
        const coursesData = await response.json();
        console.log('Debug - Available courses:', coursesData);
        setAvailableCourses(coursesData);

        // Get enrolled courses
        const enrollmentsResponse = await fetch(`${API_URL}/api/Enrollments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (enrollmentsResponse.ok) {
          const enrollments = await enrollmentsResponse.json();
          console.log('Debug - Enrollments:', enrollments);

          // Map enrollments to full course details
          const enrolledCoursesDetails = coursesData.filter(course =>
            enrollments.some(enrollment => 
              enrollment.courseId.toLowerCase() === course.id.toLowerCase()
            )
          );

          console.log('Debug - Enrolled courses details:', enrolledCoursesDetails);
          setEnrolledCourses(enrolledCoursesDetails);
        }
      } catch (err) {
        console.error('API Error:', err);
        setError('Cannot connect to the server at ' + API_URL + '. Please check if the backend URL is correct and the server is running.');
        return;
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/Enrollments/student`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          courseId: courseId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to enroll in the course');
      }

      // Reload data to update the lists
      await loadData();
    } catch (err) {
      console.error('Error enrolling:', err);
      setError(err.message);
    }
  };

  const handleUnenroll = async (courseId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/Enrollments/student/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to unenroll from the course');
      }

      // Reload data to update the lists
      await loadData();
    } catch (err) {
      console.error('Error unenrolling:', err);
      setError(err.message);
    }
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
        <h1 className="text-2xl font-bold mb-4">Student Dashboard</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            {error}
            <button
              className="absolute top-0 right-0 px-4 py-3"
              onClick={() => setError('')}
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">My Enrolled Courses</h2>
          {enrolledCourses.length === 0 ? (
            <p className="text-gray-600">You are not enrolled in any courses yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolledCourses.map(course => (
                <div key={course.id} className="border rounded-lg p-4 bg-white shadow">
                  <h3 className="font-semibold mb-2">{course.title}</h3>
                  <p className="text-gray-600 mb-4">{course.description}</p>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => navigate(`/course/${course.id}`)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      View Course
                    </button>
                    <button
                      onClick={() => handleUnenroll(course.id)}
                      className="text-red-500 hover:text-red-600"
                    >
                      Unenroll
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Available Courses</h2>
          {availableCourses.length === 0 ? (
            <p className="text-gray-600">No new courses available for enrollment.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCourses
                .filter(course => !enrolledCourses.some(ec => ec.id === course.id))
                .map(course => (
                  <div key={course.id} className="border rounded-lg p-4 bg-white shadow">
                    <h3 className="font-semibold mb-2">{course.title}</h3>
                    <p className="text-gray-600 mb-4">{course.description}</p>
                    <button
                      onClick={() => handleEnroll(course.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Enroll Now
                    </button>
                  </div>
                ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default StudentDashboard;
