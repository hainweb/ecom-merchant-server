var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
var userHelpers = require('../helpers/user-helpers');
var deliveryHelpers = require('../helpers/delivery-helpers');
const { response } = require('../app');
const verifyLogin = (req, res, next) => {
    if (req.session.deliveryLogin) {
        next()
    } else {
        res.redirect('/delivery/login')
    }
}

router.get('/', verifyLogin, async function (req, res, next) {
    let orders = await deliveryHelpers.getOrders()
    deliverDetails = req.session.deliveryNm
    res.render('delivery/view-products', { isDelivery: true, orders, deliverDetails })
})
router.get('/shipping/:id',verifyLogin, async (req, res) => {
    let orderstatus = await deliveryHelpers.addShipping(req.params.id)
    res.json({ status: true })
})
router.get('/delivered/:id',verifyLogin, async (req, res) => {
    let status = await deliveryHelpers.addDelivered(req.params.id)
    res.json({ status: true })
})
router.get('/cashupdate/:id',verifyLogin, async (req, res) => {
    let status = await deliveryHelpers.addCashUpdate(req.params.id)
    res.json({ status: true })
})
router.get('/login', (req, res) => {
    info = req.session.deliveryLoginInfo
    res.render('delivery/login', { isDelivery: true, info })
})
router.post('/login', (req, res) => {
    deliveryHelpers.doLogin(req.body).then((response) => {
        if (response.status) {
            req.session.deliveryLogin = true
            req.session.deliveryNm = response.delivery
            req.session.deliveryLoginInfo = 'Login success'
            res.redirect('/delivery/')
        } else {
           console.log('slinet info',response.loginErr);
                req.session.deliveryLoginInfo=response.loginErr
            res.redirect('/delivery/login')
        }
    })

})

router.get('/logout', (req, res) => {
    req.session.deliveryLogin = false
    res.redirect('/delivery/login')
})

module.exports = router