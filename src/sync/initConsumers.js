const { consumeFromExternal } = require('./externalToLocal');
const { consumeFromLocal } = require('./localToExternal');

async function initConsumers() {
  await consumeFromExternal();
  await consumeFromLocal(); // Uncomment this line if you want to consume from local as well
}

module.exports = { initConsumers };