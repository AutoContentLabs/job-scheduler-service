// src\app.js
const { logger, helper } = require('@auto-content-labs/messaging');
const getDomains = require('./getDomains');
const sendRequest = require('./sendRequest');
const calculateBatchSize = require("./batchSize");
const fs = require('fs');
const file = "files/domains.csv";
const taskStatusFile = 'files/taskStatus.json';

let taskCount = 0;
let processedCount = 0;
let failedCount = 0;

// Load task status from the file (if exists)
function loadTaskStatus() {
  try {
    const data = fs.readFileSync(taskStatusFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {}; // Return empty object if file doesn't exist
  }
}

// Save task status to the file
function saveTaskStatus(taskStatus) {
  fs.writeFileSync(taskStatusFile, JSON.stringify(taskStatus, null, 2));
}

async function processDomains() {
  const domains = await getDomains(file);
  const taskStatus = loadTaskStatus(); // Load existing task statuses

  const CONCURRENT_TASKS_LIMIT = calculateBatchSize(domains.length, 512); // Default 512 bytes

  const totalTasks = domains.length;  // Total number of tasks
  let tasksProcessed = 0;  // Tracks the number of processed tasks
  const startTime = Date.now();  // Start time of the processing

  for (let i = 0; i < domains.length; i += CONCURRENT_TASKS_LIMIT) {
    const chunk = domains.slice(i, i + CONCURRENT_TASKS_LIMIT);
    logger.notice(`[processDomains] CONCURRENT: ${CONCURRENT_TASKS_LIMIT} sending batch... `);

    const tasks = chunk.map((domain, index) => {
      taskCount++;
      const id = `${taskCount}`;
      const source = file;
      const params = { url: domain };
      const priority = "medium"; // "low", "medium", "high"
      const timestamp = helper.getCurrentTimestamp();

      // Check if the domain has already been processed
      if (taskStatus[domain] === 'processed') {
        logger.notice(`[job] Skipping processed domain: ${domain}`);
        return Promise.resolve(); // Skip already processed domains
      }

      return sendRequest(id, source, params, priority, timestamp)
        .then(() => {
          processedCount++;
          taskStatus[domain] = 'processed'; // Mark as processed
          saveTaskStatus(taskStatus); // Save status to file
          tasksProcessed++;

          // Track and log progress every 10 tasks processed
          if (tasksProcessed % 10 === 0 || tasksProcessed === totalTasks) {
            const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
            const progressPercentage = Math.round((tasksProcessed / totalTasks) * 100);
            const estimatedTimeRemaining = ((elapsedTime / tasksProcessed) * (totalTasks - tasksProcessed)).toFixed(2);

            logger.notice(`[Progress] ${progressPercentage}% completed. Elapsed time: ${elapsedTime}s. Estimated time remaining: ${estimatedTimeRemaining}s.`);
          }
        })
        .catch(() => {
          failedCount++;
          taskStatus[domain] = 'failed'; // Mark as failed
          saveTaskStatus(taskStatus); // Save status to file
        });
    });

    await Promise.all(tasks);
  }
}

async function start() {
  try {
    logger.info("Application starting...");

    const startTime = Date.now();
    await processDomains();
    logger.notice(`Completed ${taskCount} tasks: ${processedCount} processed, ${failedCount} failed. Time: ${Date.now() - startTime}ms`);
  } catch (error) {
    logger.error("Application failed to start", error);
  }
}

function handleShutdown() {
  logger.info("Application shutting down...");
  process.exit(0);
}

// Listen for process signals for graceful shutdown
process.on("SIGINT", handleShutdown); // for Ctrl+C in terminal
process.on("SIGTERM", handleShutdown); // for termination signal

// Start the application
start();
