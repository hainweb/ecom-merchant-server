var express = require('express')
var router = express.Router();
var adminHelpers = require('../helpers/admin-helpers')
var deliveryHelpers = require('../helpers/delivery-helpers')
var SuperAdminHelpers = require('../helpers/superAdmin-helpers');
const { response } = require('../app');

const verifyLogin = (req, res, next) => {
  if (req.session.SuperAdmin && req.session.SuperAdmin.loggedin) {
    next()
  } else {
    res.redirect('/SuperAdmin/login')
  }
}

router.get('/',verifyLogin, (req, res, next) => {
  console.log('SUPER ADMIN', req.session.SuperAdmin);

  res.render('superAdmin/view', { SuperAdmin: true, superAdminsec: req.session.SuperAdmin })
})
router.get('/login', (req, res) => {
  let info = req.session.superLoginErr
  res.render('SuperAdmin/login', { SuperAdmin: true, info })
  req.session.superLoginErr = false
})

router.post('/login', (req, res) => {
  SuperAdminHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.SuperAdmin = { loggedin: true, ...response.SuperAdmin }

      res.redirect('/SuperAdmin/')
    } else {
      req.session.superLoginErr = response.loginErr
      res.redirect('/SuperAdmin/login')
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.SuperAdmin = null

  res.redirect('/SuperAdmin/login')
})

/* router.get('/signup',verifyLogin, (req, res) => {
  let info = req.session.superSignupErr
  res.render('SuperAdmin/signup', { SuperAdmin: true, info })
}) */
/* router.post('/signup',verifyLogin ,(req, res) => {
  SuperAdminHelpers.doSignup(req.body).then((response) => {
    if (response.status) {
      req.session.SuperAdmin = response.SuperAdmin
      console.log('super sess', req.session.SuperAdmin);
      res.redirect('/SuperAdmin/')
    } else {
      req.session.superSignupErr = 'This Number is Already Taken'
      res.redirect('/SuperAdmin/signup')
    }
  })
}) */


router.get('/adminsignup',verifyLogin, (req, res) => {

  res.render('admin/signup', { SuperAdmin: true, "info": req.session.adminsignupErr ,superAdminsec:req.session.SuperAdmin})
})
router.post('/adminsignup',verifyLogin, (req, res) => {
  adminHelpers.doadminSignup(req.body).then((response1) => {
    console.log(response1);
    if (response1.status) {

      res.redirect('/SuperAdmin')
    } else {
      req.session.adminsignupErr = 'This number is already taken'
      res.redirect('/SuperAdmin/adminsignup')
    }
  })
})

router.get('/deliverysignup',verifyLogin, (req, res) => {
  info = req.session.deliverySignupInfo
  res.render('delivery/signup', { SuperAdmin: true, info,superAdminsec:req.session.SuperAdmin })
})
router.post('/deliverysignup',verifyLogin, (req, res) => {
  deliveryHelpers.doSignup(req.body).then((response) => {
    if (response.status) {
      req.session.deliverySignupInfo = 'Login success'
      res.redirect('/SuperAdmin')
    } else {
      req.session.deliverySignupInfo = 'This number is already taken'
      res.redirect('/SuperAdmin/deliverysignup')
    }

  })
})
router.get('/all-admins',verifyLogin, async (req, res) => {
  let allAdmins = await SuperAdminHelpers.getAllAdmin()
  console.log('Clinet ', allAdmins);
  res.render('superAdmin/all-admins', { SuperAdmin: true, allAdmins,superAdminsec:req.session.SuperAdmin })
})
router.get('/all-delivery',verifyLogin, async (req, res) => {
  let allDelivery = await SuperAdminHelpers.getAllDelivery()
  res.render('SuperAdmin/all-delivery', { SuperAdmin: true, allDelivery,superAdminsec:req.session.SuperAdmin })
})



module.exports = router