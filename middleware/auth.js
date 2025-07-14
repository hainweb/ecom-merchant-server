const verifyLogin = (req, res, next) => {
  if (req.session.adminsec) {
    console.log('verified');
    
    next();
  } else {
    console.log('not verified');
    
    res.json({ status: false, message: "No merchant" });
  }
};

module.exports = {
  verifyLogin,
};
