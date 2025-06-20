import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [students, setStudents] = useState([]);
  const [isOwnCourse, setIsOwnCourse] = useState(false);
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [newAssessment, setNewAssessment] = useState({
    title: '',
    maxScore: 100,
    questions: []
  });
  const [currentQuestion, setCurrentQuestion] = useState({
    questionText: '',
    options: ['', '', '', ''],
    correctOption: 0
  });
  const [showViewAssessments, setShowViewAssessments] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    console.log('Component mounted with:', {
      courseId,
      userRole,
      isOwnCourse
    });
    
    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        await fetchCourseDetails();
        await fetchAssessments();
        if (userRole === 'instructor') {
          await fetchEnrolledStudents();
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('Debug - Starting fetchCourseDetails:', {
        courseId,
        userRole,
        API_URL
      });

      // Try multiple endpoint formats
      const endpoints = [
        `${API_URL}/api/Courses/${courseId}`,
        `${API_URL}/api/Course/${courseId}`,
        `${API_URL}/api/Courses/GetCourse/${courseId}`,
        `${API_URL}/api/Course/GetById/${courseId}`
      ];

      let response = null;
      let successfulEndpoint = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`Debug - Trying endpoint: ${endpoint}`);
          const attemptResponse = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });

          if (attemptResponse.ok) {
            response = attemptResponse;
            successfulEndpoint = endpoint;
            break;
          } else {
            console.log(`Debug - Endpoint ${endpoint} failed with status: ${attemptResponse.status}`);
          }
        } catch (endpointError) {
          console.log(`Debug - Endpoint ${endpoint} error:`, endpointError);
        }
      }

      if (!response) {
        throw new Error('Course not found. Please check if the course ID is correct.');
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

      if (!data || !data.id) {
        throw new Error('Invalid course data: Missing required fields');
      }

      console.log('Debug - Course data:', data);
      
      // Format the course data
      const formattedCourse = {
        id: data.id,
        title: data.title || 'Untitled Course',
        description: data.description || '',
        instructorName: data.instructorName || '',
        mediaUrl: data.mediaUrl || null
      };

      setCourse(formattedCourse);
      
      // Check if this is the instructor's own course
      const userEmail = localStorage.getItem('userEmail');
      console.log('Debug - Checking course ownership:', {
        courseInstructorName: formattedCourse.instructorName,
        userEmail: userEmail,
        userRole: userRole
      });
      
      // Set isOwnCourse to true if user is instructor and matches the course instructor
      const instructorUsername = formattedCourse.instructorName.toLowerCase();
      const currentUsername = userEmail ? userEmail.split('@')[0].toLowerCase() : '';
      const isOwn = userRole === 'instructor' && instructorUsername === currentUsername;
      
      console.log('Debug - Course ownership result:', {
        isOwn,
        instructorUsername,
        currentUsername,
        userRole
      });

      setIsOwnCourse(isOwn);

    } catch (err) {
      console.error('Error in fetchCourseDetails:', err);
      setError(err.message || 'Failed to fetch course details');
      setCourse(null);
      // Don't navigate away, let the UI handle the error state
    }
  };

  const fetchAssessments = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      console.log('Debug - Starting fetchAssessments:', {
        courseId,
        userRole: localStorage.getItem('userRole'),
        API_URL
      });

      // Try multiple endpoint formats since we're getting 404
      const endpoints = [
        `${API_URL}/api/Assessments/course/${courseId}`,
        `${API_URL}/api/Assessment/course/${courseId}`,
        `${API_URL}/api/Assessments/ByCourse/${courseId}`,
        `${API_URL}/api/Assessment/ByCourse/${courseId}`,
        `${API_URL}/api/Assessments?courseId=${courseId}`
      ];

      let response = null;
      let successfulEndpoint = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`Debug - Trying endpoint: ${endpoint}`);
          const attemptResponse = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });

          if (attemptResponse.ok) {
            response = attemptResponse;
            successfulEndpoint = endpoint;
            break;
          } else {
            console.log(`Debug - Endpoint ${endpoint} failed with status: ${attemptResponse.status}`);
          }
        } catch (endpointError) {
          console.log(`Debug - Endpoint ${endpoint} error:`, endpointError);
        }
      }

      if (!response) {
        throw new Error('Failed to fetch assessments: No working endpoint found');
      }

      console.log(`Debug - Successfully fetched from: ${successfulEndpoint}`);
      const data = await response.json();
      console.log('Debug - Raw response:', data);

      // Transform the data to ensure correct structure and filter by courseId
      const formattedAssessments = (Array.isArray(data) ? data : [data])
        .filter(item => item && item.id && item.courseId && item.courseId.toLowerCase() === courseId.toLowerCase()) // Add courseId filter
        .map(assessment => ({
          id: assessment.id,
          title: assessment.title || 'Untitled Assessment',
          maxScore: assessment.maxScore || 100,
          courseId: assessment.courseId,
          questions: parseQuestions(assessment.questions)
        }));

      console.log('Debug - Formatted assessments:', formattedAssessments);
      setAssessments(formattedAssessments);
      setError(''); // Clear any previous errors

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch assessments');
      setAssessments([]);
    }
  };

  // Helper function to parse questions
  const parseQuestions = (questions) => {
    try {
      if (typeof questions === 'string') {
        try {
          // Try to parse as JSON array first
          const parsed = JSON.parse(questions);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          // If it's a plain string question, format it as a single question array
          return [{
            questionText: questions,
            options: ['Yes', 'No'],
            correctOption: 0
          }];
        } catch (e) {
          // If JSON parsing fails, treat it as a plain string question
          return [{
            questionText: questions,
            options: ['Yes', 'No'],
            correctOption: 0
          }];
        }
      }
      if (Array.isArray(questions)) {
        return questions;
      }
      return [];
    } catch (e) {
      console.error('Error parsing questions:', e);
      return [];
    }
  };

  const fetchEnrolledStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/Enrollments/course/${courseId}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch enrolled students');
      }

      const data = await response.json();
      setStudents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddQuestion = () => {
    if (!currentQuestion.questionText.trim()) {
      setError('Please enter a question');
      return;
    }

    if (!currentQuestion.options.every(opt => opt.trim())) {
      setError('Please fill in all options');
      return;
    }

    console.log('Debug - Adding question:', currentQuestion);
    
    setNewAssessment(prev => {
      const updatedQuestions = [...prev.questions, { ...currentQuestion }];
      console.log('Debug - Updated questions list:', updatedQuestions);
      return {
        ...prev,
        questions: updatedQuestions
      };
    });

    // Reset current question form
    setCurrentQuestion({
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0
    });
    setError('');
  };

  const handleOptionChange = (index, value) => {
    setCurrentQuestion(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  };

  const handleRemoveQuestion = (indexToRemove) => {
    setNewAssessment(prev => ({
      ...prev,
      questions: prev.questions.filter((_, index) => index !== indexToRemove)
    }));
  };

  const handleEditAssessment = (assessment) => {
    try {
      console.log('Debug - Starting edit for assessment:', assessment);
      
      // Parse questions if they're in string format
      let parsedQuestions = [];
      if (typeof assessment.questions === 'string') {
        try {
          parsedQuestions = JSON.parse(assessment.questions);
        } catch (e) {
          console.error('Error parsing questions:', e);
          parsedQuestions = [];
        }
      } else if (Array.isArray(assessment.questions)) {
        parsedQuestions = assessment.questions;
      }

      console.log('Debug - Parsed questions:', parsedQuestions);

      // Format the assessment data for editing
      const formattedAssessment = {
        ...assessment,
        questions: parsedQuestions.map(q => ({
          questionText: q.questionText || '',
          options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
          correctOption: typeof q.correctOption === 'number' ? q.correctOption : 0
        }))
      };

      console.log('Debug - Formatted assessment for editing:', formattedAssessment);
      
      setEditingAssessment(formattedAssessment);
      setNewAssessment({
        title: formattedAssessment.title,
        maxScore: formattedAssessment.maxScore,
        questions: formattedAssessment.questions
      });
      setShowCreateAssessment(true);
    } catch (err) {
      console.error('Error in handleEditAssessment:', err);
      setError('Failed to prepare assessment for editing');
    }
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    setError('');

    try {
      console.log('Debug - Current assessment state:', newAssessment);

      if (!newAssessment.title.trim()) {
        setError('Please enter a title for the assessment');
        return;
      }

      if (!newAssessment.questions || newAssessment.questions.length === 0) {
        setError('Please add at least one question');
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Calculate score per question
      const scorePerQuestion = Math.floor(newAssessment.maxScore / newAssessment.questions.length);
      const remainingScore = newAssessment.maxScore % newAssessment.questions.length;

      // Format questions with scores
      const formattedQuestions = newAssessment.questions.map((q, index) => ({
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        score: index === 0 ? scorePerQuestion + remainingScore : scorePerQuestion // Add any remaining score to first question
      }));

      console.log('Debug - Formatted questions with scores:', formattedQuestions);

      // Prepare the assessment data
      const assessmentData = {
        Title: newAssessment.title,
        MaxScore: newAssessment.maxScore,
        CourseId: courseId,
        Questions: JSON.stringify(formattedQuestions)
      };

      console.log('Debug - Sending assessment data:', assessmentData);

      const endpoint = editingAssessment 
        ? `${API_URL}/api/Assessments/${editingAssessment.id}`
        : `${API_URL}/api/Assessments`;

      const response = await fetch(endpoint, {
        method: editingAssessment ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(assessmentData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to ${editingAssessment ? 'update' : 'create'} assessment: ${errorText}`);
      }

      // Handle 204 No Content response
      if (response.status === 204) {
        // Refresh the assessments list
        await fetchAssessments();
      } else {
        // Try to parse response as JSON if there is content
        const responseText = await response.text();
        if (responseText) {
          try {
            const savedAssessment = JSON.parse(responseText);
            // Update the assessments list
            if (editingAssessment) {
              setAssessments(prevAssessments =>
                prevAssessments.map(a =>
                  a.id === editingAssessment.id ? savedAssessment : a
                )
              );
            } else {
              setAssessments(prevAssessments => [...prevAssessments, savedAssessment]);
            }
          } catch (e) {
            console.log('Response was not JSON, but operation was successful');
          }
        }
      }

      // Reset form
      setNewAssessment({
        title: '',
        maxScore: 100,
        questions: []
      });
      setCurrentQuestion({
        questionText: '',
        options: ['', '', '', ''],
        correctOption: 0
      });
      setShowCreateAssessment(false);
      setEditingAssessment(null);
      setError('');

      // Show success message
      alert(`Assessment ${editingAssessment ? 'updated' : 'created'} successfully!`);

    } catch (err) {
      console.error('Error in handleCreateAssessment:', err);
      setError(err.message || `Failed to ${editingAssessment ? 'update' : 'create'} assessment`);
    }
  };

  // Add a cancel handler
  const handleCancelEdit = () => {
    setShowCreateAssessment(false);
    setEditingAssessment(null);
    setNewAssessment({
      title: '',
      maxScore: 100,
      questions: []
    });
    setCurrentQuestion({
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0
    });
    setError('');
  };

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm('Are you sure you want to delete this assessment?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/Assessments/${assessmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete assessment');
      }

      setAssessments(assessments.filter(assessment => assessment.id !== assessmentId));
    } catch (err) {
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

  if (!course) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error || 'Course not found'}</span>
            <div className="mt-4">
              <button
                onClick={() => navigate(-1)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Course Header Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{course?.title}</h1>
                <p className="text-lg text-gray-600 mb-4">{course?.description}</p>
                <div className="flex items-center text-gray-500">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  <span className="text-sm md:text-base">Instructor: {course?.instructorName}</span>
                </div>
              </div>
              {course?.mediaUrl && (
                <a
                  href={course.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 md:mt-0 inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  View Course Media
                </a>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-8 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Students Section */}
          {userRole === 'instructor' && (
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Enrolled Students</h2>
                <span className="px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">
                  {students.length} Students
                </span>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {students.map(student => (
                  <div key={student.id} className="p-4 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors duration-200">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-lg">
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assessments Section */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Assessments</h2>
              {userRole === 'instructor' && isOwnCourse && !showCreateAssessment && (
                <div className="space-x-4">
                  <button
                    onClick={() => setShowCreateAssessment(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Assessment
                  </button>
                  <button
                    onClick={() => setShowViewAssessments(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View All Assessments
                  </button>
                </div>
              )}
            </div>

            {/* Assessment Creation Form */}
            {userRole === 'instructor' && isOwnCourse && showCreateAssessment && (
              <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingAssessment ? 'Edit Assessment' : 'Create New Assessment'}
                  </h3>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCreateAssessment} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        value={newAssessment.title}
                        onChange={(e) => setNewAssessment({ ...newAssessment, title: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                        required
                        placeholder="Enter assessment title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Max Score</label>
                      <input
                        type="number"
                        value={newAssessment.maxScore}
                        onChange={(e) => setNewAssessment({ ...newAssessment, maxScore: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  {/* Questions List */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">
                      Questions ({newAssessment.questions.length})
                    </h4>
                    
                    {newAssessment.questions.length > 0 ? (
                      <div className="space-y-4">
                        {newAssessment.questions.map((question, index) => (
                          <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex justify-between items-center mb-3">
                              <h5 className="font-medium text-gray-900">Question {index + 1}</h5>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(index)}
                                className="text-red-500 hover:text-red-700 transition-colors duration-200"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                            <p className="text-gray-700 mb-3">{question.questionText}</p>
                            <div className="ml-4 space-y-2">
                              {question.options.map((option, optIndex) => (
                                <div key={optIndex} 
                                  className={`p-2 rounded ${
                                    optIndex === question.correctOption 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'text-gray-600'
                                  }`}
                                >
                                  {optIndex + 1}. {option}
                                  {optIndex === question.correctOption && (
                                    <span className="ml-2 text-green-600">✓</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="mt-2">No questions added yet</p>
                      </div>
                    )}
                  </div>

                  {/* Add New Question Form */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Add New Question</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Text
                        </label>
                        <input
                          type="text"
                          value={currentQuestion.questionText}
                          onChange={(e) => setCurrentQuestion({
                            ...currentQuestion,
                            questionText: e.target.value
                          })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                          placeholder="Enter your question"
                        />
                      </div>
                      
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Option {index + 1}
                          </label>
                          <div className="flex items-center space-x-4">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm transition-colors duration-200"
                              placeholder={`Enter option ${index + 1}`}
                            />
                            <div className="flex items-center">
                              <input
                                type="radio"
                                name="correctOption"
                                checked={currentQuestion.correctOption === index}
                                onChange={() => setCurrentQuestion({
                                  ...currentQuestion,
                                  correctOption: index
                                })}
                                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                              />
                              <label className="ml-2 text-sm text-gray-700">
                                Correct
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                      >
                        <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Question
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-red-700">{error}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end space-x-4 pt-6">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                    >
                      {editingAssessment ? 'Update Assessment' : 'Create Assessment'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Assessment Cards */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {assessments.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No assessments</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new assessment.</p>
                </div>
              ) : (
                assessments.map(assessment => (
                  <div key={assessment.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200">
                    <div className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">{assessment.title}</h3>
                          <div className="flex items-center text-sm text-gray-500 mb-4">
                            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Max Score: {assessment.maxScore}
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {assessment.questions?.length || 0} Questions
                        </span>
                      </div>
                      
                      <div className="mt-6 flex flex-wrap gap-2">
                        {userRole === 'instructor' && isOwnCourse ? (
                          <>
                            <button
                              onClick={() => navigate(`/assessment/${assessment.id}/results`)}
                              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                            >
                              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                              </svg>
                              Results
                            </button>
                            <button
                              onClick={() => handleEditAssessment(assessment)}
                              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-200"
                            >
                              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAssessment(assessment.id)}
                              className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                            >
                              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => navigate(`/assessment/${assessment.id}/take`)}
                            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                          >
                            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Take Assessment
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CourseDetails; 