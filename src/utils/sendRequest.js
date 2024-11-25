// src\sendRequest.js
const { sendDataCollectRequestRequest } = require('@auto-content-labs/messaging');
const { logger } = require('@auto-content-labs/messaging');

/**
 * .
 * @param {string} id 
 * @param {string} source 
 * @param {Object} params 
 * @param {string} priority
 * @param {string} timestamp
 * @param {number} total - ( optional )
 */
async function sendRequest(id, source, params, priority, timestamp, total) {
  try {
    await sendDataCollectRequestRequest({
      id, source, params, priority, timestamp, total
    });
    logger.notice(`[job] successfully  : ${id} ${params.url}`, { id, domain: params.url });
  } catch (error) {
    logger.error(`[job] Failed - Error: ${id} ${params.url}  ${error.message}`, { id, domain: params.url });
  }
}

module.exports = sendRequest;
