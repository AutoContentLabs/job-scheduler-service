const {
  helper,
  sendDataCollectRequest,
  StatusType,
  ServiceType,
  AccessType,
  DataFormat,
  AccessMethod,
} = require("@auto-content-labs/messaging");
const { logger } = require("@auto-content-labs/messaging");

/**
 * Sends a data collection request.
 * @param {object} model - The configuration object for the service and its parameters.
 */
async function sendRequest(model) {
  // Default
  const value = {
    id: `task.${model.id}`, // Unique request ID
    service: {
      service_id: model.service.service_id || model.id, // Unique identifier for each service
      status_type_id: model.service.status_type_id || StatusType.ACTIVE,
      service_type_id: model.service.service_type_id || ServiceType.API,
      access_type_id: model.service.access_type_id || AccessType.RSS,
      fetch_frequency: model.service.fetch_frequency || 300,
      time_interval: model.service.time_interval || 0,
      next_fetch: model.service.next_fetch || null,
      last_fetched: model.service.last_fetched || null,
      last_error_message: model.service.last_error_message || null,
      access_method_id:
        model.service.access_method_id || AccessMethod.OPEN_ACCESS,
      data_format_id: model.service.data_format_id || DataFormat.XML,
      parameters: {
        protocol: model.service.parameters?.protocol || "https",
        domain: model.service.parameters.domain, // Domain
        port: model.service.parameters?.port || 443,
        path: model.service.parameters?.path || null,
        query_parameters: {
          geo: model.service.parameters?.query_parameters?.geo || null,
        },
        request_method: model.service.parameters?.request_method || "GET",
        rate_limit: model.service.parameters?.rate_limit || 100, //
        rate_limit_window: model.service.parameters?.rate_limit_window || 60,
        timeout: model.service.parameters?.timeout || 1000, //
        retry_count: model.service.parameters?.retry_count || 1,
        cache_duration: model.service.parameters?.cache_duration || 3600,
        cache_enabled: model.service.parameters?.cache_enabled || true,
        max_connections: model.service.parameters?.max_connections || 5,
        api_key: model.service.parameters?.api_key || null,
        logging_enabled: model.service.parameters?.logging_enabled || true,
        allowed_origins: model.service.parameters?.allowed_origins || "*",
        error_handling: model.service.parameters?.error_handling || "retry",
        authentication_required:
          model.service.parameters?.authentication_required || false,
        authentication_details: {
          type: model.service.parameters?.authentication_details?.type || null,
          location:
            model.service.parameters?.authentication_details?.location || null,
          required:
            model.service.parameters?.authentication_details?.required || false,
        },
      },
    },
  };

  const { protocol, port, path, query_parameters } = value.service.parameters;

  const filteredQueryParams = Object.fromEntries(
    Object.entries(query_parameters).filter(([key, value]) => value != null)
  );

  const queryString =
    Object.keys(filteredQueryParams).length > 0
      ? `?${new URLSearchParams(filteredQueryParams).toString()}`
      : "";

  const url = `${protocol}://${value.service.parameters.domain}:${port}${
    path ? path : ""
  }${queryString}`;

  const traceId = helper.generateId(16);
  const generatedHeaders = { correlationId: traceId, traceId: traceId };
  try {
    await sendDataCollectRequest({ value, headers: generatedHeaders });

    logger.notice(
      `[sendRequest] [${model.id}] success: ${generatedHeaders.correlationId} - ${url}`,
      { service_id: model.service.service_id, url }
    );
  } catch (error) {
    logger.error(
      `[sendRequest] [${model.id}] Failed: ${generatedHeaders.correlationId} - ${url} ${error.message}`,
      { service_id: model.service.service_id, url }
    );
  }
}

module.exports = sendRequest;
