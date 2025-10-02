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
  subject: "Reset Your Password",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin:auto; padding:20px; border:1px solid #eaeaea; border-radius:10px; background-color:#f9f9f9; text-align:center;">
      <h2 style="color:#333;">Password Reset Request</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Please use the OTP below to proceed:</p>
      <div style="margin: 20px 0; font-size: 24px; font-weight: bold; color: #e74c3c;">${forgetPssOtp}</div>
      <p style="color: #555;">This OTP is valid for the next 10 minutes. Do not share it with anyone.</p>
      <p style="margin-top: 30px;">If you did not request a password reset, please ignore this email.</p>
      <p style="margin-top: 20px;">Best regards,<br/><strong>Admin Portal Team</strong></p>
      <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;" />
      <p style="font-size: 12px; color: #777;">For your security, do not share this OTP with anyone.</p>
    </div>
  `,
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
      subject: "Verify Your Merchant Account",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin:auto; padding:20px; border:1px solid #eaeaea; border-radius:10px; background-color:#f9f9f9; text-align:center;">
      <h2 style="color:#333;">Merchant Account Verification</h2>
      <p>Hello,</p>
      <p>Thank you for registering as a merchant. Please use the OTP below to verify your email address:</p>
      <div style="margin: 20px 0; font-size: 24px; font-weight: bold; color: #2c7be5;">${otp}</div>
      <p style="color: #555;">This OTP is valid for the next 10 minutes. Do not share it with anyone.</p>
      <p style="margin-top: 30px;">Best regards,<br/><strong>Admin Portal Team</strong></p>
      <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;" />
      <p style="font-size: 12px; color: #777;">If you did not request this verification, please ignore this email.</p>
    </div>
  `,
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

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #333;">Merchant Application Received</h2>
        <p>Hello ${req.body.data.name || "Merchant"},</p>
        <p>Thank you for submitting your merchant application. We have successfully received your request and our team will review it shortly.</p>
        <p>We will notify you once your application has been reviewed.</p>
        <p style="margin-top: 30px;">Best regards,<br/><strong>Admin Portal Team</strong></p>
        <hr style="border:none; border-top:1px solid #ddd; margin:20px 0;" />
        <p style="font-size: 12px; color: #777;">If you did not submit this application, please ignore this email.</p>
      </div>
    `;

    sendEmail({
      to: req.body.data.email,
      subject: "Your Merchant Application Has Been Received",
      html: htmlMessage,
    })
      .then(() => {
        console.log("Application confirmation email sent successfully");
      })
      .catch((err) => {
        console.error("Error sending application email:", err);
      });
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
