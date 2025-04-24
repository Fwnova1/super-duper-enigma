import React, { useState, useEffect } from 'react';
import { Card, Table, Form, InputGroup, Badge, Button, Spinner, Alert, Modal, OverlayTrigger, Tooltip, Container, Row, Col } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';

const PatientList = () => {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyReferrals, setShowOnlyReferrals] = useState(false);
  const location = useLocation();
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [reassigning, setReassigning] = useState(false);
  const [user, setUser] = useState(null);
  
  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config.apiUrl}/api/patients`);
      
      console.log('User info at fetch time:', user?.username, 'Role:', user?.role);
      
      // Fetch user data to display dietitian names for all users
      try {
        console.log('Fetching users to map to patients');
        const usersRes = await axios.get(`${config.apiUrl}/api/auth/public-user-info`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('Users fetched:', usersRes.data.length);
        
        // Create a map of user IDs to usernames
        const userMap = {};
        usersRes.data.forEach(user => {
          userMap[user._id] = user.username;
        });
        
        console.log('User ID mapping created:', Object.keys(userMap).length, 'users mapped');
        
        // Add dietitian username to each patient
        const patientsWithDietitians = res.data.map(patient => {
          let dietitianName = 'Unassigned';
          
          if (patient.assignedTo) {
            // Convert assignedTo to string if it's an object (MongoDB ObjectId)
            const assignedToId = typeof patient.assignedTo === 'object' 
              ? patient.assignedTo.toString() 
              : patient.assignedTo;
              
            // Try to find the dietitian name in our map
            dietitianName = userMap[assignedToId] || 'Unknown';
          }
          
          console.log(`Patient ${patient.encounterId}: assignedTo=${patient.assignedTo}, dietitianName=${dietitianName}`);
          
          return {
            ...patient,
            dietitianName
          };
        });
        
        setPatients(patientsWithDietitians);
        console.log('Set patients with dietitian names:', patientsWithDietitians.length);
      } catch (error) {
        console.error('Error fetching users:', error);
        setPatients(res.data);
      }
      
      setLoading(false);
      
      // Remove automatic prediction when loading data
      // runAutomaticPredictions();
    } catch (error) {
      console.error('Error fetching patients:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('User loaded from localStorage:', parsedUser.username, 'Role:', parsedUser.role);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
      }
    } else {
      console.warn('No user found in localStorage');
    }
  }, []);

  // Add a separate useEffect that depends on the user state
  useEffect(() => {
    if (user) {
      fetchPatients();
    }
  }, [user]);

  // Refresh data when component comes into focus or location changes
  useEffect(() => {
    if (user) {
      fetchPatients();
    }
    // This will run whenever the URL location changes, which happens after navigation
  }, [location, user]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = () => {
    setShowOnlyReferrals(!showOnlyReferrals);
  };

  const handleRefresh = () => {
    fetchPatients();
  };

  // Function to run AI prediction on all patients automatically
  const runAutomaticPredictions = async () => {
    try {
      setPredicting(true);
      setPredictionResult(null);
      
      const response = await axios.post(
        `${config.apiUrl}/api/patients/predict-all-referrals`, 
        {}, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Update the prediction result
      setPredictionResult({
        success: true,
        message: response.data.message,
        totalPatients: response.data.totalPatients,
        predictedReferrals: response.data.predictedReferrals
      });
      
      // Refresh the patient list to show updated referral statuses
      const updatedRes = await axios.get(`${config.apiUrl}/api/patients`);
      setPatients(updatedRes.data);
    } catch (error) {
      console.error('Error predicting all referrals:', error);
      setPredictionResult({
        success: false,
        error: error.response?.data?.message || 'Failed to run AI predictions'
      });
    } finally {
      setPredicting(false);
    }
  };

  // Add this new function to handle reprocessing referrals
  const handleReprocessReferrals = async () => {
    try {
      setPredicting(true);
      setPredictionResult(null);
      
      const response = await axios.post(
        `${config.apiUrl}/api/patients/reprocess-referrals`, 
        {}, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Update the prediction result
      setPredictionResult({
        success: true,
        message: response.data.message,
        totalPatients: response.data.totalPatients,
        predictedReferrals: response.data.predictedReferrals
      });
      
      // Refresh the patient list to show updated referral statuses
      const updatedRes = await axios.get(`${config.apiUrl}/api/patients`);
      setPatients(updatedRes.data);
    } catch (error) {
      console.error('Error reprocessing referrals:', error);
      setPredictionResult({
        success: false,
        error: error.response?.data?.message || 'Failed to reprocess referrals'
      });
    } finally {
      setPredicting(false);
    }
  };

  // Add handler to manually assign patients
  const handleAssignPatients = async () => {
    try {
      setAssigning(true);
      setAssignmentResult(null);
      
      const response = await axios.post(
        `${config.apiUrl}/api/patients/assign`, 
        {}, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Update the assignment result
      setAssignmentResult({
        success: true,
        message: response.data.message,
        assignedCount: response.data.assignedCount,
        totalPatients: response.data.totalPatients
      });
      
      // Refresh the patient list
      fetchPatients();
    } catch (error) {
      console.error('Error assigning patients:', error);
      setAssignmentResult({
        success: false,
        error: error.response?.data?.message || 'Failed to assign patients to dietitians'
      });
    } finally {
      setAssigning(false);
    }
  };

  // Add handler for reassigning all patients
  const handleReassignAllPatients = async () => {
    try {
      setReassigning(true);
      setAssignmentResult(null);
      
      const response = await axios.post(
        `${config.apiUrl}/api/patients/reassign-all`, 
        {}, 
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      // Update the assignment result
      setAssignmentResult({
        success: true,
        message: response.data.message,
        reassignedCount: response.data.reassignedCount,
        totalPatients: response.data.totalPatients
      });
      
      // Refresh the patient list
      fetchPatients();
    } catch (error) {
      console.error('Error reassigning patients:', error);
      setAssignmentResult({
        success: false,
        error: error.response?.data?.message || 'Failed to reassign patients to dietitians'
      });
    } finally {
      setReassigning(false);
    }
  };

  // Filter patients based on search term and referral status
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.encounterId?.toString().includes(searchTerm);
    const matchesFilter = showOnlyReferrals ? patient.referral : true;
    return matchesSearch && matchesFilter;
  });

  // Add delete handler
  const handleDelete = async () => {
    if (!patientToDelete) return;
    
    try {
      setDeleting(true);
      
      await axios.delete(`${config.apiUrl}/api/patients/${patientToDelete._id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      // Refresh the patient list
      fetchPatients();
      
      // Reset state
      setShowDeleteModal(false);
      setPatientToDelete(null);
      setDeleting(false);
    } catch (error) {
      console.error('Error deleting patient:', error);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3 text-muted">Loading patient data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100 py-4">
      <div className="container-fluid px-4">
        {/* Page Header */}
        <div className="row mb-4">
          <div className="col">
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb">
                <li className="breadcrumb-item"><Link to="/" className="text-decoration-none">Dashboard</Link></li>
                <li className="breadcrumb-item active" aria-current="page">Patients</li>
              </ol>
            </nav>
            
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3">
              <div className="mb-3 mb-md-0">
                <h1 className="display-6 mb-0 fw-bold">CCU Patient List</h1>
                <p className="text-muted mb-0">
                  <i className="fas fa-users me-1"></i>
                  {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            
            {/* Replace the current button toolbar with a new one that includes Add Patient and has Upload Data as a secondary option */}
            <div className="btn-toolbar flex-wrap gap-2 mb-3">
              <div className="btn-group me-2 mb-2 shadow-sm">
                {user?.role === 'admin' && (
                  <OverlayTrigger placement="top" overlay={<Tooltip>Add a new patient</Tooltip>}>
                    <Button 
                      as={Link} 
                      to="/patients/add"
                      variant="success"
                      size="md"
                      className="d-flex align-items-center"
                    >
                      <i className="fas fa-user-plus me-md-2"></i>
                      <span className="d-none d-md-inline">Add Patient</span>
                    </Button>
                  </OverlayTrigger>
                )}
                
                <OverlayTrigger placement="top" overlay={<Tooltip>Refresh patient list</Tooltip>}>
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleRefresh}
                    size="md"
                    className="d-flex align-items-center"
                  >
                    <i className="fas fa-sync-alt me-md-2"></i>
                    <span className="d-none d-md-inline">Refresh</span>
                  </Button>
                </OverlayTrigger>
              </div>

              {user?.role === 'admin' && (
                <div className="btn-group me-2 mb-2 shadow-sm">
                  <OverlayTrigger placement="top" overlay={<Tooltip>Assign unassigned patients to dietitians</Tooltip>}>
                    <Button
                      variant="outline-primary"
                      size="md"
                      onClick={handleAssignPatients}
                      disabled={assigning || reassigning}
                      className="d-flex align-items-center"
                    >
                      {assigning ? (
                        <>
                          <Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-md-2" />
                          <span className="d-none d-md-inline">Assigning...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-user-md me-md-2"></i>
                          <span className="d-none d-md-inline">Assign</span>
                        </>
                      )}
                    </Button>
                  </OverlayTrigger>
                  
                  <OverlayTrigger placement="top" overlay={<Tooltip>Redistribute all patients among dietitians</Tooltip>}>
                    <Button
                      variant="outline-warning"
                      size="md"
                      onClick={handleReassignAllPatients}
                      disabled={assigning || reassigning}
                      className="d-flex align-items-center"
                    >
                      {reassigning ? (
                        <>
                          <Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-md-2" />
                          <span className="d-none d-md-inline">Reassigning...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-random me-md-2"></i>
                          <span className="d-none d-md-inline">Reassign</span>
                        </>
                      )}
                    </Button>
                  </OverlayTrigger>
                </div>
              )}

              <div className="btn-group me-2 mb-2 shadow-sm">
                {user?.role === 'admin' && (
                  <OverlayTrigger placement="top" overlay={<Tooltip>Reprocess all patient referrals using AI</Tooltip>}>
                    <Button 
                      variant="outline-danger"
                      size="md" 
                      onClick={handleReprocessReferrals}
                      disabled={predicting}
                      className="d-flex align-items-center"
                    >
                      {predicting ? (
                        <>
                          <Spinner animation="border" size="sm" role="status" aria-hidden="true" className="me-md-2" />
                          <span className="d-none d-md-inline">Processing...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-redo me-md-2"></i>
                          <span className="d-none d-md-inline">Reprocess</span>
                        </>
                      )}
                    </Button>
                  </OverlayTrigger>
                )}
                
                {user?.role === 'admin' && (
                  <OverlayTrigger placement="top" overlay={<Tooltip>Upload CSV patient data</Tooltip>}>
                    <Button 
                      as={Link} 
                      to="/upload"
                      variant="outline-secondary"
                      size="md"
                      className="d-flex align-items-center"
                    >
                      <i className="fas fa-upload me-md-2"></i>
                      <span className="d-none d-md-inline">Upload Data</span>
                    </Button>
                  </OverlayTrigger>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Status Alerts Section */}
        <div className="row mb-4">
          <div className="col">
            {predicting && (
              <Alert 
                variant="info"
                className="d-flex align-items-center gap-2 mb-3 shadow-sm border-start border-info border-5"
              >
                <div className="bg-info bg-opacity-10 p-2 rounded-circle">
                  <Spinner animation="border" size="sm" role="status" variant="info" aria-hidden="true" />
                </div>
                <span>Running AI predictions on patient data...</span>
              </Alert>
            )}
            
            {!predicting && predictionResult && (
              <Alert 
                variant={predictionResult.success ? 'info' : 'warning'}
                dismissible
                onClose={() => setPredictionResult(null)}
                className="mb-3 shadow-sm border-start border-5 border-info"
              >
                {predictionResult.success ? (
                  <>
                    <Alert.Heading className="d-flex align-items-center">
                      <span className="bg-info bg-opacity-10 p-2 rounded-circle me-2">
                        <i className="fas fa-check-circle text-info"></i>
                      </span>
                      AI Prediction Complete
                    </Alert.Heading>
                    <p className="mb-1">{predictionResult.message}</p>
                    <div className="mt-3 p-2 bg-light rounded">
                      <div className="row g-2">
                        <div className="col-md-6">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-users text-muted me-2"></i>
                            <div>
                              <small className="text-muted d-block">Total Patients</small>
                              <strong>{predictionResult.totalPatients}</strong>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="d-flex align-items-center">
                            <i className="fas fa-user-md text-danger me-2"></i>
                            <div>
                              <small className="text-muted d-block">Predicted Referrals</small>
                              <strong>
                                {predictionResult.predictedReferrals} 
                                <span className="text-muted ms-1 small">
                                  ({Math.round((predictionResult.predictedReferrals / predictionResult.totalPatients) * 100)}%)
                                </span>
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Alert.Heading className="d-flex align-items-center">
                      <span className="bg-warning bg-opacity-10 p-2 rounded-circle me-2">
                        <i className="fas fa-exclamation-triangle text-warning"></i>
                      </span>
                      AI Prediction Failed
                    </Alert.Heading>
                    <p className="mb-0">{predictionResult.error}</p>
                  </>
                )}
              </Alert>
            )}
            
            {assignmentResult && (
              <Alert 
                variant={assignmentResult.success ? 'success' : 'danger'}
                dismissible
                onClose={() => setAssignmentResult(null)}
                className="mb-3 shadow-sm border-start border-5 border-success"
              >
                {assignmentResult.success ? (
                  <>
                    <Alert.Heading className="d-flex align-items-center">
                      <span className="bg-success bg-opacity-10 p-2 rounded-circle me-2">
                        <i className="fas fa-check-circle text-success"></i>
                      </span>
                      Assignment Complete
                    </Alert.Heading>
                    <p className="mb-1">{assignmentResult.message}</p>
                    {(assignmentResult.reassignedCount !== undefined || assignmentResult.assignedCount !== undefined) && (
                      <div className="mt-3 p-2 bg-light rounded">
                        <div className="d-flex align-items-center">
                          <i className="fas fa-clipboard-check text-success me-2"></i>
                          <div>
                            <small className="text-muted d-block">Assignment Progress</small>
                            <div className="d-flex align-items-center">
                              <div className="progress flex-grow-1 me-2" style={{ height: '8px' }}>
                                <div 
                                  className="progress-bar bg-success" 
                                  role="progressbar" 
                                  style={{ 
                                    width: `${Math.round(((assignmentResult.reassignedCount || assignmentResult.assignedCount) / assignmentResult.totalPatients) * 100)}%` 
                                  }}
                                  aria-valuenow={assignmentResult.reassignedCount || assignmentResult.assignedCount}
                                  aria-valuemin="0" 
                                  aria-valuemax={assignmentResult.totalPatients}
                                ></div>
                              </div>
                              <span>
                                {assignmentResult.reassignedCount || assignmentResult.assignedCount}/{assignmentResult.totalPatients} patients
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <Alert.Heading className="d-flex align-items-center">
                      <span className="bg-danger bg-opacity-10 p-2 rounded-circle me-2">
                        <i className="fas fa-exclamation-circle text-danger"></i>
                      </span>
                      Assignment Failed
                    </Alert.Heading>
                    <p className="mb-0">{assignmentResult.error}</p>
                  </>
                )}
              </Alert>
            )}
          </div>
        </div>

        {/* Main Content Card */}
        <div className="row mb-4">
          <div className="col">
            <Card className="shadow-lg border-0 rounded-3">
              <Card.Header className="bg-white py-3 border-0">
                <div className="row g-3 align-items-center">
                  <div className="col-md-8">
                    <InputGroup className="shadow-sm">
                      <InputGroup.Text className="bg-white border-end-0">
                        <i className="fas fa-search text-primary"></i>
                      </InputGroup.Text>
                      <Form.Control
                        placeholder="Search by encounter ID..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="border-start-0 py-2"
                        aria-label="Search patients"
                      />
                    </InputGroup>
                  </div>
                  <div className="col-md-4 d-flex justify-content-end align-items-center">
                    <Form.Check 
                      type="switch"
                      id="referral-switch"
                      label={
                        <span className="d-flex align-items-center">
                          <i className="fas fa-filter text-muted me-2"></i>
                          Show only referrals
                        </span>
                      }
                      checked={showOnlyReferrals}
                      onChange={handleFilterChange}
                    />
                  </div>
                </div>
              </Card.Header>
              
              <div className="table-responsive">
                <Table hover className="align-middle mb-0">
                  <thead>
                    <tr className="bg-light">
                      <th className="py-3 border-0">Encounter ID</th>
                      <th className="py-3 border-0">BMI</th>
                      <th className="py-3 border-0">Feeding Volume</th>
                      <th className="py-3 border-0">Status</th>
                      <th className="py-3 border-0">Assigned To</th>
                      <th className="py-3 border-0 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPatients.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-5">
                          <div className="text-muted">
                            <div className="bg-light p-3 rounded-circle d-inline-flex mb-3">
                              <i className="fas fa-inbox fa-2x text-secondary"></i>
                            </div>
                            <p className="mb-1 fw-bold">No patients found</p>
                            <p className="small mb-0">Try adjusting your search or filter criteria</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredPatients.map((patient, index) => (
                        <tr key={patient._id} className={index % 2 === 0 ? 'bg-white' : 'bg-light bg-opacity-50'}>
                          <td className="py-3">
                            <span className="fw-medium">{patient.encounterId}</span>
                          </td>
                          <td className="py-3">
                            {patient.bmi ? (
                              <div className="d-flex align-items-center">
                                <div 
                                  className={`me-2 rounded-circle d-inline-block ${
                                    patient.bmi > 30 ? 'bg-danger' : 
                                    patient.bmi > 25 ? 'bg-warning' : 
                                    patient.bmi < 18.5 ? 'bg-info' : 'bg-success'
                                  }`} 
                                  style={{ width: '8px', height: '8px' }}
                                ></div>
                                {patient.bmi.toFixed(2)}
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            {patient.feed_vol ? (
                              <span>{patient.feed_vol.toFixed(2)} ml</span>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            <Badge 
                              bg={patient.referral ? 'danger' : 'success'}
                              className="d-inline-flex align-items-center gap-1 py-2 px-3"
                            >
                              <i className={`fas fa-${patient.referral ? 'user-md' : 'check'}`}></i>
                              {patient.referral ? 'Dietitian Referral' : 'Regular Care'}
                            </Badge>
                          </td>
                          <td className="py-3">
                            {!patient.assignedTo ? (
                              <Badge bg="secondary" className="py-2 px-3">
                                <i className="fas fa-user-slash me-1"></i>
                                Unassigned
                              </Badge>
                            ) : !patient.dietitianName || patient.dietitianName === 'Unknown' ? (
                              <div className="d-flex align-items-center">
                                <div className="bg-warning bg-opacity-10 p-2 rounded-circle me-2">
                                  <i className="fas fa-exclamation-circle text-warning"></i>
                                </div>
                                <span className="fst-italic text-muted">
                                  Unknown ({typeof patient.assignedTo === 'string' 
                                    ? patient.assignedTo.substring(0, 8) 
                                    : typeof patient.assignedTo === 'object' 
                                      ? JSON.stringify(patient.assignedTo).substring(0, 8) 
                                      : 'ID format error'}...)
                                </span>
                              </div>
                            ) : (
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-2">
                                  <i className="fas fa-user-md text-primary"></i>
                                </div>
                                <span className="fw-medium">{patient.dietitianName}</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3">
                            <div className="d-flex justify-content-end gap-2">
                              <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>View patient details</Tooltip>}
                              >
                                <Button 
                                  as={Link} 
                                  to={`/patients/${patient._id}`}
                                  variant="outline-primary" 
                                  size="sm"
                                  className="d-inline-flex align-items-center gap-1 rounded-pill"
                                >
                                  <i className="fas fa-eye"></i>
                                  <span className="d-none d-md-inline">View</span>
                                </Button>
                              </OverlayTrigger>
                              <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>Edit patient information</Tooltip>}
                              >
                                <Button 
                                  as={Link} 
                                  to={`/patients/edit/${patient._id}`}
                                  variant="outline-secondary" 
                                  size="sm"
                                  className="d-inline-flex align-items-center gap-1 rounded-pill"
                                >
                                  <i className="fas fa-edit"></i>
                                  <span className="d-none d-md-inline">Edit</span>
                                </Button>
                              </OverlayTrigger>
                              <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>Delete this patient</Tooltip>}
                              >
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  className="d-inline-flex align-items-center gap-1 rounded-pill"
                                  onClick={() => {
                                    setPatientToDelete(patient);
                                    setShowDeleteModal(true);
                                  }}
                                >
                                  <i className="fas fa-trash-alt"></i>
                                  <span className="d-none d-md-inline">Delete</span>
                                </Button>
                              </OverlayTrigger>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
              <Card.Footer className="bg-white border-0 py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Showing {filteredPatients.length} of {patients.length} patients
                  </small>
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-muted me-2">Legend:</small>
                    <Badge bg="success" className="d-inline-flex align-items-center">
                      <i className="fas fa-check me-1"></i> Regular
                    </Badge>
                    <Badge bg="danger" className="d-inline-flex align-items-center">
                      <i className="fas fa-user-md me-1"></i> Referral
                    </Badge>
                  </div>
                </div>
              </Card.Footer>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal 
          show={showDeleteModal} 
          onHide={() => setShowDeleteModal(false)}
          centered
          backdrop="static"
          className="modal-blur"
        >
          <Modal.Header closeButton className="border-bottom-0 pb-0">
            <Modal.Title className="text-danger">
              <div className="d-flex align-items-center">
                <div className="bg-danger bg-opacity-10 p-3 rounded-circle me-3">
                  <i className="fas fa-exclamation-triangle fa-lg text-danger"></i>
                </div>
                <div>
                  <h5 className="mb-0">Confirm Deletion</h5>
                  <p className="text-muted mb-0 small">This action cannot be undone</p>
                </div>
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="pt-4 pb-4">
            <p className="mb-4 text-center">
              Are you sure you want to permanently delete patient with encounter ID:{' '}
              <strong className="text-dark">{patientToDelete?.encounterId}</strong>?
            </p>
            
            <div className="alert alert-warning border-warning d-flex align-items-center" role="alert">
              <i className="fas fa-info-circle me-2 text-warning"></i>
              <div>
                <strong>Warning:</strong> This will remove all patient data from the system, including measurements, referral history, and assignments.
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="border-top-0 pt-0 d-flex justify-content-center gap-3">
            <Button 
              variant="outline-secondary" 
              onClick={() => setShowDeleteModal(false)}
              disabled={deleting}
              className="px-4"
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDelete}
              disabled={deleting}
              className="d-inline-flex align-items-center gap-2 px-4"
            >
              {deleting ? (
                <>
                  <Spinner animation="border" size="sm" role="status" aria-hidden="true" />
                  Deleting...
                </>
              ) : (
                <>
                  <i className="fas fa-trash-alt"></i>
                  Delete Patient
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default PatientList;