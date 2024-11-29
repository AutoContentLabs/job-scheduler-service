// src\sendRequest.js
const {
  sendDataCollectRequest,
  StatusType,
  ServiceType,
  AccessType,
  DataFormat,
  AccessMethod
} = require('@auto-content-labs/messaging');
const { logger } = require('@auto-content-labs/messaging');

/**
 * .
 * @param {string} id 
 * @param {string} domain 
 */
async function sendRequest(id, domain) {

  const value = {
    id: `job-${id}`,  // Unique request ID
    service: {
      service_id: id,  // Unique identifier for each service
      status_type_id: StatusType.ACTIVE,  // 1: active, 2: inactive, 3: maintenance, 4: under_review, 5: suspended
      service_type_id: ServiceType.API,  // Service Type: specifies the type of service (1:WEB, 2:API , 3:FTP, 4:DB, 5:MQ, 6:STREAM, 7:BATCH)
      access_type_id: AccessType.RSS,  // Reference to access_types table; specifies access method (1: api, 2: rss, 3: html)
      fetch_frequency: 300,  // Frequency (in seconds) at which data will be fetched from the external source
      time_interval: 0,  // Time interval in which the data source provides data (0: real-time)
      next_fetch: null,  // Timestamp for when the next fetch will occur; calculated automatically based on fetch frequency (timestamptz)
      last_fetched: null,  // Timestamp for when the data was last fetched; updated during each fetch (timestamptz)
      last_error_message: null,  // Stores the last error message encountered during data fetching; could be useful for debugging (any error exception)
      access_method_id: AccessMethod.OPEN_ACCESS,  // Reference to access_method_types table; indicates how the service can be accessed (1: free, 2: open_access, 3: subscription)
      data_format_id: DataFormat.XML,  // Reference to data_format_types table; specifies the data format (1: json, 2: xml, 3: csv, 4: html)
      parameters: {
        protocol: "https",  // 
        domain: domain,  // 
        port: 443,  //
        path: null,  // 
        query_parameters: {
          geo: null  // 
        },
        request_method: "GET",  // 
        rate_limit: 100,  // 
        rate_limit_window: 60,  // 
        timeout: 1000,  // ms
        retry_count: 1,  // 
        cache_duration: 3600,  // ms
        cache_enabled: true,  // 
        max_connections: 5,  // 
        api_key: null,  // 
        logging_enabled: true,  // 
        allowed_origins: "*",  // 
        error_handling: "retry",  // 
        authentication_required: false,  // 
        authentication_details: {
          type: null,  // OAuth vs...
          location: null,  // header vs...
          required: false  // 
        }
      }
    }
  }
  const pair = { value }

  // Construct the URL
  const { protocol, domain, port, path, query_parameters, request_method, rate_limit, rate_limit_window, timeout, retry_count, cache_duration, cache_enabled, max_connections, api_key, logging_enabled, allowed_origins, error_handling, authentication_required, authentication_details } = value.service.parameters;
  const url = `${protocol}://${domain}:${port}${path}?${new URLSearchParams(query_parameters).toString()}`;

  try {

    // 
    await sendDataCollectRequest(pair);

    logger.notice(`[job] success  : ${id} ${url}`, { id, url });
  } catch (error) {
    logger.error(`[job] Failed   : ${id} ${url} ${error.message}`, { id, url });
  }
}

module.exports = sendRequest;
