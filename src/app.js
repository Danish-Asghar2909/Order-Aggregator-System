const express = require('express')
const app = express()
require('dotenv').config()
const sequelize = require('./db/index')
const syncDatabase = require('./db/syncData')

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Order Aggregator System API' })
})

syncDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
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