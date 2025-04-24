import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Alert, Spinner, Badge } from 'react-bootstrap';
import axios from 'axios';
import config from '../../config';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'dietitian'
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${config.apiUrl}/api/auth/users`);
      setUsers(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load users. Please try again later.');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setFormError('');
    setNewUser({
      username: '',
      email: '',
      password: '',
      role: 'dietitian'
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({
      ...newUser,
      [name]: value
    });
  };

  const validateForm = () => {
    if (!newUser.username || newUser.username.length < 3) {
      setFormError('Username must be at least 3 characters');
      return false;
    }
    
    if (!newUser.email || !/\S+@\S+\.\S+/.test(newUser.email)) {
      setFormError('Please enter a valid email address');
      return false;
    }
    
    if (!newUser.password || newUser.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return false;
    }
    
    setFormError('');
    return true;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const response = await axios.post(`${config.apiUrl}/api/auth/create-user`, newUser);
      
      // Add the new user to the list
      setUsers([...users, response.data.user]);
      
      // Close modal and reset form
      handleModalClose();
      
      // Show success message
      setSuccessMessage(`User ${response.data.user.username} created successfully`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Error creating user');
      console.error('Error creating user:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'dietitian':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="d-flex justify-content-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>User Management</h1>
        <Button 
          variant="primary" 
          onClick={() => setShowAddModal(true)}
        >
          Create New User
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <Card className="mb-4">
        <Card.Body>
          <Table responsive striped hover>
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">No users found</td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <Badge bg={getRoleBadgeVariant(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal for creating new user */}
      <Modal show={showAddModal} onHide={handleModalClose}>
        <Modal.Header closeButton>
          <Modal.Title>Create New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formError && <Alert variant="danger">{formError}</Alert>}
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                type="text"
                name="username"
                value={newUser.username}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={newUser.email}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={newUser.password}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
                name="role"
                value={newUser.role}
                onChange={handleInputChange}
              >
                <option value="dietitian">Dietitian</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleModalClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateUser}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create User'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UserManagement; 