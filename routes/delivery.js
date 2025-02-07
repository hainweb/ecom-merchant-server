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
    console.log('orders',orders);
      // Sorting: Pending first, then in-progress, then completed, then canceled
      orders.sort((a, b) => {
        const statusOrder = {
            "Pending": 1,
            "Product take from godown": 2,
            "Product Delivered": 3,
            "Completed": 4,
            "Canceled": 5  // Canceled orders go last
        };

        let statusA = a.cancel ? "Canceled" : a.cashadmin ? "Completed" : a.status3 ? "Product Delivered" : a.status2 ? "Product take from godown" : "Pending";
        let statusB = b.cancel ? "Canceled" : b.cashadmin ? "Completed" : b.status3 ? "Product Delivered" : b.status2 ? "Product take from godown" : "Pending";

        return statusOrder[statusA] - statusOrder[statusB];
    });
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