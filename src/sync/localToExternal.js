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

async function safeAssertQueue(channel, queueName, options = {}) {
  try {
    await channel.checkQueue(queueName);
    console.log(`⚠️ Queue '${queueName}' already exists. Skipping assertion.`);
  } catch (err) {
    if (err.code === 404) {
      console.log(`✅ Queue '${queueName}' not found. Creating...`);
      await channel.assertQueue(queueName, options);
    } else {
      throw err;
    }
  }
}

async function consumeFromLocal() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const ch = await conn.createChannel();

  const mainQueue = 'sync_to_external';
  const dlqQueue = 'sync_to_external_dlq';
  const dlxExchange = 'sync_to_external_dlx'; // Match existing DLX
  const dlxRoutingKey = 'sync_to_external_dlq';

  // Ensure DLX exchange exists
  await ch.assertExchange(dlxExchange, 'direct', { durable: true });

  // DLQ creation (safe)
  await safeAssertQueue(ch, dlqQueue, { durable: true });
  await ch.bindQueue(dlqQueue, dlxExchange, dlxRoutingKey);

  // Main queue with DLX settings (safe)
  await safeAssertQueue(ch, mainQueue, {
    durable: true,
    deadLetterExchange: dlxExchange,
    deadLetterRoutingKey: dlxRoutingKey,
  });

  ch.consume(mainQueue, async (msg) => {
    if (!msg) return;

    const { vendor, ...data } = JSON.parse(msg.content.toString());
    console.log('Received message:', data);

    if (await isDuplicate(data.id, vendor)) {
      console.log('Duplicate, skipping');
      ch.ack(msg);
      return;
    }

    const endpoint = vendorEndpoints[vendor];
    const limiter = limiters[vendor];

    if (!endpoint || !limiter) {
      console.error(`Unsupported vendor: ${vendor}`);
      ch.nack(msg, false, false); // Send to DLQ
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
        ch.sendToQueue(mainQueue, msg.content, {
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
