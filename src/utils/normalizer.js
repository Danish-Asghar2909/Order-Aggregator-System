const uuid = require('uuid'); 
function normalizeProduct(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }

  const normalized = {
    name: data.name || data.title || 'Unnamed Product',
    price: parseFloat(data.price || data.cost || 0),
    stock: parseInt(data.stock || data.inventory || 0),
    vendor: data.vendor,
    metadata: data,
  };

  if (data.id) {
    normalized.external_id = String(data.id) || "not-present"; // ensure it's a string
    // normalized.id = Number(data.id); // only add if present
  }

  return normalized;
}

module.exports = { normalizeProduct };
