
const adminHelpers = require("../helpers/admin-helpers");
const sendEmail    = require("../utils/mailer");
let otp = "";

exports.login = async (req, res) => {
  // reset lockout if expired
  if (req.session.adminLockedOutUntil <= Date.now()) {
    req.session.adminFailedAttempts = 0;
    req.session.adminLockedOutUntil = null;
  }

  // enforce lockout
  if (req.session.adminLockedOutUntil > Date.now()) {
    const timeLeft = Math.ceil((req.session.adminLockedOutUntil - Date.now()) / 1000);
    return res.json({ status: false, timeLeft, message: `Try again in ${timeLeft}s.` });
  }

  req.session.adminFailedAttempts = req.session.adminFailedAttempts || 0;

  try {
    const response = await adminHelpers.doadminLogin(req.body);
    if (response.status) {
      req.session.adminloggedIn = true;
      req.session.adminsec     = response.admin;
      req.session.adminFailedAttempts = 0;
      return res.json(response);
    } else {
      req.session.adminFailedAttempts++;
      if (req.session.adminFailedAttempts >= 10) {
        req.session.adminLockedOutUntil = Date.now() + 2*60*1000;
        return res.json({ status: false, timeLeft: 120, message: "Too many failed attempts." });
      }
      return res.json({ status: false, message: "Invalid credentials." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Server error." });
  }
};

exports.logout = (req, res) => {
  req.session.adminloggedIn = false;
  req.session.adminsec      = null;
  res.json({ status: true });
};

exports.getAdmin = (req, res) => {
  if (req.session.adminsec) {
    return res.json({ status: true, admin: req.session.adminsec });
  }
  res.json({ status: false });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const exists = await adminHelpers.forgotPassword(email);
  if (!exists) return res.status(404).json({ status: false, message: "Email not found" });

  otp = Math.floor(100000 + Math.random() * 900000);
  try {
    await sendEmail({ to: email, subject: "Reset OTP", text: `Your OTP is ${otp}` });
    res.json({ status: true, message: "OTP sent." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Failed to send OTP." });
  }
};

exports.verifyOtp = (req, res) => {
  const { email, otp: userOtp } = req.body;
  if (!email || !userOtp) {
    return res.status(400).json({ status: false, message: "Email & OTP required" });
  }
  if (parseInt(userOtp, 10) !== otp) {
    return res.status(400).json({ status: false, message: "Invalid OTP" });
  }
  res.json({ status: true, message: "OTP verified" });
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ status: false, message: "Email & new password required" });
  }
  const ok = await adminHelpers.resetPassword(email, newPassword);
  if (ok) return res.json({ status: true, message: "Password reset" });
  res.status(500).json({ status: false, message: "Reset failed" });
};
