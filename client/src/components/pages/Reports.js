import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Table, Button, Spinner, Form, Alert, ListGroup, Badge, Tabs, Tab } from 'react-bootstrap';
import { Bar, Radar } from 'react-chartjs-2';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, RadialLinearScale, Title, Filler } from 'chart.js';
import config from '../../config';
import PrintableReport from '../report/PrintableReport';
import html2pdf from 'html2pdf.js';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  RadialLinearScale,
  Title, 
  Tooltip, 
  Legend,
  Filler
);

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPatients: 0,
    referrals: 0,
    referralPercentage: 0,
    measurementStats: {}
  });
  const [allPatients, setAllPatients] = useState([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState([]);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('bmi');
  const [generating, setGenerating] = useState(false);
  const printableReportRef = useRef(null);

  // Fetch general stats and all patients for selection
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, patientsRes] = await Promise.all([
          axios.get(`${config.apiUrl}/api/patients/stats/overview`),
          axios.get(`${config.apiUrl}/api/patients`)
        ]);
        
        setStats(statsRes.data || { 
          totalPatients: 0, 
          referrals: 0, 
          referralPercentage: 0,
          measurementStats: {}
        });
        
        setAllPatients(patientsRes.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch detailed data for selected patients
  useEffect(() => {
    const fetchSelectedPatients = async () => {
      if (selectedPatientIds.length === 0) {
        setSelectedPatients([]);
        return;
      }
      
      try {
        setPatientsLoading(true);
        setError(null);
        
        const response = await axios.post(
          `${config.apiUrl}/api/patients/by-ids`, 
          { patientIds: selectedPatientIds },
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        setSelectedPatients(response.data);
        setPatientsLoading(false);
      } catch (error) {
        console.error('Error fetching selected patients:', error);
        setError(error.response?.data?.message || 'Failed to load selected patients');
        setPatientsLoading(false);
      }
    };

    fetchSelectedPatients();
  }, [selectedPatientIds]);

  const handlePatientSelection = (patientId) => {
    setSelectedPatientIds(prevIds => 
      prevIds.includes(patientId)
        ? prevIds.filter(id => id !== patientId)
        : [...prevIds, patientId]
    );
  };

  const handleGeneratePDF = async () => {
    if (selectedPatients.length === 0) {
      setError('Please select at least one patient to generate a report');
      return;
    }
    
    setGenerating(true);
    
    try {
      // Small delay to ensure the printable report is fully rendered
      setTimeout(() => {
        const element = printableReportRef.current;
        
        if (!element) {
          setError('Failed to generate PDF. Report element not found.');
          setGenerating(false);
          return;
        }
        
        // Configure PDF options
        const options = {
          margin: 10,
          filename: `patient-report-${new Date().toISOString().slice(0, 10)}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Generate and download PDF
        html2pdf().from(element).set(options).save()
          .then(() => {
            console.log('PDF generated successfully');
            setGenerating(false);
          })
          .catch(err => {
            console.error('Error generating PDF:', err);
            setError('Failed to generate PDF. Please try again.');
            setGenerating(false);
          });
      }, 200);
    } catch (error) {
      console.error('Error in PDF generation:', error);
      setError('Failed to generate PDF. Please try again.');
      setGenerating(false);
    }
  };

  const formatDecimal = (value) => {
    if (value === null || value === undefined) {
      return '0';
    }
    return value.toFixed(2);
  };

  // Filter patients based on search term
  const filteredPatients = allPatients.filter(patient => 
    patient.encounterId?.toString().toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Prepare comparison data for selected patients
  const prepareComparisonData = (field) => {
    if (!selectedPatients || selectedPatients.length === 0) return null;
    
    return {
      labels: selectedPatients.map(p => p.encounterId ? `ID: ${p.encounterId}` : 'Unknown'),
      datasets: [
        {
          label: field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' '),
          data: selectedPatients.map(p => p[field] || 0),
          backgroundColor: [
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)'
          ],
          borderColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1,
        }
      ]
    };
  };

  // Prepare radar chart data for comparing all measurements of a patient
  const preparePatientRadarData = (patient) => {
    if (!patient) return null;
    
    const measurementFields = [
      'bmi', 'end_tidal_co2', 'feed_vol', 'fio2', 'resp_rate'
    ];
    
    // Normalize the values to be comparable on the same scale
    const normalizedValues = measurementFields.map(field => {
      const value = patient[field] || 0;
      const avg = stats.measurementStats[field]?.average || 1; // Prevent division by zero
      return value / avg; // Normalize as a ratio of the average
    });
    
    return {
      labels: measurementFields.map(field => field.replace(/_/g, ' ')),
      datasets: [
        {
          label: `Patient ${patient.encounterId}`,
          data: normalizedValues,
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1,
          fill: true,
          pointBackgroundColor: 'rgba(255, 99, 132, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
        },
        {
          label: 'Average Patient',
          data: measurementFields.map(() => 1), // Average is normalized to 1
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1,
          fill: true,
          pointBackgroundColor: 'rgba(54, 162, 235, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <>
      {/* Main UI for screen viewing */}
      <div className="bg-light min-vh-100 py-4">
        <div className="container-fluid px-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h2 mb-0">Patient Medical Reports</h1>
            <div>
              <Button 
                variant="primary" 
                onClick={handleGeneratePDF}
                disabled={selectedPatients.length === 0 || generating}
                className="d-flex align-items-center"
              >
                {generating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-pdf me-2"></i>
                    Download Report
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
              <i className="fas fa-exclamation-circle me-2"></i>
              {error}
            </Alert>
          )}

          <Row>
            <Col md={3}>
              <Card className="shadow-sm mb-4">
                <Card.Header className="bg-white py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="fas fa-users me-2 text-primary"></i>
                      Patient Selection
                    </h5>
                    <Badge bg="primary" pill>
                      {selectedPatientIds.length} selected
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <Form.Group className="mb-3">
                    <div className="input-group">
                      <span className="input-group-text bg-white">
                        <i className="fas fa-search text-muted"></i>
                      </span>
                      <Form.Control 
                        type="text" 
                        placeholder="Search patients by ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </Form.Group>
                  <div className="patient-list" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                    {filteredPatients.length === 0 ? (
                      <Alert variant="info">No patients match your search</Alert>
                    ) : (
                      <ListGroup>
                        {filteredPatients.map(patient => (
                          <ListGroup.Item 
                            key={patient._id}
                            className="d-flex justify-content-between align-items-center py-3"
                            action
                            active={selectedPatientIds.includes(patient._id)}
                            onClick={() => handlePatientSelection(patient._id)}
                          >
                            <div>
                              <div className="fw-bold text-truncate" style={{maxWidth: '180px'}}>
                                {patient.encounterId}
                              </div>
                              <div className="d-flex mt-1">
                                <small className="me-2">
                                  <i className="fas fa-weight me-1 text-muted"></i>
                                  {patient.bmi ? patient.bmi.toFixed(1) : 'N/A'}
                                </small>
                                <small>
                                  <i className="fas fa-flask me-1 text-muted"></i>
                                  {patient.feed_vol ? patient.feed_vol.toFixed(0) : 'N/A'} ml
                                </small>
                              </div>
                            </div>
                            <Badge bg={patient.referral ? 'danger' : 'success'} pill>
                              {patient.referral ? 'Referral' : 'Regular'}
                            </Badge>
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white border-top">
                  <small className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Select patients to generate reports
                  </small>
                </Card.Footer>
              </Card>
            </Col>

            <Col md={9}>
              {patientsLoading ? (
                <div className="text-center p-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading patient data...</span>
                  </Spinner>
                  <p className="mt-3">Loading patient data...</p>
                </div>
              ) : selectedPatients.length === 0 ? (
                <Card className="shadow-sm text-center p-5">
                  <div className="py-5">
                    <div className="display-6 text-muted mb-4">
                      <i className="fas fa-clipboard-list"></i>
                    </div>
                    <h4>Select Patients to Generate Reports</h4>
                    <p className="text-muted">
                      Choose one or more patients from the list to view their medical information and visualizations.
                    </p>
                  </div>
                </Card>
              ) : (
                <>
                  {selectedPatients.length > 1 && (
                    <Card className="shadow-sm mb-4">
                      <Card.Header className="bg-white py-3">
                        <h5 className="mb-0">
                          <i className="fas fa-chart-bar me-2 text-primary"></i>
                          Patient Comparison ({selectedPatients.length} patients)
                        </h5>
                      </Card.Header>
                      <Card.Body>
                        <Tabs
                          activeKey={activeTab}
                          onSelect={(k) => setActiveTab(k)}
                          id="comparison-tabs"
                          className="mb-3"
                        >
                          <Tab eventKey="bmi" title="BMI">
                            <div style={{ height: '350px' }}>
                              <Bar 
                                data={prepareComparisonData('bmi')} 
                                options={{ 
                                  maintainAspectRatio: false,
                                  plugins: {
                                    title: {
                                      display: true,
                                      text: 'BMI Comparison'
                                    },
                                    legend: {
                                      display: false
                                    }
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      title: {
                                        display: true,
                                        text: 'BMI Value'
                                      }
                                    }
                                  }
                                }} 
                              />
                            </div>
                          </Tab>
                          <Tab eventKey="feed_vol" title="Feeding Volume">
                            <div style={{ height: '350px' }}>
                              <Bar 
                                data={prepareComparisonData('feed_vol')} 
                                options={{ 
                                  maintainAspectRatio: false,
                                  plugins: {
                                    title: {
                                      display: true,
                                      text: 'Feeding Volume Comparison'
                                    },
                                    legend: {
                                      display: false
                                    }
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      title: {
                                        display: true,
                                        text: 'Volume (ml)'
                                      }
                                    }
                                  }
                                }} 
                              />
                            </div>
                          </Tab>
                          <Tab eventKey="resp_rate" title="Respiratory Rate">
                            <div style={{ height: '350px' }}>
                              <Bar 
                                data={prepareComparisonData('resp_rate')} 
                                options={{ 
                                  maintainAspectRatio: false,
                                  plugins: {
                                    title: {
                                      display: true,
                                      text: 'Respiratory Rate Comparison'
                                    },
                                    legend: {
                                      display: false
                                    }
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      title: {
                                        display: true,
                                        text: 'Breaths per minute'
                                      }
                                    }
                                  }
                                }} 
                              />
                            </div>
                          </Tab>
                          <Tab eventKey="end_tidal_co2" title="End Tidal CO2">
                            <div style={{ height: '350px' }}>
                              <Bar 
                                data={prepareComparisonData('end_tidal_co2')} 
                                options={{ 
                                  maintainAspectRatio: false,
                                  plugins: {
                                    title: {
                                      display: true,
                                      text: 'End Tidal CO2 Comparison'
                                    },
                                    legend: {
                                      display: false
                                    }
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      title: {
                                        display: true,
                                        text: 'CO2 Level'
                                      }
                                    }
                                  }
                                }} 
                              />
                            </div>
                          </Tab>
                          <Tab eventKey="fio2" title="FiO2">
                            <div style={{ height: '350px' }}>
                              <Bar 
                                data={prepareComparisonData('fio2')} 
                                options={{ 
                                  maintainAspectRatio: false,
                                  plugins: {
                                    title: {
                                      display: true,
                                      text: 'FiO2 Comparison'
                                    },
                                    legend: {
                                      display: false
                                    }
                                  },
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      title: {
                                        display: true,
                                        text: 'FiO2 Value'
                                      }
                                    }
                                  }
                                }} 
                              />
                            </div>
                          </Tab>
                        </Tabs>
                      </Card.Body>
                    </Card>
                  )}

                  {selectedPatients.map(patient => (
                    <Card key={patient._id} className="shadow-sm mb-4">
                      <Card.Header className="bg-white py-3 border-bottom">
                        <div className="d-flex justify-content-between align-items-center">
                          <h5 className="mb-0">
                            <i className="fas fa-user-md me-2 text-primary"></i>
                            Patient ID: {patient.encounterId}
                          </h5>
                          <Badge bg={patient.referral ? 'danger' : 'success'} className="py-2 px-3">
                            {patient.referral ? 'Dietitian Referral' : 'Regular Care'}
                          </Badge>
                        </div>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Card className="border mb-3">
                              <Card.Header className="bg-light py-2">
                                <h6 className="mb-0">
                                  <i className="fas fa-clipboard-list me-2"></i>
                                  Medical Information
                                </h6>
                              </Card.Header>
                              <Card.Body className="p-0">
                                <Table striped bordered className="mb-0">
                                  <tbody>
                                    <tr>
                                      <td className="bg-light" width="40%"><strong>BMI</strong></td>
                                      <td>
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
                                            <span className="ms-2 text-muted small">
                                              {patient.bmi > 30 ? '(Obese)' : 
                                               patient.bmi > 25 ? '(Overweight)' : 
                                               patient.bmi < 18.5 ? '(Underweight)' : '(Normal)'}
                                            </span>
                                          </div>
                                        ) : 'N/A'}
                                      </td>
                                    </tr>
                                    <tr>
                                      <td className="bg-light"><strong>Feeding Volume</strong></td>
                                      <td>{patient.feed_vol ? patient.feed_vol.toFixed(2) + ' ml' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="bg-light"><strong>Administered Volume</strong></td>
                                      <td>{patient.feed_vol_adm ? patient.feed_vol_adm.toFixed(2) + ' ml' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="bg-light"><strong>End Tidal CO2</strong></td>
                                      <td>{patient.end_tidal_co2 ? patient.end_tidal_co2.toFixed(2) : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="bg-light"><strong>FiO2</strong></td>
                                      <td>{patient.fio2 ? patient.fio2.toFixed(2) + '%' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="bg-light"><strong>FiO2 Ratio</strong></td>
                                      <td>{patient.fio2_ratio ? patient.fio2_ratio.toFixed(2) : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="bg-light"><strong>Respiratory Rate</strong></td>
                                      <td>{patient.resp_rate ? patient.resp_rate.toFixed(2) + ' breaths/min' : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="bg-light"><strong>Oxygen Flow Rate</strong></td>
                                      <td>{patient.oxygen_flow_rate ? patient.oxygen_flow_rate.toFixed(2) : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="bg-light"><strong>PEEP</strong></td>
                                      <td>{patient.peep ? patient.peep.toFixed(2) : 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="bg-light"><strong>PIP</strong></td>
                                      <td>{patient.pip ? patient.pip.toFixed(2) : 'N/A'}</td>
                                    </tr>
                                  </tbody>
                                </Table>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col md={6}>
                            <Card className="border h-100">
                              <Card.Header className="bg-light py-2">
                                <h6 className="mb-0">
                                  <i className="fas fa-chart-radar me-2"></i>
                                  Patient Profile vs. Average
                                </h6>
                              </Card.Header>
                              <Card.Body>
                                <div style={{ height: '350px' }}>
                                  <Radar 
                                    data={preparePatientRadarData(patient)} 
                                    options={{ 
                                      maintainAspectRatio: false,
                                      scales: {
                                        r: {
                                          beginAtZero: true,
                                          min: 0,
                                          max: 2, // Scale that goes to 2x the average
                                          ticks: {
                                            display: false
                                          }
                                        }
                                      }
                                    }} 
                                  />
                                </div>
                                <div className="text-center mt-2">
                                  <small className="text-muted">
                                    Values shown as ratio compared to average patient (1.0 = average)
                                  </small>
                                </div>
                                
                                <div className="mt-3 pt-3 border-top">
                                  <h6 className="mb-3">Key Measurements Relative to Population</h6>
                                  {['bmi', 'feed_vol', 'resp_rate', 'end_tidal_co2', 'fio2'].map(field => {
                                    const value = patient[field] || 0;
                                    const avg = stats.measurementStats[field]?.average || 1;
                                    const ratio = value / avg;
                                    const percentage = Math.round(ratio * 100);
                                    
                                    return (
                                      <div key={field} className="mb-2">
                                        <div className="d-flex justify-content-between mb-1">
                                          <small className="text-capitalize">{field.replace(/_/g, ' ')}</small>
                                          <small className={
                                            ratio > 1.2 ? 'text-danger' : 
                                            ratio < 0.8 ? 'text-warning' : 
                                            'text-success'
                                          }>
                                            {percentage}% of avg
                                          </small>
                                        </div>
                                        <div className="progress" style={{ height: '8px' }}>
                                          <div 
                                            className={`progress-bar ${
                                              ratio > 1.2 ? 'bg-danger' : 
                                              ratio < 0.8 ? 'bg-warning' : 
                                              'bg-success'
                                            }`} 
                                            role="progressbar" 
                                            style={{ width: `${Math.min(percentage, 200)}%` }}
                                            aria-valuenow={percentage} 
                                            aria-valuemin="0" 
                                            aria-valuemax="200"
                                          ></div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </Card.Body>
                            </Card>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  ))}
                </>
              )}
            </Col>
          </Row>
        </div>
      </div>

      {/* Hidden report component for PDF generation */}
      <div className="printable-report-container" style={{ display: 'none' }}>
        <div ref={printableReportRef}>
          <PrintableReport patients={selectedPatients} stats={stats} />
        </div>
      </div>
    </>
  );
};

export default Reports; 