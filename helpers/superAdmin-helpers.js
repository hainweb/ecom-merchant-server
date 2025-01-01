var db = require('../config/connection')
var collection = require('../config/collection')
var bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { response } = require('../app');
const { resolve } = require("path");
const { reject } = require("bcrypt/promises");

module.exports = {

  getAllAdmin: () => {
    return new Promise(async (resolve, reject) => {
      let admins = await db.get().collection(collection.ADMIN_COLLECTION).find().toArray()

      resolve(admins)

    })
  },
  getAllDelivery: () => {
    return new Promise(async (resolve, reject) => {
      let delivery = await db.get().collection(collection.DELIVERY_COLLECTION).find().toArray()
      console.log('server delivery', delivery);

      resolve(delivery)
    })
  },
  doSignup: (details) => {
    return new Promise(async (resolve, reject) => {
      let response = {}

      let superAdminExist = await db.get().collection(collection.SUPERADMIN_COLLECTION).findOne({ Mobile: details.Mobile })
      if (!superAdminExist) {
        details.Password = await bcrypt.hash(details.Password, 10)
        db.get().collection(collection.SUPERADMIN_COLLECTION).insertOne(details)
        response.status = true
        response.superAdmin = details
        console.log('server ', details);
        resolve(response)

      } else {
        response.status = false
        resolve(response)
      }
    })
  },
  doLogin: (details) => {
    return new Promise(async (resolve, reject) => {
      let response = {}
      let loginStatus = {}

      let superAdmin = await db.get().collection(collection.SUPERADMIN_COLLECTION).findOne({ Mobile: details.Mobile })
      if (superAdmin) {
        bcrypt.compare(details.Password, superAdmin.Password).then((status) => {
          if (status) {
           response.status = true
            response.SuperAdmin = superAdmin
            resolve(response)
          } else {
           response.status = false
            response.loginErr = 'Incorrect Password'
            resolve(response)
          }
        })
      } else {
        loginStatus = false
        response.loginErr = 'Invalid Mobile'
        resolve(response)
      }
    })
  }
}