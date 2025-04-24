import React, { useState, useEffect } from 'react';
import { Card, Container, Row, Col, Alert, Badge, Spinner, ListGroup, Nav, Button, Form, Tabs, Tab } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';

const ActiveReferrals = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [referrals, setReferrals] = useState({
    pending: [],
    in_progress: [],
    completed: []
  });
  const [counts, setCounts] = useState({
    pending: 0,
    in_progress: 0,
    completed: 0,
    total: 0
  });
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReferrals, setFilteredReferrals] = useState({
    pending: [],
    in_progress: [],
    completed: []
  });
  const [currentUser, setCurrentUser] = useState(null);

  // Get user data from localStorage on component mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Fetch active referrals on component mount
  useEffect(() => {
    fetchActiveReferrals();
  }, []);

  // Filter referrals when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredReferrals(referrals);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = {
      pending: referrals.pending.filter(patient => 
        patient.encounterId.toLowerCase().includes(searchTermLower) || 
        (patient.notes && patient.notes.toLowerCase().includes(searchTermLower))
      ),
      in_progress: referrals.in_progress.filter(patient => 
        patient.encounterId.toLowerCase().includes(searchTermLower) || 
        (patient.notes && patient.notes.toLowerCase().includes(searchTermLower))
      ),
      completed: referrals.completed.filter(patient => 
        patient.encounterId.toLowerCase().includes(searchTermLower) || 
        (patient.notes && patient.notes.toLowerCase().includes(searchTermLower))
      )
    };

    setFilteredReferrals(filtered);
  }, [searchTerm, referrals]);

  // Fetch active referrals from the API
  const fetchActiveReferrals = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      try {
        // First try to use the active-referrals endpoint
        console.log('Fetching from active-referrals endpoint...');
        const response = await axios.get(
          `${config.apiUrl}/api/patients/active-referrals`,
          { headers }
        );

        if (response.data && response.data.success) {
          setReferrals(response.data.referrals);
          setCounts(response.data.counts);
          setFilteredReferrals(response.data.referrals);
          return;
        }
      } catch (primaryError) {
        console.error('Error with primary endpoint:', primaryError);
        // Continue to fallback method
      }

      // Fallback method: Get all patients with referral=true and group them ourselves
      console.log('Using fallback method to fetch referrals...');
      const response = await axios.get(
        `${config.apiUrl}/api/patients`,
        { headers }
      );

      if (Array.isArray(response.data)) {
        // Filter to get only patients with referrals
        const patientsWithReferrals = response.data.filter(patient => patient.referral === true);
        
        // Group by status
        const grouped = {
          pending: [],
          in_progress: [],
          completed: []
        };

        for (const patient of patientsWithReferrals) {
          const status = patient.referralStatus || 'pending';
          if (grouped[status]) {
            grouped[status].push(patient);
          } else {
            grouped.pending.push(patient);
          }
        }

        // Set the referrals data
        setReferrals(grouped);
        
        // Calculate counts
        const counts = {
          pending: grouped.pending.length,
          in_progress: grouped.in_progress.length,
          completed: grouped.completed.length,
          total: patientsWithReferrals.length
        };
        
        setCounts(counts);
        setFilteredReferrals(grouped);
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching active referrals:', err);
      setError(
        err.response?.data?.message || 
        'Error loading referrals. The server may be experiencing issues with the referral management system.'
      );
      
      // Set empty data structures to prevent rendering errors
      setReferrals({
        pending: [],
        in_progress: [],
        completed: []
      });
      
      setCounts({
        pending: 0,
        in_progress: 0,
        completed: 0,
        total: 0
      });
      
      setFilteredReferrals({
        pending: [],
        in_progress: [],
        completed: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle status update for a patient
  const handleStatusUpdate = async (patientId, newStatus, notes = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post(
        `${config.apiUrl}/api/patients/${patientId}/referral-status`,
        {
          status: newStatus,
          notes
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.success) {
        // Reload all referrals after status update
        fetchActiveReferrals();
      } else {
        throw new Error('Failed to update referral status');
      }
    } catch (err) {
      console.error('Error updating referral status:', err);
      setError(err.response?.data?.message || 'Error updating status. Please try again.');
    } finally {
      setLoading(false);
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

  // Render a patient card
  const PatientCard = ({ patient }) => {
    const assignedDietitian = patient.assignedTo ? 
      (typeof patient.assignedTo === 'object' ? patient.assignedTo.username : 'Assigned') : 
      'Unassigned';

    return (
      <Card className="mb-3 shadow-sm">
        <Card.Header className="bg-white py-2">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <Link to={`/patients/${patient._id}`} className="text-decoration-none text-primary">
                {patient.encounterId}
              </Link>
            </h5>
            <Badge 
              bg={patient.referralStatus ? getStatusBadgeColor(patient.referralStatus) : 'secondary'}
              className="py-1 px-2"
            >
              {formatStatus(patient.referralStatus || 'pending')}
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="py-2">
          <div className="d-flex justify-content-between mb-2">
            <small className="text-muted">Assigned to:</small>
            <Badge bg="info" className="rounded-pill">{assignedDietitian}</Badge>
          </div>
          
          {patient.assignedDate && (
            <div className="d-flex justify-content-between mb-2">
              <small className="text-muted">Assigned on:</small>
              <small>{new Date(patient.assignedDate).toLocaleDateString()}</small>
            </div>
          )}

          <div className="mt-3 text-end">
            <Link 
              to={`/patients/${patient._id}`} 
              className="btn btn-sm btn-outline-primary"
            >
              <i className="fas fa-external-link-alt me-1"></i>
              View Details
            </Link>
          </div>
        </Card.Body>
      </Card>
    );
  };

  return (
    <Container fluid>
      <div className="page-header">
        <h1 className="page-title">Active Referrals</h1>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="fas fa-clipboard-list me-2 text-primary"></i>
              Referral Management
            </h5>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={fetchActiveReferrals}
              disabled={loading}
            >
              <i className="fas fa-sync-alt me-1"></i>
              Refresh
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={3}>
              <div className="stats-card bg-light-warning p-3 rounded border">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="mb-0">{counts.pending}</h2>
                    <span className="text-muted">Pending</span>
                  </div>
                  <div className="stats-icon bg-warning text-white rounded p-2">
                    <i className="fas fa-hourglass-half"></i>
                  </div>
                </div>
              </div>
            </Col>
            <Col md={3}>
              <div className="stats-card bg-light-primary p-3 rounded border">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="mb-0">{counts.in_progress}</h2>
                    <span className="text-muted">In Progress</span>
                  </div>
                  <div className="stats-icon bg-primary text-white rounded p-2">
                    <i className="fas fa-spinner"></i>
                  </div>
                </div>
              </div>
            </Col>
            <Col md={3}>
              <div className="stats-card bg-light-success p-3 rounded border">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="mb-0">{counts.completed}</h2>
                    <span className="text-muted">Completed</span>
                  </div>
                  <div className="stats-icon bg-success text-white rounded p-2">
                    <i className="fas fa-check"></i>
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          <Form.Group className="mb-4">
            <Form.Control
              type="text"
              placeholder="Search by patient ID or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Form.Group>

          <Tabs
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
            className="mb-3"
          >
            <Tab 
              eventKey="pending" 
              title={
                <span>
                  Pending <Badge bg="warning" pill>{filteredReferrals.pending.length}</Badge>
                </span>
              }
            >
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading referrals...</p>
                </div>
              ) : filteredReferrals.pending.length === 0 ? (
                <Alert variant="info">
                  No pending referrals found.
                </Alert>
              ) : (
                <Row>
                  {filteredReferrals.pending.map(patient => (
                    <Col md={4} key={patient._id}>
                      <PatientCard patient={patient} />
                    </Col>
                  ))}
                </Row>
              )}
            </Tab>
            <Tab 
              eventKey="in_progress" 
              title={
                <span>
                  In Progress <Badge bg="primary" pill>{filteredReferrals.in_progress.length}</Badge>
                </span>
              }
            >
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading referrals...</p>
                </div>
              ) : filteredReferrals.in_progress.length === 0 ? (
                <Alert variant="info">
                  No in-progress referrals found.
                </Alert>
              ) : (
                <Row>
                  {filteredReferrals.in_progress.map(patient => (
                    <Col md={4} key={patient._id}>
                      <PatientCard patient={patient} />
                    </Col>
                  ))}
                </Row>
              )}
            </Tab>
            <Tab 
              eventKey="completed" 
              title={
                <span>
                  Completed <Badge bg="success" pill>{filteredReferrals.completed.length}</Badge>
                </span>
              }
            >
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-2">Loading referrals...</p>
                </div>
              ) : filteredReferrals.completed.length === 0 ? (
                <Alert variant="info">
                  No completed referrals found.
                </Alert>
              ) : (
                <Row>
                  {filteredReferrals.completed.map(patient => (
                    <Col md={4} key={patient._id}>
                      <PatientCard patient={patient} />
                    </Col>
                  ))}
                </Row>
              )}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ActiveReferrals; 