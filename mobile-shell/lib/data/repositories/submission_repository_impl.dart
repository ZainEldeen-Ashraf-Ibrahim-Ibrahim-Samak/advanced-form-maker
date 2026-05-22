import "dart:convert";

import "package:cryptography/cryptography.dart";

import "../../data/adapters/encrypted_draft_store.dart";
import "../../data/adapters/secure_storage_adapter.dart";
import "../../data/mappers/submission_mapper.dart";
import "../../data/services/submission_api_client.dart";
import "../../domain/entities/local_draft.dart";
import "../../domain/entities/submission_outcome.dart";
import "../../domain/entities/submission_session.dart";
import "../../domain/repositories/submission_repository.dart";

class SubmissionRepositoryImpl implements SubmissionRepository {
  SubmissionRepositoryImpl({
    required SubmissionApiClient submissionApiClient,
    required SubmissionMapper mapper,
    required SecureStorageAdapter secureStorage,
  })  : _submissionApiClient = submissionApiClient,
        _mapper = mapper,
        _secureStorage = secureStorage;

  static const String _sessionTokenKey = "scct.mobile.submission.token";
  static const String _draftKeyPrefix = "scct.mobile.submission.draft";

  final SubmissionApiClient _submissionApiClient;
  final SubmissionMapper _mapper;
  final SecureStorageAdapter _secureStorage;

  Future<EncryptedDraftStore>? _draftStoreFuture;

  @override
  Future<SubmissionSession> loadSession(String token, {required String localeCode}) async {
    await persistSessionToken(token);

    try {
      final data = await _submissionApiClient.fetchSubmissionSession(token);
      return _mapper.mapSession(
        token: token,
        localeCode: localeCode,
        isOnline: true,
        data: data,
      );
    } on SubmissionApiException catch (error) {
      if (error.statusCode == 404 || error.statusCode == 401) {
        await clearSessionSecrets();
      }
      rethrow;
    }
  }

  @override
  Future<SubmissionOutcome> submit(SubmissionMutationInput input) async {
    try {
      await _submissionApiClient.submitNew(
        token: input.token,
        payload: input.toRequestJson(),
        ifMatchFormVersion: input.expectedFormVersion,
      );
      return const SubmissionOutcome(
        kind: SubmissionOutcomeKind.success,
        message: "ok",
      );
    } on SubmissionApiException catch (error) {
      return _mapFailure(error);
    }
  }

  @override
  Future<SubmissionOutcome> resubmit(SubmissionMutationInput input) async {
    try {
      await _submissionApiClient.resubmit(
        token: input.token,
        payload: input.toRequestJson(),
        ifMatchFormVersion: input.expectedFormVersion,
        ifMatchSubmissionUpdatedAt: input.expectedSubmissionUpdatedAt,
      );
      return const SubmissionOutcome(
        kind: SubmissionOutcomeKind.success,
        message: "ok",
      );
    } on SubmissionApiException catch (error) {
      return _mapFailure(error);
    }
  }

  @override
  Future<void> persistSessionToken(String token) {
    return _secureStorage.write(_sessionTokenKey, token);
  }

  @override
  Future<void> clearSessionSecrets() async {
    await _secureStorage.delete(_sessionTokenKey);
  }

  @override
  Future<LocalDraft?> loadDraft(String token) async {
    final draftStore = await _draftStore();
    final key = await _draftStorageKey(token);
    final decoded = await draftStore.readDecrypted(key);
    if (decoded == null) {
      return null;
    }

    return LocalDraft.fromJson(decoded);
  }

  @override
  Future<void> saveDraft(LocalDraft draft) async {
    final draftStore = await _draftStore();
    final key = await _draftStorageKeyByRef(draft.tokenRef);
    await draftStore.writeEncrypted(key, draft.toJson());
  }

  @override
  Future<void> clearDraft(String token) async {
    final draftStore = await _draftStore();
    final key = await _draftStorageKey(token);
    await draftStore.delete(key);
  }

  Future<String> buildTokenRef(String token) {
    return _tokenRef(token);
  }

  Future<EncryptedDraftStore> _draftStore() {
    return _draftStoreFuture ??= EncryptedDraftStore.create(secureStorage: _secureStorage);
  }

  Future<String> _draftStorageKey(String token) async {
    final tokenRef = await _tokenRef(token);
    return _draftStorageKeyByRef(tokenRef);
  }

  Future<String> _draftStorageKeyByRef(String tokenRef) async {
    return "$_draftKeyPrefix.$tokenRef";
  }

  Future<String> _tokenRef(String token) async {
    final digest = await Sha256().hash(utf8.encode(token));
    return base64UrlEncode(digest.bytes).replaceAll("=", "");
  }

  SubmissionOutcome _mapFailure(SubmissionApiException error) {
    final code = (error.code ?? "").toUpperCase();

    if (error.statusCode == 401 || code == "UNAUTHORIZED") {
      return SubmissionOutcome(
        kind: SubmissionOutcomeKind.unauthorized,
        code: error.code,
        message: error.message,
      );
    }

    if (error.statusCode == 404 || code == "NOT_FOUND") {
      return SubmissionOutcome(
        kind: SubmissionOutcomeKind.invalidToken,
        code: error.code,
        message: error.message,
      );
    }

    if (error.statusCode == 409 || code.startsWith("STALE_")) {
      return SubmissionOutcome(
        kind: SubmissionOutcomeKind.staleConflict,
        code: error.code,
        message: error.message,
        retryable: true,
      );
    }

    if (error.statusCode == 400 &&
        (code == "VALIDATION_ERROR" || code == "SUBMISSION_INVALID" || code == "RESUBMISSION_INVALID")) {
      return SubmissionOutcome(
        kind: SubmissionOutcomeKind.validationError,
        code: error.code,
        message: error.message,
      );
    }

    if (error.code == "TIMEOUT" || error.code == "NETWORK_ERROR" || error.statusCode == 503) {
      return SubmissionOutcome(
        kind: SubmissionOutcomeKind.networkError,
        code: error.code,
        message: error.message,
        retryable: true,
      );
    }

    return SubmissionOutcome(
      kind: SubmissionOutcomeKind.serverError,
      code: error.code,
      message: error.message,
      retryable: error.statusCode >= 500,
    );
  }
}
