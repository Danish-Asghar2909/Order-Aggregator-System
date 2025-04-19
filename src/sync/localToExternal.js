const amqp = require('amqplib');
const axios = require('axios');
const Bottleneck = require('bottleneck');
const { isDuplicate } = require('../utils/deduplication');
require('dotenv').config();

const vendorEndpoints = {
  vendorA: process.env.vendorA,
  vendorB: process.env.vendorB,
};

const limiters = {
  vendorA: new Bottleneck({ minTime: 1000 }),
  vendorB: new Bottleneck({ minTime: 1000 }),
};

async function consumeFromLocal() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const ch = await conn.createChannel();

  // Set up DLX (Dead Letter Exchange)
  const dlxExchange = 'dlx_exchange';
  await ch.assertExchange(dlxExchange, 'direct', { durable: true });

  // Declare DLQ and bind it to the DLX
  await ch.assertQueue('sync_to_external_dlq', { durable: true });
  await ch.bindQueue('sync_to_external_dlq', dlxExchange, 'sync_to_external_dlq');

  // Declare main queue with DLX settings
  await ch.assertQueue('sync_to_external', {
    durable: true,
    deadLetterExchange: dlxExchange,
    deadLetterRoutingKey: 'sync_to_external_dlq',
  });

  // Start consuming messages
  ch.consume('sync_to_external', async (msg) => {
    if (!msg) return;

    const { vendor, ...data } = JSON.parse(msg.content.toString());
    console.log('📥 Received message:', data);

    if (await isDuplicate(data.id, vendor)) {
      console.log('⚠️ Duplicate, skipping');
      ch.ack(msg);
      return;
    }

    const endpoint = vendorEndpoints[vendor];
    const limiter = limiters[vendor];

    if (!endpoint || !limiter) {
      console.error(`Unsupported vendor: ${vendor}`);
      ch.nack(msg, false, false);
      return;
    }

    try {
      await limiter.schedule(() =>
        axios.put(`${endpoint}/${data.external_id}`, { ...data, vendor })
      );
      console.log('Synced to external API');
      ch.ack(msg);
    } catch (err) {
      console.error('External API failed:', err.message);

      const maxRetries = 3;
      const headers = msg.properties.headers || {};
      const attempts = headers['x-retry'] || 0;

      if (attempts < maxRetries) {
        console.log(`Retrying... (Attempt ${attempts + 1})`);
        ch.sendToQueue('sync_to_external', msg.content, {
          persistent: true,
          headers: { 'x-retry': attempts + 1 },
        });
        ch.ack(msg);
      } else {
        console.log('Max retries reached. Sending to DLQ.');
        ch.nack(msg, false, false);
      }
    }
  });
}

module.exports = { consumeFromLocal };
