var db = require('../config/connection')
var collection = require('../config/collection')


module.exports = {

  getAdminOrders: (adminId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match: {
            "products.product.adminId": adminId
          }
        }
      ]).toArray();

      resolve(orders);
    } catch (err) {
      reject(err);
    }
  });
},
  
}