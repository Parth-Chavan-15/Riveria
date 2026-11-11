const User = require('../models/User');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Generate JWT Helper
const generateToken = (id) => {
    return jwt.sign({ id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN, issuer: 'riveria-api', audience: 'riveria-client' });
};

// POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { email, password } = req.body;
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ error: 'User already exists' });

        const user = await User.create({ email, password, role: 'user' });
        res.status(201).json({ _id: user._id, email: user.email, role: user.role, token: generateToken(user._id) });
    } catch (error) {
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// POST /api/auth/login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');

        if (user && (await user.matchPassword(password))) {
            res.status(200).json({ _id: user._id, email: user.email, role: user.role, token: generateToken(user._id) });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Server error during login' });
    }
};

// GET /api/auth/me (Protected)
exports.getMe = async (req, res) => {
    res.status(200).json(req.user);
};
