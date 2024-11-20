// app.js
const { logger, helper } = require('@auto-content-labs/messaging');
const getDomains = require('./getDomains');
const sendRequest = require('./sendRequest');

const file = "domains.csv";

let taskCount = 0;
let processedCount = 0;
let failedCount = 0;

/**
 * 
 */
async function processDomains() {
  const domains = await getDomains(file);
  const tasks = domains.map((domain, index) => {
    taskCount++;
    const id = `${taskCount}`;
    const source = file;
    const params = { url: domain };
    const priority = "medium"; // "low", "medium", "high"
    const timestamp = helper.getCurrentTimestamp();

    return sendRequest(id, source, params, priority, timestamp)
      .then(() => processedCount++)
      .catch(() => failedCount++);
  });

  await Promise.all(tasks);
}

/**
 * 
 */
async function start() {
  try {
    logger.info("Application starting...");

    const startTime = Date.now();
    await processDomains();
    logger.info(`Completed ${taskCount} tasks: ${processedCount} processed, ${failedCount} failed. Time: ${Date.now() - startTime}ms`);
  } catch (error) {
    logger.error("Application failed to start", error);
  }
}

/**
 * Graceful shutdown handler.
 */
function handleShutdown() {
  logger.info("Application shutting down...");
  process.exit(0);
}

// Listen for process signals for graceful shutdown
process.on("SIGINT", handleShutdown); // for Ctrl+C in terminal
process.on("SIGTERM", handleShutdown); // for termination signal

// Start the application
start();
