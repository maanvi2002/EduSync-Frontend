import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

// Reduced character limits to match database constraints
const TITLE_MAX_LENGTH = 50;  // Reduced from 100
const DESCRIPTION_MAX_LENGTH = 200;  // Reduced from 500
const MEDIA_URL_MAX_LENGTH = 100;  // Reduced from 255

const EditCourse = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [course, setCourse] = useState({
    title: '',
    description: '',
    mediaUrl: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [charCount, setCharCount] = useState({
    title: 0,
    description: 0,
    mediaUrl: 0
  });

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  useEffect(() => {
    // Update character counts
    setCharCount({
      title: course.title.length,
      description: course.description.length,
      mediaUrl: course.mediaUrl.length
    });
  }, [course]);

  const fetchCourse = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/api/Courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch course details');
      }

      const courseData = await response.json();
      setCourse({
        title: courseData.title || '',
        description: courseData.description || '',
        mediaUrl: courseData.mediaUrl || ''
      });
    } catch (err) {
      setError(err.message || 'Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (course.title.length > TITLE_MAX_LENGTH) {
      setError(`Title must be ${TITLE_MAX_LENGTH} characters or less`);
      return;
    }
    if (course.description.length > DESCRIPTION_MAX_LENGTH) {
      setError(`Description must be ${DESCRIPTION_MAX_LENGTH} characters or less`);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const formData = new FormData();
      formData.append('title', course.title);
      formData.append('description', course.description);
      if (file) {
        formData.append('file', file); // Only include file if selected
      }

      const response = await fetch(`${API_URL}/api/Courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
          // DO NOT set content-type when using FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(errorText || 'Failed to update course');
      }

      alert('Course updated successfully!');
      navigate('/instructor-dashboard');
    } catch (err) {
      console.error('Update error:', err);
      setError(err.message || 'Failed to update course');
    }
  };


  const handleInputChange = (field, value) => {
    // Prevent input if it would exceed the limit
    switch (field) {
      case 'title':
        if (value.length <= TITLE_MAX_LENGTH) {
          setCourse(prev => ({ ...prev, [field]: value }));
        }
        break;
      case 'description':
        if (value.length <= DESCRIPTION_MAX_LENGTH) {
          setCourse(prev => ({ ...prev, [field]: value }));
        }
        break;
      case 'mediaUrl':
        if (value.length <= MEDIA_URL_MAX_LENGTH) {
          setCourse(prev => ({ ...prev, [field]: value }));
        }
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading course details...</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Edit Course</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">
                Title <span className="text-gray-500 text-xs">({charCount.title}/{TITLE_MAX_LENGTH})</span>
              </label>
              <input
                type="text"
                id="title"
                value={course.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
                maxLength={TITLE_MAX_LENGTH}
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="description">
                Description <span className="text-gray-500 text-xs">({charCount.description}/{DESCRIPTION_MAX_LENGTH})</span>
              </label>
              <textarea
                id="description"
                value={course.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="4"
                required
                maxLength={DESCRIPTION_MAX_LENGTH}
              />
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Current Media:
              </label>
              {course.mediaUrl ? (
                <a
                  href={course.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline break-all text-sm"
                >
                  {course.mediaUrl}
                </a>
              ) : (
                <p className="text-sm text-gray-500">No media file uploaded.</p>
              )}
            </div>


            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="file">
                Replace File (PDF/MP4):
              </label>
              <input
                type="file"
                id="file"
                accept=".pdf,.mp4"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full border rounded p-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional — uploading a new file will replace the existing media URL.
              </p>
            </div>


            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/instructor-dashboard')}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default EditCourse; 