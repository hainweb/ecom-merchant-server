var express = require('express');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers');
const { ObjectId } = require('mongodb');
const { response } = require('../app');
var adminHelpers = require('../helpers/admin-helpers');
const userHelpers = require('../helpers/user-helpers');
const userDisplayHelpers = require('../helpers/userDisplay-helpers')

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const deliveryHelpers = require('../helpers/delivery-helpers');



// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRECT,
});

// Configure multer storage to upload images to Cloudinary for categories and products
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'categories',  // Cloudinary folder name
    allowed_formats: ['jpg', 'jpeg', 'png'],
  },
});


function getPublicIdFromUrl(url) {
  // Extract the public ID from the Cloudinary URL
  // URL format: https://res.cloudinary.com/your-cloud-name/image/upload/v1234567890/folder/public-id.jpg
  const urlParts = url.split('/');
  const fileName = urlParts[urlParts.length - 1];
  const folderPath = urlParts[urlParts.length - 2];
  return `${folderPath}/${fileName.split('.')[0]}`;
}


const verifyLogin = (req, res, next) => {
  if (req.session.adminsec) {
    next()
  } else {
    res.json({ status: false, message: 'No user' })
  }
}
/* GET users listing. */

let totalInStock = 0;
let totalLowStock = 0;
let totalOutOfStock = 0;

router.get('/all-products', async function (req, res, next) {
  const products = await productHelpers.getAllProducts();

  for (let product of products) {
    product.ordercount = await productHelpers.getOrdersCount(product._id);
  }

  console.log(req.session.adminsec);

  // Send the response immediately
  res.json({ products });

  // Run the stock calculations asynchronously to avoid delaying the response
  setImmediate(() => {
    products.forEach(product => product.Quantity = Number(product.Quantity));

    totalInStock = products.filter(product => product.Quantity > 10).length;
    totalLowStock = products.filter(product => product.Quantity <=10 && product.Quantity > 0).length;
    totalOutOfStock = products.filter(product => product.Quantity <= 0).length;

    //   console.log("Stock Counts Updated:", { totalInStock, totalLowStock, totalOutOfStock });
  });
});

router.get('/login', (req, res) => {
  if (req.session.adminloggedIn) {
    res.redirect('/admin')
  } else {
    res.render('admin/login', { admin: true, "info": req.session.adminloginErr })
    req.session.admininfo = false
  }

})
router.post('/login', (req, res) => {
  adminHelpers.doadminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.adminloggedIn = true
      req.session.adminsec = response.admin
      console.log('admin lofing', req.session.adminsec, req.session.adminloggedIn);

      res.json(response)
    } else {
      req.session.adminloginErr = "Invalid username or password"
      res.json(response)
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.adminsec = null
  req.session.adminloggedIn = false
  res.json({ status: true })
})


router.get('/get-admin', (req, res) => {
  console.log('sess', req.session.adminsec);

  if (req.session.adminsec) {
    let admin = req.session.adminsec
    console.log('adminse', admin);
    res.json({ status: true, admin })

  } else {
    res.json({ status: false })
  }
})

router.get('/add-products', verifyLogin, (req, res) => {
  res.render('admin/add-products', { admin: true, adminsec: req.session.adminsec })
})


router.post('/add-product', async (req, res) => {
  console.log('api call to add products to image ', req.body, req.files);

  try {
    const { Name, Price, SellingPrice, Category, Description, Quantity, Return, Specifications, Highlights, CustomOptions } = req.body;

    // Upload thumbnail
    let thumbnailImage = null;
    if (req.files && req.files.thumbnail) {
      const thumbnailFile = req.files.thumbnail;
      const thumbnailResult = await cloudinary.uploader.upload(thumbnailFile.tempFilePath, {
        folder: 'products/thumbnails',
      });
      thumbnailImage = thumbnailResult.secure_url;
      console.log('thumbnail added ');

    }

    // Upload images
    const imageUrls = [];
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      for (const image of images) {
        const imageResult = await cloudinary.uploader.upload(image.tempFilePath, {
          folder: 'products/images',
        });
        imageUrls.push(imageResult.secure_url);
      }
      console.log('images added ');

    }

    // Prepare product details
    const newProduct = {
      Name,
      Price,
      SellingPrice,
      Category,
      Description,
      Quantity,
      Return,
      Specifications: Specifications ? JSON.parse(Specifications) : [],
      Highlights: Highlights ? JSON.parse(Highlights) : [],
      CustomOptions: CustomOptions ? JSON.parse(CustomOptions) : [],
      thumbnailImage,
      images: imageUrls,
    };

    console.log('New Product:', newProduct);

    // Save `newProduct` to your database
    // Replace this with your database logic
    productHelpers.addProduct(newProduct, (ObjectId) => {
      res.json({ status: true, message: 'Product added successfully!' })

    })


  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ message: 'Failed to add product.', error: err });
  }
});


router.get('/get-product/:id', async (req, res) => {
  let proId = req.params.id
  console.log('id rp', proId);

  let product = await productHelpers.getProductById(proId)

  res.json(product)

})






router.get('/get-categoriesList', async (req, res) => {
  console.log('api call to get cat');
  let categories = await productHelpers.getCategoriesName()
  console.log('categ', categories);
  res.json(categories)

})


router.post('/delete-slider/:id', (req, res) => {
  let sliderId = req.params.id
  console.log('slider id', sliderId);
  userDisplayHelpers.deleteSlider(sliderId).then((response) => {
    res.json(response)
  })
})

router.post('/add-slider', (req, res) => {
  console.log('API call to add slider', req.body, req.files);

  // Assuming req.files.sliderImage contains the image to be uploaded
  const imageFile = req.files.image;

  // Upload image to Cloudinary
  cloudinary.uploader.upload(imageFile.tempFilePath, {
    folder: 'slider' // Optional: specify a folder in Cloudinary
  })
    .then((result) => {
      console.log('Image uploaded to Cloudinary', result);

      // Add the Cloudinary image URL and other data to your database
      const sliderData = {
        ...req.body,
        image: result.secure_url // Cloudinary image URL
      };

      console.log('slider', sliderData);


      // Call your helper to add the slider data to the database
      userDisplayHelpers.addSlider(sliderData).then((response) => {
        console.log('res', response);

        res.json(response)
      })
        .catch((err) => {
          console.error('Error adding slider:', err);
          res.status(500).json({ message: 'Error adding slider', error: err });
        });
    })
    .catch((error) => {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Error uploading image', error });
    });
});


router.get('/get-sliders', (req, res) => {
  userDisplayHelpers.getSlider().then((response) => {
    res.json(response)
  })
})


/* Add Category */
router.post('/add-category', async (req, res) => {
  console.log('api call to add category');

  try {
    const { Name, LinkTo, image } = req.body;

    if (!Name || !LinkTo || !image) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let imageUrl = null;
    if (image.startsWith('data:image')) {
      const result = await cloudinary.uploader.upload(image, {
        folder: 'categories',
        allowed_formats: ['jpg', 'jpeg', 'png'],
      });
      imageUrl = result.secure_url;
    }

    const categoryData = { name: Name, linkTo: LinkTo, image: imageUrl };
    console.log('image added ', categoryData);

    userDisplayHelpers.addCategories(categoryData).then((response => {
      res.json(response);
    }))

  } catch (error) {
    console.error("Error adding category:", error);
    res.status(500).json({ success: false, message: 'Error adding category', error });
  }
});

router.get('/get-categories', (req, res) => {
  console.log('api call to get ctae ');

  productHelpers.getCategories().then((response) => {
    res.json(response)
  })
})

router.post('/delete-category', (req, res) => {
  userDisplayHelpers.deleteCategory(req.body.id).then((response) => {
    res.json(response)
  })
})


router.post('/delete-item/:id', (req, res) => {
  let proId = req.params.id
  console.log(proId);
  productHelpers.deleteProduct(proId).then((response) => {
    res.json(response)
  })

})
router.get('/edit-product/:id', async (req, res) => {
  console.log('api call to edit product get');
  var product = await productHelpers.getProductsDetails(req.params.id)
  console.log(product);


  res.json({ product })

})





router.post('/edit-product/:id', async (req, res) => {
  console.log('api call to edit products', req.body);

  try {
    const { id } = req.params;
    const { Name, Price, SellingPrice, Category, Description, Quantity, Return, Specifications, Highlights, CustomOptions } = req.body;

    // Get existing product to check current images
    const existingProduct = await productHelpers.getProductById(id);
    console.log('ext pro', existingProduct);


    // Handle thumbnail upload
    let thumbnailImage = existingProduct.thumbnailImage;
    if (req.files && req.files.thumbnail) {
      // Delete existing thumbnail if it exists
      if (existingProduct.thumbnailImage) {
        const publicId = getPublicIdFromUrl(existingProduct.thumbnailImage);
        await cloudinary.uploader.destroy(publicId);
        console.log('thumbnail delected from coudinary');

      }

      const thumbnailFile = req.files.thumbnail;
      const thumbnailResult = await cloudinary.uploader.upload(thumbnailFile.tempFilePath, {
        folder: 'products/thumbnails',
      });
      thumbnailImage = thumbnailResult.secure_url;
      console.log('thumbnail updated ', thumbnailImage);
    }

    // Handle multiple images upload
    let imageUrls = existingProduct.images || [];
    if (req.files && req.files.images) {
      // Delete existing images
      if (existingProduct.images && existingProduct.images.length > 0) {
        for (const imageUrl of existingProduct.images) {
          const publicId = getPublicIdFromUrl(imageUrl);
          await cloudinary.uploader.destroy(publicId);
          console.log('image delected from coudinary');
        }
      }

      // Upload new images
      imageUrls = [];
      const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      for (const image of images) {
        const imageResult = await cloudinary.uploader.upload(image.tempFilePath, {
          folder: 'products/images',
        });
        imageUrls.push(imageResult.secure_url);
        console.log('image up', imageUrls);
      }
    }

    const updatedProduct = {
      Name,
      Price,
      SellingPrice,
      Category,
      Description,
      Quantity,
      Return,
      Specifications: Specifications ? JSON.parse(Specifications) : [],
      Highlights: Highlights ? JSON.parse(Highlights) : [],
      CustomOptions: CustomOptions ? JSON.parse(CustomOptions) : [],
      thumbnailImage,
      images: imageUrls
    };
    console.log('up', updatedProduct);

    await productHelpers.updateProduct(id, updatedProduct);
    res.json({ status: true, message: 'Product updated successfully!' });

  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ status: false, message: 'Failed to update product' });
  }

});


router.get('/all-users', async (req, res) => {
  let allUsers = await adminHelpers.getAllUsers()
  console.log("all users are ", allUsers);
  res.json(allUsers)


})
router.get('/order-list/:id', async (req, res) => {
  req.params.id
  console.log("id is ", req.params.id);
  let orders = await userHelpers.getOrders(req.params.id)
  console.log("ordered products are ", orders);
  res.json(orders)
})
router.get('/ordered-products/:id', async (req, res) => {
  req.params.id
  console.log("id is ", req.params.id);
  let products = await userHelpers.getOrderedProducts(req.params.id)
  console.log("products are ", products);
  res.json(products)
})
module.exports = router;


/* Anyanltics of admin panel*/

router.get('/get-total-revenue', async (req, res) => {
  console.log('APi call to get revenue ');

  adminHelpers.getTotalRevenue().then((response) => {
    console.log('geted totall result ', response);

    let pendingOrders = (response.totalOrders - response.canceledOrders - response.deliveredOrders)
    console.log('Pending orders', pendingOrders);

    let pendingCashToAdmin = (response.deliveredOrders - response.cashToAdminOrders)
    console.log('Pending cash', pendingCashToAdmin);


    let conversionRate = parseFloat(((response.totalOrderedProducts / response.totalUser) * 100).toFixed(2));
    console.log('conversion rate', conversionRate);
    
    let averageOrderValue = parseFloat((response.deliveredRevenue / response.deliveredOrders).toFixed(2));
    console.log('Average order value', averageOrderValue);
    

    console.log("Total In Stock:", totalInStock);
    console.log("Total Low Stock:", totalLowStock);
    console.log("Total Out of Stock:", totalOutOfStock);

    res.json({ pendingOrders, pendingCashToAdmin, ...response, conversionRate, averageOrderValue, totalInStock, totalLowStock, totalOutOfStock })

  })
})


router.get('/get-revenue-trend', (req, res) => {
  console.log('api call to revenue trend', req.query);
  adminHelpers.getRevenueTrend(req.query).then((response) => {
    console.log('geted tevenue trend', response);
    res.json(response)
  })

})


router.get('/get-user-activity', (req, res) => {
  console.log('api call to user actiovity', req.query);

  adminHelpers.getUserActivity(req.query).then((response) => {
    console.log('user activeity', response);

    res.json(response)
  })

})


router.get('/get-total-orders', async (req, res) => {
  console.log('api call to total orders');
  let orders = await deliveryHelpers.getOrders()
  res.json(orders)


})

router.get('/get-products-category', (req, res) => {
  console.log('API call to category products');

  adminHelpers.getCategoriesProducts()
    .then((result) => {
      console.log('Products total by category:', result);
      // Send the result as JSON back to the client
      res.json(result);
    })
    .catch((error) => {
      console.error('Error in getCategoriesProducts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    });
});
