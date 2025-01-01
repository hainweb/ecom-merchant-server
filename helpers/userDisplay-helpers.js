var db = require('../config/connection');
var collection = require('../config/collection');
const { ObjectId } = require('mongodb'); // To generate unique IDs
const { reject } = require('bcrypt/promises');

const cloudinary = require('cloudinary').v2;

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRECT,
});


module.exports = {
    addCategories: async (datas) => {
        console.log('server side data', datas);

        try {
            // Generate a unique ID for the category
            const categoryId = new ObjectId();
            const newCategory = { id: categoryId, ...datas };

            // Ensure `categories` is an array or initialize it
            const existingDocument = await db.get().collection(collection.DISPLAY_COLLECTION).findOne({});
            if (!existingDocument) {
                // If no document exists, create one with an empty `categories` array
                await db.get().collection(collection.DISPLAY_COLLECTION).insertOne({ categories: [newCategory] });
                console.log('Category added successfully (new document created):', newCategory);
            } else {
                // If `categories` exists and is not an array, fix the structure
                if (!Array.isArray(existingDocument.categories)) {
                    await db.get().collection(collection.DISPLAY_COLLECTION).updateOne(
                        {},
                        { $set: { categories: [] } }
                    );
                }

                // Add the new category to the `categories` array
                await db.get().collection(collection.DISPLAY_COLLECTION).updateOne(
                    {},
                    { $push: { categories: newCategory } }
                );
                console.log('Category added successfully:', newCategory);
                return { status: true, categories: newCategory };
            }
        } catch (error) {
            console.error('Error adding category:', error);
        }
    },



    deleteCategory: (catId) => {
        console.log('Category ID to delete:', catId);

        return new Promise((resolve, reject) => {
            db.get()
                .collection(collection.DISPLAY_COLLECTION)
                .findOne({ "categories.id": new ObjectId(catId) })
                .then((doc) => {
                    if (!doc) {
                        return resolve({
                            status: 'failed',
                            message: 'Category not found',
                        });
                    }

                    // Find the category to delete
                    const categoryToDelete = doc.categories.find(cat => cat.id.equals(new ObjectId(catId)));
                    if (!categoryToDelete) {
                        return resolve({
                            status: 'failed',
                            message: 'Category not found in the document',
                        });
                    }

                    // Extract the public_id from the image URL
                    const imageUrl = categoryToDelete.image;
                    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];

                    // Delete the image from Cloudinary
                    cloudinary.uploader.destroy(publicId, (error, result) => {
                        if (error) {
                            console.error('Error deleting image from Cloudinary:', error);
                            return reject({
                                status: 'error',
                                message: 'Error deleting image from Cloudinary',
                            });
                        }

                        console.log('Image deleted from Cloudinary:', result);

                        // Proceed to delete the category from the database
                        db.get()
                            .collection(collection.DISPLAY_COLLECTION)
                            .updateOne(
                                {},
                                { $pull: { categories: { id: new ObjectId(catId) } } }
                            )
                            .then((result) => {
                                if (result.modifiedCount > 0) {
                                    console.log('Category deletion successful');

                                    db.get().collection(collection.DISPLAY_COLLECTION)
                                        .findOne({})
                                        .then((doc) => {
                                            const categories = doc ? doc.categories : [];
                                            resolve({
                                                status: true,
                                                message: 'Category deleted successfully',
                                                categories,
                                            });
                                        })
                                        .catch((err) => {
                                            console.error('Error fetching categories:', err.message);
                                            reject({
                                                status: 'error',
                                                message: 'Error fetching categories after deletion',
                                            });
                                        });
                                } else {
                                    resolve({
                                        status: 'failed',
                                        message: 'Category not found or document missing',
                                    });
                                }
                            })
                            .catch((err) => {
                                console.error('Error during category deletion:', err.message);
                                reject({
                                    status: 'error',
                                    message: err.message,
                                });
                            });
                    });
                })
                .catch((err) => {
                    console.error('Error finding category:', err.message);
                    reject({
                        status: 'error',
                        message: 'Error finding category',
                    });
                });
        });
    },

    addSlider: (slider) => {
        return new Promise((resolve, reject) => {
            console.log("Adding slider data:", slider); // Log the input data

            const sliderId = new ObjectId()
            const sliderData = { id: sliderId, ...slider };
            console.log('new slider with id', sliderData);


            // Check if sliderData is an object and contains the expected fields
            if (!sliderData.linkTo || !sliderData.image) {
                console.error("Invalid slider data:", sliderData); // Log invalid data
                return reject(new Error("Invalid slider data. Both 'linkTo' and 'image' are required."));
            }

            console.log("Starting update operation..."); // Log before DB operation
            db.get().collection(collection.DISPLAY_COLLECTION).updateOne(
                {}, // You can specify the filter here if you want to target a specific document
                {
                    $push: { slider: sliderData } // Push the slider data into the 'slider' array
                },
                { upsert: true } // If the document doesn't exist, create it

            ).then(async () => {
                const slider = await db.get().collection(collection.DISPLAY_COLLECTION)
                    .find({}, { projection: { slider: 1 } })
                    .toArray();

                // Extract the 'slider' array from the first result (assuming only one document)
                if (slider.length > 0) {
                    const slides = slider[0].slider;
                    console.log('slider array', slides);
                    resolve({ status: true, slides });
                } else {
                    resolve([]); // In case no slides are found
                }


            })
        });
    },

    getSlider: () => {
        return new Promise(async (resolve, reject) => {
            try {
                const slides = await db.get().collection(collection.DISPLAY_COLLECTION)
                    .find({}, { projection: { slider: 1 } })
                    .toArray();

                // Extract the 'slider' array from the first result (assuming only one document)
                if (slides.length > 0) {
                    const sliderArray = slides[0].slider;
                    console.log('slider array', sliderArray);
                    resolve(sliderArray);
                } else {
                    resolve([]); // In case no slides are found
                }
            } catch (error) {
                reject(error); // Handle any errors during the query
            }
        });
    },

    deleteSlider: (sliderId) => {
        console.log('server call', sliderId);
        return new Promise((resolve, reject) => {
            db.get()
                .collection(collection.DISPLAY_COLLECTION)
                .findOne({ "slider.id": new ObjectId(sliderId) })
                .then((doc) => {
                    if (!doc || !doc.slider) {
                        return resolve({
                            status: 'failed',
                            message: 'Slider not found',
                        });
                    }
    
                    // Find the slider to delete
                    const sliderToDelete = doc.slider.find(slide => 
                        slide.id && slide.id.equals(new ObjectId(sliderId))
                    );
    
                    if (!sliderToDelete) {
                        return resolve({
                            status: 'failed',
                            message: 'Slider not found in the document',
                        });
                    }
    
                    // Extract the public_id from the image URL
                    const imageUrl = sliderToDelete.image;
                    const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
    
                    // Delete the image from Cloudinary
                    cloudinary.uploader.destroy(publicId, (error, result) => {
                        if (error) {
                            console.error('Error deleting image from Cloudinary:', error);
                            return reject({
                                status: 'error',
                                message: 'Error deleting image from Cloudinary',
                            });
                        }
    
                        console.log('Image deleted from Cloudinary:', result);
    
                        // Proceed to delete the slider from the database
                        db.get()
                            .collection(collection.DISPLAY_COLLECTION)
                            .updateOne(
                                { "slider.id": new ObjectId(sliderId) },
                                { $pull: { slider: { id: new ObjectId(sliderId) } } }
                            )
                            .then((result) => {
                                if (result.modifiedCount > 0) {
                                    console.log('Slider deletion successful');
                                    resolve({
                                        status: true,
                                        message: 'Slider deleted successfully',
                                    });

                                    
                                } else {
                                    resolve({
                                        status: 'failed',
                                        message: 'Slider not found or document missing',
                                    });
                                }
                            })
                            .catch((err) => {
                                console.error('Error during slider deletion:', err.message);
                                reject({
                                    status: 'error',
                                    message: err.message,
                                });
                            });
                    });
                })
                .catch((err) => {
                    console.error('Error finding slider:', err.message);
                    reject({
                        status: 'error',
                        message: 'Error finding slider',
                    });
                });
        });
    },
    




};
