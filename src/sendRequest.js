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
 */
async function sendRequest(id, source, params, priority, timestamp) {
  try {
    await sendDataCollectRequestRequest({
      id, source, params, priority, timestamp
    });
    logger.notice(`[sendRequest] successfully: ${params.url}`, { id, domain: params.url });
  } catch (error) {
    logger.error(`Failed to send request: ${id} - Error: ${error.message}`, { id, domain: params.url });
  }
}

module.exports = sendRequest;
