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
    await Product.upsert(normalized);
    ch.ack(msg);
  });
}

module.exports = { consumeFromExternal };