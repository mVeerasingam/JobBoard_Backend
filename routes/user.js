const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { formatJobDetails } = require('./jobs');
const requireAuth = require('../mw/auth');

// User Schema
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    savedJobs: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'job'
    }]
});

// Create User model
const User = mongoose.model('user', userSchema);

// Register a new user
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Username already exists'
            });
        }

        const hashedPassword = bcrypt.hashSync(password + process.env.EXTRA_BCRYPT_STRING, 12);

        // Create new user object
        const user = new User({
            username,
            password: hashedPassword,
            savedJobs: []
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: user._id
        });
    } catch (err) {
        console.log(err)
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
});

// Login
router.post('/signin', async (req, res) => {
    try {
        const { username, password } = req.body;

        console.log('Signin attempt for:', username);

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                error: 'Username and password are required'
            });
        }

        // Find the user by username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({
                success: false,
                error: 'User not found'
            });
        }

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password + process.env.EXTRA_BCRYPT_STRING, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: 'Invalid password'
            });
        }

        req.session.userId = user._id;
        req.session.username = user.username;

        // Successful login
        res.status(200).json({
            success: true,
            message: 'Login successful',
            userId: user._id,
            username: user.username
        });

    } catch (err) {
        console.error('Error during signin:', err);  // Log the full error for debugging
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});


router.post('/save-jobs/:jobId', requireAuth, async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const userId = req.session.userId;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, error: 'Invalid ID format' });
        }

        const user = await User.findById(userId);
        const Job = mongoose.model('job');
        const job = await Job.findById(jobId);

        if (!user || !job) {
            return res.status(404).json({ success: false, error: 'User or job not found' });
        }

        if (user.savedJobs.includes(jobId)) {
            return res.json({ success: true, message: 'Job already saved', savedJobs: user.savedJobs });
        }

        user.savedJobs.push(jobId);
        await user.save();

        res.json({ success: true, message: 'Job saved successfully', savedJobs: user.savedJobs });

    } catch (err) {
        console.error('Error saving job:', err);
        res.status(500).json({ success: false, error: 'Failed to save job' });
    }
});

// Get saved jobs
router.get('/saved-jobs', requireAuth, async (req, res) => {
    try {
        const { userId } = req.session;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID format' });
        }

        // Find user by session userId
        const user = await User.findById(userId).populate('savedJobs');
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const jobs = user.savedJobs.map(formatJobDetails); // Format each job in the savedJobs array

        res.json({
            success: true,
            jobs
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

router.delete('/saved-jobs/:jobId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.session;
        const { jobId } = req.params;

        // Validate ObjectId formats
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, error: 'Invalid ID format' });
        }

        // Find user and check if job is in saved jobs
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Check if the job is in saved jobs
        if (!user.savedJobs.includes(jobId)) {
            return res.status(404).json({ success: false, error: 'Job not found in saved jobs' });
        }

        // Remove job from saved jobs
        user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
        await user.save();

        res.json({ success: true, message: 'Job removed from saved jobs' });
    } catch (err) {
        console.error('Error removing saved job:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});


// Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ success: false, error: 'Logout failed' });
        res.json({ success: true, message: 'Logged out successfully' });
    });
});


exports.routes = router;