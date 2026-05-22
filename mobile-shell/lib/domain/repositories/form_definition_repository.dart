import "../entities/form_definition.dart";

abstract class FormDefinitionRepository {
  Future<FormDefinition> fetchById(
    String formId, {
    bool forceRefresh = false,
    String locale = "ar",
  });

  Future<FormDefinition?> getCached(String formId);

  void attachReconnectRefresh({
    required String formId,
    required Stream<bool> onlineStream,
    String locale = "ar",
  });

  Future<void> dispose();
}
