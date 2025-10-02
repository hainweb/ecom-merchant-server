// routes/routes.js
const express = require("express");
const router = express.Router();
const fileUpload = require("express-fileupload");

// Controllers
const authCtrl = require("../controllers/authController");
const productCtrl = require("../controllers/productController");
const analyticsCtrl = require("../controllers/analyticsController");

// Middleware
const { verifyLogin } = require("../middleware/auth");

// --- AUTH ---
router.post("/login", authCtrl.login);
router.get("/logout", authCtrl.logout);
router.get("/get-admin", authCtrl.getAdmin);
router.post("/forgot-password", authCtrl.forgotPassword);
router.post("/verify-otp", authCtrl.verifyOtp);
router.post("/reset-password", authCtrl.resetPassword);

router.post("/send-otp", authCtrl.sendOtp);
router.post("/verify-merchant", authCtrl.verifyOtp, authCtrl.createMerchant);

router.post('/mark-intro-seen',authCtrl.markIntroSeen)

// --- PRODUCTS ---
router.get("/all-products", productCtrl.allProducts);
router.get("/admin-products", verifyLogin, productCtrl.adminProducts);

router.post("/add-product", verifyLogin, productCtrl.addProduct);
router.get("/get-product/:id", productCtrl.getProduct);

router.post("/delete-item/:id", verifyLogin, productCtrl.deleteProduct);
router.get("/edit-product/:id", verifyLogin, productCtrl.editProductGet);
router.post("/edit-product/:id", verifyLogin, productCtrl.editProductPost);

// --- ANALYTICS ---
router.get("/get-total-revenue", verifyLogin, analyticsCtrl.getTotalRevenue);
router.get("/get-revenue-trend", verifyLogin, analyticsCtrl.getRevenueTrend);
router.get("/get-admin-orders", verifyLogin, analyticsCtrl.getAdminOrders);
router.get(
  "/get-products-category",
  verifyLogin,
  analyticsCtrl.getProductsByCategory
);
router.get(
  "/get-shipping-status",
  verifyLogin,
  analyticsCtrl.getShippingStatus
);

module.exports = router;
