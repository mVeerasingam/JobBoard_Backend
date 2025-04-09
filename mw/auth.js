const jwt = require('jsonwebtoken');

// Middleware to check if the user is authenticated with JWT
module.exports = (req, res, next) => {
    // Get the Authorization header from the request
    const authHeader = req.headers.authorization;

    // If there is no Authorization header or it doesn't start with "Bearer", return an error
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    // Extract the token from the Authorization header (after "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
        // Verify the token using the .env secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // If token is valid, store the decoded user info in the request object
        req.user = decoded; // Contains userId and username
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
};
