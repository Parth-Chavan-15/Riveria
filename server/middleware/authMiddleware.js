const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - Requires valid JWT
exports.protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]; // Extract token from "Bearer <token>"
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        if (!req.user) return res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'User no longer exists' } });
        next();
    } catch (error) {
        res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } });
    }
};

// Admin Only - Role-Based Access Control
exports.adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied: Admins only' });
    }
};
