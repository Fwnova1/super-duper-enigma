import React, { useState } from 'react';
import { Card, Form, Button, Alert, Row, Col, InputGroup } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Create axios instance with longer timeout
const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 30000 // 30 seconds timeout
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const AddPatient = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Initial form state
  const [formData, setFormData] = useState({
    encounterId: '',
    name: '',
    dateOfBirth: '',
    admissionDate: '',
    gender: '',
    age: '',
    bmi: '',
    end_tidal_co2: '',
    feed_vol: '',
    feed_vol_adm: '',
    fio2: '',
    fio2_ratio: '',
    insp_time: '',
    oxygen_flow_rate: '',
    peep: '',
    pip: '',
    resp_rate: '',
    sip: '',
    tidal_vol: '',
    tidal_vol_actual: '',
    tidal_vol_kg: '',
    tidal_vol_spon: ''
  });
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (type === 'number' || name.startsWith('bmi') || name.startsWith('tidal') || name.includes('vol')) {
      // Convert numeric fields to numbers
      const numValue = value === '' ? '' : parseFloat(value);
      setFormData({ ...formData, [name]: numValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Clean the data - remove empty fields
      const cleanedData = {};
      for (const [key, value] of Object.entries(formData)) {
        if (value !== '') {
          cleanedData[key] = value;
        }
      }
      
      console.log('Submitting patient data:', cleanedData);
      
      // Submit to API with increased timeout
      await api.post('/api/patients', cleanedData);
      setSuccess(true);
      
      // Reset form or redirect
      setTimeout(() => {
        navigate('/patients');
      }, 2000);
    } catch (err) {
      console.error('Error adding patient:', err);
      
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 401) {
          setError('Authentication error: You need to log in again to add patients.');
        } else if (err.response.status === 403) {
          setError('Permission denied: You do not have permission to add patients.');
        } else {
          setError(err.response.data?.error || err.response.data?.message || 'Server error when adding patient.');
        }
      } else if (err.request) {
        // The request was made but no response was received
        setError('No response from server. Please check your connection or try again later.');
      } else {
        // Something happened in setting up the request that triggered an Error
        setError('Error preparing request: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Physical measurement fields definition
  const measurementFields = [
    { name: 'bmi', label: 'BMI', placeholder: 'e.g., 24.5', type: 'number', step: '0.1', unit: 'kg/m²' },
    { name: 'end_tidal_co2', label: 'End-tidal CO2', placeholder: 'e.g., 35', type: 'number', step: '0.1', unit: 'mmHg' },
    { name: 'feed_vol', label: 'Feeding Volume', placeholder: 'e.g., 1000', type: 'number', step: '1', unit: 'ml' },
    { name: 'feed_vol_adm', label: 'Feeding Volume Administered', placeholder: 'e.g., 52.3', type: 'number', step: '0.1', unit: 'ml' },
    { name: 'fio2', label: 'FiO2', placeholder: 'e.g., 40', type: 'number', step: '0.1', unit: '%' },
    { name: 'fio2_ratio', label: 'FiO2 Ratio', placeholder: 'e.g., 240.6', type: 'number', step: '0.1', unit: '' },
    { name: 'insp_time', label: 'Inspiration Time', placeholder: 'e.g., 1.1', type: 'number', step: '0.1', unit: 'sec' },
    { name: 'oxygen_flow_rate', label: 'Oxygen Flow Rate', placeholder: 'e.g., 3.4', type: 'number', step: '0.1', unit: 'L/min' },
    { name: 'peep', label: 'PEEP', placeholder: 'e.g., 6.2', type: 'number', step: '0.1', unit: 'cmH2O' },
    { name: 'pip', label: 'Peak Inspiratory Pressure', placeholder: 'e.g., 19.5', type: 'number', step: '0.1', unit: 'cmH2O' },
    { name: 'resp_rate', label: 'Respiratory Rate', placeholder: 'e.g., 2.4', type: 'number', step: '0.1', unit: 'breaths/min' },
    { name: 'sip', label: 'SIP', placeholder: 'e.g., 17', type: 'number', step: '0.1', unit: 'cmH2O' },
    { name: 'tidal_vol', label: 'Tidal Volume', placeholder: 'e.g., 320', type: 'number', step: '1', unit: 'ml' },
    { name: 'tidal_vol_actual', label: 'Actual Tidal Volume', placeholder: 'e.g., 346.5', type: 'number', step: '0.1', unit: 'ml' },
    { name: 'tidal_vol_kg', label: 'Tidal Volume per kg', placeholder: 'e.g., 6.9', type: 'number', step: '0.1', unit: 'ml/kg' },
    { name: 'tidal_vol_spon', label: 'Spontaneous Tidal Volume', placeholder: 'e.g., 216.8', type: 'number', step: '0.1', unit: 'ml' }
  ];
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Add New Patient</h1>
        <Button 
          variant="outline-secondary" 
          onClick={() => navigate('/patients')}
        >
          Back to Patients
        </Button>
      </div>
      
      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success">
          Patient added successfully! The AI model has automatically determined referral status. Redirecting...
        </Alert>
      )}
      
      <Alert variant="info" className="mb-4">
        <Alert.Heading>AI Referral Prediction</Alert.Heading>
        <p>
          The system will automatically use AI to predict whether this patient needs a dietitian referral
          based on the physiological measurements you enter.
        </p>
      </Alert>
      
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="encounterId">
                  <Form.Label>Encounter ID*</Form.Label>
                  <Form.Control
                    type="text"
                    name="encounterId"
                    value={formData.encounterId}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter unique encounter ID"
                  />
                  <Form.Text className="text-muted">
                    A unique identifier for this patient encounter
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            
            <h4 className="mt-4 mb-3 border-bottom pb-2">Patient Information</h4>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="name">
                  <Form.Label>Patient Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter patient name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="age">
                  <Form.Label>Age</Form.Label>
                  <Form.Control
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Enter patient age"
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="dateOfBirth">
                  <Form.Label>Date of Birth</Form.Label>
                  <Form.Control
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="gender">
                  <Form.Label>Gender</Form.Label>
                  <Form.Select 
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleInputChange}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="admissionDate">
                  <Form.Label>Admission Date</Form.Label>
                  <Form.Control
                    type="date"
                    name="admissionDate"
                    value={formData.admissionDate}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <h4 className="mt-4 mb-3 border-bottom pb-2">Physiological Measurements</h4>
            <p className="text-muted">All fields are optional. Leave blank if measurement is not available.</p>
            <hr />
            
            <Row>
              {measurementFields.map((field, index) => (
                <Col md={6} key={field.name}>
                  <Form.Group className="mb-3">
                    <Form.Label>{field.label}</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={field.type}
                        step={field.step}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        placeholder={field.placeholder}
                      />
                      {field.unit && <InputGroup.Text>{field.unit}</InputGroup.Text>}
                    </InputGroup>
                  </Form.Group>
                </Col>
              ))}
            </Row>
            
            <div className="d-flex justify-content-end">
              <Button 
                variant="secondary" 
                onClick={() => navigate('/patients')}
                className="me-2"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                disabled={loading || !formData.encounterId}
              >
                {loading ? 'Saving...' : 'Save Patient'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AddPatient; 