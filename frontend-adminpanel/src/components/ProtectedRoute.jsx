import React, { useContext } from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

const ProtectedRoute = ({ children, roles, module, action }) => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        // Redirect to login but save the current location they were trying to go to
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Role Templates (e.g. only superadmin or admin can access Admins menu)
    if (roles && !roles.includes(user.role)) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '70vh',
                padding: '20px',
                textAlign: 'center',
                color: 'var(--text-primary)'
            }}>
                <ShieldAlert size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px' }}>Privilege Level Insufficient</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '20px' }}>
                    This section is restricted to Super Administrators only.
                </p>
                <Link 
                    to="/dashboard" 
                    style={{
                        padding: '10px 20px',
                        background: 'var(--primary-color, #7c3aed)',
                        color: '#fff',
                        borderRadius: '6px',
                        textDecoration: 'none',
                        fontWeight: '600'
                    }}
                >
                    Return to Dashboard
                </Link>
            </div>
        );
    }

    // Granular Module + Action Permission checks for Sub Admins
    if (user.role === 'subadmin' && module && action) {
        const perms = user.permissions || {};
        const moduleActions = perms[module] || [];
        
        if (!moduleActions.includes(action)) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '70vh',
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--text-primary)'
                }}>
                    <ShieldAlert size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
                    <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '10px' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', marginBottom: '20px' }}>
                        You do not have administrative permission to {action} inside the {module} module. Please contact your system administrator to update your access profile.
                    </p>
                    <Link 
                        to="/dashboard" 
                        style={{
                            padding: '10px 20px',
                            background: 'var(--primary-color, #7c3aed)',
                            color: '#fff',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontWeight: '600'
                        }}
                    >
                        Return to Dashboard
                    </Link>
                </div>
            );
        }
    }

    return children;
};

export default ProtectedRoute;
