const verifyLogin = (req, res, next) => {
  if (req.session.adminsec) {
    next();
  } else {
    res.json({ status: false, message: "No merchant" });
  }
};

module.exports = {
  verifyLogin,
};
