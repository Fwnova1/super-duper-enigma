import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Alert, Spinner, Badge, Accordion, ListGroup } from 'react-bootstrap';
import axios from 'axios';
import config from '../../config';

/**
 * Component for managing patient referrals
 * @param {Object} props - Component props
 * @param {Object} props.patient - The patient object
 * @param {Function} props.onStatusChange - Callback when referral status changes
 * @param {Object} props.user - The current user
 */
const ReferralManagement = ({ patient, onStatusChange, user }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [referralHistory, setReferralHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [statusForm, setStatusForm] = useState({
    status: patient?.referralStatus || 'pending',
    notes: ''
  });
  const [responseForm, setResponseForm] = useState({
    accept: true,
    notes: ''
  });

  // Load referral history when component mounts or patient changes
  useEffect(() => {
    if (patient?._id) {
      fetchReferralHistory();
    }
  }, [patient?._id]);

  // Update status form when patient changes
  useEffect(() => {
    if (patient) {
      setStatusForm(prev => ({
        ...prev,
        status: patient.referralStatus || 'pending'
      }));
    }
  }, [patient]);

  // Fetch referral history from the API
  const fetchReferralHistory = async () => {
    if (!patient?._id) return;

    try {
      setLoadingHistory(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${config.apiUrl}/api/patients/${patient._id}/referral-history`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data && response.data.success) {
        setReferralHistory(response.data.referralHistory || []);
      }
    } catch (err) {
      console.error('Error fetching referral history:', err);
      setError('Failed to load referral history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handle form input changes for status update
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStatusForm({
      ...statusForm,
      [name]: value
    });
  };

  // Handle form input changes for assignment response
  const handleResponseChange = (e) => {
    const { name, value, type, checked } = e.target;
    setResponseForm({
      ...responseForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle form submission to update referral status
  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${config.apiUrl}/api/patients/${patient._id}/referral-status`,
        statusForm,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        setSuccess(`Referral status updated to ${statusForm.status}`);
        // Clear notes field but keep selected status
        setStatusForm({
          ...statusForm,
          notes: ''
        });
        
        // Refresh history
        fetchReferralHistory();
        
        // Call the parent callback if provided
        if (onStatusChange) {
          onStatusChange(response.data.patient);
        }
      }
    } catch (err) {
      console.error('Error updating referral status:', err);
      setError(err.response?.data?.message || 'Failed to update referral status');
    } finally {
      setSaving(false);
    }
  };

  // Handle accepting or declining an assignment
  const handleAssignmentResponse = async (accept) => {
    try {
      setResponding(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${config.apiUrl}/api/patients/${patient._id}/assignment-response`,
        {
          accept,
          notes: responseForm.notes
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        setSuccess(response.data.message);
        setResponseForm({
          accept: true,
          notes: ''
        });
        
        // Refresh history
        fetchReferralHistory();
        
        // Call the parent callback if provided
        if (onStatusChange) {
          onStatusChange(response.data.patient);
        }
      }
    } catch (err) {
      console.error('Error responding to assignment:', err);
      setError(err.response?.data?.message || 'Failed to process your response');
    } finally {
      setResponding(false);
    }
  };

  // Get badge color based on status
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'in_progress':
        return 'primary';
      case 'completed':
        return 'success';
      default:
        return 'secondary';
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // If patient data is not loaded yet, show loading spinner
  if (!patient) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Referral Management</h5>
        </Card.Header>
        <Card.Body className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading patient data...</p>
        </Card.Body>
      </Card>
    );
  }

  // If patient has no referral, show a message
  if (!patient?.referral) {
    return (
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Referral Management</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="info">
            This patient does not have a dietitian referral.
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  // Check if this is a pending assignment for the current dietitian
  const isPendingAssignment = user && 
    user.role === 'dietitian' && 
    patient.assignedTo && 
    patient.assignedTo === user._id && 
    patient.assignmentStatus === 'requested';

  return (
    <Card className="mb-4">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Referral Management</h5>
        <Badge 
          bg={getStatusBadgeColor(patient.referralStatus || 'pending')}
          className="px-3 py-2"
        >
          {formatStatus(patient.referralStatus || 'pending')}
        </Badge>
      </Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            <i className="fas fa-exclamation-circle me-2"></i>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
            <i className="fas fa-check-circle me-2"></i>
            {success}
          </Alert>
        )}
        
        {/* Assignment Response (if this is for the current dietitian) */}
        {isPendingAssignment && (
          <div className="mb-4">
            <Alert variant="warning">
              <h6 className="alert-heading">New Assignment Request</h6>
              <p>A request has been made to assign this patient to you. Please review and respond.</p>
              
              <Form.Group className="mb-3">
                <Form.Label>Response Notes (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  name="notes"
                  value={responseForm.notes}
                  onChange={handleResponseChange}
                  placeholder="Add notes about your decision"
                  rows={2}
                  disabled={responding}
                />
              </Form.Group>
              
              <div className="d-flex justify-content-between">
                <Button 
                  variant="success" 
                  onClick={() => handleAssignmentResponse(true)}
                  disabled={responding}
                >
                  {responding ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>
                      Accept Assignment
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="danger" 
                  onClick={() => handleAssignmentResponse(false)}
                  disabled={responding}
                >
                  {responding ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-times me-2"></i>
                      Decline Assignment
                    </>
                  )}
                </Button>
              </div>
            </Alert>
          </div>
        )}
        
        {/* Status Update Form */}
        {user && (user.role === 'admin' || 
          (user.role === 'dietitian' && patient.assignmentAccepted)) && (
          <Form onSubmit={handleStatusUpdate}>
            <Form.Group className="mb-3">
              <Form.Label>Update Referral Status</Form.Label>
              <Form.Select 
                name="status"
                value={statusForm.status}
                onChange={handleInputChange}
                disabled={saving}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                name="notes"
                value={statusForm.notes}
                onChange={handleInputChange}
                placeholder="Add notes about this status change"
                rows={3}
                disabled={saving}
              />
              <Form.Text className="text-muted">
                These notes will be added to the referral history.
              </Form.Text>
            </Form.Group>
            
            <Button 
              type="submit" 
              variant="primary" 
              disabled={saving}
            >
              {saving ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  Updating...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Update Status
                </>
              )}
            </Button>
          </Form>
        )}
        
        {/* Status Explanation */}
        <div className="mt-4 mb-3 border p-3 rounded bg-light">
          <h6>About Referral Status</h6>
          <ul className="mb-0 small">
            <li><Badge bg="warning" className="me-1">Pending</Badge> Initial status when patient is assigned to a dietitian</li>
            <li><Badge bg="primary" className="me-1">In Progress</Badge> Dietitian has accepted the patient and is working with them</li>
            <li><Badge bg="success" className="me-1">Completed</Badge> Dietitian has completed work with this patient</li>
          </ul>
        </div>
        
        {/* Referral History */}
        <div className="mt-4">
          <h6 className="border-bottom pb-2">
            <i className="fas fa-history me-2"></i>
            Referral History
          </h6>
          
          {loadingHistory ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" />
              <span className="ms-2">Loading history...</span>
            </div>
          ) : referralHistory.length === 0 ? (
            <div className="text-muted py-3">
              No history available. Status changes will appear here.
            </div>
          ) : (
            <ListGroup variant="flush">
              {referralHistory.map((entry, index) => (
                <ListGroup.Item key={index} className="py-3">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <Badge 
                        bg={getStatusBadgeColor(entry.status)}
                        className="me-2"
                      >
                        {formatStatus(entry.status)}
                      </Badge>
                      <span className="text-muted small">
                        by {entry.changedByName || 'Unknown'}
                      </span>
                    </div>
                    <small className="text-muted">
                      {new Date(entry.timestamp).toLocaleString()}
                    </small>
                  </div>
                  {entry.notes && (
                    <div className="mt-2 small">
                      <p className="mb-0 text-secondary">{entry.notes}</p>
                    </div>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default ReferralManagement; 