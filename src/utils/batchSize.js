const ping = require('ping');

// Function to control network delay
async function getLatencyFromMultipleSources() {
  const sources = ['google.com', 'amazon.com', 'cloudflare.com', 'azure.microsoft.com'];
  const latencies = await Promise.all(sources.map(host => ping.promise.probe(host).then(res => res.time)));
  
  // average
  const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  // Return the best (minimum) latency from the sources
  const bestLatency = Math.min(...latencies); 
  return bestLatency;
}

async function calculateBatchSize(totalMessages, messageSize = 1024) {
  const maxBatchSize = 10 * 1024 * 1024; // 10MB
  const avgMessageSize = messageSize || 1024; // 1KB default
  const totalSize = totalMessages * avgMessageSize;

  let batchSize;

  // Get network latency and adjust batch size accordingly
  const latency = await getLatencyFromMultipleSources();
  if (latency > 200) {
    batchSize = Math.min(10, totalMessages); // Small batch for high latency
  } else if (latency > 100) {
    batchSize = Math.min(50, totalMessages); // Medium batch for medium delay
  } else {
    batchSize = Math.min(100, totalMessages); // Large batch for low latency
  }

  // Adjust batch size based on data size
  if (totalSize < 100 * 1024) {
    batchSize = Math.min(10, totalMessages); // Small data size
  } else if (totalSize < 1 * 1024 * 1024) {
    batchSize = Math.min(50, totalMessages); // Medium data size
  } else {
    batchSize = Math.min(100, totalMessages); // Large data size
  }

  // Ensure that the batch size does not exceed 10 MB
  const batchSizeInBytes = batchSize * avgMessageSize;
  if (batchSizeInBytes > maxBatchSize) {
    batchSize = Math.floor(maxBatchSize / avgMessageSize);
  }

  return batchSize;
}

module.exports = calculateBatchSize;
