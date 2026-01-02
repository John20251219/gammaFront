// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../utils/auth';

const PrivateRoute = ({ children }) => {
    const isAuth = authService.isAuthenticated();

    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default PrivateRoute;