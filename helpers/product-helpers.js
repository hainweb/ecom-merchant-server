var db = require('../config/connection')
var collection = require('../config/collection')
const cloudinary = require('cloudinary').v2;
const { ObjectId } = require('mongodb')
const { get, response } = require('../app');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRECT,
});

function extractPublicId(url) {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1]; // e.g., "image-name.webp"
    const publicId = fileName.split('.')[0]; // Remove the extension
    return parts.slice(-3, -1).join('/') + '/' + publicId; // Recreate the full public ID
}

module.exports = {

    addProduct: (product, callback) => {

        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {

            console.log('Added product data', data);

            callback(data.insertedId)

        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(products)
        })
    },
    deleteProduct: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) }).then((product) => {
                if (!product) {
                    reject(new Error('Product not found'));
                    return;
                }

                // Delete images from Cloudinary
                const deletePromises = [];

                // Delete the thumbnail image
                if (product.thumbnailImage) {
                    const thumbnailPublicId = extractPublicId(product.thumbnailImage);
                    deletePromises.push(cloudinary.uploader.destroy(thumbnailPublicId));
                    console.log('thumbnail image deleted ');

                }

                // Delete additional images
                if (product.images && Array.isArray(product.images)) {
                    product.images.forEach((imageUrl) => {
                        const imagePublicId = extractPublicId(imageUrl);
                        deletePromises.push(cloudinary.uploader.destroy(imagePublicId));
                        console.log(' images deleted ');
                    });
                }

                // Wait for all images to be deleted
                Promise.all(deletePromises)
                    .then(() => {
                        // Delete the product from the database
                        return db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(proId) });
                    })
                    .then((response) => {
                        console.log('Product and images deleted successfully:', response);
                        resolve({ status: true });
                    })
                    .catch((err) => {
                        console.error('Error deleting images:', err);
                        reject(err);
                    });
            }).catch((err) => {
                console.error('Error finding product:', err);
                reject(err);
            });
        });
    },
    getProductsDetails: (proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) }).then((product) => {
                resolve(product)
            })
        })
    },

    getProductById: (proId) => {
        return new Promise(async(resolve, reject) => {
         let products=await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: new ObjectId(proId) })

         console.log('server up products',products);

         resolve(products)
         
        })
    },

   

    updateProduct: (proId, proDetails) => {
        return new Promise(async (resolve, reject) => {
            try {
                const updateData = {
                    Name: proDetails.Name,
                    Price: proDetails.Price,
                    SellingPrice:proDetails.SellingPrice,
                    Category: proDetails.Category,
                    Description: proDetails.Description,
                    Quantity: proDetails.Quantity,
                    Return: proDetails.Return,
                    Specifications: proDetails.Specifications,
                    Highlights: proDetails.Highlights,
                    CustomOptions:proDetails.CustomOptions
                };

                // Only update image fields if new images were uploaded
                if (proDetails.thumbnailImage) {
                    updateData.thumbnailImage = proDetails.thumbnailImage;
                }
                if (proDetails.images && proDetails.images.length > 0) {
                    updateData.images = proDetails.images;
                }

                const result = await db.get().collection(collection.PRODUCT_COLLECTION)
                    .updateOne(
                        { _id: new ObjectId(proId) },
                        { $set: updateData }
                    );

                resolve({ status: true });
            } catch (error) {
                reject(error);
            }
        });
    },



    getOrdersCount: (proId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let result = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    { $match: { 'products.item': new ObjectId(proId) } }, // Match the specific product
                    { $unwind: '$products' }, // Deconstruct the products array
                    { $match: { 'products.item': new ObjectId(proId) } }, // Match again after unwind
                    { $group: { _id: null, totalQuantity: { $sum: '$products.quantity' } } } // Sum the quantity
                ]).toArray();

                let totalQuantity = result.length > 0 ? result[0].totalQuantity : 0;
                resolve(totalQuantity);
            } catch (error) {
                reject(error);
            }
        });
    },

    getCategoriesName: async () => {
        try {
            const categories = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $group: {
                        _id: null, // We don't need to group by anything specific, just want the unique categories
                        categories: { $addToSet: "$Category" } // Adds unique categories to the 'categories' array
                    }
                },
                {
                    $project: {
                        _id: 0, // Exclude the _id field
                        categories: 1 // Include the categories field
                    }
                }
            ]).toArray();

            console.log('cate ', categories);


            return categories[0] ? categories[0].categories : []; // Return the list of categories
        } catch (error) {
            console.error('Error fetching categories:', error);
            return [];
        }
    },

    getCategories: () => {
        return new Promise((resolve, reject) => {
            console.log('API call to server to get categories');

            db.get().collection(collection.DISPLAY_COLLECTION)
                .findOne({})
                .then(result => {
                    if (result && result.categories) {
                        console.log('success', result.categories);

                        resolve(result.categories); // Resolve with the categories array
                    } else {
                        console.log('no cat');

                        reject('No categories found');
                    }
                })
                .catch(err => {
                    console.error('Error fetching categories:', err);
                    reject(err); // Reject with the error
                });
        });
    },











}