import "dart:async";
import "dart:convert";

import "package:http/http.dart" as http;

class SubmissionApiException implements Exception {
  const SubmissionApiException({
    required this.message,
    required this.statusCode,
    this.code,
  });

  final String message;
  final int statusCode;
  final String? code;

  @override
  String toString() {
    return "SubmissionApiException(status: $statusCode, code: $code, message: $message)";
  }
}

class SubmissionApiClient {
  SubmissionApiClient({
    required Uri baseUrl,
    required int timeoutMs,
    http.Client? httpClient,
  })  : _baseUrl = baseUrl,
        _timeout = Duration(milliseconds: timeoutMs),
        _httpClient = httpClient ?? http.Client();

  final Uri _baseUrl;
  final Duration _timeout;
  final http.Client _httpClient;

  Future<Map<String, dynamic>> fetchSubmissionSession(String token) {
    final uri = _baseUrl.resolve("/api/submissions/$token");
    return _request(
      method: "GET",
      uri: uri,
      body: null,
      headers: const <String, String>{},
    );
  }

  Future<Map<String, dynamic>> submitNew({
    required String token,
    required Map<String, dynamic> payload,
    String? ifMatchFormVersion,
  }) {
    final uri = _baseUrl.resolve("/api/submissions/$token");
    return _request(
      method: "POST",
      uri: uri,
      body: payload,
      headers: const <String, String>{},
    );
  }

  Future<Map<String, dynamic>> resubmit({
    required String token,
    required Map<String, dynamic> payload,
    String? ifMatchFormVersion,
    String? ifMatchSubmissionUpdatedAt,
  }) {
    final uri = _baseUrl.resolve("/api/submissions/$token");
    return _request(
      method: "PATCH",
      uri: uri,
      body: payload,
      headers: const <String, String>{},
    );
  }

  Future<Map<String, dynamic>> _request({
    required String method,
    required Uri uri,
    required Map<String, dynamic>? body,
    required Map<String, String> headers,
  }) async {
    final normalizedHeaders = <String, String>{
      "Accept": "application/json",
      ...headers,
      if (body != null) "Content-Type": "application/json",
    };

    http.Response response;
    try {
      switch (method) {
        case "GET":
          response = await _httpClient
              .get(uri, headers: normalizedHeaders)
              .timeout(_timeout);
          break;
        case "POST":
          response = await _httpClient
              .post(
                uri,
                headers: normalizedHeaders,
                body: jsonEncode(body ?? const <String, dynamic>{}),
              )
              .timeout(_timeout);
          break;
        case "PATCH":
          response = await _httpClient
              .patch(
                uri,
                headers: normalizedHeaders,
                body: jsonEncode(body ?? const <String, dynamic>{}),
              )
              .timeout(_timeout);
          break;
        default:
          throw const SubmissionApiException(
            message: "Unsupported request method",
            statusCode: 500,
            code: "UNSUPPORTED_METHOD",
          );
      }
    } on TimeoutException {
      throw const SubmissionApiException(
        message: "Request timed out",
        statusCode: 408,
        code: "TIMEOUT",
      );
    } on SubmissionApiException {
      rethrow;
    } catch (_) {
      throw const SubmissionApiException(
        message: "Network request failed",
        statusCode: 503,
        code: "NETWORK_ERROR",
      );
    }

    final jsonBody = _decodeJson(response.body);
    final success = jsonBody["success"] == true;

    if (response.statusCode >= 200 && response.statusCode < 300 && success) {
      final data = jsonBody["data"];
      if (data is Map<String, dynamic>) {
        return data;
      }
      return <String, dynamic>{};
    }

    throw SubmissionApiException(
      message: (jsonBody["error"] ?? "Request failed").toString(),
      statusCode: response.statusCode,
      code: jsonBody["code"]?.toString(),
    );
  }

  Map<String, dynamic> _decodeJson(String rawBody) {
    if (rawBody.trim().isEmpty) {
      return const <String, dynamic>{};
    }

    try {
      final decoded = jsonDecode(rawBody);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return const <String, dynamic>{};
    } catch (_) {
      return const <String, dynamic>{};
    }
  }
}
