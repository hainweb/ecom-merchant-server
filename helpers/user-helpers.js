var db = require('../config/connection')
var collection = require('../config/collection')
var bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { response } = require('../app');


const updateProduct = (proId, proDetails) => {
  return new Promise((resolve, reject) => {
    db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: new ObjectId(proId) }, {
      $set: {
        Name: proDetails.Name,
        Price: proDetails.Price,
        Category: proDetails.Category,
        Description: proDetails.Description,
        Quantity: proDetails.Quantity
      }
    }).then((response) => {
      resolve()
    })
  })
}
module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      let response1 = {};
      let userExists = await db.get().collection(collection.USER_COLLECTION).findOne({ Mobile: userData.Mobile });
      if (!userExists) {
        userData.Password = await bcrypt.hash(userData.Password, 10);  // Hash the password
        db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
          response1.user = userData;  // Return user data
          response1.status = true;
          resolve(response1);
        });
      } else {
        response1.status = false;
        resolve(response1);
      }
    });
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false
      let response = {}
      let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Mobile: userData.Mobile })
      if (user) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            console.log('Login success');
            response.user = user
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
  addToCart: (proId, userId) => {
    let proObj = {
      item: new ObjectId(proId),
      quantity: 1
    }
    return new Promise(async (resolve, reject) => {
      let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
      if (userCart) {
        let proExist = userCart.products.findIndex(product => product.item == proId)
        console.log(proExist);
        if (proExist != -1) {
          /*db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId), 'products.item': new ObjectId(proId) },
            {
              $inc: { 'products.$.quantity': 1 }
            }
          ).then(() => {
            resolve()
          }) */
          resolve({status:false ,message:"Already In Cart"})
        } else {
          db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId) },
            {

              $push: { products: proObj }

            }
          ).then((response) => {
            resolve({status:true})
          })

        }

      } else {
        let cartObj = {
          user: new ObjectId(userId),
          products: [proObj]
        }
        console.log(cartObj);

        db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
          resolve({status:true})
        })
      }
    })
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: new ObjectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1,
            quantity: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }
        }


      ]).toArray()

      console.log(cartItems);

      resolve(cartItems)
    })
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0
      let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
      if (cart) {
        count = cart.products.length
      }
      resolve(count)
    })
  },
  changeProductQuantity: (details) => {
    details.quantity = parseInt(details.count);
    details.count = parseInt(details.count);

    return new Promise((resolve, reject) => {
      // Find the current quantity of the product in the cart
      db.get().collection(collection.CART_COLLECTION).findOne(
        { _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product) },
        { projection: { 'products.$': 1 } }
      ).then((cart) => {
        if (cart) {
          const currentQuantity = cart.products[0].quantity;

          if (currentQuantity + details.count <= 0) {
            // Remove the product if the resulting quantity is 0 or less
            db.get().collection(collection.CART_COLLECTION).updateOne(
              { _id: new ObjectId(details.cart) },
              {
                $pull: { products: { item: new ObjectId(details.product) } }
              }
            ).then((response) => {
              resolve({ removeProduct: true });
            });
          } else {
            // Update the quantity if it's more than 0
            db.get().collection(collection.CART_COLLECTION).updateOne(
              { _id: new ObjectId(details.cart), 'products.item': new ObjectId(details.product) },
              {
                $inc: { 'products.$.quantity': details.count }
              }
            ).then((response) => {
              resolve({ status: true });
            });
          }
        } else {
          reject('Product not found in cart');
        }
      }).catch((err) => {
        reject(err);
      });
    });
  },
  getTotalAmount: (userId) => {
    console.log('database',userId);
    
    return new Promise(async (resolve, reject) => {
      let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match: { user: new ObjectId(userId) }
        },
        {
          $unwind: '$products'
        },
        {
          $project: {
            item: '$products.item',
            quantity: '$products.quantity'
          }
        },
        {
          $lookup: {
            from: collection.PRODUCT_COLLECTION,
            localField: 'item',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            item: 1,
            quantity: 1,
            product: { $arrayElemAt: ['$product', 0] }
          }
        },
        {
          $project: {
            item: 1,
            quantity: 1,
            price: { $toDouble: '$product.Price' } // Convert the Price field to a double
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $multiply: ['$quantity', '$price'] } }
          }
        }
      ]).toArray();
      let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
      if (Array.isArray(total) && total.length > 0) {
        resolve(total[0].total);
      } else {
        // Handle the case where total is not an array or is empty
        resolve(0); // Or some other default value
      }
    })
  },
  addOrders: async (details, products, total) => {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(details, products, total);
        let status = details['payment-method'] === 'COD' ? 'Order placed' : 'pending';
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

        // Create the order object
        let orderObj = {
          deliveryDetails: {
            name: details.Name,
            mobile: details.Mobile,
            address: details.Address,
            pinncode: details.Pincode,
          },
          userId: new ObjectId(details.userId),
          paymentMethod: details['payment-method'],
          products: products,
          total: total,
          status: status,
          date: date
       
  };

  (async () => {
    // Check all product quantities first
    let isQuantityInsufficient = false;
    let insufficientProduct = null;
  
    for (const product of products) {
      console.log('pp', product);
      console.log(product.quantity);
      console.log(product.product.Quantity);
  
      if (product.product.Quantity < product.quantity) {
        console.log('Product quantity is less than order quantity');
        isQuantityInsufficient = true;
        insufficientProduct = product; // Save the insufficient product details
        break; // Exit the loop as soon as a product fails the check
      }
    }
  
    // If any product has insufficient quantity
    if (isQuantityInsufficient) {
      resolve({
        status: false,
        message: `This ${insufficientProduct.quantity} quantity is not available at this moment`,
        product: insufficientProduct.item
      });
    } else {
      console.log('All products have sufficient quantity');
  
      // Proceed with the order placement
      const response = await db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj);
  
      // Update quantities for all products
      for (let product of products) {
        const proId = product.item; // Assuming product.item holds the product ID
        const orderedQuantity = product.quantity; // Assuming product.quantity holds the quantity ordered
  
        const currentQuantity = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) });
  
        const newQuantity = currentQuantity.Quantity - orderedQuantity;
  
        // Update the product quantity
        await updateProduct(proId, {
          Name: currentQuantity.Name, // Keep the existing product details
          Price: currentQuantity.Price,
          Category: currentQuantity.Category,
          Description: currentQuantity.Description,
          Quantity: newQuantity
        });
      }
  
      // Delete the user's cart after placing the order
      await db.get().collection(collection.CART_COLLECTION).deleteOne({ user: new ObjectId(details.userId) });
  
      resolve({ status: true });
    }
  })();
  


      
} catch (error) {
  reject(error);
}
    });
  },

getCartProductList: (userId) => {
  return new Promise(async (resolve, reject) => {
    let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
    resolve(cart.products)
  })
},
  getOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: new ObjectId(userId) }).toArray()
      console.log(orders);
      resolve(orders)

    })
  },
    getTrackOrders: (userId) => {
      return new Promise(async (resolve, reject) => {
        let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ _id: new ObjectId(userId) }).toArray()
        console.log(orders);
        resolve(orders)

      })
    },
      getOrderedProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
          let orderedProdut = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
              $match: { _id: new ObjectId(userId) }
            },
            {
              $unwind: '$products'
            },
            {
              $project: {
                item: '$products.item',
                quantity: '$products.quantity'
              }
            },
            {
              $lookup: {
                from: collection.PRODUCT_COLLECTION,
                localField: 'item',
                foreignField: '_id',
                as: 'product'
              }
            },
            {
              $project: {
                item: 1,
                quantity: 1,
                product: { $arrayElemAt: ['$product', 0] }
              }
            }


          ]).toArray()



          resolve(orderedProdut)
        })
      },
        addToWishlist: (proId, userId) => {
          let proObj = {
            item: new ObjectId(proId),
          };

          return new Promise(async (resolve, reject) => {
            try {
              let userWishlist = await db.get().collection(collection.WISHLIST_COLLECTION).findOne({ user: new ObjectId(userId) });
              console.log("user wishlist ", userWishlist);

              if (userWishlist) {
                let proExist = userWishlist.products.findIndex(product => product.item.toString() === proId);
                console.log(proExist);

                if (proExist !== -1) {
                  // Remove product from wishlist
                  await db.get().collection(collection.WISHLIST_COLLECTION).updateOne(
                    { user: new ObjectId(userId) },
                    { $pull: { products: { item: new ObjectId(proId) } } }
                  );
                  resolve({ status: 'Product removed from wishlist' });
                } else {
                  // Add product to wishlist
                  await db.get().collection(collection.WISHLIST_COLLECTION).updateOne(
                    { user: new ObjectId(userId) },
                    { $push: { products: proObj } }
                  );
                  resolve({ status: 'Product added to wishlist' });
                }

              } else {
                // Create new wishlist
                let wishlistObj = {
                  user: new ObjectId(userId),
                  products: [proObj],
                };
                console.log(wishlistObj);

                await db.get().collection(collection.WISHLIST_COLLECTION).insertOne(wishlistObj);
                resolve({ status: 'New wishlist created and product added' });
              }
            } catch (error) {
              reject(error);
            }
          });
        },
          getWishlist: (userId) => {
            return new Promise(async (resolve, reject) => {
              try {
                let wishlist = await db.get().collection(collection.WISHLIST_COLLECTION)
                  .findOne({ user: new ObjectId(userId) });

                if (wishlist) {
                  resolve(wishlist);
                } else {
                  resolve({ products: [] }); // If no wishlist found, return empty products array
                }
              } catch (error) {
                reject(error);
              }
            });
          },
            getWishlistProducts: (userId) => {
              return new Promise(async (resolve, reject) => {
                let WishlistItems = await db.get().collection(collection.WISHLIST_COLLECTION).aggregate([
                  {
                    $match: { user: new ObjectId(userId) }
                  },
                  {
                    $unwind: '$products'
                  },
                  {
                    $project: {
                      item: '$products.item',


                    }
                  },
                  {
                    $lookup: {
                      from: collection.PRODUCT_COLLECTION,
                      localField: 'item',
                      foreignField: '_id',
                      as: 'product'
                    }
                  },
                  {
                    $project: {
                      item: 1,

                      product: { $arrayElemAt: ['$product', 0] }
                    }
                  }


                ]).toArray()

                console.log("wish list items are ", WishlistItems);

                resolve(WishlistItems)
              })
            },
  
  




}
