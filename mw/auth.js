module.exports = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Please log in or create an account' });
    }
    next()
}