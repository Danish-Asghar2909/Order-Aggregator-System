// src/models/index.js
const sequelize = require('../db/index');
const Product = require('./Product');
const Order = require('./Order');

module.exports = {
  sequelize,
  Product,
  Order,
};
