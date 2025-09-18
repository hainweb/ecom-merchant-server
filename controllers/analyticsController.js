const adminHelpers = require("../helpers/admin-helpers");
const orderHelpers = require("../helpers/order-helpers");
const productHelpers = require("../helpers/product-helpers");
let totalInStock = 0,
  totalLowStock = 0,
  totalOutOfStock = 0;

exports.getTotalRevenue = async (req, res) => {
  const adminId = req.session.adminsec._id;
  const data = await adminHelpers.getTotalRevenue(adminId);
  const pendingOrders =
    data.totalOrders - data.canceledOrders - data.deliveredOrders;
  const pendingCash = data.deliveredOrders - data.cashToAdminOrders;
  const conversionRate = parseFloat(
    ((data.deliveredOrders / data.totalUser) * 100).toFixed(2)
  );
  const averageOrderVal = parseFloat(
    (data.deliveredRevenue / data.deliveredOrders).toFixed(2)
  );

  const products = await productHelpers.getAllProducts();

  totalInStock = products.filter((product) => product.Quantity > 10).length;
  totalLowStock = products.filter(
    (product) => product.Quantity <= 10 && product.Quantity > 0
  ).length;
  totalOutOfStock = products.filter((product) => product.Quantity <= 0).length;

  res.json({
    pendingOrders,
    pendingCashToAdmin: pendingCash,
    conversionRate,
    averageOrderValue: averageOrderVal,
    totalInStock,
    totalLowStock,
    totalOutOfStock,
    ...data,
  });
};

exports.getRevenueTrend = (req, res) => {
  adminHelpers
    .getRevenueTrend(req.query, req.session.adminsec._id)
    .then((response) => res.json(response))
    .catch((err) => res.status(500).json({ error: err }));
};

exports.getAdminOrders = async (req, res) => {
  const orders = await orderHelpers.getAdminOrders(req.session.adminsec._id);
  res.json(orders);
};

exports.getProductsByCategory = (req, res) => {
  adminHelpers
    .getCategoriesProducts(req.session.adminsec._id)
    .then((result) => res.json(result))
    .catch((err) => res.status(500).json({ error: err }));
};

exports.getShippingStatus = async (req, res) => {
  try {
    const { start, end } = req.query;
    const data = await adminHelpers.getShippingStatus(
      new Date(start),
      new Date(end),
      req.session.adminsec._id
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching shipping status" });
  }
};
