// batchSize.js
function calculateBatchSize(totalMessages, messageSize) {
  const maxBatchSize = 10 * 1024 * 1024; // 10MB

  const avgMessageSize = messageSize || 1024; // 1KB default

  // total
  const totalSize = totalMessages * avgMessageSize;

  let batchSize;

  if (totalSize < 100 * 1024) { // small (100KB)
    batchSize = Math.min(10, totalMessages); // min
  } else if (totalSize < 1 * 1024 * 1024) { //  (1MB)
    batchSize = Math.min(50, totalMessages); // medium batch
  } else { // big
    batchSize = Math.min(100, totalMessages); // big batch
  }

  // 
  const batchSizeInBytes = batchSize * avgMessageSize;
  if (batchSizeInBytes > maxBatchSize) {
    batchSize = Math.floor(maxBatchSize / avgMessageSize);
  }

  return batchSize;
}

module.exports = calculateBatchSize;