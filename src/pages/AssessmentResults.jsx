import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { API_URL } from '../config';

const AssessmentResults = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isOwnAssessment, setIsOwnAssessment] = useState(false);

  useEffect(() => {
    fetchAssessmentAndResults();
  }, [assessmentId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      console.error('Date formatting error:', err);
      return 'Invalid Date';
    }
  };

  const fetchAssessmentAndResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('userRole');
      const userEmail = localStorage.getItem('userEmail');

      if (!token) {
        navigate('/login');
        return;
      }

      console.log('Debug - Starting fetchAssessmentAndResults:', {
        assessmentId,
        API_URL,
        token: token ? 'Present' : 'Missing',
        userRole,
        userEmail,
        timestamp: new Date().toISOString()
      });

      // Fetch assessment details
      console.log('Debug - Fetching assessment details...');
      const assessmentResponse = await fetch(`${API_URL}/api/Assessments/${assessmentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      console.log('Debug - Assessment Response:', {
        status: assessmentResponse.status,
        statusText: assessmentResponse.statusText,
        url: `${API_URL}/api/Assessments/${assessmentId}`
      });

      if (!assessmentResponse.ok) {
        const errorText = await assessmentResponse.text();
        console.log('Debug - Assessment Error:', errorText);
        throw new Error('Failed to fetch assessment details');
      }

      const assessmentData = await assessmentResponse.json();
      console.log('Debug - Assessment Data:', {
        ...assessmentData,
        timestamp: new Date().toISOString()
      });

      // Fetch course details to verify instructor ownership
      console.log('Debug - Fetching course details...', {
        courseId: assessmentData.courseId,
        url: `${API_URL}/api/Courses/${assessmentData.courseId}`
      });

      const courseResponse = await fetch(`${API_URL}/api/Courses/${assessmentData.courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      console.log('Debug - Course Response:', {
        status: courseResponse.status,
        statusText: courseResponse.statusText
      });

      if (!courseResponse.ok) {
        const errorText = await courseResponse.text();
        console.log('Debug - Course Error:', errorText);
        throw new Error('Failed to fetch course details');
      }

      const courseData = await courseResponse.json();
      console.log('Debug - Course Data:', {
        id: courseData.id,
        title: courseData.title,
        instructorName: courseData.instructorName,
        timestamp: new Date().toISOString()
      });

      // Check if the current user is the instructor of this course
      const instructorUsername = courseData.instructorName.toLowerCase();
      const currentUsername = userEmail.split('@')[0].toLowerCase();
      
      console.log('Debug - Ownership check:', {
        userRole,
        courseInstructor: instructorUsername,
        currentUser: currentUsername,
        isInstructor: userRole === 'instructor',
        namesMatch: instructorUsername === currentUsername,
        timestamp: new Date().toISOString()
      });

      const isOwn = userRole === 'instructor' && instructorUsername === currentUsername;

      if (!isOwn) {
        console.log('Debug - Access denied:', {
          reason: userRole !== 'instructor' ? 'Not an instructor' : 'Not the course owner',
          userRole,
          instructorUsername,
          currentUsername
        });
        throw new Error('You do not have permission to view these results');
      }

      console.log('Debug - Access granted:', {
        isOwn,
        userRole,
        instructorUsername,
        currentUsername
      });

      setIsOwnAssessment(isOwn);
      setAssessment(assessmentData);

      // Only fetch results if the user is the instructor of this course
      if (isOwn) {
        console.log('Debug - Fetching results for authorized instructor...');
        // Try different endpoints for results, starting with the known working one
        const endpoints = [
          `${API_URL}/api/Results?assessmentId=${assessmentId}`,
          `${API_URL}/api/Results/assessment/${assessmentId}`,
          `${API_URL}/api/Results/byAssessment/${assessmentId}`,
          `${API_URL}/api/Result/assessment/${assessmentId}`,
          `${API_URL}/api/Result/byAssessment/${assessmentId}`,
          `${API_URL}/api/Result?assessmentId=${assessmentId}`
        ];

        let resultsData = null;
        let successfulEndpoint = null;
        let lastError = null;

        for (const endpoint of endpoints) {
          try {
            console.log(`Debug - Trying endpoint: ${endpoint}`);
            const resultsResponse = await fetch(endpoint, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });

            console.log('Debug - Results attempt:', {
              endpoint,
              status: resultsResponse.status,
              statusText: resultsResponse.statusText
            });

            if (!resultsResponse.ok) {
              lastError = `${endpoint} returned ${resultsResponse.status}`;
              continue;
            }

            const responseText = await resultsResponse.text();
            console.log('Debug - Results Response:', {
              endpoint,
              status: resultsResponse.status,
              text: responseText.substring(0, 200) + '...' // Log first 200 chars to avoid huge logs
            });

            try {
              const parsedResults = JSON.parse(responseText);
              console.log('Debug - Results parsed successfully:', {
                endpoint,
                count: Array.isArray(parsedResults) ? parsedResults.length : 1
              });

              // Filter results to only include those matching the current assessment ID
              const filteredResults = Array.isArray(parsedResults) ? parsedResults : [parsedResults];
              const validResults = filteredResults.filter(result => 
                result.assessmentId.toLowerCase() === assessmentId.toLowerCase()
              );

              console.log('Debug - Filtered results:', {
                totalResults: filteredResults.length,
                validResults: validResults.length,
                currentAssessmentId: assessmentId,
                resultAssessmentIds: filteredResults.map(r => r.assessmentId)
              });

              if (validResults.length > 0) {
                resultsData = validResults;
                successfulEndpoint = endpoint;
                break;
              }
            } catch (parseError) {
              console.log('Debug - Failed to parse response:', {
                endpoint,
                error: parseError.message,
                responsePreview: responseText.substring(0, 100) + '...'
              });
              lastError = `${endpoint} returned invalid JSON: ${responseText}`;
              continue;
            }
          } catch (endpointErr) {
            console.log(`Debug - Endpoint ${endpoint} failed:`, {
              error: endpointErr.message,
              stack: endpointErr.stack
            });
            lastError = `${endpoint} failed: ${endpointErr.message}`;
          }
        }

        if (!resultsData) {
          console.log('Debug - No valid results found:', { lastError });
          setResults([]);
        } else {
          console.log('Debug - Final Results Data:', {
            endpoint: successfulEndpoint,
            resultCount: resultsData.length
          });

          // Sort by attempt date (most recent first)
          const sortedResults = resultsData.sort((a, b) => 
            new Date(b.attemptDate) - new Date(a.attemptDate)
          );

          console.log('Debug - Sorted Results:', {
            count: sortedResults.length,
            firstResult: sortedResults[0] ? {
              id: sortedResults[0].id,
              userName: sortedResults[0].userName,
              attemptDate: sortedResults[0].attemptDate,
              assessmentId: sortedResults[0].assessmentId
            } : null
          });

          setResults(sortedResults);
        }
      }
    } catch (err) {
      console.error('Debug - Error in fetchAssessmentAndResults:', {
        message: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });
      setError(err.message);
      if (err.message === 'You do not have permission to view these results') {
        setTimeout(() => {
          navigate(-1);
        }, 3000);
      }
    } finally {
      setLoading(false);
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

  if (!assessment || !isOwnAssessment) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error || 'You do not have permission to view these results. Redirecting...'}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto p-4">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">{assessment.title} - Results</h1>
          <p className="text-gray-600 mb-2">Max Score: {assessment.maxScore}</p>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {results.length === 0 ? (
            <p className="text-gray-500">No results available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-4 text-left">Student</th>
                    <th className="py-2 px-4 text-left">Score</th>
                    <th className="py-2 px-4 text-left">Attempt Date</th>
                    <th className="py-2 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={result.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="py-2 px-4">{result.userName || 'Unknown Student'}</td>
                      <td className="py-2 px-4">{result.score}/{assessment.maxScore}</td>
                      <td className="py-2 px-4">{formatDate(result.attemptDate)}</td>
                      <td className="py-2 px-4">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            result.score >= assessment.maxScore * 0.6
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {result.score >= assessment.maxScore * 0.6 ? 'Passed' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AssessmentResults; 