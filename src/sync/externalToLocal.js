const amqp = require('amqplib');
// const { Product } = require('../models/Product');
const { Product } = require('../models');
const { normalizeProduct } = require('../utils/normalizer');

async function consumeFromExternal() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue('sync_from_external', { durable: true });

  ch.consume('sync_from_external', async (msg) => {
    if (!msg) return;
    const data = JSON.parse(msg.content.toString());
    const normalized = normalizeProduct(data);
    // console.log('Normalized Product:', normalized);
    // Check if the product already exists
    const existingProduct = await Product.findOne({
      where: {  external_id : normalized.external_id , vendor: normalized.vendor },
    });
    // console.log('Existing Product:', existingProduct);
    if( !existingProduct ) {
      // If it doesn't exist, create it
      await Product.create(normalized);
      console.log('Created new product:', normalized);
    }
    // If it exists, update it
    await Product.update(normalized, {
      where: { external_id : normalized.external_id , vendor: normalized.vendor },
    });
    ch.ack(msg);
  });
}

module.exports = { consumeFromExternal };