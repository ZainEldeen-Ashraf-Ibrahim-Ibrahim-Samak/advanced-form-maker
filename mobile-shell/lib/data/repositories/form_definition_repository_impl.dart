import "dart:async";
import "dart:convert";

import "package:hive/hive.dart";
import "package:http/http.dart" as http;

import "../../domain/entities/form_definition.dart";
import "../../domain/repositories/form_definition_repository.dart";
import "../services/submission_api_client.dart";

class FormDefinitionRepositoryImpl implements FormDefinitionRepository {
  FormDefinitionRepositoryImpl({
    required Uri baseUrl,
    required int timeoutMs,
    http.Client? httpClient,
  })  : _baseUrl = baseUrl,
        _timeout = Duration(milliseconds: timeoutMs),
        _httpClient = httpClient ?? http.Client();

  static const String _boxName = "form_definitions";

  final Uri _baseUrl;
  final Duration _timeout;
  final http.Client _httpClient;
  final List<StreamSubscription<bool>> _subscriptions =
      <StreamSubscription<bool>>[];

  @override
  Future<FormDefinition> fetchById(
    String formId, {
    bool forceRefresh = false,
    String locale = "ar",
  }) async {
    if (!forceRefresh) {
      final cached = await getCached(formId);
      if (cached != null) {
        return cached;
      }
    }

    final uri = _baseUrl.resolve("/api/forms/$formId/definition");
    final response = await _httpClient.get(
      uri,
      headers: const <String, String>{
        "Accept": "application/json",
      },
    ).timeout(_timeout);

    final body = _decodeJson(response.body);
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        body["success"] != true ||
        body["data"] is! Map<String, dynamic>) {
      throw SubmissionApiException(
        message:
            (body["error"] ?? "Failed to fetch form definition").toString(),
        statusCode: response.statusCode,
        code: body["code"]?.toString(),
      );
    }

    final data = Map<String, dynamic>.from(body["data"] as Map<String, dynamic>)
      ..["fetchedAt"] = DateTime.now().toUtc().toIso8601String()
      ..["locale"] = locale;

    final definition = FormDefinition.fromJson(data);
    final box = await _openBox();
    await box.put(formId, definition.toJson());
    return definition;
  }

  @override
  Future<FormDefinition?> getCached(String formId) async {
    final box = await _openBox();
    final cached = box.get(formId);
    if (cached is Map<String, dynamic>) {
      return FormDefinition.fromJson(cached);
    }

    if (cached is Map) {
      return FormDefinition.fromJson(cached.cast<String, dynamic>());
    }

    return null;
  }

  @override
  void attachReconnectRefresh({
    required String formId,
    required Stream<bool> onlineStream,
    String locale = "ar",
  }) {
    final subscription = onlineStream.listen((isOnline) {
      if (!isOnline) {
        return;
      }

      unawaited(() async {
        try {
          await fetchById(
            formId,
            forceRefresh: true,
            locale: locale,
          );
        } catch (_) {
          // Ignore reconnect refresh errors and keep cached definition.
        }
      }());
    });

    _subscriptions.add(subscription);
  }

  @override
  Future<void> dispose() async {
    for (final subscription in _subscriptions) {
      await subscription.cancel();
    }
    _subscriptions.clear();
  }

  Future<Box<dynamic>> _openBox() async {
    if (Hive.isBoxOpen(_boxName)) {
      return Hive.box<dynamic>(_boxName);
    }

    return Hive.openBox<dynamic>(_boxName);
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
