var db=require('../config/connection')
var collection = require('../config/collection')
var bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { response } = require('../app');

module.exports={
    doadminSignup: (adminData) => {
        return new Promise(async (resolve, reject) => {
          let response1 = {};
          let adminExists = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Mobile: adminData.Mobile });
          if (!adminExists) {
            adminData.Password = await bcrypt.hash(adminData.Password, 10);  // Hash the password
            db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then((data) => {
              response1.admin = adminData;  // Return user data
              response1.status = true;
              resolve(response1);
            }); 
          } else {
            response1.status = false;
            resolve(response1); 
          }
        });
      },
      doadminLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
          let loginStatus = false
          let response = {}
          let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ Mobile: adminData.Mobile })
          if (admin) {
            bcrypt.compare(adminData.Password, admin.Password).then((status) => {
              if (status) {
                console.log('Login success');
                response.admin = admin
                response.status = true
                resolve(response)
    
              } else {
                console.log('Login failed pss error');
                resolve({ status: false })
    
              }
            })
          } else {
            console.log('No user found');
            resolve({ status: false })
          }
        })
      },
      getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
          try {
            // Fetch all users
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray();
            
            // For each user, fetch their order count
            for (let user of users) {
              let orderCount = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userId: new ObjectId(user._id) }).count(); // Counting orders for each user
              user.orderCount = orderCount; // Assign the order count to each user
            }
      
            resolve(users);
          } catch (error) {
            reject(error);
          }
        });
      }
      
}