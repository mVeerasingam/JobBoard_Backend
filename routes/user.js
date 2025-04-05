const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { formatJobDetails } = require('./jobs');

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

        // Log the request body to ensure data is being sent correctly
        console.log('Signin attempt:', req.body);

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
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                error: 'Invalid password'
            });
        }

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


// Save a job for logged-in user
router.post('/users/:userId/save-job/:jobId', async (req, res) => {
    try {
        const { userId, jobId } = req.params;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid user ID format'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid job ID format'
            });
        }

        // Find user and job
        const user = await User.findById(userId);
        const Job = mongoose.model('job');
        const job = await Job.findById(jobId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        // Check if job is already saved
        if (user.savedJobs.includes(jobId)) {
            return res.json({
                success: true,
                message: 'Job already saved',
                savedJobs: user.savedJobs
            });
        }

        // Save the job
        user.savedJobs.push(jobId);
        await user.save();

        res.json({
            success: true,
            message: 'Job saved successfully',
            savedJobs: user.savedJobs
        });

    } catch (err) {
        console.error('Error saving job:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to save job',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

router.get('/users/:userId/saved-jobs', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('savedJobs');
        if (!user) return res.status(404).json({ error: 'User not found' });

        res.json({
            success: true,
            jobs: user.savedJobs.map(formatJobDetails)
        });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});


// Delete a saved job
router.delete('/users/:userId/saved-jobs/:jobId', async (req, res) => {
    try {
        const { userId, jobId } = req.params;

        // Validate IDs
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid ID format'
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if job exists in saved jobs
        const jobIndex = user.savedJobs.findIndex(id => id.toString() === jobId);
        if (jobIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'Job not found in saved jobs'
            });
        }

        // Remove job from saved jobs
        user.savedJobs.splice(jobIndex, 1);
        await user.save();

        res.json({
            success: true,
            message: 'Job removed from saved jobs',
            remainingJobs: user.savedJobs.length
        });

    } catch (err) {
        console.error('Error removing saved job:', err);
        res.status(500).json({
            success: false,
            error: 'Server error',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

exports.routes = router;