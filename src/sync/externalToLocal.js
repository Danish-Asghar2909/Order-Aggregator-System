const amqp = require('amqplib');
const { Product } = require('../models');
const { normalizeProduct } = require('../utils/normalizer');
require('dotenv').config();

async function safeAssertQueue(channel, queueName, options = {}) {
  try {
    await channel.checkQueue(queueName);
    console.log(`⚠️ Queue '${queueName}' already exists. Skipping assertion.`);
  } catch (err) {
    if (err.code === 404) {
      console.log(`Queue '${queueName}' not found. Creating...`);
      await channel.assertQueue(queueName, options);
    } else {
      throw err;
    }
  }
}

async function consumeFromExternal() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  const ch = await conn.createChannel();

  const mainQueue = 'sync_from_external';
  const dlqQueue = 'sync_from_external_dlq';
  const dlxExchange = 'sync_from_external_dlx';
  const dlxRoutingKey = 'sync_from_external_dlq';

  // DLX exchange
  await ch.assertExchange(dlxExchange, 'direct', { durable: true });

  // Safe assert DLQ
  await safeAssertQueue(ch, dlqQueue, { durable: true });
  await ch.bindQueue(dlqQueue, dlxExchange, dlxRoutingKey);

  // Safe assert Main Queue with DLX settings
  await safeAssertQueue(ch, mainQueue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': dlxExchange,
      'x-dead-letter-routing-key': dlxRoutingKey,
    },
  });

  ch.consume(mainQueue, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());
      const normalized = normalizeProduct(data);

      const existingProduct = await Product.findOne({
        where: {
          external_id: normalized.external_id,
          vendor: normalized.vendor,
        },
      });

      if (!existingProduct) {
        await Product.create(normalized);
        console.log('Created new product:', normalized);
      } else {
        await Product.update(normalized, {
          where: {
            external_id: normalized.external_id,
            vendor: normalized.vendor,
          },
        });
        console.log('Updated product:', normalized);
      }

      ch.ack(msg);
    } catch (err) {
      console.error('Error:', err.message);

      const maxRetries = 3;
      const headers = msg.properties.headers || {};
      const attempts = headers['x-retry'] || 0;

      if (attempts < maxRetries) {
        console.log(`Retrying (Attempt ${attempts + 1})`);
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

module.exports = { consumeFromExternal };
