const { DataTypes } = require('sequelize');
const sequelize = require('../db/index');

const Order = sequelize.define('Order', {
  product_id: { 
    type: DataTypes.INTEGER 
  },
  quantity: { 
    type: DataTypes.INTEGER 
  },
  status: { 
    type: DataTypes.STRING, 
    defaultValue: 'pending' 
  }
});

module.exports = Order; 