// const { DataTypes } = require('sequelize');
// const sequelize = require('../db/index');

// const Product = sequelize.define('Product', {
//     external_id: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     vendor: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     name: DataTypes.STRING,
//     price: DataTypes.FLOAT,
//     stock: DataTypes.INTEGER,
//     metadata: {
//       type: DataTypes.JSONB,
//       allowNull: true,
//     },
//   });

// module.exports = Product; 

// src/models/Product.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db/index'); // Make sure this is your Sequelize instance

const Product = sequelize.define('Product', {
  external_id: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue : "not-present",
  },
  vendor: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  name: DataTypes.STRING,
  price: DataTypes.FLOAT,
  stock: DataTypes.INTEGER,
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
});

module.exports = Product;
