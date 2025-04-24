import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Button, Alert, Spinner, Container, Tab, Nav, Image, Badge } from 'react-bootstrap';
import axios from 'axios';
import config from '../../config';

const UserSettings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Profile form state
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    fullName: '',
    dateOfBirth: '',
    position: '',
    profilePicture: '',
    role: ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Temp profile picture URL for preview
  const [tempProfilePic, setTempProfilePic] = useState('');

  // Load user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // axios interceptor will add the token automatically
        const response = await axios.get(`${config.apiUrl}/api/auth/me`);
        
        // Format date of birth for date input
        let formattedProfile = { ...response.data };
        if (formattedProfile.dateOfBirth) {
          const date = new Date(formattedProfile.dateOfBirth);
          if (!isNaN(date.getTime())) {
            formattedProfile.dateOfBirth = date.toISOString().split('T')[0];
          } else {
            formattedProfile.dateOfBirth = '';
          }
        }
        
        setProfile(formattedProfile);
        
        if (formattedProfile.profilePicture) {
          setTempProfilePic(formattedProfile.profilePicture);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load your profile information. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile({
      ...profile,
      [name]: value
    });
  };

  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({
      ...passwordForm,
      [name]: value
    });
  };

  // Handle profile picture upload
  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Simple file validation
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      // Create a URL for the file for preview
      const fileUrl = URL.createObjectURL(file);
      setTempProfilePic(fileUrl);
      
      // In a real application, you would upload this file to your server or a CDN
      // For now, we'll just simulate storing the URL
      setProfile({
        ...profile,
        profilePicture: fileUrl
      });
    }
  };

  // Submit profile update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Create a clean copy of the profile data for sending
      const profileData = {
        username: profile.username,
        email: profile.email,
        fullName: profile.fullName || '',
        position: profile.position || '',
        profilePicture: profile.profilePicture || ''
      };
      
      // Handle date of birth separately to ensure proper format
      if (profile.dateOfBirth) {
        try {
          const dateObj = new Date(profile.dateOfBirth);
          if (!isNaN(dateObj.getTime())) {
            profileData.dateOfBirth = dateObj.toISOString();
          }
        } catch (dateError) {
          console.error('Error formatting date:', dateError);
          // Don't include invalid date in the submission
        }
      }
      
      console.log('Sending profile update with data:', profileData);
      
      // axios interceptor will add the token automatically
      const response = await axios.put(`${config.apiUrl}/api/auth/profile`, profileData);
      
      console.log('Profile update response:', response.data);
      
      setSuccess('Profile updated successfully!');
      
      // Update profile state with returned data
      const updatedProfile = { ...response.data.user };
      
      // Format returned date for display
      if (updatedProfile.dateOfBirth) {
        const date = new Date(updatedProfile.dateOfBirth);
        if (!isNaN(date.getTime())) {
          updatedProfile.dateOfBirth = date.toISOString().split('T')[0];
        }
      }
      
      setProfile(updatedProfile);
      
      // Update user in localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({
        ...user,
        username: response.data.user.username,
        email: response.data.user.email
      }));
      
      setSaving(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        console.error('Status code:', err.response.status);
      } else if (err.request) {
        console.error('Error request:', err.request);
      }
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
      setSaving(false);
    }
  };

  // Submit password change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // axios interceptor will add the token automatically
      await axios.put(`${config.apiUrl}/api/auth/password`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      setSuccess('Password updated successfully!');
      
      // Reset password form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setSaving(false);
    } catch (err) {
      console.error('Error updating password:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        console.error('Status code:', err.response.status);
      }
      setError(err.response?.data?.message || 'Failed to update password. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center mt-5">
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Account Settings</h1>
        <div>
          <span className="text-muted">Manage your account preferences and information</span>
        </div>
      </div>
      
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          <i className="fas fa-exclamation-circle me-2"></i>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" onClose={() => setSuccess(null)} dismissible>
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </Alert>
      )}
      
      <Row>
        <Col lg={3} md={4}>
          <Card className="mb-4">
            <Card.Body className="text-center">
              <div className="position-relative mb-3 mx-auto">
                <Image 
                  src={tempProfilePic || 'https://via.placeholder.com/150?text=Profile'} 
                  roundedCircle 
                  className="profile-avatar mb-3" 
                  style={{ width: '120px', height: '120px' }} 
                />
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="rounded-circle position-absolute bottom-0 end-0 shadow-sm"
                  onClick={() => document.getElementById('profilePicInput').click()}
                >
                  <i className="fas fa-camera"></i>
                </Button>
              </div>
              <h5>{profile.fullName || profile.username}</h5>
              <div className="d-flex justify-content-center align-items-center mb-2">
                <Badge 
                  bg={profile.role === 'admin' ? 'danger' : profile.role === 'dietitian' ? 'success' : 'secondary'} 
                  className="text-uppercase"
                >
                  {profile.role}
                </Badge>
              </div>
              <p className="text-muted mb-0">{profile.position || 'No position set'}</p>
              
              {/* Hidden file input for profile picture */}
              <Form.Control
                type="file"
                id="profilePicInput"
                className="d-none"
                accept="image/*"
                onChange={handleProfilePicChange}
              />
            </Card.Body>
          </Card>
          
          <Nav variant="pills" className="flex-column mb-4">
            <Nav.Item>
              <Nav.Link 
                eventKey="profile" 
                active={activeTab === 'profile'} 
                onClick={() => setActiveTab('profile')}
                className="d-flex align-items-center"
              >
                <i className="fas fa-user me-2"></i>
                Profile Information
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                eventKey="password" 
                active={activeTab === 'password'} 
                onClick={() => setActiveTab('password')}
                className="d-flex align-items-center"
              >
                <i className="fas fa-lock me-2"></i>
                Security & Password
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Col>
        
        <Col lg={9} md={8}>
          <Card>
            <Card.Body>
              <Tab.Content>
                <Tab.Pane active={activeTab === 'profile'}>
                  <h4 className="mb-4">
                    <i className="fas fa-user-edit me-2 text-primary"></i>
                    Profile Information
                  </h4>
                  <Form onSubmit={handleProfileSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Username</Form.Label>
                          <Form.Control
                            type="text"
                            name="username"
                            value={profile.username}
                            onChange={handleProfileChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Email Address</Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            value={profile.email}
                            onChange={handleProfileChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Full Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="fullName"
                        value={profile.fullName || ''}
                        onChange={handleProfileChange}
                        placeholder="Enter your full name"
                      />
                    </Form.Group>
                    
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Date of Birth</Form.Label>
                          <Form.Control
                            type="date"
                            name="dateOfBirth"
                            value={profile.dateOfBirth || ''}
                            onChange={handleProfileChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Working Position</Form.Label>
                          <Form.Control
                            type="text"
                            name="position"
                            value={profile.position || ''}
                            onChange={handleProfileChange}
                            placeholder="e.g. Senior Dietitian"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Role</Form.Label>
                      <div className="d-flex align-items-center">
                        <Badge 
                          bg={profile.role === 'admin' ? 'danger' : profile.role === 'dietitian' ? 'success' : 'secondary'} 
                          className="text-uppercase me-2"
                          style={{ fontSize: '0.9rem', padding: '0.5em 1em' }}
                        >
                          {profile.role}
                        </Badge>
                        <span className="text-muted small">
                          Role cannot be changed. Contact an administrator if your role needs to be updated.
                        </span>
                      </div>
                    </Form.Group>
                    
                    <div className="d-flex justify-content-end mt-4">
                      <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? (
                          <>
                            <Spinner animation="border" size="sm" role="status" className="me-2" />
                            Saving Changes...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-save me-2"></i>
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </Tab.Pane>
                
                <Tab.Pane active={activeTab === 'password'}>
                  <h4 className="mb-4">
                    <i className="fas fa-shield-alt me-2 text-primary"></i>
                    Change Password
                  </h4>
                  <Form onSubmit={handlePasswordSubmit}>
                    <Form.Group className="mb-4">
                      <Form.Label>Current Password</Form.Label>
                      <Form.Control
                        type="password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                      />
                    </Form.Group>
                    
                    <div className="border-top border-bottom py-4 mb-4">
                      <Form.Group className="mb-3">
                        <Form.Label>New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="newPassword"
                          value={passwordForm.newPassword}
                          onChange={handlePasswordChange}
                          required
                          minLength={6}
                        />
                        <Form.Text className="text-muted">
                          <i className="fas fa-info-circle me-1"></i>
                          Password must be at least 6 characters long
                        </Form.Text>
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Confirm New Password</Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          value={passwordForm.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                          minLength={6}
                        />
                      </Form.Group>
                    </div>
                    
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="text-muted">
                        <i className="fas fa-lock me-2"></i>
                        Make sure to use a secure password
                      </div>
                      <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? (
                          <>
                            <Spinner animation="border" size="sm" role="status" className="me-2" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-key me-2"></i>
                            Update Password
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                </Tab.Pane>
              </Tab.Content>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UserSettings; 