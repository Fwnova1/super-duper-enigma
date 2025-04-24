import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Row, Col, Card, Table, Badge, Button, Spinner, ProgressBar, Alert, Form, ListGroup, Tab, Tabs } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend } from 'chart.js';
import config from '../../config';
import html2pdf from 'html2pdf.js';
import PrintableReport from '../report/PrintableReport';
import ReferralManagement from '../referral/ReferralManagement';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const PatientDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [error, setError] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [dietitians, setDietitians] = useState([]);
  const [selectedDietitian, setSelectedDietitian] = useState('');
  const [assigningDietitian, setAssigningDietitian] = useState(false);
  const [assignmentResult, setAssignmentResult] = useState(null);
  const [assignedDietitianName, setAssignedDietitianName] = useState('Unassigned');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [generating, setGenerating] = useState(false);
  const printableReportRef = useRef(null);

  // Function to run AI prediction on this patient
  const predictReferral = useCallback(async () => {
    try {
      setPredicting(true);
      setPredictionResult(null);
      
      // Let axios interceptors handle the token automatically
      const response = await axios.post(
        `${config.apiUrl}/api/patients/${id}/predict-referral`, 
        {}
      );
      
      // Update patient data with prediction result
      setPatient(response.data.patient);
      setPredictionResult({
        success: true,
        needsReferral: response.data.prediction
      });
    } catch (error) {
      console.error('Error predicting referral:', error);
      setPredictionResult({
        success: false,
        error: error.response?.data?.message || 'Failed to predict referral'
      });
    } finally {
      setPredicting(false);
    }
  }, [id, setPatient, setPredicting, setPredictionResult]);

  // Create fetchData as a callback so it can be referenced elsewhere
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`Fetching patient data for ID: ${id}`);
      
      // Let axios interceptors handle the token automatically
      const patientRes = await axios.get(`${config.apiUrl}/api/patients/${id}`);
      
      console.log('Patient data received:', patientRes.data);
      setPatient(patientRes.data);
      setLoading(false);
      
      // Automatically run AI prediction after loading patient data
      if (patientRes.data) {
        predictReferral();
      }
      
      // Also fetch the stats needed for the printable report
      const token = localStorage.getItem('token');
      if (token) {
        const statsRes = await axios.get(`${config.apiUrl}/api/patients/stats/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.response?.data?.message || 'Failed to load patient data');
      setLoading(false);
    }
  }, [id, predictReferral]);

  useEffect(() => {
    fetchData();
    
    // Load user from localStorage
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
  }, [fetchData]);

  // Fetch dietitians for assignment dropdown - declared outside useEffect so it can be called from other functions
  const fetchDietitians = useCallback(async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'dietitian') || !patient) {
      console.log('Cannot fetch dietitians: Missing user, proper role, or patient data');
      return;
    }

    try {
      console.log('========== DIETITIAN LIST DEBUG ==========');
      console.log('User role:', user.role);
      console.log('User ID:', user.id);
      
      // Check token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found in localStorage');
        setAssignmentResult({
          success: false,
          error: 'Authentication token not found. Please log in again.'
        });
        return;
      }
      
      console.log('Attempting to fetch dietitians from:', `${config.apiUrl}/api/patients/dietitians`);
      
      // Force dietitians list to empty while loading to show loading state
      setDietitians([]);
      
      // Set up request configuration with explicit headers
      const requestConfig = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000 // 30 second timeout (increased)
      };
      
      // Try the database connection first to ensure it's working
      try {
        const dbStatus = await axios.get(`${config.apiUrl}/api/patients/system/db-status`, requestConfig);
        console.log('Database status check:', dbStatus.data);
        
        if (!dbStatus.data.success) {
          throw new Error(`Database error: ${dbStatus.data.message}`);
        }
        
        console.log(`Database is connected with state: ${dbStatus.data.dbState}`);
      } catch (dbErr) {
        console.error('Database connection check failed:', dbErr);
        // Continue with the request anyway, but log the error
      }
      
      // Make the request directly with axios
      const response = await axios.get(`${config.apiUrl}/api/patients/dietitians`, requestConfig);
      
      console.log('Dietitians API response status:', response.status);
      console.log('Dietitians response data:', JSON.stringify(response.data));
      
      // Check response format
      let dietitiansList = [];
      
      if (response.data && Array.isArray(response.data)) {
        // Direct array response (new simplified format)
        dietitiansList = response.data;
        console.log(`Found ${dietitiansList.length} dietitians (array format)`);
      } else if (response.data && response.data.dietitians && Array.isArray(response.data.dietitians)) {
        // Older format with nested dietitians array
        dietitiansList = response.data.dietitians;
        console.log(`Found ${dietitiansList.length} dietitians (object format)`);
      } else if (response.data && response.data.success === false) {
        // Error response with message
        console.error('Server returned error:', response.data.message);
        setDietitians([]);
        setAssignmentResult({
          success: false,
          error: response.data.message || 'Server returned an error'
        });
        return;
      } else {
        console.error('Invalid response data format for dietitians:', response.data);
        setDietitians([]);
        setAssignmentResult({
          success: false,
          error: 'Invalid response format from server'
        });
        return;
      }
      
      // Check if we have any dietitians
      if (dietitiansList.length === 0) {
        console.log('No dietitians found in the response');
        if (user.role === 'admin') {
          // Automatically create a test dietitian if admin and no dietitians found
          console.log('Admin user detected - will attempt to create a test dietitian');
          createTestDietitian();
        }
      } else {
        // Set the dietitians list
        setDietitians(dietitiansList);
        
        // If patient has an assigned dietitian, find their name
        if (patient.assignedTo) {
          console.log('Patient assigned to:', patient.assignedTo);
          
          // Convert assignedTo to string for consistent comparison
          const patientDietitianId = patient.assignedTo.toString();
          
          // Find the matching dietitian
          const assignedDietitian = dietitiansList.find(d => 
            d._id.toString() === patientDietitianId
          );
          
          if (assignedDietitian) {
            console.log('Found assigned dietitian:', assignedDietitian.username);
            setAssignedDietitianName(assignedDietitian.username);
          } else {
            console.log('Assigned dietitian not found in list. ID:', patientDietitianId);
            setAssignedDietitianName('Unknown');
          }
        } else {
          console.log('Patient has no dietitian assigned');
          setAssignedDietitianName('Unassigned');
        }
      }
      console.log('========== END DIETITIAN LIST DEBUG ==========');
    } catch (error) {
      console.error('========== DIETITIAN LIST ERROR ==========');
      console.error('Error fetching dietitians:', error);
      
      let errorMessage = 'Failed to load dietitians list';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        errorMessage = error.message;
      }
      
      console.error('=========================================');
      
      setDietitians([]);
      setAssignmentResult({
        success: false,
        error: errorMessage
      });
    }
  }, [user, patient, setDietitians, setAssignedDietitianName, setAssignmentResult]);

  // Call fetchDietitians when component loads with proper dependencies
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'dietitian') && patient) {
      console.log("Triggering dietitian fetch due to user/patient data load");
      fetchDietitians();
    }
  }, [user, patient, fetchDietitians]);

  // Handle dietitian assignment
  const handleAssignDietitian = async (e) => {
    e.preventDefault();
    
    if (!selectedDietitian) {
      setAssignmentResult({
        success: false,
        error: 'Please select a dietitian to assign'
      });
      return;
    }
    
    try {
      setAssigningDietitian(true);
      setAssignmentResult(null);
      
      console.log(`Assigning patient ${patient.encounterId} to dietitian ID: ${selectedDietitian}`);
      
      // Send request to the server
      const response = await axios.post(
        `${config.apiUrl}/api/patients/${id}/assign`, 
        { dietitianId: selectedDietitian },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      console.log('Assignment response:', response.data);
      
      if (response.data && response.data.success) {
        // Update the patient with new assignment
        const updatedPatient = await axios.get(`${config.apiUrl}/api/patients/${id}`);
        
        console.log('Updated patient:', updatedPatient.data);
        setPatient(updatedPatient.data);
        
        // Update the assigned dietitian name directly
        const assignedDietitian = dietitians.find(d => d._id.toString() === selectedDietitian.toString());
        if (assignedDietitian) {
          console.log('Setting assigned dietitian to:', assignedDietitian.username);
          setAssignedDietitianName(assignedDietitian.username);
        }
        
        // Show success message
        setAssignmentResult({
          success: true,
          message: response.data.message || 'Patient successfully assigned to dietitian'
        });
        
        // Reset selection
        setSelectedDietitian('');
        
        // Refresh dietitians list to update counts
        fetchDietitians();
      } else {
        throw new Error(response.data?.message || 'Failed to assign dietitian');
      }
    } catch (error) {
      console.error('Error assigning dietitian:', error);
      
      let errorMessage = 'Failed to assign dietitian';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        console.error('No response received');
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        console.error('Error message:', error.message);
        errorMessage = error.message;
      }
      
      setAssignmentResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setAssigningDietitian(false);
    }
  };

  // Measurement definitions with normal ranges and units
  const measurementDefinitions = {
    bmi: {
      label: 'BMI',
      unit: 'kg/m²',
      normalRange: { min: 18.5, max: 24.9 },
      category: 'Nutrition'
    },
    end_tidal_co2: {
      label: 'End-tidal CO2',
      unit: 'mmHg',
      normalRange: { min: 35, max: 45 },
      category: 'Respiratory'
    },
    feed_vol: {
      label: 'Feeding Volume',
      unit: 'ml',
      normalRange: { min: 1000, max: 2000 },
      category: 'Nutrition'
    },
    feed_vol_adm: {
      label: 'Feeding Volume Administered',
      unit: 'ml',
      normalRange: { min: 800, max: 1600 },
      category: 'Nutrition'
    },
    fio2: {
      label: 'FiO2',
      unit: '%',
      normalRange: { min: 21, max: 100 },
      category: 'Respiratory'
    },
    fio2_ratio: {
      label: 'FiO2 Ratio',
      unit: '',
      normalRange: { min: 200, max: 300 },
      category: 'Respiratory'
    },
    insp_time: {
      label: 'Inspiration Time',
      unit: 'sec',
      normalRange: { min: 0.8, max: 1.2 },
      category: 'Respiratory'
    },
    oxygen_flow_rate: {
      label: 'Oxygen Flow Rate',
      unit: 'L/min',
      normalRange: { min: 2, max: 6 },
      category: 'Respiratory'
    },
    peep: {
      label: 'PEEP',
      unit: 'cmH2O',
      normalRange: { min: 5, max: 8 },
      category: 'Respiratory'
    },
    pip: {
      label: 'Peak Inspiratory Pressure',
      unit: 'cmH2O',
      normalRange: { min: 15, max: 25 },
      category: 'Respiratory'
    },
    resp_rate: {
      label: 'Respiratory Rate',
      unit: 'breaths/min',
      normalRange: { min: 12, max: 20 },
      category: 'Respiratory'
    },
    sip: {
      label: 'SIP',
      unit: 'cmH2O',
      normalRange: { min: 15, max: 25 },
      category: 'Respiratory'
    },
    tidal_vol: {
      label: 'Tidal Volume',
      unit: 'ml',
      normalRange: { min: 400, max: 600 },
      category: 'Respiratory'
    },
    tidal_vol_actual: {
      label: 'Actual Tidal Volume',
      unit: 'ml',
      normalRange: { min: 400, max: 600 },
      category: 'Respiratory'
    },
    tidal_vol_kg: {
      label: 'Tidal Volume per kg',
      unit: 'ml/kg',
      normalRange: { min: 6, max: 8 },
      category: 'Respiratory'
    },
    tidal_vol_spon: {
      label: 'Spontaneous Tidal Volume',
      unit: 'ml',
      normalRange: { min: 300, max: 500 },
      category: 'Respiratory'
    }
  };

  const getMeasurementStatus = (value, normalRange) => {
    if (value < normalRange.min) return 'danger';
    if (value > normalRange.max) return 'warning';
    return 'success';
  };

  const getMeasurementProgress = (value, normalRange) => {
    const range = normalRange.max - normalRange.min;
    const position = ((value - normalRange.min) / range) * 100;
    return Math.min(Math.max(position, 0), 100);
  };

  // Add a test function to check basic authentication
  const testAuth = async () => {
    try {
      console.log('======== TESTING AUTHENTICATION ========');
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found for auth test');
        setAssignmentResult({
          success: false,
          error: 'No authentication token found. Please log in again.'
        });
        return;
      }
      
      console.log('Testing auth with token:', token.substring(0, 10) + '...');
      
      // Make a request to the test endpoint
      const response = await axios.get(`${config.apiUrl}/api/patients/auth-test`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Auth test response:', response.data);
      console.log('Authentication working properly!');
      
      // Now try to get dietitians after confirming auth works
      fetchDietitians();
      
      console.log('======== END AUTHENTICATION TEST ========');
    } catch (error) {
      console.error('======== AUTHENTICATION TEST ERROR ========');
      console.error('Auth test failed:', error);
      console.error('Error response:', error.response);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('=========================================');
      
      setAssignmentResult({
        success: false,
        error: 'Authentication test failed: ' + (error.response?.data?.message || error.message)
      });
    }
  };

  // Add a function to create a test dietitian user (admin only)
  const createTestDietitian = async () => {
    try {
      if (!user || user.role !== 'admin') {
        setAssignmentResult({
          success: false,
          error: 'Only admins can create test users'
        });
        return;
      }
      
      console.log('Creating test dietitian user...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Generate a random username and email to avoid conflicts
      const random = Math.floor(Math.random() * 10000);
      const userData = {
        username: `test_dietitian_${random}`,
        email: `test${random}@example.com`,
        password: 'password123',
        role: 'dietitian'
      };
      
      console.log('Test user data:', userData);
      
      const response = await axios.post(
        `${config.apiUrl}/api/auth/create-user`,
        userData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('User creation response:', response.data);
      
      setAssignmentResult({
        success: true,
        message: `Test dietitian created: ${userData.username}`
      });
      
      // Try to load dietitians again
      fetchDietitians();
    } catch (error) {
      console.error('Error creating test dietitian:', error);
      setAssignmentResult({
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create test user'
      });
    }
  };

  // Test direct fetch call
  const testDirectFetch = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiUrl}/api/patients/dietitians`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      console.log('Direct fetch response:', data);
      
      alert(`Direct fetch successful. Found ${Array.isArray(data) ? data.length : 
        (data.dietitians ? data.dietitians.length : 0)} dietitians`);
        
    } catch (err) {
      console.error('Direct fetch error:', err);
      alert(`Direct fetch error: ${err.message}`);
    }
  };
  
  // Test database connection
  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');
      const token = localStorage.getItem('token');
      const response = await axios.get(`${config.apiUrl}/api/patients/system/db-status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      });
      
      console.log('Database status response:', response.data);
      
      if (response.data && response.data.success) {
        alert(`Database connection: ${response.data.status}\nState: ${response.data.dbState}`);
      } else {
        alert(`Database error: ${response.data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Database connection test error:', err);
      alert(`Error testing database: ${err.message}`);
    }
  };

  // Test direct dietitian fetch
  const testDietitianFetch = async () => {
    try {
      console.log('Testing direct dietitian fetch...');
      const token = localStorage.getItem('token');
      
      // Make direct request to the dietitians endpoint
      const response = await axios.get(`${config.apiUrl}/api/patients/dietitians`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('Dietitian fetch response:', response);
      
      if (response.data) {
        // If we got data, try to display it
        const dietitianData = response.data;
        const dietitianCount = Array.isArray(dietitianData) ? dietitianData.length : 0;
        
        if (dietitianCount > 0) {
          // Display success message with dietitian count
          alert(`Successfully found ${dietitianCount} dietitians!\nFirst dietitian: ${dietitianData[0]?.username}`);
          // Update the state for the component
          setDietitians(dietitianData);
        } else {
          alert('API returned successfully but no dietitians were found');
        }
      } else {
        alert('API returned empty response');
      }
    } catch (err) {
      console.error('Dietitian fetch test error:', err);
      
      // Get detailed error info
      let errorInfo = `Error: ${err.message}`;
      
      if (err.response) {
        errorInfo += `\nStatus: ${err.response.status}`;
        errorInfo += `\nData: ${JSON.stringify(err.response.data)}`;
      }
      
      alert(`Error testing dietitian fetch: ${errorInfo}`);
    }
  };

  // Test direct database check
  const testDirectDbCheck = async () => {
    try {
      console.log('Running direct database check...');
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`${config.apiUrl}/api/auth/direct-db-check`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('Direct DB check response:', response.data);
      
      let messageText = '';
      if (response.data.success) {
        messageText = `DB Check Results:\n` +
          `- Find users: ${response.data.findQueryCount}\n` +
          `- Count documents: ${response.data.countDocuments}\n` +
          `- Distinct roles: ${response.data.distinctRoles.join(', ')}\n` +
          `- Raw users found: ${response.data.rawUserCount}\n` +
          `- Connection state: ${response.data.connectionState}\n`;
          
        if (response.data.rawUserSample.length > 0) {
          messageText += `\nUser sample: ${response.data.rawUserSample[0].username} (${response.data.rawUserSample[0].role})`;
        }
        
        // If we found users but they don't have the right role
        if (response.data.rawUserCount > 0 && !response.data.distinctRoles.includes('dietitian')) {
          messageText += `\n\nPROBLEM FOUND: Users exist but none have the 'dietitian' role. This is likely a case sensitivity issue.`;
        }
        
        alert(messageText);
        
        // If we found users in raw query but not in the regular query, there's a model issue
        if (response.data.rawUserCount > 0 && response.data.findQueryCount === 0) {
          alert('ISSUE DETECTED: Users exist in the database but the model cannot access them. This may be a schema mismatch issue.');
        }
      } else {
        alert(`Direct DB check failed: ${response.data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Direct DB check error:', err);
      
      let errorInfo = `Error: ${err.message}`;
      if (err.response) {
        errorInfo += `\nStatus: ${err.response.status}`;
        errorInfo += `\nData: ${JSON.stringify(err.response.data || {})}`;
      }
      
      alert(`Error running direct DB check: ${errorInfo}`);
    }
  };

  // Add a refresh button component for dietitians list
  const DietitianRefreshButton = () => (
    <Button 
      variant="outline-secondary" 
      size="sm" 
      className="ms-2"
      onClick={() => {
        console.log("Manual refresh of dietitians list requested");
        fetchDietitians();
      }}
    >
      <span className="d-flex align-items-center">
        <span className="material-icons-outlined" style={{fontSize: '16px'}}>refresh</span>
        <span className="ms-1">Refresh List</span>
      </span>
    </Button>
  );

  const handleGeneratePDF = async () => {
    if (!patient) {
      return;
    }
    
    setGenerating(true);
    
    try {
      // Small delay to ensure the printable report is fully rendered
      setTimeout(() => {
        const element = printableReportRef.current;
        
        if (!element) {
          console.error('Failed to generate PDF. Report element not found.');
          setGenerating(false);
          return;
        }
        
        // Configure PDF options
        const options = {
          margin: 10,
          filename: `patient-${patient.encounterId}-report-${new Date().toISOString().slice(0, 10)}.pdf`,
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
            setGenerating(false);
          });
      }, 200);
    } catch (error) {
      console.error('Error in PDF generation:', error);
      setGenerating(false);
    }
  };

  // Callback function for when ReferralManagement component updates status
  const handleReferralStatusChange = useCallback((updatedPatient) => {
    setPatient(updatedPatient);
    // Reload data to ensure everything is up to date
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center p-4">
        <Card.Body>
          <Card.Title className="text-danger">Error</Card.Title>
          <Card.Text>{error}</Card.Text>
          <Button as={Link} to="/patients" variant="primary">
            Back to Patient List
          </Button>
        </Card.Body>
      </Card>
    );
  }

  if (!patient) {
    return (
      <Card className="text-center p-4">
        <Card.Body>
          <Card.Title>Patient Not Found</Card.Title>
          <Card.Text>The requested patient information could not be found.</Card.Text>
          <Button as={Link} to="/patients" variant="primary">
            Back to Patient List
          </Button>
        </Card.Body>
      </Card>
    );
  }

  // Group measurements by category
  const measurementsByCategory = {};
  Object.entries(measurementDefinitions).forEach(([key, def]) => {
    if (patient[key] !== undefined && patient[key] !== null) {
      if (!measurementsByCategory[def.category]) {
        measurementsByCategory[def.category] = [];
      }
      measurementsByCategory[def.category].push({
        key,
        value: patient[key],
        ...def
      });
    }
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Patient Details</h1>
        <div className="d-flex">
          <Button 
            variant="outline-success" 
            className="me-2"
            onClick={handleGeneratePDF}
            disabled={generating || !patient}
          >
            {generating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Generating PDF...
              </>
            ) : (
              <>
                <i className="fas fa-file-pdf me-2"></i>
                Export Report
              </>
            )}
          </Button>
          <Button as={Link} to="/patients" variant="outline-primary">
            Back to Patient List
          </Button>
        </div>
      </div>

      <Row>
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header>
              <h4>Patient Information</h4>
            </Card.Header>
            <Card.Body>
              <Table>
                <tbody>
                  <tr>
                    <td><strong>Encounter ID:</strong></td>
                    <td>{patient.encounterId}</td>
                  </tr>
                  <tr>
                    <td><strong>Name:</strong></td>
                    <td>{patient.name || 'Not specified'}</td>
                  </tr>
                  <tr>
                    <td><strong>Date of Birth:</strong></td>
                    <td>
                      {patient.dateOfBirth ? (
                        new Date(patient.dateOfBirth).toLocaleDateString()
                      ) : (
                        <span className="text-muted">Not specified</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Age:</strong></td>
                    <td>{patient.age || <span className="text-muted">Not specified</span>}</td>
                  </tr>
                  <tr>
                    <td><strong>Gender:</strong></td>
                    <td>
                      {patient.gender ? (
                        patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)
                      ) : (
                        <span className="text-muted">Not specified</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Admission Date:</strong></td>
                    <td>
                      {patient.admissionDate ? (
                        new Date(patient.admissionDate).toLocaleDateString()
                      ) : (
                        <span className="text-muted">Not specified</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Status:</strong></td>
                    <td>
                      {patient.referral ? (
                        <Badge bg="danger">Dietitian Referral</Badge>
                      ) : (
                        <Badge bg="success">Regular Care</Badge>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Assigned To:</strong></td>
                    <td>
                      {patient.assignedTo ? (
                        <Badge bg="info">{assignedDietitianName}</Badge>
                      ) : (
                        <Badge bg="secondary">Unassigned</Badge>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td><strong>Assignment Date:</strong></td>
                    <td>
                      {patient.assignedDate ? (
                        new Date(patient.assignedDate).toLocaleDateString()
                      ) : (
                        <span className="text-muted">Not yet assigned</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </Table>
              
              {/* AI Prediction Section */}
              <div className="mt-3">
                <h5>AI Referral Status</h5>
                {predicting ? (
                  <div className="text-center my-3">
                    <Spinner animation="border" size="sm" role="status" aria-hidden="true" />{' '}
                    Processing referral prediction...
                  </div>
                ) : predictionResult && (
                  <Alert variant={predictionResult.success ? 
                    (predictionResult.needsReferral ? 'danger' : 'success') : 
                    'warning'}>
                    {predictionResult.success ? (
                      <>
                        <strong>{predictionResult.needsReferral ? 
                          'AI has determined this patient needs dietitian referral' : 
                          'AI has determined this patient does not need dietitian referral'}
                        </strong>
                        <div className="mt-2 small">
                          <strong>Key factors considered:</strong>
                          <ul className="mb-0 ps-3">
                            {patient.bmi && <li>BMI: {patient.bmi.toFixed(1)}</li>}
                            {patient.feed_vol && <li>Feeding Volume: {patient.feed_vol.toFixed(1)} ml</li>}
                            {patient.feed_vol_adm && <li>Volume Administered: {patient.feed_vol_adm.toFixed(1)} ml</li>}
                            {patient.fio2 && <li>FiO2: {patient.fio2.toFixed(1)}%</li>}
                            {patient.fio2_ratio && <li>FiO2 Ratio: {patient.fio2_ratio.toFixed(1)}</li>}
                          </ul>
                        </div>
                      </>
                    ) : (
                      `Error: ${predictionResult.error}`
                    )}
                  </Alert>
                )}
                <small className="text-muted d-block mt-2">
                  The AI model automatically evaluates patient data to determine if a dietitian referral is recommended.
                  {predictionResult && predictionResult.success && predictionResult.needsReferral && 
                    " This patient has been flagged for dietitian review based on their physiological measurements."}
                </small>
              </div>
              
              {/* Referral Management Section - Only visible to admin and dietitians */}
              {user && (user.role === 'admin' || user.role === 'dietitian') && (
                <ReferralManagement 
                  patient={patient} 
                  user={user} 
                  onStatusChange={handleReferralStatusChange}
                />
              )}
              
              {/* Dietitian Assignment Section - Only visible to admin and dietitians */}
              {user && (user.role === 'admin' || user.role === 'dietitian') && (
                <div className="mt-4">
                  <h5 className="border-bottom pb-2 mb-3">
                    Dietitian Assignment
                    {dietitians.length > 0 && <DietitianRefreshButton />}
                  </h5>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-2">
                      <span><strong>Current Assignment:</strong></span>
                      <span>
                        {patient.assignedTo ? (
                          <Badge bg="info">{assignedDietitianName}</Badge>
                        ) : (
                          <Badge bg="secondary">Unassigned</Badge>
                        )}
                      </span>
                    </div>
                    {patient.assignedDate && (
                      <small className="text-muted d-block">
                        Assigned on: {new Date(patient.assignedDate).toLocaleDateString()}
                      </small>
                    )}
                  </div>
                  
                  {!patient.referral && (
                    <Alert variant="info" className="mb-3">
                      <small>
                        Note: This patient doesn't currently need dietitian referral according to the AI, 
                        but you can still assign them manually if needed.
                      </small>
                    </Alert>
                  )}
                  
                  {assignmentResult && (
                    <Alert 
                      variant={assignmentResult.success ? 'success' : 'danger'}
                      dismissible
                      onClose={() => setAssignmentResult(null)}
                      className="mb-3"
                    >
                      {assignmentResult.success ? assignmentResult.message : `Error: ${assignmentResult.error}`}
                    </Alert>
                  )}
                  
                  {dietitians.length === 0 && (
                    <Alert variant="warning">
                      <Alert.Heading>No Dietitians Available</Alert.Heading>
                      <p>
                        The system could not find any dietitian users. This is needed for patient assignment.
                      </p>
                      <hr/>
                      <p className="mb-0">
                        {user?.role === 'admin' ? (
                          <>
                            As an admin, you can create a test dietitian user below, or add dietitians through the User Management page.
                          </>
                        ) : (
                          <>
                            Please contact your system administrator to add dietitian users.
                          </>
                        )}
                      </p>
                      <div className="d-flex mt-3">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={fetchDietitians}
                          className="me-2"
                        >
                          <span className="d-flex align-items-center">
                            <span className="material-icons-outlined" style={{fontSize: '16px'}}>refresh</span>
                            <span className="ms-1">Refresh List</span>
                          </span>
                        </Button>
                        
                        <Button 
                          variant="info" 
                          size="sm"
                          onClick={testDietitianFetch}
                          className="me-2"
                        >
                          Test Dietitian Fetch
                        </Button>
                        
                        <Button 
                          variant="danger" 
                          size="sm"
                          onClick={testDirectDbCheck}
                          className="me-2"
                        >
                          Check Database
                        </Button>
                        
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={testAuth}
                          className="me-2"
                        >
                          Test Authentication
                        </Button>
                        
                        {user?.role === 'admin' && (
                          <Button 
                            variant="success" 
                            size="sm"
                            onClick={createTestDietitian}
                          >
                            Create Test Dietitian
                          </Button>
                        )}
                      </div>
                    </Alert>
                  )}
                  
                  {dietitians.length > 0 && (
                    <Form onSubmit={handleAssignDietitian}>
                      <Form.Group className="mb-3">
                        <Form.Label><strong>Change Assignment:</strong></Form.Label>
                        <Form.Select 
                          value={selectedDietitian}
                          onChange={(e) => setSelectedDietitian(e.target.value)}
                          required
                          className="mb-2"
                        >
                          <option value="">-- Select Dietitian --</option>
                          {dietitians.map(dietitian => (
                            <option key={dietitian._id} value={dietitian._id}>
                              {dietitian.username} • {dietitian.patientCount} {dietitian.patientCount === 1 ? 'patient' : 'patients'}
                            </option>
                          ))}
                        </Form.Select>
                        
                        {user && user.role === 'admin' && (
                          <div className="border-top pt-2 mt-2 small text-muted">
                            <p className="mb-1"><strong>Assignment Guide:</strong></p>
                            <ul className="ps-3 mb-0">
                              <li>Dietitians with fewer patients should be prioritized</li>
                              <li>Reassignments are tracked in the system</li>
                              <li>The dietitian will be notified of the assignment</li>
                            </ul>
                          </div>
                        )}
                      </Form.Group>
                      
                      <Button 
                        type="submit" 
                        variant="primary" 
                        disabled={assigningDietitian || !selectedDietitian}
                        className="w-100"
                      >
                        {assigningDietitian ? (
                          <>
                            <Spinner animation="border" size="sm" role="status" aria-hidden="true" />{' '}
                            Assigning...
                          </>
                        ) : (
                          patient.assignedTo ? 'Reassign Patient' : 'Assign Patient'
                        )}
                      </Button>
                    </Form>
                  )}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Key Metrics Card */}
          <Card className="mb-4">
            <Card.Header>
              <h4>Key Metrics</h4>
            </Card.Header>
            <Card.Body>
              {Object.entries(measurementsByCategory).map(([category, measurements]) => (
                <div key={category} className="mb-3">
                  <h5>{category}</h5>
                  {measurements.map(({ key, value, label, unit, normalRange }) => (
                    <div key={key} className="mb-2">
                      <div className="d-flex justify-content-between">
                        <span>{label}</span>
                        <span>
                          {value.toFixed(2)} {unit}
                        </span>
                      </div>
                      <ProgressBar
                        variant={getMeasurementStatus(value, normalRange)}
                        now={getMeasurementProgress(value, normalRange)}
                        className="mt-1"
                      />
                      <small className="text-muted">
                        Normal range: {normalRange.min} - {normalRange.max} {unit}
                      </small>
                    </div>
                  ))}
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          {/* Category-based Charts */}
          {Object.entries(measurementsByCategory).map(([category, measurements]) => (
            <Card key={category} className="mb-4">
              <Card.Header>
                <h4>{category} Measurements</h4>
              </Card.Header>
              <Card.Body>
                <div style={{ height: '300px' }}>
                  <Line
                    data={{
                      labels: measurements.map(m => m.label),
                      datasets: [
                        {
                          label: 'Patient Value',
                          data: measurements.map(m => m.value),
                          borderColor: 'rgb(75, 192, 192)',
                          tension: 0.1
                        },
                        {
                          label: 'Normal Range Min',
                          data: measurements.map(m => m.normalRange.min),
                          borderColor: 'rgba(75, 192, 192, 0.2)',
                          borderDash: [5, 5],
                          fill: false
                        },
                        {
                          label: 'Normal Range Max',
                          data: measurements.map(m => m.normalRange.max),
                          borderColor: 'rgba(75, 192, 192, 0.2)',
                          borderDash: [5, 5],
                          fill: false
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const measurement = measurements[context.dataIndex];
                              return [
                                `${context.dataset.label}: ${context.parsed.y} ${measurement.unit}`,
                                `Normal range: ${measurement.normalRange.min} - ${measurement.normalRange.max} ${measurement.unit}`
                              ];
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: false
                        }
                      }
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          ))}
        </Col>
      </Row>

      {/* Hidden printable report container */}
      <div className="printable-report-container" style={{ display: 'none' }}>
        <div ref={printableReportRef}>
          <PrintableReport patients={patient ? [patient] : []} stats={stats} />
        </div>
      </div>
    </div>
  );
};

export default PatientDetail; 