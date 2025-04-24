import React, { useState, useEffect, useCallback } from 'react';
import { Card, Table, Badge, Button, Spinner, Alert, Container, Form } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import { format } from 'date-fns';

const PendingAssignments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [responding, setResponding] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [currentPatientId, setCurrentPatientId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch pending assignments on component mount
  useEffect(() => {
    fetchPendingAssignments();
  }, []);

  // Fetch pending assignments from the API
  const fetchPendingAssignments = async (useMockEndpoint = false) => {
    try {
      console.log(`==== DEBUG: Fetching assignments ====`);
      console.log(`Using mock endpoint: ${useMockEndpoint}`);
      
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token missing. Please log in again.');
      }

      // Check if the current user is a dietitian
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('User data missing. Please log in again.');
      }

      const user = JSON.parse(userData);
      console.log('Current user:', user);
      
      if (user.role !== 'dietitian') {
        throw new Error('Only dietitians can view pending assignments. Your role is: ' + user.role);
      }

      // Choose the endpoint based on debugging needs
      const endpoint = `${config.apiUrl}/api/patients/pending-assignments`;

      console.log(`Fetching pending assignments from ${endpoint}...`);
      
      try {
        const response = await axios.get(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          // Add longer timeout to prevent quick failures
          timeout: 15000 // Increased timeout to 15 seconds
        });
        
        console.log('API response:', response.data);
        
        if (response.data && response.data.success) {
          // Debug: Check the structure of the returned patients
          const patients = response.data.patients || [];
          console.log('Received patients array:', patients);
          console.log('Patient IDs:', patients.map(p => p._id));
          
          setPendingAssignments(patients);
          console.log('Pending assignments set:', patients);
          setLoading(false);
        } else {
          // If success is false, display the returned message
          throw new Error(response.data?.message || 'Failed to fetch pending assignments');
        }
      } catch (apiError) {
        // Specific handling for API errors
        console.error('API request error:', apiError);
        
        if (apiError.response) {
          console.error('Server response:', apiError.response.data);
          console.error('Status code:', apiError.response.status);
          
          // Extract detailed error information
          const errorData = apiError.response.data;
          const detailedError = {
            message: errorData.message || 'Unknown server error',
            debug: errorData.debug || {},
            stack: errorData.stack || null
          };
          
          console.error('Detailed error information:', detailedError);
          
          // Show detailed error to the user - always show in development and production
          setError(
            `Server error: ${detailedError.message}\n\n` +
            `Debug info: ${JSON.stringify(errorData, null, 2)}\n\n` +
            `Try refreshing the page.`
          );
          
          setLoading(false);
          return;
        }
        
        throw apiError; // Re-throw to be caught by the outer catch if not an API response error
      }
    } catch (err) {
      console.error('Error fetching pending assignments:', err);
      
      // Log detailed error information
      if (err.response) {
        console.error('Server response:', err.response.data);
        console.error('Status code:', err.response.status);
      } else if (err.request) {
        console.error('No response received:', err.request);
      }
      
      if (err.response && err.response.status === 403) {
        setError('You are not authorized to view pending assignments. Please log in with a dietitian account.');
      } else if (err.response && err.response.status === 500) {
        // For server errors
        setError(
          `Server error: ${err.response?.data?.message || err.message}. ` +
          `Try refreshing the page.`
        );
      } else {
        setError(err.response?.data?.message || err.message || 'Error loading pending assignments. Please try again.');
      }
      setLoading(false);
    }
  };

  // Handle assignment response (accept or decline)
  const handleAssignmentResponse = async (patientId, accept) => {
    try {
      // Add debug logging
      console.log('==== DEBUG: Response to assignment ====');
      console.log('Patient ID:', patientId);
      console.log('Accept:', accept);
      console.log('All pending assignments:', pendingAssignments);
      console.log('Filtered assignments:', filteredAssignments);
      
      setCurrentPatientId(patientId);
      setResponding(true);
      setSuccess(null);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token missing. Please log in again.');
      }

      // Determine if this is a mock ID (starts with 'mock')
      const isMockId = typeof patientId === 'string' && patientId.toLowerCase().startsWith('mock');
      
      // Choose the right endpoint based on whether this is a mock assignment
      const endpoint = isMockId
        ? `${config.apiUrl}/api/patients/mock-assignment-response/${patientId}`
        : `${config.apiUrl}/api/patients/${patientId}/assignment-response`;
        
      console.log(`Sending assignment response to endpoint: ${endpoint}`);
      console.log('Request payload:', { accept, notes: responseNotes });
      
      const response = await axios.post(
        endpoint,
        {
          accept,
          notes: responseNotes
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        setSuccess(response.data.message || `Successfully ${accept ? 'accepted' : 'declined'} the assignment.`);
        setResponseNotes('');
        // Reload assignments after response
        fetchPendingAssignments();
      } else {
        throw new Error(response.data?.message || 'Failed to process your response');
      }
    } catch (err) {
      console.error('Error responding to assignment:', err);
      setError(err.response?.data?.message || err.message || 'Failed to process your response. Please try again.');
    } finally {
      setResponding(false);
      setCurrentPatientId(null);
    }
  };

  // Filter assignments based on search term
  const filteredAssignments = pendingAssignments.filter(patient => 
    patient.encounterId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container className="py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1>Pending Assignment Requests</h1>
        </div>
        <div className="d-flex justify-content-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <span className="ms-2">Loading pending assignments...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Pending Assignment Requests</h1>
        <div>
          <Button 
            variant="outline-primary" 
            className="me-2"
            onClick={fetchPendingAssignments}>
            <i className="fas fa-sync-alt me-2"></i>
            Refresh
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <i className="fas fa-exclamation-circle me-2"></i>
              {error.includes('\n') ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{error}</pre>
              ) : (
                error
              )}
            </div>
          </div>
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-4">
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </Alert>
      )}
      
      {pendingAssignments.length === 0 && !error && (
        <Alert variant="info" className="mb-4">
          <i className="fas fa-info-circle me-2"></i>
          You don't have any pending assignment requests at this time.
        </Alert>
      )}
      
      {pendingAssignments.length > 0 && (
        <>
          <Card className="mb-4">
            <Card.Body>
              <Form className="mb-4">
                <Form.Group controlId="searchTerm">
                  <Form.Control
                    type="text"
                    placeholder="Search by patient ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </Form.Group>
              </Form>
              
              <Table responsive striped hover>
                <thead className="bg-light">
                  <tr>
                    <th>Patient ID</th>
                    <th>Date Requested</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-4">No matching assignments found</td>
                    </tr>
                  ) : (
                    filteredAssignments.map(patient => (
                      <tr key={patient._id}>
                        <td>
                          <Link to={`/patients/${patient._id}`}>
                            {patient.encounterId}
                          </Link>
                        </td>
                        <td>
                          {patient.assignedDate ? new Date(patient.assignedDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <Badge bg="warning">
                            <i className="fas fa-clock me-1"></i>
                            Needs Response
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex">
                            <Button 
                              variant="outline-success" 
                              size="sm"
                              className="me-2"
                              onClick={() => handleAssignmentResponse(patient._id, true)}
                              disabled={responding && currentPatientId === patient._id}
                            >
                              {responding && currentPatientId === patient._id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <i className="fas fa-check me-1"></i>
                              )}
                              Accept
                            </Button>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleAssignmentResponse(patient._id, false)}
                              disabled={responding && currentPatientId === patient._id}
                            >
                              {responding && currentPatientId === patient._id ? (
                                <Spinner animation="border" size="sm" />
                              ) : (
                                <i className="fas fa-times me-1"></i>
                              )}
                              Decline
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Response Notes (Optional)</h5>
            </Card.Header>
            <Card.Body>
              <Form.Group controlId="responseNotes">
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Add notes about your acceptance or declination (optional)"
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                />
                <Form.Text className="text-muted">
                  These notes will be added to the patient's record.
                </Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>
          
          <div className="alert alert-info">
            <h6 className="alert-heading">About Assignment Requests</h6>
            <p className="mb-0">
              When you accept an assignment, you'll become responsible for the patient and they will appear in your "My Patients" list.
              If you decline, the patient will remain in the general pool and can be assigned to another dietitian.
            </p>
          </div>
        </>
      )}
    </Container>
  );
};

export default PendingAssignments; 