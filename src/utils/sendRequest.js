const {
  helper,
  sendDataCollectRequest,
  StatusType,
  ServiceType,
  AccessType,
  DataFormat,
  AccessMethod
} = require('@auto-content-labs/messaging');
const { logger } = require('@auto-content-labs/messaging');

/**
 * Sends a data collection request.
 * @param {string} id - The unique job identifier.
 * @param {string} domain - The domain of the service.
 */
async function sendRequest(id, domain) {

  // Construct the value object dynamically
  const value = {
    id: `job-${id}`,  // Unique request ID
    service: {
      service_id: id,  // Unique identifier for each service
      status_type_id: StatusType.ACTIVE,  // Active status
      service_type_id: ServiceType.API,  // Service Type: API
      access_type_id: AccessType.RSS,  // Access Type: RSS feed
      fetch_frequency: 300,  // Frequency (in seconds)
      time_interval: 0,  // Real-time fetching
      next_fetch: null,  // Auto-calculated timestamp for next fetch
      last_fetched: null,  // Timestamp for last fetched data
      last_error_message: null,  // Stores last error message
      access_method_id: AccessMethod.OPEN_ACCESS,  // Open access method
      data_format_id: DataFormat.XML,  // Data format: XML
      parameters: {
        protocol: "https",  // Protocol: HTTPS
        domain,  // Domain passed in function argument
        port: 443,  // Standard HTTPS port
        path: null,  // No specific path, can be set dynamically
        query_parameters: {
          geo: null  // Geo-location parameter (can be set dynamically)
        },
        request_method: "GET",  // HTTP request method
        rate_limit: 100,  // Rate limit per window
        rate_limit_window: 60,  // Time window for rate limit (seconds)
        timeout: 1000,  // Timeout duration (ms)
        retry_count: 1,  // Retry count in case of failure
        cache_duration: 3600,  // Cache duration (ms)
        cache_enabled: true,  // Cache is enabled
        max_connections: 5,  // Max number of simultaneous connections
        api_key: null,  // API key for authentication (if required)
        logging_enabled: true,  // Enable logging
        allowed_origins: "*",  // Allow all origins
        error_handling: "retry",  // Error handling strategy
        authentication_required: false,  // Whether authentication is needed
        authentication_details: {
          type: null,  // Authentication type (OAuth, etc.)
          location: null,  // Header or body location for credentials
          required: false  // If authentication is required
        }
      }
    }
  };

  // Construct the URL
  const { protocol, port, path, query_parameters } = value.service.parameters;

  // Remove any null or undefined query parameters
  const filteredQueryParams = Object.fromEntries(
    Object.entries(query_parameters).filter(([key, value]) => value != null)
  );

  // Construct the query string only if there are query parameters
  const queryString = Object.keys(filteredQueryParams).length > 0
    ? `?${new URLSearchParams(filteredQueryParams).toString()}`
    : '';

  // Construct the final URL without trailing ?
  const url = `${protocol}://${domain}:${port}${path ? path : ''}${queryString}`;

  try {
    // Send the data collection request
    const traceId = helper.generateId(16)
    const generatedHeaders = { correlationId: traceId, traceId: traceId } // trace this request
    await sendDataCollectRequest({ value, headers: generatedHeaders });

    // Log success message
    logger.notice(`[sendRequest] [${id}] success  : ${generatedHeaders.correlationId} - ${url}`, { id, url });
  } catch (error) {
    // Log error message
    logger.error(`[sendRequest] [${id}] Failed   :  ${generatedHeaders.correlationId} - ${url} ${error.message}`, { id, url });
  }
}

module.exports = sendRequest;
