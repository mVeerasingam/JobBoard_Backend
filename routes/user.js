const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { formatJobDetails } = require('./jobs');
const requireAuth = require('../mw/auth');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'job' }]
});

const User = mongoose.model('user', userSchema);

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { username, password } = req.body;

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }

        const hashedPassword = bcrypt.hashSync(password + process.env.EXTRA_BCRYPT_STRING, 12);

        const user = new User({ username, password: hashedPassword });
        await user.save();

        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Signin with JWT
router.post('/signin', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Signin attempt for:', username);

        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ success: false, error: 'User not found' });

        const isMatch = await bcrypt.compare(password + process.env.EXTRA_BCRYPT_STRING, user.password);
        if (!isMatch) return res.status(400).json({ success: false, error: 'Invalid password' });

        const token = jwt.sign(
            { userId: user._id, username: user.username },
            process.env.JWT_SECRET || 'supersecretjwtkey',
            { expiresIn: '7d' }
        );

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            userId: user._id,
            username: user.username
        });

    } catch (err) {
        console.error('Error during signin:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Save Job
router.post('/save-jobs/:jobId', requireAuth, async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const userId = req.user.userId;

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

// Get Saved Jobs
router.get('/saved-jobs', requireAuth, async (req, res) => {
    try {
        const userId = req.user.userId;

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, error: 'Invalid user ID format' });
        }

        const user = await User.findById(userId).populate('savedJobs');
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const jobs = user.savedJobs.map(formatJobDetails);

        res.json({ success: true, jobs });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Remove Saved Job
router.delete('/saved-jobs/:jobId', requireAuth, async (req, res) => {
    try {
        const { userId } = req.user;
        const { jobId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, error: 'Invalid ID format' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        if (!user.savedJobs.includes(jobId)) {
            return res.status(404).json({ success: false, error: 'Job not found in saved jobs' });
        }

        user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
        await user.save();

        res.json({ success: true, message: 'Job removed from saved jobs' });
    } catch (err) {
        console.error('Error removing saved job:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
});

// Signout
router.post('/signout', (req, res) => {
    // This is just a simple signout route since JWT is stateless.
    // To "sign out" you can simply remove the token on the client side.

    // If using cookies, you could clear the cookie here:
    // res.clearCookie('token');

    res.json({
        success: true,
        message: 'Successfully logged out.'
    });
});

exports.routes = router;
