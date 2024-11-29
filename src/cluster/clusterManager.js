const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const { logger } = require('@auto-content-labs/messaging');
const domainProcessor = require('../services/domainProcessor');

function start(withCluster = process.env.NODE_ENV !== 'production') {
  // # Default number of workers: 
  // # If the WORKER_COUNT environmental variable is not defined,
  // # the system automatically starts numCPUs (number of CPUs available) workers.
  const workerCount = process.env.WORKER_COUNT ? parseInt(process.env.WORKER_COUNT, 10) : numCPUs;

  if (withCluster) {
    if (cluster.isMaster) {
      logger.info(`Master process is starting with ${workerCount} workers...`);

      // Forking workers based on WORKER_COUNT
      for (let i = 0; i < workerCount; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        logger.notice(`Worker ${worker.process.pid} exited with code ${code} and signal ${signal}`);
        // Optionally, restart the worker if needed
      });
    } else {
      // Worker process
      domainProcessor.start();
    }
  } else {
    // Single process mode (for production or non-clustered environments)
    domainProcessor.start();
  }
}

module.exports = { start };
