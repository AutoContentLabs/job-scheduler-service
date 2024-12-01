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
      logger.info(`[processDomains] CONCURRENT: ${CONCURRENT_TASKS_LIMIT} sending batch...`);

      const tasks = chunk.map(async (domain) => {  // map içine async işaretini ekliyoruz
        if (taskLimit && tasksProcessed >= taskLimit) {
          logger.info(`[processDomains] Task limit of ${taskLimit} reached. Stopping further processing.`);
          return;  // Task limitine ulaşıldığında işleme devam etmiyoruz
        }

        taskCount++;
        const id = taskCount;

        if (taskStatus[domain] === 'processed') {
          logger.info(`[processDomains] [${id}] Skipping processed domain: ${domain}`);
          return;  // İşlem yapılmış domainleri atlıyoruz
        }

        try {
          await sendRequest(id, domain);  // sendRequest'i await ile çağırıyoruz

          processedCount++;
          taskStatus[domain] = 'processed';
          tasksProcessed++;
          changesToSave = true;

          const { progressPercentage, formattedElapsedTime, formattedEstimatedTimeRemaining } = calculateProgress(
            tasksProcessed,
            totalTasks,
            startTime
          );
          if (tasksProcessed % 10 === 0 || tasksProcessed === totalTasks) {
            //logger.notice(`[✨] ${progressPercentage}%. Elapsed time: ${formattedElapsedTime}s. Estimated time remaining: ${formattedEstimatedTimeRemaining}s.`);
          }

        } catch (error) {
          failedCount++;
          taskStatus[domain] = 'failed';
          changesToSave = true;
        }
      });

      await Promise.all(tasks);  // Bütün task'lar tamamlanana kadar bekliyoruz
      await saveTaskStatus();

      if (taskLimit && tasksProcessed >= taskLimit) {
        logger.info(`[processDomains] Task limit of ${taskLimit} reached. Stopping process.`);
        break;  // Task limiti aşıldığında dış döngüden çıkıyoruz
      }
    }

    if (taskLimit && tasksProcessed >= taskLimit) {
      break;  // Task limiti aşıldığında dış döngüden çıkıyoruz
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
