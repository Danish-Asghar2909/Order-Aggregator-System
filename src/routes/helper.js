const { Product , Order} = require("../models");
const axios = require('axios');
require('dotenv').config()

const updateVendor = async (payload, baseUrl) => {
    try {
      const { id, ...payloadWithoutId } = payload; // Exclude `id`
      let data = JSON.stringify({...payloadWithoutId});      
      const endpoint = `${baseUrl}/${id}`;

      let config = {
        method: 'put',
        maxBodyLength: Infinity,
        url: endpoint,
        headers: { 
          'Content-Type': 'application/json'
        },
        data : data
      };
  
      const response = await axios.request(config)
      console.log("Response from Vendor API:", response);
      return response;
    } catch (err) {
      console.error("Error in Updating Vendor API:", err);
      throw new Error('Not able to update Vendor');
    }
  };
  
  

const handleOrderAndUpdateDB = async (order) => {
    const { id : product_id , ...data } = order;
    const product = await Product.findOne({ where: { id : product_id } });
    if (!product) {
      throw new Error('Product not found');
    }
    if (product.stock < data.quantity) {
      throw new Error('Insufficient stock');
    }
    const payloadToExternalVendor = {
        id : product_id,
        stock : product.stock - data.quantity
    }
    if(product.vendor === 'vendorA'){
        await updateVendor( payloadToExternalVendor , process.env.vendorA)
    }else if( product.vendor === 'vendorB' ){
        await updateVendor( payloadToExternalVendor , process.env.vendorA)
    }
    await Product.update({ stock: product.stock - data.quantity }, { where: { id : product_id } });
    const orderData = {
      ...data,
      product_id,
      status: 'pending',
    };
    await Order.upsert(orderData);    
}

module.exports = {
    handleOrderAndUpdateDB
}
