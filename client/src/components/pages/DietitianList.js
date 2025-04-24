import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Row, Col, Card, Table, Badge, Spinner, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const DietitianList = () => {
  const [dietitians, setDietitians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [patientData, setPatientData] = useState({});
  const [lookupInProgress, setLookupInProgress] = useState({});
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchDietitians();
  }, []);
  
  const fetchDietitians = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/patients/dietitians-api', {
        headers: token ? { Authorization: token } : {},
        timeout: 5000
      });
      
      let dietitianResult = [];
      if (response.data && response.data.dietitians) {
        dietitianResult = response.data.dietitians;
      } else if (Array.isArray(response.data)) {
        dietitianResult = response.data;
      }
      
      setDietitians(dietitianResult);
      
      // Fetch patient details for all assigned patients
      const allPatientIds = dietitianResult.reduce((ids, dietitian) => {
        if (dietitian.assignedPatients && dietitian.assignedPatients.length > 0) {
          return [...ids, ...dietitian.assignedPatients];
        }
        return ids;
      }, []);
      
      if (allPatientIds.length > 0) {
        try {
          // Filter out any patientIds that don't look like MongoDB ObjectIds (24 hex chars)
          const validObjectIds = allPatientIds.filter(id => 
            typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id)
          );
          
          if (validObjectIds.length > 0) {
            const patientDetailsResponse = await axios.post('http://localhost:5000/api/patients/by-ids', 
              { patientIds: validObjectIds },
              { headers: token ? { Authorization: token } : {} }
            );
            
            const patientMapping = {};
            if (patientDetailsResponse.data && Array.isArray(patientDetailsResponse.data)) {
              patientDetailsResponse.data.forEach(patient => {
                patientMapping[patient._id] = {
                  _id: patient._id,
                  encounterId: patient.encounterId || 'Unknown ID',
                  name: patient.name || 'Unnamed Patient',
                  dateOfBirth: patient.dateOfBirth || null,
                  admissionDate: patient.admissionDate || patient.created || null
                };
              });
            }
            
            setPatientData(patientMapping);
          }
          
          // Also fetch all patients to enable lookups by encounter ID
          const allPatientsResponse = await axios.get('http://localhost:5000/api/patients', {
            headers: token ? { Authorization: token } : {}
          });
          
          if (allPatientsResponse.data && Array.isArray(allPatientsResponse.data)) {
            // Create a mapping of encounter IDs to MongoDB IDs
            const encounterMapping = {};
            // Also collect additional patient data
            const additionalPatientData = {};
            
            allPatientsResponse.data.forEach(patient => {
              if (patient.encounterId) {
                encounterMapping[patient.encounterId] = patient._id;
                
                // Store additional patient data
                additionalPatientData[patient._id] = {
                  name: patient.name || 'Unnamed Patient',
                  dateOfBirth: patient.dateOfBirth || null,
                  admissionDate: patient.admissionDate || patient.created || null
                };
              }
            });
            
            // Update patient data with this mapping and additional data
            setPatientData(prev => ({
              ...prev,
              ...additionalPatientData,
              _encounterMapping: encounterMapping
            }));
          }
          
        } catch (error) {
          console.error('Error fetching patient details:', error);
          // Continue with default patient display even when API fails
        }
      }
    } catch (err) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Handle navigation for both MongoDB ObjectIds and Encounter IDs
  const handlePatientNavigation = async (patientId, encounterId, e) => {
    e.stopPropagation();
    
    // If it's a valid MongoDB ObjectId, navigate directly
    if (typeof patientId === 'string' && /^[0-9a-fA-F]{24}$/.test(patientId)) {
      navigate(`/patients/${patientId}`);
      return;
    }
    
    // Check if we already have the mapping in our state
    if (patientData._encounterMapping && patientData._encounterMapping[patientId]) {
      navigate(`/patients/${patientData._encounterMapping[patientId]}`);
      return;
    }
    
    // For encounter IDs that we don't have a mapping for yet
    setLookupInProgress(prev => ({ ...prev, [patientId]: true }));
    
    try {
      // Fetch all patients
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/patients', {
        headers: token ? { Authorization: token } : {}
      });
      
      if (response.data && Array.isArray(response.data)) {
        // Find the patient with matching encounter ID
        const patient = response.data.find(p => p.encounterId === patientId);
        
        if (patient && patient._id) {
          // Store the mapping for future use
          setPatientData(prev => ({
            ...prev,
            _encounterMapping: {
              ...(prev._encounterMapping || {}),
              [patientId]: patient._id
            }
          }));
          
          // Navigate to the patient
          navigate(`/patients/${patient._id}`);
        } else {
          console.error(`Could not find patient with encounter ID: ${patientId}`);
          alert(`Could not find patient with ID: ${patientId}`);
        }
      }
    } catch (error) {
      console.error('Error looking up patient by encounter ID:', error);
    } finally {
      setLookupInProgress(prev => ({ ...prev, [patientId]: false }));
    }
  };

  return (
    <Container fluid className="py-4 px-4 px-md-5">
      <Row className="justify-content-center">
        <Col xl={10} lg={11}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="text-primary fw-bold m-0">Dietitian Directory</h2>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={fetchDietitians}
              disabled={loading}
              className="d-flex align-items-center"
            >
              {loading ? (
                <>
                  <Spinner size="sm" animation="border" className="me-2" />
                  <span>Refreshing</span>
                </>
              ) : (
                <>
                  <i className="fas fa-sync-alt me-2"></i>
                  <span>Refresh List</span>
                </>
              )}
            </Button>
          </div>
          
          <Card className="shadow border-0 overflow-hidden">
            <Card.Header className="bg-primary text-white py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  Available Dietitians 
                  <Badge bg="light" text="dark" className="ms-2 px-3">{dietitians.length}</Badge>
                </h4>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading dietitians...</p>
                </div>
              ) : dietitians.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-user-md fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No dietitians found in the system.</p>
                  <Button variant="primary" size="sm" onClick={fetchDietitians}>
                    Try Again
                  </Button>
                </div>
              ) : (
                <Table responsive hover className="align-middle mb-0">
                  <thead>
                    <tr className="bg-light">
                      <th className="px-4 py-3" style={{ width: "40px" }}></th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3 text-center">Patients</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dietitians.map((dietitian) => (
                      <React.Fragment key={dietitian._id}>
                        <tr 
                          className={expandedRows[dietitian._id] ? "bg-light" : ""} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleRow(dietitian._id)}
                        >
                          <td className="text-center px-4 py-3">
                            <i className={`fas fa-chevron-${expandedRows[dietitian._id] ? 'down' : 'right'} text-primary`}></i>
                          </td>
                          <td className="fw-medium px-4 py-3">
                            <div className="d-flex align-items-center">
                              <div className="bg-primary bg-opacity-10 rounded-circle p-2 d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                                <i className="fas fa-user-md text-primary"></i>
                              </div>
                              {dietitian.username || dietitian.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">{dietitian.email}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge 
                              bg={dietitian.patientCount > 0 ? "success" : "secondary"} 
                              pill 
                              className="px-3 py-2"
                            >
                              {dietitian.patientCount} {dietitian.patientCount === 1 ? 'patient' : 'patients'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge 
                              bg={dietitian.patientCount > 0 ? "success" : "secondary"}
                              className="bg-opacity-10 text-success border border-success"
                              pill
                            >
                              {dietitian.patientCount > 0 ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                        {expandedRows[dietitian._id] && dietitian.assignedPatients && dietitian.assignedPatients.length > 0 && (
                          <tr className="bg-light">
                            <td colSpan="5" className="p-0 border-0">
                              <div className="p-4 border-top">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                  <h6 className="mb-0">
                                    <i className="fas fa-user-friends me-2 text-primary"></i>
                                    Assigned Patients
                                  </h6>
                                  <Badge bg="primary" pill className="px-3 py-2">
                                    {dietitian.assignedPatients.length} total
                                  </Badge>
                                </div>
                                <div className="row g-3">
                                  {dietitian.assignedPatients.map((patientId, index) => {
                                    // Check if the ID is a valid MongoDB ObjectId (24 hex chars)
                                    const isValidObjectId = typeof patientId === 'string' && /^[0-9a-fA-F]{24}$/.test(patientId);
                                    
                                    // Get mapped MongoDB ID for encounter IDs
                                    const mappedId = !isValidObjectId && patientData._encounterMapping && patientData._encounterMapping[patientId] 
                                      ? patientData._encounterMapping[patientId] 
                                      : null;
                                      
                                    // Get patient data either from original ObjectId or mapped ID
                                    const patient = patientData[patientId] || patientData[mappedId] || { 
                                      _id: isValidObjectId ? patientId : null,
                                      encounterId: isValidObjectId ? 'Unknown' : patientId,
                                      name: 'Unnamed Patient',
                                      dateOfBirth: null,
                                      admissionDate: null
                                    };
                                    
                                    // Check if this encounter ID has a known mapping
                                    const hasMapping = !isValidObjectId && patientData._encounterMapping && patientData._encounterMapping[patientId];
                                    
                                    // Is the patient currently being looked up?
                                    const isLookingUp = lookupInProgress[patientId];
                                    
                                    // Format dates if available
                                    const formattedDOB = patient.dateOfBirth 
                                      ? new Date(patient.dateOfBirth).toLocaleDateString() 
                                      : 'Unknown';
                                      
                                    const formattedAdmission = patient.admissionDate 
                                      ? new Date(patient.admissionDate).toLocaleDateString() 
                                      : 'Unknown';
                                    
                                    return (
                                      <div key={index} className="col-lg-6 col-md-12 mb-3">
                                        <div 
                                          className="border rounded p-0 patient-card shadow-sm"
                                          onClick={(e) => handlePatientNavigation(patientId, patient.encounterId, e)}
                                          style={{ 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s ease',
                                            opacity: isLookingUp ? 0.7 : 1
                                          }}
                                          onMouseOver={(e) => e.currentTarget.classList.add('bg-light')}
                                          onMouseOut={(e) => e.currentTarget.classList.remove('bg-light')}
                                        >
                                          <div className="p-3 border-bottom d-flex align-items-center">
                                            <div className={`rounded-circle p-2 d-flex align-items-center justify-content-center me-3 ${
                                              isValidObjectId || hasMapping ? 'bg-success bg-opacity-10' : 'bg-info bg-opacity-10'
                                            }`} style={{ width: '42px', height: '42px', flexShrink: 0 }}>
                                              {isLookingUp ? (
                                                <Spinner animation="border" size="sm" className="text-primary" />
                                              ) : (
                                                <i className={`fas ${isValidObjectId || hasMapping ? 'fa-user text-success' : 'fa-id-card text-info'}`}></i>
                                              )}
                                            </div>
                                            <div className="d-flex flex-column">
                                              <h6 className="mb-0 fw-medium">{patient.name}</h6>
                                              <small className="text-muted">
                                                {isValidObjectId ? 'Patient ID: ' : 'Encounter ID: '}
                                                <span className="fw-medium">{patient.encounterId}</span>
                                              </small>
                                            </div>
                                            <div className="ms-auto">
                                              <i className="fas fa-external-link-alt text-primary"></i>
                                            </div>
                                          </div>
                                          <div className="p-3 bg-light bg-opacity-50">
                                            <div className="row g-2 text-secondary small">
                                              <div className="col-6">
                                                <div className="d-flex align-items-center">
                                                  <i className="fas fa-calendar-day me-2 text-primary"></i>
                                                  <div>
                                                    <div className="text-muted small">DOB</div>
                                                    <div className="fw-medium">{formattedDOB}</div>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="col-6">
                                                <div className="d-flex align-items-center">
                                                  <i className="fas fa-hospital-user me-2 text-primary"></i>
                                                  <div>
                                                    <div className="text-muted small">Admission</div>
                                                    <div className="fw-medium">{formattedAdmission}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
            <Card.Footer className="bg-white border-top py-3 px-4">
              <small className="text-muted">
                Last updated: {new Date().toLocaleString()}
              </small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DietitianList; 