const { logger, helper } = require('@auto-content-labs/messaging');
const getDomains = require('../utils/getDomains');
const sendRequest = require('../utils/sendRequest');
const calculateBatchSize = require('../utils/batchSize');
const { calculateProgress } = require('../utils/progress');
const fs = require('fs');
const path = require('path');
const taskStatusFile = 'files/taskStatus.json';
const domainsDir = 'files/domains/';

let taskCount = 0;
let processedCount = 0;
let failedCount = 0;
let taskStatus = {};  // Keep task status in memory
let changesToSave = false;

// Check if TASK_LIMIT environment variable is set, else use default (no limit)
const taskLimit = process.env.TASK_LIMIT ? parseInt(process.env.TASK_LIMIT, 10) : null;

async function loadTaskStatus() {
  try {
    const data = await fs.promises.readFile(taskStatusFile, 'utf-8');
    taskStatus = JSON.parse(data);
  } catch (error) {
    taskStatus = {};  // Initialize empty object if file doesn't exist
  }
}

async function saveTaskStatus() {
  if (changesToSave) {
    await fs.promises.writeFile(taskStatusFile, JSON.stringify(taskStatus, null, 2));
    changesToSave = false;  // Reset flag
  }
}

function getDomainFiles() {
  return fs.readdirSync(domainsDir)
    .filter(file => file.startsWith('domains_') && file.endsWith('.csv'))
    .map(file => path.join(domainsDir, file));
}

async function processDomains() {
  const domainFiles = getDomainFiles();
  let totalTasks = 0;
  let tasksProcessed = 0;
  let startTime = Date.now();

  for (let file of domainFiles) {
    const domains = await getDomains(file);
    totalTasks += domains.length;
    const CONCURRENT_TASKS_LIMIT = Math.min(await calculateBatchSize(totalTasks), taskLimit ? taskLimit - tasksProcessed : Number.MAX_SAFE_INTEGER);

    for (let i = 0; i < domains.length; i += CONCURRENT_TASKS_LIMIT) {
      const chunk = domains.slice(i, i + CONCURRENT_TASKS_LIMIT);
      logger.notice(`[processDomains] CONCURRENT: ${CONCURRENT_TASKS_LIMIT} sending batch...`);

      const tasks = chunk.map((domain) => {
        if (taskLimit && tasksProcessed >= taskLimit) {
          logger.notice(`Task limit of ${taskLimit} reached. Stopping further processing.`);
          return Promise.resolve();  // Exit early when the limit is reached
        }

        taskCount++;
        const id = `${taskCount}`;

        if (taskStatus[domain] === 'processed') {
          logger.notice(`[job] [${id}] Skipping processed domain: ${domain}`);
          return Promise.resolve();
        }

        return sendRequest(id, domain)
          .then(() => {
            processedCount++;
            taskStatus[domain] = 'processed';
            tasksProcessed++;
            changesToSave = true;

            const { progressPercentage, formattedElapsedTime, formattedEstimatedTimeRemaining } = calculateProgress(
              tasksProcessed,
              totalTasks,
              startTime
            );
            if (tasksProcessed % 10 === 0 || tasksProcessed === totalTasks)
              logger.notice(`[✨] ${progressPercentage}%. Elapsed time: ${formattedElapsedTime}s. Estimated time remaining: ${formattedEstimatedTimeRemaining}s.`);
          })
          .catch(() => {
            failedCount++;
            taskStatus[domain] = 'failed';
            changesToSave = true;
          });
      });

      await Promise.all(tasks);
      await saveTaskStatus();

      if (taskLimit && tasksProcessed >= taskLimit) {
        logger.notice(`Task limit of ${taskLimit} reached. Stopping process.`);
        break;  // Exit the loop early when the limit is reached
      }
    }

    if (taskLimit && tasksProcessed >= taskLimit) {
      break;  // Exit the outer loop if task limit is reached
    }
  }
}


async function start() {
  try {
    logger.info("Application starting...");
    await loadTaskStatus();  // Load initial task status
    const startTime = Date.now();
    await processDomains();
    await saveTaskStatus();  // Final save
    logger.notice(`Completed ${taskCount} tasks: ${processedCount} processed, ${failedCount} failed. Time: ${Date.now() - startTime}ms`);
  } catch (error) {
    logger.error("Application failed to start", error);
  }
}

/**
* Graceful shutdown handler for the application.
*/
function handleShutdown() {
  logger.info("Application shutting down...");
  process.exit(0);
}

// Listen for process signals for graceful shutdown
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

module.exports = { start };
