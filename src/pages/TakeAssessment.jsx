import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

const TakeAssessment = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [previousResults, setPreviousResults] = useState([]);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Get role from localStorage
    const role = localStorage.getItem('userRole');
    console.log('Current user role:', role); // Debug log
    setUserRole(role || '');
    checkPreviousAttempts();
  }, [assessmentId]);

  const checkPreviousAttempts = async () => {
    try {
      const token = localStorage.getItem('token');
      const currentRole = localStorage.getItem('userRole');
      console.log('Token:', token ? 'Present' : 'Missing');
      console.log('Role from localStorage:', currentRole);

      if (!token) {
        navigate('/login');
        return;
      }

      // Decode token to check role
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', tokenPayload);
        // Check if role is in token claims
        const roleFromToken = tokenPayload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
        if (roleFromToken && !currentRole) {
          console.log('Setting role from token:', roleFromToken);
          localStorage.setItem('userRole', roleFromToken);
          setUserRole(roleFromToken);
        }
      } catch (e) {
        console.error('Error decoding token:', e);
      }

      // Get user's results for this specific assessment
      const response = await fetch(`${API_URL}/api/Results/student/${assessmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const results = await response.json();
        if (Array.isArray(results) && results.length > 0) {
          // Sort results by attempt date, most recent first
          const sortedResults = results.sort((a, b) => 
            new Date(b.attemptDate) - new Date(a.attemptDate)
          );
          setPreviousResults(sortedResults);
          setResult(sortedResults[0]); // Most recent result
          setHasAttempted(true);

          // If there's any previous attempt and multiple attempts aren't allowed,
          // redirect to results view
          if (results.length > 0) {
            setSubmitted(true);
            setError('You have already completed this assessment. Multiple attempts are not allowed.');
            return;
          }
        }
      }

      // Fetch assessment details
      await fetchAssessment();
      
    } catch (error) {
      console.error('Error checking previous attempts:', error);
      setError('Failed to check previous attempts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const assessmentsResponse = await fetch(`${API_URL}/api/Assessments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!assessmentsResponse.ok) {
        throw new Error('Failed to load assessments');
      }

      const assessments = await assessmentsResponse.json();
      const assessmentData = assessments.find(a => 
        a.id.toLowerCase() === assessmentId.toLowerCase()
      );

      if (!assessmentData) {
        throw new Error('Assessment not found');
      }

      // Parse questions if they're in string format
      if (typeof assessmentData.questions === 'string') {
        try {
          assessmentData.questions = JSON.parse(assessmentData.questions);
        } catch (e) {
          console.error('Error parsing questions:', e);
          assessmentData.questions = [];
        }
      }

      setAssessment(assessmentData);
      
      // If user has attempted and multiple attempts aren't allowed, redirect to results
      if (hasAttempted && !assessmentData.allowMultipleAttempts) {
        setSubmitted(true);
        setError('You have already completed this assessment. Multiple attempts are not allowed.');
        return;
      }

      // Initialize answers
      const initialAnswers = {};
      if (Array.isArray(assessmentData.questions)) {
        assessmentData.questions.forEach((_, index) => {
          initialAnswers[index] = -1;
        });
      }
      setAnswers(initialAnswers);

    } catch (err) {
      console.error('Error in fetchAssessment:', err);
      setError(err.message || 'Failed to load assessment');
    }
  };

  const handleAnswerChange = (questionIndex, selectedOption) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedOption
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Check if user has already attempted and multiple attempts aren't allowed
      if (hasAttempted && !assessment?.allowMultipleAttempts) {
        setError('You have already completed this assessment. Multiple attempts are not allowed.');
        setSubmitted(true);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Please log in to submit the assessment.');
      }

      // Decode token to get user ID
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const userId = tokenPayload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];

      if (!userId) {
        throw new Error('User ID not found in token');
      }

      // Check for unanswered questions
      const unansweredQuestions = Object.values(answers).filter(answer => answer === -1).length;
      if (unansweredQuestions > 0) {
        throw new Error(`Please answer all questions before submitting. ${unansweredQuestions} question(s) remaining.`);
      }

      // Calculate total score and prepare answers
      let totalScore = 0;
      const answersArray = Object.entries(answers).map(([index, selectedOption]) => {
        const question = assessment.questions[index];
        const isCorrect = selectedOption === Number(question.correctOption);
        if (isCorrect) {
          totalScore += Math.floor(assessment.maxScore / assessment.questions.length);
        }
        return question.options[selectedOption];
      });

      const resultData = {
        assessmentId: assessment.id,
        userId: userId,
        score: totalScore,
        attemptDate: new Date().toISOString(),
        studentAnswers: answersArray
      };

      const response = await fetch(`${API_URL}/api/Results`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resultData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || 'Failed to submit assessment');
      }

      const submittedResult = await response.json();
      setResult({
        ...submittedResult,
        studentAnswers: answersArray
      });
      setSubmitted(true);
      setHasAttempted(true);
      
    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError(err.message || 'Failed to submit assessment');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading assessment...</span>
          </div>
        </div>
      </>
    );
  }

  // If user has attempted and multiple attempts aren't allowed, show results
  if (submitted || (hasAttempted && !assessment?.allowMultipleAttempts)) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4">
          <div className="bg-white shadow rounded-lg p-6">
            <h1 className="text-2xl font-bold mb-4">Assessment Results</h1>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {result && assessment && assessment.questions && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Your Submission</h2>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">{assessment.title}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">Score</p>
                      <p className="text-2xl font-bold">
                        {result.score} / {assessment.maxScore}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Percentage</p>
                      <p className="text-2xl font-bold">
                        {Math.round((result.score / assessment.maxScore) * 100)}%
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-gray-600">Submitted on</p>
                    <p className="font-medium">
                      {new Date(result.attemptDate).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-4">Your Answers</h3>
                  {assessment.questions.map((question, index) => {
                    if (!question || !Array.isArray(question.options)) {
                      return null;
                    }

                    const studentAnswer = result.studentAnswers?.[index];
                    const correctAnswerText = question.options[question.correctOption];
                    const isCorrect = studentAnswer === correctAnswerText;
                    
                    return (
                      <div key={index} className={`mb-4 p-4 border rounded ${isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="font-medium mb-2">Question {index + 1}: {question.questionText}</p>
                        <div className="ml-4">
                          <p className="text-gray-600">
                            Your answer: {studentAnswer || 'No answer'}
                          </p>
                          <p className={`font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                            Correct answer: {correctAnswerText || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-8 mt-4 border-t">
              <button
                onClick={() => navigate(`/course/${assessment?.courseId}`)}
                className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
              >
                Back to Course
              </button>
              {assessment?.allowMultipleAttempts && (
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setResult(null);
                    setAnswers({});
                    window.location.reload();
                  }}
                  className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
                >
                  Take Assessment Again
                </button>
              )}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!assessment || !assessment.questions || !Array.isArray(assessment.questions)) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error || 'Assessment not found or invalid format'}
          </div>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">{assessment.title || 'Assessment'}</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {previousResults.length > 0 && assessment.allowMultipleAttempts && (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-6">
              <p className="font-medium">Previous Attempts:</p>
              <p>Your highest score: {Math.max(...previousResults.map(r => r.score))} / {assessment.maxScore}</p>
              <p>Number of attempts: {previousResults.length}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {assessment.questions.map((question, qIndex) => {
              if (!question || !Array.isArray(question.options)) {
                return null;
              }

              return (
                <div key={qIndex} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <p className="font-medium">Question {qIndex + 1}: {question.questionText}</p>
                    <span className="text-sm text-gray-500">
                      ({Math.floor(assessment.maxScore / assessment.questions.length)} points)
                    </span>
                  </div>
                  <div className="space-y-2 ml-4">
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center">
                        <input
                          type="radio"
                          id={`q${qIndex}-o${oIndex}`}
                          name={`question-${qIndex}`}
                          checked={answers[qIndex] === oIndex}
                          onChange={() => handleAnswerChange(qIndex, oIndex)}
                          className="mr-2"
                        />
                        <label htmlFor={`q${qIndex}-o${oIndex}`} className="text-gray-700">
                          {String.fromCharCode(65 + oIndex)}. {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between items-center pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={hasAttempted && !assessment.allowMultipleAttempts}
                className={`px-6 py-2 rounded ${
                  hasAttempted && !assessment.allowMultipleAttempts
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
              >
                Submit Assessment
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default TakeAssessment; 