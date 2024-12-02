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
 * @param {object} model - The configuration object for the service and its parameters.
 */
async function sendRequest(model) {

  // Varsayılan değerler
  const value = {
    id: `task.${model.id}`,  // Unique request ID
    service: {
      service_id: model.service.service_id || model.id,  // Unique identifier for each service
      status_type_id: model.service.status_type_id || StatusType.ACTIVE,  // Varsayılan aktif durum
      service_type_id: model.service.service_type_id || ServiceType.API,  // Varsayılan servis tipi: API
      access_type_id: model.service.access_type_id || AccessType.RSS,  // Varsayılan erişim tipi: RSS feed
      fetch_frequency: model.service.fetch_frequency || 300,  // Varsayılan veri çekme sıklığı (saniye)
      time_interval: model.service.time_interval || 0,  // Gerçek zamanlı veri çekme (0)
      next_fetch: model.service.next_fetch || null,  // Sonraki veri çekme zamanını otomatik olarak hesapla
      last_fetched: model.service.last_fetched || null,  // Son veri çekme zamanını sakla
      last_error_message: model.service.last_error_message || null,  // Son hata mesajını sakla
      access_method_id: model.service.access_method_id || AccessMethod.OPEN_ACCESS,  // Açık erişim metodu
      data_format_id: model.service.data_format_id || DataFormat.XML,  // XML veri formatı
      parameters: {
        protocol: model.service.parameters?.protocol || "https",  // Varsayılan protokol
        domain: model.service.parameters.domain,  // Gelen domain
        port: model.service.parameters?.port || 443,  // Varsayılan port (HTTPS)
        path: model.service.parameters?.path || null,  // Varsayılan path, dinamik olarak ayarlanabilir
        query_parameters: {
          geo: model.service.parameters?.query_parameters?.geo || null  // Varsayılan geo parametreleri
        },
        request_method: model.service.parameters?.request_method || "GET",  // Varsayılan HTTP metodu
        rate_limit: model.service.parameters?.rate_limit || 100,  // Varsayılan rate limit
        rate_limit_window: model.service.parameters?.rate_limit_window || 60,  // Varsayılan rate limit pencere süresi
        timeout: model.service.parameters?.timeout || 1000,  // Varsayılan zaman aşımı süresi (ms)
        retry_count: model.service.parameters?.retry_count || 1,  // Varsayılan retry sayısı
        cache_duration: model.service.parameters?.cache_duration || 3600,  // Varsayılan cache süresi
        cache_enabled: model.service.parameters?.cache_enabled || true,  // Varsayılan cache etkin
        max_connections: model.service.parameters?.max_connections || 5,  // Varsayılan maksimum bağlantı sayısı
        api_key: model.service.parameters?.api_key || null,  // API anahtarı (gerektiğinde)
        logging_enabled: model.service.parameters?.logging_enabled || true,  // Varsayılan logging etkin
        allowed_origins: model.service.parameters?.allowed_origins || "*",  // Varsayılan izin verilen kökenler
        error_handling: model.service.parameters?.error_handling || "retry",  // Varsayılan hata yönetimi
        authentication_required: model.service.parameters?.authentication_required || false,  // Varsayılan kimlik doğrulama gereksiz
        authentication_details: {
          type: model.service.parameters?.authentication_details?.type || null,  // Varsayılan kimlik doğrulama türü
          location: model.service.parameters?.authentication_details?.location || null,  // Varsayılan kimlik doğrulama yeri
          required: model.service.parameters?.authentication_details?.required || false  // Varsayılan kimlik doğrulama gereksiz
        }
      }
    }
  };

  // URL'yi oluşturma
  const { protocol, port, path, query_parameters } = value.service.parameters;

  // Null olmayan query parametrelerini filtreleme
  const filteredQueryParams = Object.fromEntries(
    Object.entries(query_parameters).filter(([key, value]) => value != null)
  );

  // URL query string oluşturma
  const queryString = Object.keys(filteredQueryParams).length > 0
    ? `?${new URLSearchParams(filteredQueryParams).toString()}`
    : '';

  // Tam URL'yi oluşturma
  const url = `${protocol}://${value.service.parameters.domain}:${port}${path ? path : ''}${queryString}`;

  // Veri toplama isteğini gönderme
  const traceId = helper.generateId(16);  // Trace ID oluşturma
  const generatedHeaders = { correlationId: traceId, traceId: traceId };  // Başlıklar oluşturma
  try {


    // Veri toplama isteğini gönderme
    await sendDataCollectRequest({ value, headers: generatedHeaders });

    // Başarı mesajı
    logger.notice(`[sendRequest] [${model.id}] success: ${generatedHeaders.correlationId} - ${url}`, { service_id: model.service.service_id, url });
  } catch (error) {
    // Hata mesajı
    logger.error(`[sendRequest] [${model.id}] Failed: ${generatedHeaders.correlationId} - ${url} ${error.message}`, { service_id: model.service.service_id, url });
  }
}

module.exports = sendRequest;
