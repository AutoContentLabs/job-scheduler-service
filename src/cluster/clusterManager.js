const cluster = require('cluster');
const numCPUs = 1 //require('os').cpus().length;
const { logger } = require('@auto-content-labs/messaging');
const domainProcessor = require('../services/domainProcessor');

function start() {
  if (cluster.isMaster) {

    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      logger.notice(`Worker ${worker.process.pid} exited ${code} ${signal}`);
    });
  } else {

    domainProcessor.start();
  }
}

module.exports = {
  start
};
