const path = require('path');
const mongoose = require('mongoose')
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

const userRoutes = require('./routes/user');
const jobRoutes = require('./routes/jobs');

app.use(express.json()) // Won't parse JSON data sent to server without this
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // set to true if using HTTPS
}));

app.use('/', userRoutes.routes);
app.use('/', jobRoutes.routes);

// AWS EC2 instance in env
const mongoDb_url = process.env.ELASTIC_IP

mongoose.set('strictQuery', true)
mongoose.connect(mongoDb_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log('Connected to MongoDB on EC2');
        app.listen(3010, () => {
            console.log(`Server running on port 3010`);
        });
    })
    .catch(err => console.error('Connection failed:', err));

