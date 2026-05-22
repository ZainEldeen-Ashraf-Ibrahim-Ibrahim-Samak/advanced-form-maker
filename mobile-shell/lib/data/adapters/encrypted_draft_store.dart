import "dart:convert";
import "dart:math";

import "package:cryptography/cryptography.dart";
import "package:shared_preferences/shared_preferences.dart";

import "secure_storage_adapter.dart";

class EncryptedDraftStore {
  EncryptedDraftStore._({
    required SharedPreferences prefs,
    required SecureStorageAdapter secureStorage,
  })  : _prefs = prefs,
        _secureStorage = secureStorage;

  static const String _masterKeyName = "scct.mobile.draft.master_key.v1";

  final SharedPreferences _prefs;
  final SecureStorageAdapter _secureStorage;
  final AesGcm _algorithm = AesGcm.with256bits();

  static Future<EncryptedDraftStore> create({
    SecureStorageAdapter? secureStorage,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    return EncryptedDraftStore._(
      prefs: prefs,
      secureStorage: secureStorage ?? SecureStorageAdapter(),
    );
  }

  Future<void> writeEncrypted(String key, Map<String, dynamic> payload) async {
    final secretKey = await _resolveSecretKey();
    final nonce = _randomBytes(12);
    final plainBytes = utf8.encode(jsonEncode(payload));

    final secretBox = await _algorithm.encrypt(
      plainBytes,
      secretKey: secretKey,
      nonce: nonce,
    );

    final envelope = <String, String>{
      "n": base64Encode(secretBox.nonce),
      "c": base64Encode(secretBox.cipherText),
      "m": base64Encode(secretBox.mac.bytes),
    };

    await _prefs.setString(key, jsonEncode(envelope));
  }

  Future<Map<String, dynamic>?> readDecrypted(String key) async {
    final raw = _prefs.getString(key);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map<String, dynamic>) {
        return null;
      }

      final nonce = base64Decode((decoded["n"] ?? "").toString());
      final cipherText = base64Decode((decoded["c"] ?? "").toString());
      final macBytes = base64Decode((decoded["m"] ?? "").toString());

      final secretKey = await _resolveSecretKey();
      final secretBox = SecretBox(
        cipherText,
        nonce: nonce,
        mac: Mac(macBytes),
      );

      final clearBytes = await _algorithm.decrypt(secretBox, secretKey: secretKey);
      final clearText = utf8.decode(clearBytes);
      final clearJson = jsonDecode(clearText);
      if (clearJson is! Map<String, dynamic>) {
        return null;
      }
      return clearJson;
    } catch (_) {
      // Backward compatibility: if data was previously stored as plain JSON map.
      try {
        final legacy = jsonDecode(raw);
        if (legacy is Map<String, dynamic>) {
          return legacy;
        }
      } catch (_) {
        return null;
      }
      return null;
    }
  }

  Future<void> delete(String key) {
    return _prefs.remove(key);
  }

  Future<SecretKey> _resolveSecretKey() async {
    final existing = await _secureStorage.read(_masterKeyName);
    if (existing != null && existing.isNotEmpty) {
      return SecretKey(base64Decode(existing));
    }

    final randomKey = _randomBytes(32);
    await _secureStorage.write(_masterKeyName, base64Encode(randomKey));
    return SecretKey(randomKey);
  }

  List<int> _randomBytes(int count) {
    final random = Random.secure();
    return List<int>.generate(count, (_) => random.nextInt(256));
  }
}
