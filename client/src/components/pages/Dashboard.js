import React, { useState, useEffect } from 'react';
import { Row, Col, Card, ListGroup, Badge, Spinner, Table } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';
import config from '../../config';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement,
  LineElement,
  Title, 
  Tooltip, 
  Legend
);

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [referralPatients, setReferralPatients] = useState([]);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    referrals: 0,
    referralPercentage: 0,
    measurementStats: {}
  });
  const [bmiDistribution, setBmiDistribution] = useState({
    underweight: 0,
    normal: 0,
    overweight: 0,
    obese: 0
  });

  // Fetch pending assignments for dietitians
  const fetchPendingAssignments = async () => {
    if (!user || user.role !== 'dietitian') {
      console.log('Not fetching assignments: User not logged in or not a dietitian', user);
      return;
    }
    
    try {
      console.log('Fetching pending assignments for dietitian:', user._id, user.username);
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No auth token found');
        return;
      }
      
      const response = await axios.get(
        `${config.apiUrl}/api/patients/pending-assignments`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('Pending assignments response:', response.data);
      
      if (response.data && response.data.success) {
        const assignmentData = response.data.patients || [];
        console.log(`Successfully fetched ${assignmentData.length} pending assignments`);
        setPendingAssignments(assignmentData);
      } else {
        console.warn('Received success=false from pending assignments endpoint', response.data);
      }
    } catch (error) {
      console.error('Error fetching pending assignments:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Status code:', error.response.status);
      }
    }
  };

  // Get user data from localStorage on component mount
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('Loaded user data:', parsedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error('Error parsing user data from localStorage', e);
      }
    } else {
      console.warn('No user data found in localStorage');
    }
  }, []);

  // Effect to fetch assignments when user changes
  useEffect(() => {
    if (user && user.role === 'dietitian') {
      console.log('User is a dietitian, fetching pending assignments');
      fetchPendingAssignments();
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [allPatientsRes, referralPatientsRes, statsRes] = await Promise.all([
          axios.get(`${config.apiUrl}/api/patients`),
          axios.get(`${config.apiUrl}/api/patients/referrals`),
          axios.get(`${config.apiUrl}/api/patients/stats/overview`)
        ]);

        const allPatients = allPatientsRes.data || [];
        setPatients(allPatients);
        setReferralPatients(referralPatientsRes.data || []);
        
        const statsData = statsRes.data || {
          totalPatients: 0,
          referrals: 0,
          referralPercentage: 0,
          measurementStats: {},
          bmiDistribution: { underweight: 0, normal: 0, overweight: 0, obese: 0 },
          recentPatients: []
        };
        
        setStats(statsData);
        
        // Use the BMI distribution from the API if available
        if (statsData.bmiDistribution) {
          setBmiDistribution(statsData.bmiDistribution);
        } else {
          // Otherwise calculate it from the patients data (as fallback)
          const bmiDist = {
            underweight: 0,
            normal: 0,
            overweight: 0,
            obese: 0
          };

          allPatients.forEach(patient => {
            if (patient.bmi) {
              if (patient.bmi < 18.5) bmiDist.underweight++;
              else if (patient.bmi < 25) bmiDist.normal++;
              else if (patient.bmi < 30) bmiDist.overweight++;
              else bmiDist.obese++;
            }
          });

          setBmiDistribution(bmiDist);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  // Safely get percentage with null check
  const getReferralPercentage = () => {
    if (stats && typeof stats.referralPercentage === 'number') {
      return stats.referralPercentage.toFixed(1);
    }
    return '0.0';
  };

  // Prepare data for BMI distribution chart
  const bmiData = {
    labels: ['Underweight', 'Normal', 'Overweight', 'Obese'],
    datasets: [
      {
        label: 'Patient Count',
        data: [
          bmiDistribution.underweight,
          bmiDistribution.normal,
          bmiDistribution.overweight,
          bmiDistribution.obese
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(46, 204, 113, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(231, 76, 60, 0.7)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(46, 204, 113, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(231, 76, 60, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  // Prepare referral distribution data for pie chart
  const referralData = {
    labels: ['Dietitian Referral', 'Regular Care'],
    datasets: [
      {
        data: [stats.referrals || 0, (stats.totalPatients - stats.referrals) || 0],
        backgroundColor: ['rgba(231, 76, 60, 0.7)', 'rgba(52, 152, 219, 0.7)'],
        borderColor: ['rgba(231, 76, 60, 1)', 'rgba(52, 152, 219, 1)'],
        borderWidth: 1,
      },
    ]
  };

  // Prepare nutritional goal progress data (simulated)
  const feedingGoalData = {
    labels: ['Actual', 'Goal'],
    datasets: [
      {
        data: [
          stats.measurementStats?.feed_vol?.average || 0,
          1500 // Simulated goal - could come from an API or be calculated
        ],
        backgroundColor: ['rgba(46, 204, 113, 0.7)', 'rgba(201, 203, 207, 0.3)'],
        borderColor: ['rgba(46, 204, 113, 1)', 'rgba(201, 203, 207, 1)'],
        borderWidth: 1,
        circumference: 180,
        rotation: 270
      }
    ]
  };

  // Find top critical measurements to display
  const criticalMeasurements = Object.entries(stats.measurementStats || {})
    .filter(([key]) => ['bmi', 'feed_vol', 'feed_vol_adm', 'fio2'].includes(key))
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 4);

  // Get the top 5 patients by recency
  const recentPatients = patients.slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div>
          <span className="text-muted me-3">Last updated: {new Date().toLocaleString()}</span>
          <Badge bg="primary" className="ml-2">
            <i className="fas fa-sync-alt me-1"></i> Live
          </Badge>
        </div>
      </div>

      {/* Alert for Dietitians with Pending Assignments */}
      {user && user.role === 'dietitian' && pendingAssignments.length > 0 && (
        <div className="alert alert-warning mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="alert-heading mb-0">
                <i className="fas fa-bell me-2"></i>
                You have {pendingAssignments.length} assignment request{pendingAssignments.length !== 1 ? 's' : ''} that need{pendingAssignments.length === 1 ? 's' : ''} your response
              </h5>
              <span className="small">
                Patient ID{pendingAssignments.length !== 1 ? 's' : ''}: {' '}
                {pendingAssignments.slice(0, 3).map(p => p.encounterId).join(', ')}
                {pendingAssignments.length > 3 && `, and ${pendingAssignments.length - 3} more`}
              </span>
            </div>
            <div>
              <button 
                className="btn btn-outline-warning btn-sm me-2"
                onClick={fetchPendingAssignments}
              >
                <i className="fas fa-sync-alt"></i>
              </button>
              <Link 
                to="/pending-assignments" 
                className="btn btn-warning"
              >
                View & Respond
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview Cards */}
      <Row className="mb-4">
        <Col md={3} sm={6} className="mb-3 mb-md-0">
          <Card className="dashboard-stat-card primary h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-uppercase text-muted mb-2">Total Patients</h6>
                  <h2 className="mb-0">{stats.totalPatients || 0}</h2>
                </div>
                <div className="d-flex align-items-center">
                  <div className="display-4 text-primary">
                    <i className="fas fa-users"></i>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6} className="mb-3 mb-md-0">
          <Card className="dashboard-stat-card danger h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-uppercase text-muted mb-2">Referrals</h6>
                  <h2 className="mb-0">{stats.referrals || 0}</h2>
                  <small className="text-muted">{getReferralPercentage()}% of total</small>
                </div>
                <div className="d-flex align-items-center">
                  <div className="display-4 text-danger">
                    <i className="fas fa-user-md"></i>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6} className="mb-3 mb-md-0">
          <Card className="dashboard-stat-card success h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-uppercase text-muted mb-2">Avg. BMI</h6>
                  <h2 className="mb-0">
                    {stats.measurementStats?.bmi?.average?.toFixed(1) || 'N/A'}
                  </h2>
                  <small className="text-muted">
                    {stats.measurementStats?.bmi?.count || 0} measurements
                  </small>
                </div>
                <div className="d-flex align-items-center">
                  <div className="display-4 text-success">
                    <i className="fas fa-weight"></i>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3} sm={6}>
          <Card className="dashboard-stat-card warning h-100">
            <Card.Body>
              <div className="d-flex justify-content-between">
                <div>
                  <h6 className="text-uppercase text-muted mb-2">Avg. Feeding Vol</h6>
                  <h2 className="mb-0">
                    {stats.measurementStats?.feed_vol?.average?.toFixed(0) || 'N/A'}
                  </h2>
                  <small className="text-muted">ml per patient</small>
                </div>
                <div className="d-flex align-items-center">
                  <div className="display-4 text-warning">
                    <i className="fas fa-flask"></i>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Main Dashboard Content */}
      <Row>
        {/* Left Column - Charts */}
        <Col lg={8}>
          <Row className="mb-4">
            <Col md={6}>
              <Card className="h-100">
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>BMI Distribution</span>
                    <Badge bg="info" pill>
                      {stats.totalPatients} patients
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="chart-container" style={{ height: '250px' }}>
                    <Pie data={bmiData} options={{ maintainAspectRatio: false }} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="h-100">
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Referral Status</span>
                    <Badge bg="info" pill>
                      {getReferralPercentage()}% referred
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="chart-container" style={{ height: '250px' }}>
                    <Doughnut data={referralData} options={{ maintainAspectRatio: false }} />
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <span>Patient Metrics Overview</span>
                <div>
                  <Badge bg="primary" className="me-2">Daily</Badge>
                  <Badge bg="secondary">Weekly</Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              <div className="chart-container" style={{ height: '300px' }}>
                <Bar 
                  data={{
                    labels: criticalMeasurements.map(([key]) => 
                      key.replace(/_/g, ' ').toUpperCase()
                    ),
                    datasets: [{
                      label: 'Average Value',
                      backgroundColor: 'rgba(52, 152, 219, 0.5)',
                      borderColor: 'rgba(52, 152, 219, 1)',
                      borderWidth: 1,
                      data: criticalMeasurements.map(([,value]) => value.average || 0)
                    }]
                  }}
                  options={{ 
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }} 
                />
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column - Info and Lists */}
        <Col lg={4}>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <span>Recent Patients</span>
                <Link to="/patients" className="btn btn-sm btn-outline-primary">
                  View All
                </Link>
              </div>
            </Card.Header>
            <ListGroup variant="flush">
              {recentPatients.map(patient => (
                <ListGroup.Item key={patient._id} className="border-bottom">
                  <div className="d-flex justify-content-between align-items-center py-1">
                    <div className="d-flex align-items-center">
                      <div className={`status-indicator ${patient.referral ? 'danger' : 'active'}`}></div>
                      <div>
                        <h6 className="mb-0">
                          <Link to={`/patients/${patient._id}`} className="text-decoration-none">
                            {patient.encounterId}
                          </Link>
                        </h6>
                        <small className="text-muted">
                          BMI: {patient.bmi?.toFixed(1) || 'N/A'}
                        </small>
                      </div>
                    </div>
                    <div>
                      {patient.referral ? (
                        <Badge bg="danger">Referral</Badge>
                      ) : (
                        <Badge bg="success">Regular</Badge>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
              {recentPatients.length === 0 && (
                <ListGroup.Item className="text-center py-3 text-muted">
                  No patients available
                </ListGroup.Item>
              )}
            </ListGroup>
            <Card.Footer className="text-center bg-light">
              <Link to="/patients" className="text-decoration-none">
                <small>View all patients <i className="fas fa-arrow-right ms-1"></i></small>
              </Link>
            </Card.Footer>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <span>Referral Patients</span>
                <Badge bg="danger" pill>
                  {referralPatients.length}
                </Badge>
              </div>
            </Card.Header>
            <ListGroup variant="flush">
              {referralPatients.slice(0, 5).map(patient => (
                <ListGroup.Item key={patient._id} className="border-bottom">
                  <div className="d-flex justify-content-between align-items-center py-1">
                    <div>
                      <Link to={`/patients/${patient._id}`} className="text-decoration-none">
                        {patient.encounterId}
                      </Link>
                    </div>
                    <div>
                      <Badge bg="danger" className="me-2">Referral</Badge>
                      {patient.assignedTo ? (
                        <Badge bg="info">Assigned</Badge>
                      ) : (
                        <Badge bg="warning">Unassigned</Badge>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
              {referralPatients.length === 0 && (
                <ListGroup.Item className="text-center py-3 text-muted">
                  No referral patients
                </ListGroup.Item>
              )}
            </ListGroup>
            <Card.Footer className="text-center bg-light">
              <Link to="/active-referrals" className="text-decoration-none">
                <small>Manage referrals <i className="fas fa-arrow-right ms-1"></i></small>
              </Link>
            </Card.Footer>
          </Card>

          {/* Pending Assignments Card - Only visible to dietitians */}
          {user && user.role === 'dietitian' && (
            <Card className="mb-4">
              <Card.Header className="bg-warning bg-opacity-10">
                <div className="d-flex justify-content-between align-items-center">
                  <span>
                    <i className="fas fa-bell me-2 text-warning"></i>
                    Assignment Requests
                  </span>
                  <div>
                    <Badge bg="warning" pill className="me-2">
                      {pendingAssignments.length}
                    </Badge>
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={fetchPendingAssignments}
                      title="Refresh assignments"
                    >
                      <i className="fas fa-sync-alt"></i>
                    </button>
                  </div>
                </div>
              </Card.Header>
              <ListGroup variant="flush">
                {pendingAssignments.slice(0, 5).map(patient => (
                  <ListGroup.Item key={patient._id} className="border-bottom">
                    <div className="d-flex justify-content-between align-items-center py-1">
                      <div>
                        <Link to={`/patients/${patient._id}`} className="text-decoration-none">
                          <strong>{patient.encounterId}</strong>
                        </Link>
                        <div className="small mt-1">
                          {patient.bmi && <span className="me-2">BMI: {patient.bmi.toFixed(1)}</span>}
                          {patient.feed_vol && <span>Feed Vol: {patient.feed_vol}</span>}
                        </div>
                      </div>
                      <div>
                        <Badge bg="warning">
                          <i className="fas fa-clock me-1"></i>
                          Needs Response
                        </Badge>
                      </div>
                    </div>
                    <small className="text-muted">
                      Requested: {patient.assignedDate ? new Date(patient.assignedDate).toLocaleDateString() : 'Unknown'}
                    </small>
                  </ListGroup.Item>
                ))}
                {pendingAssignments.length === 0 && (
                  <ListGroup.Item className="text-center py-3 text-muted">
                    <div className="py-2">
                      No pending assignment requests
                    </div>
                    <button 
                      className="btn btn-sm btn-outline-secondary mt-1"
                      onClick={fetchPendingAssignments}
                    >
                      <i className="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                  </ListGroup.Item>
                )}
              </ListGroup>
              {pendingAssignments.length > 0 && (
                <Card.Footer className="text-center bg-light">
                  <Link to="/pending-assignments" className="text-decoration-none">
                    <small>Respond to requests <i className="fas fa-arrow-right ms-1"></i></small>
                  </Link>
                </Card.Footer>
              )}
            </Card>
          )}

          <Card>
            <Card.Header>Nutritional Goal Progress</Card.Header>
            <Card.Body className="text-center">
              <div className="chart-container" style={{ height: '230px' }}>
                <Doughnut 
                  data={feedingGoalData} 
                  options={{ 
                    maintainAspectRatio: false,
                    rotation: 270,
                    circumference: 180,
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }} 
                />
              </div>
              <div className="mt-2">
                <h3 className="mb-0">
                  {stats.measurementStats?.feed_vol?.average?.toFixed(0) || 0}
                  <small className="text-muted"> / 1500 ml</small>
                </h3>
                <p className="text-muted mb-0">Average feeding volume</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 