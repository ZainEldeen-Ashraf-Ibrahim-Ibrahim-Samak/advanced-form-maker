import "dart:convert";
import "dart:typed_data";

import "package:http/http.dart" as http;

import "../../domain/entities/field_response.dart";
import "submission_api_client.dart";

class CloudinarySignResponse {
  const CloudinarySignResponse({
    required this.signature,
    required this.timestamp,
    required this.apiKey,
    required this.cloudName,
    this.folder,
    this.uploadPreset,
    this.resourceType,
    this.eager,
  });

  final String signature;
  final int timestamp;
  final String apiKey;
  final String cloudName;
  final String? folder;
  final String? uploadPreset;
  final String? resourceType;
  final String? eager;
}

class CloudinarySignClient {
  CloudinarySignClient({
    required Uri baseUrl,
    required int timeoutMs,
    http.Client? httpClient,
  })  : _baseUrl = baseUrl,
        _timeoutMs = timeoutMs,
        _httpClient = httpClient ?? http.Client();

  final Uri _baseUrl;
  final int _timeoutMs;
  final http.Client _httpClient;

  Future<CloudinarySignResponse> requestSignature({
    String? folder,
    String? eager,
    String? publicId,
    String? fieldType,
    String? formId,
    String? draftId,
  }) async {
    final uri = _baseUrl.resolve("/api/cloudinary/sign");

    final payload = <String, dynamic>{
      "timestamp": DateTime.now().toUtc().millisecondsSinceEpoch ~/ 1000,
      if (folder != null && folder.trim().isNotEmpty) "folder": folder.trim(),
      if (eager != null && eager.trim().isNotEmpty) "eager": eager.trim(),
      if (publicId != null && publicId.trim().isNotEmpty)
        "public_id": publicId.trim(),
      if (fieldType != null && fieldType.trim().isNotEmpty)
        "fieldType": fieldType.trim(),
      if (formId != null && formId.trim().isNotEmpty) "formId": formId.trim(),
      if (draftId != null && draftId.trim().isNotEmpty)
        "draftId": draftId.trim(),
    };

    final response = await _httpClient
        .post(
          uri,
          headers: const <String, String>{
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: jsonEncode(payload),
        )
        .timeout(Duration(milliseconds: _timeoutMs));

    final body = _decodeBody(response.body);
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        body["success"] != true) {
      throw SubmissionApiException(
        message:
            (body["error"] ?? "Cloudinary signature request failed").toString(),
        statusCode: response.statusCode,
        code: body["code"]?.toString(),
      );
    }

    final data =
        body["data"] as Map<String, dynamic>? ?? const <String, dynamic>{};

    final cloudName = _firstNonEmptyString(<Object?>[
      data["cloudName"],
      data["cloud_name"],
      data["cloudname"],
    ]);

    final apiKey = _firstNonEmptyString(<Object?>[
      data["apiKey"],
      data["api_key"],
      data["apikey"],
    ]);

    final signatureValue = _firstNonEmptyString(<Object?>[
      data["signature"],
    ]);

    final timestampValue = (data["timestamp"] is int)
        ? data["timestamp"] as int
        : int.tryParse((data["timestamp"] ?? "0").toString()) ?? 0;

    if (signatureValue.isEmpty ||
        cloudName.isEmpty ||
        apiKey.isEmpty ||
        timestampValue <= 0) {
      throw const SubmissionApiException(
        message: "Cloudinary signature response is missing required fields",
        statusCode: 500,
        code: "SIGNATURE_RESPONSE_INVALID",
      );
    }

    final resolvedFolder = _firstNonEmptyString(<Object?>[
      data["folder"],
    ]);
    final resolvedUploadPreset = _firstNonEmptyString(<Object?>[
      data["uploadPreset"],
      data["upload_preset"],
    ]);
    final resolvedResourceType = _firstNonEmptyString(<Object?>[
      data["resourceType"],
      data["resource_type"],
    ]);
    final resolvedEager = _firstNonEmptyString(<Object?>[
      data["eager"],
    ]);

    return CloudinarySignResponse(
      signature: signatureValue,
      timestamp: timestampValue,
      apiKey: apiKey,
      cloudName: cloudName,
      folder: resolvedFolder.isEmpty ? null : resolvedFolder,
      uploadPreset: resolvedUploadPreset.isEmpty ? null : resolvedUploadPreset,
      resourceType: resolvedResourceType.isEmpty ? null : resolvedResourceType,
      eager: resolvedEager.isEmpty ? null : resolvedEager,
    );
  }

  Future<MediaReference> uploadFile({
    required Uint8List bytes,
    required String fileName,
    required CloudinarySignResponse signature,
    String? folder,
    String? publicId,
    String? uploadPreset,
    String? resourceType,
    String? eager,
  }) async {
    final resolvedResourceType = _firstNonEmptyString(<Object?>[
      resourceType,
      signature.resourceType,
      "auto",
    ]);
    final uploadUri = Uri.parse(
        "https://api.cloudinary.com/v1_1/${signature.cloudName}/$resolvedResourceType/upload");

    final request = http.MultipartRequest("POST", uploadUri)
      ..fields["api_key"] = signature.apiKey
      ..fields["timestamp"] = signature.timestamp.toString()
      ..fields["signature"] = signature.signature;

    final resolvedFolder = _firstNonEmptyString(<Object?>[
      folder,
      signature.folder,
    ]);
    if (resolvedFolder.isNotEmpty) {
      request.fields["folder"] = resolvedFolder;
    }

    if (publicId != null && publicId.trim().isNotEmpty) {
      request.fields["public_id"] = publicId.trim();
    }

    final resolvedUploadPreset = _firstNonEmptyString(<Object?>[
      uploadPreset,
      signature.uploadPreset,
    ]);
    if (resolvedUploadPreset.isNotEmpty) {
      request.fields["upload_preset"] = resolvedUploadPreset;
    }

    final resolvedEager = _firstNonEmptyString(<Object?>[
      eager,
      signature.eager,
    ]);
    if (resolvedEager.isNotEmpty) {
      request.fields["eager"] = resolvedEager;
    }

    request.files.add(http.MultipartFile.fromBytes(
      "file",
      bytes,
      filename: fileName,
    ));

    final streamResponse = await _httpClient
        .send(request)
        .timeout(Duration(milliseconds: _timeoutMs));
    final response = await http.Response.fromStream(streamResponse);
    final body = _decodeBody(response.body);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw SubmissionApiException(
        message: (body["error"] ?? "Cloudinary upload failed").toString(),
        statusCode: response.statusCode,
        code: body["code"]?.toString(),
      );
    }

    final secureUrl = (body["secure_url"] ?? body["url"] ?? "").toString();
    final returnedPublicId = (body["public_id"] ?? "").toString();

    if (secureUrl.isEmpty || returnedPublicId.isEmpty) {
      throw const SubmissionApiException(
        message: "Cloudinary upload response missing media references",
        statusCode: 500,
        code: "UPLOAD_RESPONSE_INVALID",
      );
    }

    return MediaReference(
      url: secureUrl,
      publicId: returnedPublicId,
    );
  }

  Map<String, dynamic> _decodeBody(String raw) {
    if (raw.trim().isEmpty) {
      return const <String, dynamic>{};
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return const <String, dynamic>{};
    } catch (_) {
      return const <String, dynamic>{};
    }
  }

  String _firstNonEmptyString(List<Object?> values) {
    for (final value in values) {
      final text = (value ?? "").toString().trim();
      if (text.isNotEmpty) {
        return text;
      }
    }

    return "";
  }
}
