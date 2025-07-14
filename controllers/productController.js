

const productHelpers = require("../helpers/product-helpers");
// pull both cloudinary _and_ your helper out of the same module:
const { cloudinary, getPublicIdFromUrl } = require("../utils/cloudinary-helpers");

// List all products
exports.allProducts = async (req, res) => {
  const products = await productHelpers.getAllProducts();
  for (let p of products) {
    p.ordercount = await productHelpers.getOrdersCount(p._id);
    p.Quantity   = Number(p.Quantity);
  }

    totalInStock = products.filter((product) => product.Quantity > 10).length;
    totalLowStock = products.filter(
      (product) => product.Quantity <= 10 && product.Quantity > 0
    ).length;
    totalOutOfStock = products.filter(
      (product) => product.Quantity <= 0
    ).length;
    
  res.json({ products });
};

// List admin’s own products
exports.adminProducts = async (req, res) => {
  const adminId  = req.session.adminsec._id;
  const products = await productHelpers.getAdminProducts(adminId);
  for (let p of products) {
    p.ordercount = await productHelpers.getOrdersCount(p._id);
    p.Quantity   = Number(p.Quantity);
  }
  res.json({ products });
};

// Add new product
exports.addProduct = async (req, res) => {

    console.log('api call gotedt to add product');
    

 try {
    const {
      Name,
      Price,
      SellingPrice,
      Category,
      Description,
      Quantity,
      Return,
      Specifications,
      Highlights,
      CustomOptions,
    } = req.body;

    // Upload thumbnail
    let thumbnailImage = null;
    if (req.files && req.files.thumbnail) {
      const thumbnailFile = req.files.thumbnail;
      const thumbnailResult = await cloudinary.uploader.upload(
        thumbnailFile.tempFilePath,
        {
          folder: "products/thumbnails",
        }
      );
      thumbnailImage = thumbnailResult.secure_url;
      console.log("thumbnail added ");
    }

    // Upload images
    const imageUrls = [];
    if (req.files && req.files.images) {
      const images = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      for (const image of images) {
        const imageResult = await cloudinary.uploader.upload(
          image.tempFilePath,
          {
            folder: "products/images",
          }
        );
        imageUrls.push(imageResult.secure_url);
      }
      console.log("images added ");
    }
    console.log("admin session", req.session.adminsec);

    // Prepare product details
    const newProduct = {
      adminId: req.session.adminsec._id,
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

    console.log("New Product:", newProduct);

    productHelpers.addProduct(newProduct, (ObjectId) => {
      res.json({ status: true, message: "Product added successfully!" });
    });
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ message: "Failed to add product.", error: err });
  }

};

// Get one product
exports.getProduct = async (req, res) => {
  const product = await productHelpers.getProductById(req.params.id);
  res.json(product);
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
         const response = await productHelpers.deleteProduct(req.params.id);
  res.json(response);
    } catch (error) {
        console.error('deleting product error',error);
        
    }
 
};

// GET product for edit
exports.editProductGet = async (req, res) => {
  const product = await productHelpers.getProductsDetails(req.params.id);
  res.json({ product });
};

// POST edited product
exports.editProductPost = async (req, res) => {
  try {
    // 1. Fetch existing product
    const existing = await productHelpers.getProductById(req.params.id);

    // 2. Handle thumbnail replace
    let thumbnailImage = existing.thumbnailImage;
    if (req.files?.thumbnail) {
      if (thumbnailImage) {
        const publicId = getPublicIdFromUrl(thumbnailImage);
        await cloudinary.uploader.destroy(publicId);
      }
      const thumbUp = await cloudinary.uploader.upload(
        req.files.thumbnail.tempFilePath,
        { folder: "products/thumbnails" }
      );
      thumbnailImage = thumbUp.secure_url;
    }

    // 3. Handle images replace
    let imageUrls = existing.images || [];
    if (req.files?.images) {
      // delete old ones
      for (const url of imageUrls) {
        const publicId = getPublicIdFromUrl(url);
        await cloudinary.uploader.destroy(publicId);
      }
      // upload new
      imageUrls = [];
      const imgs = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];
      for (let img of imgs) {
        const up = await cloudinary.uploader.upload(
          img.tempFilePath,
          { folder: "products/images" }
        );
        imageUrls.push(up.secure_url);
      }
    }

    // 4. Build updated object
    const {
      Name, Price, SellingPrice, Category, Description,
      Quantity, Return, Specifications, Highlights, CustomOptions
    } = req.body;

    const updatedProd = {
      adminId: req.session.adminsec._id,
      Name, Price, SellingPrice, Category, Description, Quantity, Return,
      Specifications: Specifications ? JSON.parse(Specifications) : [],
      Highlights:    Highlights    ? JSON.parse(Highlights)    : [],
      CustomOptions: CustomOptions ? JSON.parse(CustomOptions) : [],
      thumbnailImage,
      images: imageUrls,
    };

    // 5. Save
    await productHelpers.updateProduct(req.params.id, updatedProd);
    res.json({ status: true, message: "Product updated!" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Update failed", error: err });
  }
};
