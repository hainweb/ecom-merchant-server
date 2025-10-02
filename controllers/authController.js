const adminHelpers = require("../helpers/admin-helpers");
const sendEmail = require("../utils/mailer");
let otp = "";
let forgetPssOtp = "";

exports.login = async (req, res) => {
  if (req.session.adminLockedOutUntil <= Date.now()) {
    req.session.adminFailedAttempts = 0;
    req.session.adminLockedOutUntil = null;
  }

  if (req.session.adminLockedOutUntil > Date.now()) {
    const timeLeft = Math.ceil(
      (req.session.adminLockedOutUntil - Date.now()) / 1000
    );
    return res.json({
      status: false,
      timeLeft,
      message: `Try again in ${timeLeft}s.`,
    });
  }

  req.session.adminFailedAttempts = req.session.adminFailedAttempts || 0;

  try {
    const response = await adminHelpers.doadminLogin(req.body);

    if (response.status) {
      req.session.adminloggedIn = true;
      req.session.adminsec = response.admin;
      req.session.adminFailedAttempts = 0;
      return res.json(response);
    } else {
      req.session.adminFailedAttempts++;
      if (req.session.adminFailedAttempts >= 10) {
        req.session.adminLockedOutUntil = Date.now() + 2 * 60 * 1000;
        return res.json({
          status: false,
          timeLeft: 120,
          message: "Too many failed attempts.",
        });
      }
      if (!response.isApproved) {
        return res.json({
          status: false,
          message: "This account is not approved",
        });
      }
      if (response.isBlock) {
        return res.json({ status: false, message: "This account is blocked" });
      }
      return res.json({
        status: false,
        message: "Incorrect email or password",
      });
    }
  } catch (err) {
    res.status(500).json({ status: false, message: "Server error." });
  }
};

exports.markIntroSeen = async (req, res) => {
  try {
    const adminId = req.session.adminsec._id;
    const response = await adminHelpers.markIntroSeen(adminId);
    if (response.acknowledged) {
      req.session.adminsec.isIntroSeen = true;
      res.json({ status: true });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: "Something went wrong" });
  }
};

exports.logout = (req, res) => {
  req.session.adminloggedIn = false;
  req.session.adminsec = null;
  res.json({ status: true });
};

exports.getAdmin = (req, res) => {
  if (req.session.adminsec) {
    if (req.session.adminsec.isApproved) {
      return res.json({
        status: true,
        admin: req.session.adminsec,
        isApproved: true,
      });
    } else {
      return res.json({
        status: true,
        isApproved: false,
        admin: req.session.adminsec,
      });
    }
  } else {
    res.json({ status: false });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const exists = await adminHelpers.checkMerchant(email);
  if (!exists)
    return res.status(404).json({ status: false, message: "Email not found" });

  forgetPssOtp = Math.floor(100000 + Math.random() * 900000);
  try {
    await sendEmail({
      to: email,
      subject: "Reset OTP",
      text: `Your OTP is ${forgetPssOtp}`,
    });
    res.json({ status: true, message: "OTP sent." });
  } catch (e) {
    res.status(500).json({ status: false, message: "Failed to send OTP." });
  }
};
exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const exists = await adminHelpers.checkMerchant(email);
  if (exists) {
    console.log("alredy");

    return res.json({ status: false, message: "This email is already exist" });
  }
  otp = Math.floor(100000 + Math.random() * 900000);
 
  try {
    await sendEmail({
      to: email,
      subject: "Email verification for Merchant account",
      text: `Your OTP is ${otp}`,
    });
    res.json({ status: true, message: "OTP sent." });
  } catch (e) {
    res.status(500).json({ status: false, message: "Failed to send OTP." });
  }
};

exports.createMerchant = async (req, res) => {
  try {
    const response = await adminHelpers.createMerchant(req.body.data);
    console.log(response);

    req.session.adminloggedIn = true;
    req.session.adminsec = response;
    req.session.adminFailedAttempts = 0;
    res.json({ status: true, message: "Merchant created" });


    
  } catch (error) {
    console.error(error);
    res.json({ status: false, message: "Something went wrong" });
  }
};

exports.verifyOtp = (req, res, next) => {
  const { email, otp: userOtp } = req.body;
  if (!email || !userOtp) {
    console.log("no email and opt");

    return res
      .status(400)
      .json({ status: false, message: "Email & OTP required" });
  }
  if (req.body.data) {
    console.log("this is merch");

    if (parseInt(userOtp, 10) !== otp) {
      console.log("otp not corretc");

      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }
    console.log("otp verifued");

    next();
    return;
  }
  if (parseInt(userOtp, 10) !== forgetPssOtp) {
    return res.status(400).json({ status: false, message: "Invalid OTP" });
  }
  res.json({ status: true, message: "OTP verified" });
};

exports.resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res
      .status(400)
      .json({ status: false, message: "Email & new password required" });
  }
  const ok = await adminHelpers.resetPassword(email, newPassword);
  if (ok) return res.json({ status: true, message: "Password reset" });
  res.status(500).json({ status: false, message: "Reset failed" });
};
