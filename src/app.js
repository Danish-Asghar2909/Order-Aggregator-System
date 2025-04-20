const express = require('express')
const app = express()
require('dotenv').config()
const sequelize = require('./db/index')
const syncDatabase = require('./db/syncData')

const routes = require('./routes');
const { initConsumers } = require('./sync/initConsumers');
const { syncVendors } = require('./sync/vendorsFetcher');
// const { startDashboard } = require('./monitor/dashboard');

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/', routes);

syncDatabase().then(async () => {
  try{
    await syncVendors();         // This syncs vendor products on boot
    await initConsumers();
    // startDashboard();
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  }catch(err){
    console.error('Error initializing database:', err);
  }

});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: sequelize.authenticate() ? 'Connected' : 'Disconnected'
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})