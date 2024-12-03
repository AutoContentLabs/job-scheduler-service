const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const { logger, helper } = require("@auto-content-labs/messaging");

const sendRequest = require("./sendRequest");

const TASKS_FILE = "files/tasks/tasks.json";
const DOMAIN_DIR = "files/domains/";
// TASK LIMIT is task processing limit
const TASK_LIMIT = process.env.TASK_LIMIT
  ? parseInt(process.env.TASK_LIMIT, 10)
  : null;
// Maximum parallel tasks limit
const MAX_PARALLEL_TASKS = process.env.MAX_PARALLEL_TASKS
  ? parseInt(process.env.MAX_PARALLEL_TASKS, 10)
  : 5;

const TASK = {
  total: 0,
  count: 0,
  processed: 0,
  failed: 0,
  pending: 0,
};

let TASKS_STATUS = {
  "example.com": { id: 0, status: "que" },
};

async function loadTaskStatus() {
  try {
    const data = await fs.promises.readFile(TASKS_FILE, "utf-8");
    TASKS_STATUS = JSON.parse(data);
  } catch (error) {
    TASKS_STATUS = {}; // Initialize empty object if file doesn't exist
  }
}

async function saveTaskStatus() {
  if (changesToSave) {
    await fs.promises.writeFile(
      TASKS_FILE,
      JSON.stringify(TASKS_STATUS, null, 2)
    );
    changesToSave = false; // Reset flag
  }
}

function getDomains(file) {
  return new Promise((resolve, reject) => {
    const domains = [];
    const readStream = fs.createReadStream(file).pipe(csv());

    readStream
      .on("data", (row) => {
        if (row.domain && row.id) {
          domains.push({ id: parseInt(row.id), domain: row.domain });
        }
      })
      .on("end", () => resolve(domains))
      .on("error", (err) => reject(err));
  });
}
async function getDomainFiles() {
  return fs
    .readdirSync(DOMAIN_DIR)
    .filter((file) => file.startsWith("domains_") && file.endsWith(".csv"))
    .map((file) => path.join(DOMAIN_DIR, file));
}

async function task(id, domain) {
  const status = {
    start: performance.now(),
    end: 0,
    duration: 0,
    state: "pending",
    domain: domain,
    id: id,
  };
  try {
    const model = { id: id, service: { parameters: { domain: domain } } };
    sendRequest(model);

    status.end = performance.now();
    status.duration = status.end - status.start;
    status.state = "processed";

    return status;
  } catch (error) {
    status.end = performance.now();
    status.duration = status.end - status.start;
    status.state = "failed";
    logger.error(
      `Task failed for domain: ${domain} with error: ${error.message}`
    );
  } finally {
    //
  }

  return status;
}

async function processDomains() {
  const domainFiles = await getDomainFiles();
  for (let file of domainFiles) {
    if (TASK.processed >= TASK_LIMIT) {
      logger.info("Task limit reached. Stopping further processing.");
      return;
    }

    const domains = await getDomains(file);

    // Process tasks in batches with MAX_PARALLEL_TASKS limit
    const domainChunks = chunkArray(domains, MAX_PARALLEL_TASKS);

    TASK.total += domainChunks.length;

    for (let chunk of domainChunks) {
      const taskPromises = chunk.map(async (item) => {
        if (TASK.processed >= TASK_LIMIT) {
          return; // Stop processing if task limit reached
        }

        TASK.count++;

        const status = await task(item.id, item.domain);
        switch (status.state) {
          case "processed":
            TASK.processed++;
            break;
          case "failed":
            TASK.failed++;
            break;
          default:
            TASK.pending++;
            break;
        }

        // Save the status in TASKS_STATUS
        TASKS_STATUS[item.domain] = { id: item.id, status: status.state };
      });

      // Wait for all tasks in this chunk to complete
      await Promise.all(taskPromises);
    }
  }
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

async function start() {
  try {
    logger.info(
      `Application starting... TASK_LIMIT: ${TASK_LIMIT}, MAX_PARALLEL_TASKS: ${MAX_PARALLEL_TASKS}`
    );
    const startProcessDomainsTime = Date.now();
    await processDomains();
    const endProcessDomainsTime = Date.now();
    logger.notice(
      `Completed task processing in ${
        endProcessDomainsTime - startProcessDomainsTime
      }ms. Task Stats: ${JSON.stringify(TASK)}`
    );
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
