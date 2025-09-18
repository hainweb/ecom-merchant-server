const productHelpers = require("../helpers/product-helpers");
const userDisplayHelpers = require("../helpers/user-helpers");
const cloudinary = require("cloudinary").v2;

exports.addCategory = async (req, res) => {
  try {
    const { Name, LinkTo, image } = req.body;
    if (!Name || !LinkTo || !image) {
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });
    }

    let imageUrl = image;
    if (image.startsWith("data:image")) {
      const result = await cloudinary.uploader.upload(image, {
        folder: "categories",
        allowed_formats: ["jpg", "jpeg", "png"],
      });
      imageUrl = result.secure_url;
    }

    await userDisplayHelpers.addCategories({
      name: Name,
      linkTo: LinkTo,
      image: imageUrl,
    });
    res.json({ success: true, message: "Category added" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error adding category" });
  }
};

exports.getCategories = async (req, res) => {
  const cats = await productHelpers.getCategories();
  res.json(cats);
};

exports.getCategoriesList = async (req, res) => {
  const names = await productHelpers.getCategoriesName();
  res.json(names);
};

exports.deleteCategory = async (req, res) => {
  const resp = await userDisplayHelpers.deleteCategory(req.body.id);
  res.json(resp);
};
