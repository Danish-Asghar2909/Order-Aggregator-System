const sequelize = require('./index');

require('../models/Order');
require('../models/Product');

async function syncDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    await sequelize.sync({ force: false });
    console.log('Tables synced!');
  } catch (error) {
    console.error('Sync Error:', error);
  }
}

module.exports = syncDatabase;
