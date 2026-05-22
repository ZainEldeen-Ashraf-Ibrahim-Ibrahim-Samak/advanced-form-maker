import "dart:convert";

import "package:cryptography/cryptography.dart";

import "../adapters/encrypted_draft_store.dart";
import "../adapters/secure_storage_adapter.dart";
import "../../domain/entities/local_draft.dart";

class SecureDraftRepository {
  SecureDraftRepository._({
    required EncryptedDraftStore store,
  }) : _store = store;

  static const String _prefix = "scct.mobile.submission.draft";

  final EncryptedDraftStore _store;

  static Future<SecureDraftRepository> create({
    SecureStorageAdapter? secureStorage,
  }) async {
    final store = await EncryptedDraftStore.create(
      secureStorage: secureStorage,
    );
    return SecureDraftRepository._(store: store);
  }

  Future<void> save(String token, LocalDraft draft) async {
    final key = await _key(token);
    await _store.writeEncrypted(key, draft.toJson());
  }

  Future<LocalDraft?> load(String token) async {
    final key = await _key(token);
    final decoded = await _store.readDecrypted(key);
    if (decoded == null) return null;
    return LocalDraft.fromJson(decoded);
  }

  Future<void> clear(String token) async {
    final key = await _key(token);
    await _store.delete(key);
  }

  Future<String> tokenRef(String token) {
    return tokenRefFor(token);
  }

  static Future<String> tokenRefFor(String token) async {
    final digest = await Sha256().hash(utf8.encode(token));
    return base64UrlEncode(digest.bytes).replaceAll("=", "");
  }

  Future<String> _key(String token) async {
    final tokenRef = await _tokenRef(token);
    return "$_prefix.$tokenRef";
  }

  Future<String> _tokenRef(String token) async {
    return tokenRefFor(token);
  }
}
