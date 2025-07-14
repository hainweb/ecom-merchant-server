const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const MongoStore = require('connect-mongo'); 
const hbs = require('express-handlebars');
const fileUpload = require('express-fileupload');
const session = require('express-session');

const adminRouter = require('./routes/admin');
const db = require('./config/connection');
require('dotenv').config(); 

const app = express(); 
 
// Trust first proxy for secure cookies
app.set('trust proxy', 1);

// CORS configuration
app.use(cors({
  origin: ['https://king-cart-merchant.onrender.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine({
  extname: 'hbs',
  defaultLayout: 'layout', 
  layoutsDir: path.join(__dirname, 'views', 'layout'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    lt: (v1, v2) => v1 < v2,
    eq: (v1, v2) => v1 === v2,
    multiply: (v1, v2) => v1 * v2
  }
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.static(path.join(__dirname, 'public')));

// File upload configuration
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Session configuration
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 30 * 24 * 60 * 60, // 30 days in seconds
    autoRemove: 'native',
    touchAfter: 24 * 3600 // Touch session every 24 hours
  }),
  name: 'sessionId',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
    domain: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : undefined
  }
};


app.use(session(sessionConfig));

// Database connection
db.connect((err) => {
  if (err) {
    console.log('Database not connected: ' + err);
  } else {
    console.log('Database Connected');
  }
});

// Routes
app.use('/admin', adminRouter);
app.use('/public', express.static(path.join(__dirname, 'public')));

// 404 handler
app.use((req, res, next) => {
  next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
