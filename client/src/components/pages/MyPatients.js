import React, { useState, useEffect } from 'react';
import { Card, Table, Form, InputGroup, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import config from '../../config';
import { format } from 'date-fns';

const MyPatients = () => {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const location = useLocation();

  const fetchMyPatients = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${config.apiUrl}/api/patients/mypatients`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setPatients(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching my patients:', error);
      setError('Failed to load assigned patients. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPatients();
  }, []);

  // Refresh data when component comes into focus or location changes
  useEffect(() => {
    fetchMyPatients();
  }, [location]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleRefresh = () => {
    fetchMyPatients();
  };

  // Filter patients based on search term
  const filteredPatients = patients.filter(patient => {
    return patient.encounterId?.toString().includes(searchTerm);
  });

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
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>My Assigned Patients</h1>
        <Button 
          variant="outline-secondary" 
          onClick={handleRefresh}
        >
          Refresh List
        </Button>
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
        </Alert>
      )}
      
      {patients.length === 0 && !error && (
        <Alert variant="info" className="mb-4">
          You have no patients assigned to you at this time.
        </Alert>
      )}
      
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <InputGroup className="w-75">
              <InputGroup.Text>
                <i className="fas fa-search"></i>
              </InputGroup.Text>
              <Form.Control
                placeholder="Search by encounter ID..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </InputGroup>
            
            <div>
              <Badge bg="info" className="me-2">
                Total: {patients.length}
              </Badge>
            </div>
          </div>
          
          <Table responsive striped hover>
            <thead>
              <tr>
                <th>Encounter ID</th>
                <th>BMI</th>
                <th>Feeding Volume</th>
                <th>Assigned Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">No patients found</td>
                </tr>
              ) : (
                filteredPatients.map(patient => (
                  <tr key={patient._id}>
                    <td>{patient.encounterId}</td>
                    <td>{patient.bmi ? patient.bmi.toFixed(2) : 'N/A'}</td>
                    <td>{patient.feed_vol ? patient.feed_vol.toFixed(2) : 'N/A'}</td>
                    <td>
                      {patient.assignedDate 
                        ? format(new Date(patient.assignedDate), 'MMM d, yyyy') 
                        : 'N/A'}
                    </td>
                    <td>
                      <Button 
                        as={Link} 
                        to={`/patients/${patient._id}`}
                        variant="primary" 
                        size="sm"
                        className="me-1"
                      >
                        View Details
                      </Button>
                      <Button 
                        as={Link} 
                        to={`/patients/edit/${patient._id}`}
                        variant="secondary" 
                        size="sm"
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default MyPatients; 