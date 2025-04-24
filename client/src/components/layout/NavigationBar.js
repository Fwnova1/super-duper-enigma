import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, NavDropdown, Badge, Image } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import axios from 'axios';
import config from '../../config';

const NavigationBar = ({ isAuthenticated, user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingAssignmentsCount, setPendingAssignmentsCount] = useState(0);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // Helper function to check if user has one of the required roles
  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  // Fetch pending assignments count for dietitians
  useEffect(() => {
    const fetchPendingAssignmentsCount = async () => {
      if (!isAuthenticated || !user || user.role !== 'dietitian') return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${config.apiUrl}/api/patients/pending-assignments`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.data && response.data.success) {
          setPendingAssignmentsCount(response.data.count || 0);
        }
      } catch (error) {
        console.error('Error fetching pending assignments count:', error);
      }
    };

    fetchPendingAssignmentsCount();
    
    // Refresh assignments count when location changes (user navigates to a different page)
    if (isAuthenticated && user?.role === 'dietitian') {
      fetchPendingAssignmentsCount();
    }
  }, [isAuthenticated, user, location.pathname]);

  // Function to get initials from username or full name
  const getInitials = () => {
    if (user?.fullName) {
      return user.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
    }
    
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    
    return 'U';
  };

  // Role badge styling
  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'dietitian':
        return 'success';
      default:
        return 'secondary';
    }
  };

  return (
    <Navbar 
      bg="white" 
      variant="light" 
      expand="lg" 
      className="navbar-shadow"
      fixed="top"
    >
      <Container fluid className="px-4">
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
          <i className="fas fa-heartbeat text-primary me-2"></i>
          <span>CCU Feeding Dashboard</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="ms-auto">
            {isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/" active={location.pathname === '/'} className="nav-link-hover">
                  <i className="fas fa-chart-line me-1"></i> Dashboard
                </Nav.Link>
                
                <NavDropdown 
                  title={
                    <div className="d-inline-flex align-items-center">
                      <i className="fas fa-user-injured me-1"></i> Patients
                      {user?.role === 'dietitian' && pendingAssignmentsCount > 0 && (
                        <Badge 
                          bg="warning" 
                          pill 
                          className="ms-1 position-relative" 
                          style={{ top: '-8px', fontSize: '0.65rem' }}
                        >
                          {pendingAssignmentsCount}
                        </Badge>
                      )}
                    </div>
                  } 
                  id="patients-dropdown"
                  active={['/patients', '/patients/add', '/upload', '/mypatients'].some(path => 
                    location.pathname.startsWith(path)
                  )}
                >
                  <NavDropdown.Item as={Link} to="/patients">
                    <i className="fas fa-list me-2"></i>
                    View All Patients
                  </NavDropdown.Item>
                  {hasRole(['admin']) && (
                    <NavDropdown.Item as={Link} to="/patients/add">
                      <i className="fas fa-user-plus me-2"></i>
                      Add Patient
                    </NavDropdown.Item>
                  )}
                  {hasRole(['admin']) && (
                    <NavDropdown.Item as={Link} to="/upload">
                      <i className="fas fa-upload me-2"></i>
                      Upload Patient Data
                    </NavDropdown.Item>
                  )}
                  {user?.role === 'dietitian' && (
                    <NavDropdown.Item as={Link} to="/mypatients">
                      <i className="fas fa-user-md me-2"></i>
                      My Assigned Patients
                    </NavDropdown.Item>
                  )}
                  {user?.role === 'dietitian' && (
                    <NavDropdown.Item as={Link} to="/pending-assignments">
                      <i className="fas fa-bell me-2"></i>
                      Assignment Requests
                      {pendingAssignmentsCount > 0 && (
                        <Badge bg="warning" pill className="ms-2">
                          {pendingAssignmentsCount}
                        </Badge>
                      )}
                    </NavDropdown.Item>
                  )}
                  {hasRole(['admin', 'dietitian']) && (
                    <NavDropdown.Item as={Link} to="/active-referrals">
                      <i className="fas fa-clipboard-list me-2"></i>
                      Active Referrals
                    </NavDropdown.Item>
                  )}
                  {hasRole(['admin', 'dietitian']) && (
                    <NavDropdown.Item as={Link} to="/dietitians">
                      <i className="fas fa-user-md me-2"></i>
                      Dietitian List
                    </NavDropdown.Item>
                  )}
                </NavDropdown>
                
                {hasRole(['admin', 'dietitian']) && (
                  <Nav.Link as={Link} to="/reports" active={location.pathname === '/reports'} className="nav-link-hover">
                    <i className="fas fa-chart-bar me-1"></i> Reports
                  </Nav.Link>
                )}
                
                {hasRole(['admin']) && (
                  <Nav.Link as={Link} to="/users" active={location.pathname === '/users'} className="nav-link-hover">
                    <i className="fas fa-users-cog me-1"></i> User Management
                  </Nav.Link>
                )}
                
                <NavDropdown 
                  title={
                    <div className="d-inline-flex align-items-center">
                      {user?.profilePicture ? (
                        <Image 
                          src={user.profilePicture} 
                          width={30} 
                          height={30} 
                          roundedCircle 
                          className="border me-2"
                          style={{ objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="avatar-circle me-2">
                          <span className="avatar-initials">{getInitials()}</span>
                        </div>
                      )}
                      <span className="d-none d-sm-inline">{user?.fullName || user?.username || 'Account'}</span> 
                      {user?.role && (
                        <Badge 
                          bg={getRoleBadgeVariant(user.role)} 
                          className="ms-2 text-uppercase"
                          style={{ fontSize: '0.65rem' }}
                        >
                          {user.role}
                        </Badge>
                      )}
                    </div>
                  } 
                  id="user-dropdown"
                  align="end"
                >
                  <NavDropdown.Item as={Link} to="/settings">
                    <i className="fas fa-cog me-2"></i>
                    Settings
                  </NavDropdown.Item>
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Logout
                  </NavDropdown.Item>
                </NavDropdown>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" className="nav-link-hover">
                  <i className="fas fa-sign-in-alt me-1"></i> Login
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default NavigationBar; 