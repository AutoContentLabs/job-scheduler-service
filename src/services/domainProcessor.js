const { logger, helper } = require('@auto-content-labs/messaging');
const getDomains = require('../utils/getDomains');
const sendRequest = require('../utils/sendRequest');
const calculateBatchSize = require('../utils/batchSize');
const { calculateProgress } = require('../utils/progress');
const fs = require('fs');
const path = require('path');
const taskStatusFile = 'files/taskStatus.json';

// Define domain directory
const domainsDir = 'files/domains/';

let taskCount = 0;
let processedCount = 0;
let failedCount = 0;

let taskStatus = loadTaskStatus();  // Initial task status load

function loadTaskStatus() {
  try {
    const data = fs.readFileSync(taskStatusFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return {}; // Return empty object if file doesn't exist
  }
}

function saveTaskStatus() {
  fs.writeFileSync(taskStatusFile, JSON.stringify(taskStatus, null, 2));
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

    const CONCURRENT_TASKS_LIMIT = await calculateBatchSize(totalTasks);

    for (let i = 0; i < domains.length; i += CONCURRENT_TASKS_LIMIT) {
      const chunk = domains.slice(i, i + CONCURRENT_TASKS_LIMIT);
      logger.notice(`[processDomains] CONCURRENT: ${CONCURRENT_TASKS_LIMIT} sending batch...`);

      const tasks = chunk.map((domain) => {
        taskCount++;
        const id = `${taskCount}`;
        const source = file;
        const params = { url: domain };
        const priority = "medium";
        const timestamp = helper.getCurrentTimestamp();

        if (taskStatus[domain] === 'processed') {
          logger.notice(`[job] Skipping processed domain: ${domain}`);
          return Promise.resolve(); 
        }

        return sendRequest(id, source, params, priority, timestamp, taskCount)
          .then(() => {
            processedCount++;
            taskStatus[domain] = 'processed';
            tasksProcessed++;

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
          });
      });

      await Promise.all(tasks);
      saveTaskStatus();  // Save task status after each batch
    }
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

module.exports = { start };
