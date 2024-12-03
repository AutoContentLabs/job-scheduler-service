const { logger } = require("@auto-content-labs/messaging-utils");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");

const sendRequest = require("./sendRequest");

const TASKS_FILE = "files/tasks/tasks.json";
const DOMAIN_DIR = "files/domains/";
const TASK_LIMIT = process.env.TASK_LIMIT ? parseInt(process.env.TASK_LIMIT, 10) : null;
const MAX_PARALLEL_TASKS = process.env.MAX_PARALLEL_TASKS ? parseInt(process.env.MAX_PARALLEL_TASKS, 10) : 5;

const TASK = {
  total: 0,
  count: 0,
  processed: 0,
  failed: 0,
  pending: 0,
};

let TASKS_STATUS = {}; // TASKS_STATUS başlangıçta boş

// Create the directory if it doesn't exist
function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
    logger.info(`Created directory: ${dirname}`);
  }
}

async function loadTaskStatus() {
  try {
    const data = await fs.promises.readFile(TASKS_FILE, "utf-8");
    TASKS_STATUS = JSON.parse(data);
    logger.info("Task status loaded successfully.");
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warning("Task status file not found, initializing empty status.");
    } else {
      logger.error("Error loading task status file", error);
    }
    TASKS_STATUS = {}; // Eğer dosya yoksa, boş bir nesne ile başla
  }
}

async function saveTaskStatus() {
  try {
    // Ensure the directory exists before saving the file
    ensureDirectoryExistence(TASKS_FILE);

    await fs.promises.writeFile(TASKS_FILE, JSON.stringify(TASKS_STATUS, null, 2));
    logger.info("Task status saved successfully.");
  } catch (error) {
    logger.error("Error saving task status file", error);
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
    logger.info(`Task processed for domain: ${domain}`);

    status.end = performance.now();
    status.duration = status.end - status.start;
    status.state = "processed";
  } catch (error) {
    status.end = performance.now();
    status.duration = status.end - status.start;
    status.state = "failed";
    logger.error(`Task failed for domain: ${domain} with error: ${error.message}`);
  }

  // Task sonrasında dosyayı güncelle
  TASKS_STATUS[domain] = { id: id, status: status.state };

  // Task bitince dosyayı kaydet
  await saveTaskStatus();

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
      });

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
    logger.info(`Application starting... TASK_LIMIT: ${TASK_LIMIT}, MAX_PARALLEL_TASKS: ${MAX_PARALLEL_TASKS}`);

    await loadTaskStatus();

    const startProcessDomainsTime = Date.now();
    await processDomains();
    const endProcessDomainsTime = Date.now();

    logger.notice(`Completed task processing in ${endProcessDomainsTime - startProcessDomainsTime}ms. Task Stats: ${JSON.stringify(TASK)}`);
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
