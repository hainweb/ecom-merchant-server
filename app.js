require('dotenv').config(); // Load .env file

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
const MongoStore = require('connect-mongo');
var adminRouter = require('./routes/admin');
var deliverRouter = require('./routes/delivery');
var superAdminRouter = require('./routes/superAdmin');
var hbs = require('express-handlebars');
var app = express();
var fileUpload = require('express-fileupload');
var db = require('./config/connection');
var session = require('express-session'); 
const router = express.Router();

// Trust first proxy for secure cookies
app.set('trust proxy', 1);

// CORS configuration - must be before routes
app.use(cors({
  origin: process.env.FRONTEND_URL,
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
  layoutsDir: __dirname + '/views/layout/', 
  partialsDir: __dirname + '/views/partials/',
  helpers: {
    lt: function (v1, v2) {
      return v1 < v2;
    },
    eq: function (v1, v2) {
      return v1 === v2;
    },
    multiply: function (v1, v2) {
      return v1 * v2;
    }
  }
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SESSION_SECRET)); // Use same secret as session
app.use(express.static(path.join(__dirname, 'public')));

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
}));

router.use(fileUpload());

// Session configuration - updated for better production support
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
    autoRemove: 'native',
    touchAfter: 24 * 3600
  }),
  name: 'sessionId', // Custom cookie name
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Must be true in production
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Critical for cross-origin
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? 'https://king-cart-adminpanel.onrender.com' : undefined // Update with your domain
  }
};

app.use(session(sessionConfig));

// Database connection
db.connect((err) => {
  if (err) {
    console.log('Database not connected' + err);
  } else {
    console.log('Database Connected');
  }
});

// Routes
app.use('/admin', adminRouter);
app.use('/delivery', deliverRouter);
app.use('/superAdmin', superAdminRouter);
app.use('/public', express.static(path.join(__dirname, 'public')));

// 404 handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
