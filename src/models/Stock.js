const { DataTypes } = require('sequelize');
const sequelize = require('../db/index');


const Stock = sequelize.define('Stock', {
  product_id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true 
  },
  vendor: { 
    type: DataTypes.STRING 
  },
  quantity: { 
    type: DataTypes.INTEGER 
  }
});

module.exports = Stock; 