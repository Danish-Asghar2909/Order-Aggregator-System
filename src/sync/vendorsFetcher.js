const axios = require('axios');
const amqp = require('amqplib');
require('dotenv').config()

const vendorSources = {
  vendorA: process.env.vendorA,
  vendorB: process.env.vendorB,
};

async function syncVendors() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertQueue('sync_from_external', { durable: true });

  for (const [vendor, url] of Object.entries(vendorSources)) {
    try {
      const res = await axios.get(url);
      // console.log(`Fetched data from ${vendor}:`, res.data);
      if (!res.data) {
        console.error(`No data received from ${vendor}`);
        continue;
      }
      // let products = Array.isArray(res.data.products) ? res.data.products : res.data ? [res.data] : [res.data];
      let products = Array.isArray(res.data.products) ? res.data.products : res.data;
      

      for (const product of products) {
        const enriched = { ...product, vendor };
        ch.sendToQueue('sync_from_external', Buffer.from(JSON.stringify(enriched)), { persistent: true });
      }
    } catch (err) {
      console.error(`Failed to fetch from ${vendor}:`, err);
    }
  }
}

module.exports = { syncVendors };