var db = require('../config/connection')
var collection = require('../config/collection')
var bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { response } = require('../app');
const { reject } = require('bcrypt/promises');


module.exports = {
  getOrders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()

      resolve(orders)

    })
  },
  addShipping: (orderId) => {
    return new Promise((resolve, reject) => {
      const date = new Date().toLocaleString("en-US", {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      });

      console.log(date);

      let statusUpdate = {
        $set: {
          status2: "Shipped",
          shipedDate: date
        }
      }
      db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: new ObjectId(orderId) }, statusUpdate).then((response) => {
        resolve()
      })
    })
  },
  addDelivered: (orderId) => {
    return new Promise((resolve, reject) => {
      const date = new Date().toLocaleString("en-US", {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      });

      let statusUpdate = {
        $set: {
          status2: "Shipped",
          status3: "Product delivered",
          deliveredDate: date
        }
      }
      db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: new ObjectId(orderId) }, statusUpdate).then((response) => {
        resolve()
      })
    })
  },
  addCashUpdate: (orderId) => {
    return new Promise((resolve, reject) => {
      const date = new Date().toLocaleString("en-US", {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      });

  

      let statusUpdate = {
        $set: {
          status2: "Shipped",
          status3: "Product delivered",
          cashadmin: "Cash sended",
          cashadminDate: date
        }
      }
      db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: new ObjectId(orderId) }, statusUpdate).then((response) => {
        resolve()
      })
    })
  },
  doSignup: (deliveryData) => {
    console.log('userdt is ', deliveryData);
    return new Promise(async (resolve, reject) => {
      let response = {};
      let deliveryExists = await db.get().collection(collection.DELIVERY_COLLECTION).findOne({ Mobile: deliveryData.Mobile });
      if (!deliveryExists) {
        deliveryData.Password = await bcrypt.hash(deliveryData.Password, 10);  // Hash the password
        db.get().collection(collection.DELIVERY_COLLECTION).insertOne(deliveryData).then((data) => {
          response.delivery = deliveryData;  // Return user data
          response.status = true;
          resolve(response);
        });
      } else {
        response.status = false;
        resolve(response);
      }
    })

  },
  doLogin: (deliveryData) => {
    return new Promise(async (resolve, reject) => {
      let loginstatus = false
      let loginErr=false
      let response = {}
      let delivery = await db.get().collection(collection.DELIVERY_COLLECTION).findOne({ Mobile: deliveryData.Mobile })
      if (delivery) {
        bcrypt.compare(deliveryData.Password, delivery.Password).then((status) => {
          if (status) {
            response.status = true
            response.delivery = delivery
            resolve(response)
          } else {
            response.loginErr='Incorect password'
            response.status = false
            resolve(response )
          }
        })
      } else {
        response.loginErr='Invalid Mobile number'
        resolve(response)
      }
    })
  }

}