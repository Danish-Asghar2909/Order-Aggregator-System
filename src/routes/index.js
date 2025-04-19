const express = require('express');
const router = express.Router();
const { sequelize } = require('../db/index');
const amqp = require('amqplib');
const { Product } = require('../models');
const {Order} = require('../models');
const axios = require('axios');
const { handleOrderAndUpdateDB } = require('./helper');

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Order Aggregator System API' });
});

router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'Connected',
    });
  } catch (err) {
    res.json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
    });
  }
});

router.get('/products', async (req, res, next) => {
    try {
      const where = {};
      if (req.query.vendor) where.vendor = req.query.vendor;
  
      const products = await Product.findAll({ where, order: [['createdAt', 'DESC']] });
      res.json({ products });
    } catch (err) {
      next(err);
    }
  });


  router.post('/order', async (req, res, next) => {
    try {
      const { vendor, ...order } = req.body;
      if (!vendor || !order.id) {
        return res.status(400).json({ error: 'Missing vendor or order ID' });
      }
  
      const conn = await amqp.connect(process.env.RABBITMQ_URL);
      const ch = await conn.createChannel();
  
      handleOrderAndUpdateDB(req.body)
      // Declare DLX exchange and queue
      await ch.assertExchange('sync_to_external_dlx', 'direct', { durable: true });
      await ch.assertQueue('sync_to_external_dlq', { durable: true });
      await ch.bindQueue('sync_to_external_dlq', 'sync_to_external_dlx', 'sync_to_external.dlq');
  
      // Declare main queue with DLX config
      await ch.assertQueue('sync_to_external', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'sync_to_external_dlx',
          'x-dead-letter-routing-key': 'sync_to_external.dlq',
        },
      });
  
      // Send message
      ch.sendToQueue('sync_to_external', Buffer.from(JSON.stringify({ vendor, ...order })), {
        persistent: true,
      });
  
      await ch.close();
      await conn.close();
      
      res.status(200).json({ message: 'Order queued for syncing' });
    } catch (err) {
      next(err);
    }
  });
  
  

module.exports = router;