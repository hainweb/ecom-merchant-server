# Merchant Backend | Multi-Role E-Commerce Platform

This is the **Merchant API Server** for handling merchant operations including product management, authentication, and order tracking.

---

## Features

### Authentication
- Merchant **signup** and **login** (activation by Super Admin)
- JWT-based authentication
- Forgot password flow with OTP verification
- Mark introductory tutorial as seen
- Merchant verification by OTP
- Logout

### Products
- CRUD APIs for products
- Fetch all products or merchant-specific products
- Image upload support for products
- Real-time stock updates

### Analytics
- Total revenue tracking
- Revenue trend over time
- Order data analytics
- Products by category
- Shipping status tracking

---

## Tech Stack

- **Backend**: Node.js, Express.js  
- **Database**: MongoDB 
- **Authentication**: JWT, Bcrypt  
- **File Upload**: Multer or express-fileupload  
- **Optional**: Cloud storage integration for images  

---

## Environment Variables

Create a `.env` file in the **root directory** with the following variables:

```env
# MongoDB connection string
MONGO_URI=<your_mongodb_uri>

# Server port
PORT=7000

# Node environment: development or production
NODE_ENV=development

# Session configuration
SESSION_SECRET=<your_session_secret>
SESSION_TTL=86400
SESSION_COOKIE_MAX_AGE=86400000

# Frontend URL for CORS or redirects
FRONTEND_URL=http://localhost:2000

# Cloudinary configuration for image uploads
CLOUD_NAME=<your_cloud_name>
API_KEY=<your_api_key>
API_SECRET=<your_api_secret>

# Email configuration for OTPs
EMAIL_USER=<your_email_user>
EMAIL_PASS=<your_email_password>

```

---

## Setup & Start Instructions

```bash
# 1️ Clone the repository
git clone https://github.com/hainweb/ecom-merchant-server.git

# 2️ Navigate to project directory
cd ecom-merchant-server

# 3️ Install dependencies
npm install

# 4️ Create .env file in the root directory (see Environment Variables section)

# 5️ Start the development server
npm start
