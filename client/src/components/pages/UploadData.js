import React, { useState } from 'react';
import { Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import axios from 'axios';
import config from '../../config';

const UploadData = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({
    isUploading: false,
    progress: 0,
    success: false,
    error: null,
    data: null
  });

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    // Reset status when a new file is selected
    setUploadStatus({
      isUploading: false,
      progress: 0,
      success: false,
      error: null,
      data: null
    });
  };

  const isCSVFile = (file) => {
    // Check if filename ends with .csv
    if (file.name.toLowerCase().endsWith('.csv')) {
      return true;
    }
    
    // Check MIME type (browser can report various MIME types for CSV)
    const validCSVTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/x-csv', 'text/plain'];
    return validCSVTypes.includes(file.type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setUploadStatus({
        ...uploadStatus,
        error: 'Please select a CSV file to upload'
      });
      return;
    }

    // Check if file is CSV
    if (!isCSVFile(file)) {
      setUploadStatus({
        ...uploadStatus,
        error: `Only CSV files are allowed. Your file type is ${file.type}`
      });
      return;
    }

    const formData = new FormData();
    formData.append('csvFile', file);

    console.log('Uploading file:', file.name, file.type);

    setUploadStatus({
      ...uploadStatus,
      isUploading: true,
      progress: 0
    });

    try {
      // Set up progress tracking
      const axiosConfig = {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadStatus(prev => ({
            ...prev,
            progress: percentCompleted
          }));
        }
      };

      const response = await axios.post(`${config.apiUrl}/api/upload`, formData, axiosConfig);
      console.log('Upload response:', response.data);
      
      setUploadStatus({
        isUploading: false,
        progress: 100,
        success: true,
        error: null,
        data: response.data
      });
    } catch (error) {
      console.error('Upload error:', error.response || error);
      setUploadStatus({
        isUploading: false,
        progress: 0,
        success: false,
        error: error.response?.data?.error || 'Failed to upload file',
        data: null
      });
    }
  };

  return (
    <div>
      <h1 className="mb-4">Upload Patient Data</h1>
      
      <Card>
        <Card.Body>
          <Card.Title>Upload CCU Patient Data CSV</Card.Title>
          <Card.Text>
            Upload a CSV file containing patient information and physiological measurements. 
            The system will process this file and update the patient database.
          </Card.Text>
          
          {uploadStatus.error && (
            <Alert variant="danger">
              {uploadStatus.error}
            </Alert>
          )}
          
          {uploadStatus.success && (
            <Alert variant="success">
              File uploaded successfully! {uploadStatus.data?.patientsImported} patients imported.
            </Alert>
          )}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="csvFile" className="mb-3">
              <Form.Label>Select CSV File</Form.Label>
              <Form.Control 
                type="file" 
                onChange={handleFileChange}
                accept=".csv,text/csv,application/vnd.ms-excel,application/csv,text/x-csv,text/plain"
                disabled={uploadStatus.isUploading}
              />
              <Form.Text className="text-muted">
                File should be in CSV format with appropriate headers for patient data.
              </Form.Text>
            </Form.Group>
            
            {uploadStatus.isUploading && (
              <ProgressBar 
                animated 
                now={uploadStatus.progress} 
                label={`${uploadStatus.progress}%`}
                className="mb-3"
              />
            )}
            
            <Button 
              variant="primary" 
              type="submit"
              disabled={!file || uploadStatus.isUploading}
            >
              {uploadStatus.isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </Form>
          
          <Card.Text className="mt-4 small">
            <strong>Note:</strong> Uploading a new file will add to the existing patient data in the system.
            Patients with the same encounter ID will be updated with the new data.
            <br /><br />
            <strong>AI Referral Prediction:</strong> The system will automatically run AI predictions on ALL uploaded patients
            to determine which ones need dietitian referrals based on their physiological measurements.
            <strong>Any referral values in the CSV will be ignored</strong> - the AI model makes the final determination.
          </Card.Text>
        </Card.Body>
      </Card>
      
      <Card className="mt-4">
        <Card.Header>CSV File Format Requirements</Card.Header>
        <Card.Body>
          <p>The CSV file should include the following columns:</p>
          <ul>
            <li><strong>encounterId</strong> - Unique identifier for each patient encounter (REQUIRED)</li>
            <li><strong>Physiological Measurements:</strong></li>
            <ul>
              <li><strong>bmi</strong> - Body Mass Index</li>
              <li><strong>end_tidal_co2</strong> - End-tidal CO2 levels</li>
              <li><strong>feed_vol</strong> - Feeding volume</li>
              <li><strong>feed_vol_adm</strong> - Feeding volume administered</li>
              <li><strong>fio2</strong> - Fraction of inspired oxygen</li>
              <li><strong>fio2_ratio</strong> - FiO2 ratio</li>
              <li><strong>insp_time</strong> - Inspiration time</li>
              <li><strong>oxygen_flow_rate</strong> - Oxygen flow rate</li>
              <li><strong>peep</strong> - Positive End-Expiratory Pressure</li>
              <li><strong>pip</strong> - Peak Inspiratory Pressure</li>
              <li><strong>resp_rate</strong> - Respiratory rate</li>
              <li><strong>sip</strong> - Sustained Inspiratory Pressure</li>
              <li><strong>tidal_vol</strong> - Tidal volume</li>
              <li><strong>tidal_vol_actual</strong> - Actual tidal volume</li>
              <li><strong>tidal_vol_kg</strong> - Tidal volume per kg</li>
              <li><strong>tidal_vol_spon</strong> - Spontaneous tidal volume</li>
            </ul>
            <li><strong>Additional fields (optional):</strong></li>
            <ul>
              <li><strong>notes</strong> - Clinical notes about the patient</li>
              <li><strong>comments</strong> - Additional comments</li>
              <li><strong>description</strong> - Patient case description</li>
            </ul>
          </ul>
          <p className="mt-3">
            <strong>Note:</strong> Only the encounterId field is strictly required. Empty or missing values in other fields will be automatically set to 0, and missing referral field values will be predicted by the AI model.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default UploadData; 