import "dart:async";
import "dart:convert";

import "package:flutter/foundation.dart";
import "package:image_picker/image_picker.dart";

import "../../data/repositories/secure_draft_repository.dart";
import "../../data/services/cloudinary_sign_client.dart";
import "../../data/services/submission_api_client.dart";
import "../../domain/constants/message_keys.dart";
import "../../domain/constants/submission_regex.dart";
import "../../domain/entities/contact_record.dart";
import "../../domain/entities/field_response.dart";
import "../../domain/entities/local_draft.dart";
import "../../domain/entities/media_upload_item.dart";
import "../../domain/entities/submission_event.dart";
import "../../domain/entities/submission_outcome.dart";
import "../../domain/entities/submission_session.dart";
import "../../domain/repositories/submission_repository.dart";
import "../../domain/services/connectivity_service.dart";
import "../../domain/services/submission_event_bus.dart";
import "../../domain/use_cases/validate_submission_draft.dart";
import "../../data/services/socket_service.dart";

class NativeSubmissionViewModel extends ChangeNotifier {
  NativeSubmissionViewModel({
    required SubmissionRepository repository,
    required SecureDraftRepository secureDraftRepository,
    required CloudinarySignClient cloudinarySignClient,
    required ConnectivityService connectivityService,
    required ValidateSubmissionDraftUseCase validator,
    required String localeCode,
    required int draftAutosaveDebounceMs,
    required String pusherKey,
    required String pusherCluster,
    SubmissionEventBus? eventBus,
  })  : _repository = repository,
        _secureDraftRepository = secureDraftRepository,
        _cloudinarySignClient = cloudinarySignClient,
        _connectivityService = connectivityService,
        _validator = validator,
        _localeCode = localeCode,
        _draftAutosaveDebounceMs = draftAutosaveDebounceMs,
        _pusherKey = pusherKey,
        _pusherCluster = pusherCluster,
        _eventBus = eventBus;

  final SubmissionRepository _repository;
  final SecureDraftRepository _secureDraftRepository;
  final CloudinarySignClient _cloudinarySignClient;
  final ConnectivityService _connectivityService;
  final ValidateSubmissionDraftUseCase _validator;
  final String _localeCode;
  final int _draftAutosaveDebounceMs;
  final String _pusherKey;
  final String _pusherCluster;
  final SubmissionEventBus? _eventBus;

  SubmissionSession? _session;
  String? _token;
  bool _isLoading = true;
  bool _isSubmitting = false;
  bool _isOnline = true;
  String? _fatalMessageKey;
  String? _statusMessageKey;
  String? _lastServerError;
  String _clientName = "";
  String _clientContact = "";
  List<ContactRecord> _contacts = <ContactRecord>[
    ContactRecord(id: "contact_primary")
  ];
  final Map<String, FieldResponse> _responsesByFieldId =
      <String, FieldResponse>{};
  final Map<String, MediaUploadItem> _mediaQueueByFieldId =
      <String, MediaUploadItem>{};
  final Map<String, String> _fieldErrorKeys = <String, String>{};
  String? _contactErrorKey;
  final Set<String> _uploadingFieldIds = <String>{};

  StreamSubscription<bool>? _connectivitySubscription;
  Timer? _autosaveTimer;

  SubmissionSession? get session => _session;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  bool get isOnline => _isOnline;
  String? get fatalMessageKey => _fatalMessageKey;
  String? get statusMessageKey => _statusMessageKey;
  String get clientName => _clientName;
  String get clientContact => _clientContact;
  List<ContactRecord> get contacts =>
      List<ContactRecord>.unmodifiable(_contacts);
  Map<String, FieldResponse> get responsesByFieldId =>
      Map<String, FieldResponse>.unmodifiable(_responsesByFieldId);
  Map<String, String> get fieldErrorKeys =>
      Map<String, String>.unmodifiable(_fieldErrorKeys);
  String? get contactErrorKey => _contactErrorKey;
  String? get lastServerError => _lastServerError;

  bool get isEditable => _session?.isEditable ?? false;
  bool get isAnyFieldUploading => _uploadingFieldIds.isNotEmpty;
  int get uploadingCount => _uploadingFieldIds.length;

  String get submitActionKey {
    if (_session?.mode == SubmissionMode.needsRewrite ||
        _session?.mode == SubmissionMode.draft) {
      return MessageKeys.submissionResubmit;
    }
    return MessageKeys.submissionSubmit;
  }

  Future<void> initialize(String token) async {
    _token = token;
    _isLoading = true;
    _fatalMessageKey = null;
    _statusMessageKey = null;
    notifyListeners();

    _isOnline = await _connectivityService.isOnline();
    await _connectivitySubscription?.cancel();
    _connectivitySubscription =
        _connectivityService.watchOnlineStatus().listen((online) {
      final wasOnline = _isOnline;
      _isOnline = online;
      if (!wasOnline && online) {
        _emitEvent(
          SubmissionEventName.queueOnlineResume,
          MessageKeys.submissionOfflineBlocked,
        );
      }
      if (_session != null) {
        _session = _session!.copyWith(isOnline: online);
      }
      notifyListeners();
    });

    try {
      if (_pusherKey.isNotEmpty) {
        await SocketService.instance.init(
          apiKey: _pusherKey,
          cluster: _pusherCluster,
        );
      }
      await _loadSessionAndDraft();
    } on SubmissionApiException catch (error) {
      _fatalMessageKey = _mapFatalMessage(error.code, error.statusCode);
      if (_fatalMessageKey == MessageKeys.submissionInvalidToken ||
          _fatalMessageKey == MessageKeys.submissionUnauthorized) {
        await _clearSensitiveSessionData();
      }
    } catch (_) {
      _fatalMessageKey = MessageKeys.submissionServerFailure;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    if (_token == null) return;
    _statusMessageKey = null;
    _fatalMessageKey = null;
    _isLoading = true;
    notifyListeners();

    try {
      await _loadSessionAndDraft();
    } on SubmissionApiException catch (error) {
      _fatalMessageKey = _mapFatalMessage(error.code, error.statusCode);
    } catch (_) {
      _fatalMessageKey = MessageKeys.submissionServerFailure;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearStatusMessage() {
    _statusMessageKey = null;
    notifyListeners();
  }

  void updateClientName(String value) {
    _clientName = value;
    _scheduleAutosave();
    notifyListeners();
  }

  void updateClientContact(String value) {
    _clientContact = value;
    _scheduleAutosave();
    notifyListeners();
  }

  void addContact() {
    _contacts = <ContactRecord>[
      ..._contacts,
      ContactRecord(id: _newContactId()),
    ];
    _scheduleAutosave();
    notifyListeners();
  }

  void removeContact(String id) {
    if (_contacts.length <= 1) {
      return;
    }

    _contacts =
        _contacts.where((contact) => contact.id != id).toList(growable: false);
    _scheduleAutosave();
    notifyListeners();
  }

  void updateContactField({
    required String id,
    String? name,
    String? email,
    String? phone,
    String? contact,
    String? role,
    String? notes,
  }) {
    _contacts = _contacts
        .map(
          (current) => current.id == id
              ? current.copyWith(
                  name: name,
                  email: email,
                  phone: phone == null ? null : normalizePhoneNumber(phone),
                  contact: contact,
                  role: role,
                  notes: notes,
                )
              : current,
        )
        .toList(growable: false);
    _scheduleAutosave();
    notifyListeners();
  }

  void setFieldValue(String fieldDefinitionId, Object? value) {
    final existing = _responsesByFieldId[fieldDefinitionId] ??
        FieldResponse(fieldDefinitionId: fieldDefinitionId);

    final definition = _session?.fields.firstWhere(
      (field) => field.id == fieldDefinitionId,
      orElse: () => const SubmissionFieldDefinition(
        id: "",
        nameEn: "",
        nameAr: "",
        inputType: SubmissionFieldType.text,
        isMultiple: false,
        validation: SubmissionFieldValidation(),
        dropdownOptionsEn: <String>[],
        dropdownOptionsAr: <String>[],
      ),
    );

    final normalizedValue =
        definition?.validation.regexType == SubmissionRegexType.phone &&
                value is String
            ? normalizePhoneNumber(value)
            : value;

    _responsesByFieldId[fieldDefinitionId] =
        existing.copyWith(value: normalizedValue);
    _scheduleAutosave();
    notifyListeners();
  }

  void clearFieldMedia(String fieldDefinitionId) {
    final existing = _responsesByFieldId[fieldDefinitionId] ??
        FieldResponse(fieldDefinitionId: fieldDefinitionId);

    _responsesByFieldId[fieldDefinitionId] = existing.copyWith(
      mediaUrl: null,
      mediaPublicId: null,
      mediaItems: const <MediaReference>[],
    );

    _mediaQueueByFieldId.remove(fieldDefinitionId);
    _scheduleAutosave();
    notifyListeners();
  }

  Future<void> uploadMediaForField({
    required String fieldDefinitionId,
    required XFile file,
  }) async {
    final requiredMedia = _isFieldMediaRequired(fieldDefinitionId);

    _emitEvent(
      SubmissionEventName.uploadStarted,
      MessageKeys.submissionMediaUpload,
      fieldId: fieldDefinitionId,
    );

    _uploadingFieldIds.add(fieldDefinitionId);
    _mediaQueueByFieldId[fieldDefinitionId] = MediaUploadItem(
      fieldDefinitionId: fieldDefinitionId,
      localUri: file.path,
      status: MediaUploadStatus.uploading,
      required: requiredMedia,
    );
    notifyListeners();

    try {
      final bytes = await file.readAsBytes();
      final session = _session;
      final fieldType = _cloudinaryFieldTypeFor(fieldDefinitionId);
      final signature = await _cloudinarySignClient.requestSignature(
        fieldType: fieldType,
        formId: session?.formTemplateId,
        draftId: _token,
      );

      final uploaded = await _cloudinarySignClient.uploadFile(
        bytes: bytes,
        fileName: file.name,
        signature: signature,
        resourceType: signature.resourceType,
      );

      final existing = _responsesByFieldId[fieldDefinitionId] ??
          FieldResponse(fieldDefinitionId: fieldDefinitionId);

      final isMultipleMedia = _isFieldMultipleMedia(fieldDefinitionId);
      final nextMediaItems = isMultipleMedia
          ? <MediaReference>[
              ...existing.mediaItems,
              uploaded,
            ]
          : <MediaReference>[uploaded];

      _responsesByFieldId[fieldDefinitionId] = existing.copyWith(
        mediaUrl: uploaded.url,
        mediaPublicId: uploaded.publicId,
        mediaItems: nextMediaItems,
      );

      _mediaQueueByFieldId[fieldDefinitionId] = MediaUploadItem(
        fieldDefinitionId: fieldDefinitionId,
        localUri: file.path,
        status: MediaUploadStatus.uploaded,
        uploadedUrl: uploaded.url,
        uploadedPublicId: uploaded.publicId,
        required: requiredMedia,
      );

      _emitEvent(
        SubmissionEventName.uploadSuccess,
        MessageKeys.submissionSuccess,
        fieldId: fieldDefinitionId,
      );

      _scheduleAutosave();
    } on SubmissionApiException {
      _statusMessageKey = MessageKeys.submissionServerFailure;
      _emitEvent(
        SubmissionEventName.uploadFailed,
        MessageKeys.submissionServerFailure,
        fieldId: fieldDefinitionId,
      );
      _mediaQueueByFieldId[fieldDefinitionId] = MediaUploadItem(
        fieldDefinitionId: fieldDefinitionId,
        localUri: file.path,
        status: MediaUploadStatus.failed,
        required: requiredMedia,
        lastError: MessageKeys.submissionServerFailure,
      );
    } catch (_) {
      _statusMessageKey = MessageKeys.submissionServerFailure;
      _emitEvent(
        SubmissionEventName.uploadFailed,
        MessageKeys.submissionServerFailure,
        fieldId: fieldDefinitionId,
      );
      _mediaQueueByFieldId[fieldDefinitionId] = MediaUploadItem(
        fieldDefinitionId: fieldDefinitionId,
        localUri: file.path,
        status: MediaUploadStatus.failed,
        required: requiredMedia,
        lastError: MessageKeys.submissionServerFailure,
      );
    } finally {
      _uploadingFieldIds.remove(fieldDefinitionId);
      notifyListeners();
    }
  }

  bool isFieldUploading(String fieldDefinitionId) {
    return _uploadingFieldIds.contains(fieldDefinitionId);
  }

  bool get hasBlockingRequiredMedia {
    for (final field
        in _session?.fields ?? const <SubmissionFieldDefinition>[]) {
      final isMediaField = field.inputType == SubmissionFieldType.image ||
          field.inputType == SubmissionFieldType.file;
      if (!isMediaField || !field.validation.required) {
        continue;
      }

      final response = _responsesByFieldId[field.id] ??
          FieldResponse(fieldDefinitionId: field.id);
      final hasResponseMedia =
          (response.mediaUrl?.trim().isNotEmpty ?? false) ||
              response.mediaItems.isNotEmpty;
      if (!hasResponseMedia) {
        return true;
      }

      final queue = _mediaQueueByFieldId[field.id];
      if (queue != null && queue.isBlockingRequiredUpload) {
        return true;
      }
    }

    return false;
  }

  Future<void> submitOrResubmit() async {
    final token = _token;
    final session = _session;
    if (token == null || session == null) {
      return;
    }

    if (!_isOnline) {
      _statusMessageKey = MessageKeys.submissionOfflineBlocked;
      notifyListeners();
      return;
    }

    if (isAnyFieldUploading) {
      _statusMessageKey = MessageKeys.submissionMediaUpload;
      _emitEvent(
        SubmissionEventName.validationFailed,
        MessageKeys.submissionMediaUpload,
      );
      notifyListeners();
      return;
    }

    final validation = _validator.execute(
      contacts: _contacts,
      contactFormFields: session.contactFormFields,
      fields: session.fields,
      responses: _responsesByFieldId,
    );
    _fieldErrorKeys
      ..clear()
      ..addAll(validation.fieldErrorKeys);
    _contactErrorKey = validation.contactErrorKey;

    if (!validation.isValid) {
      _statusMessageKey = MessageKeys.submissionValidationFailed;
      _emitEvent(
        SubmissionEventName.validationFailed,
        MessageKeys.submissionValidationFailed,
      );
      notifyListeners();
      return;
    }

    if (hasBlockingRequiredMedia) {
      _statusMessageKey = MessageKeys.submissionRequiredMedia;
      _emitEvent(
        SubmissionEventName.validationFailed,
        MessageKeys.submissionRequiredMedia,
      );
      notifyListeners();
      return;
    }

    _emitEvent(
      SubmissionEventName.submitStarted,
      MessageKeys.submissionSubmit,
    );

    _isSubmitting = true;
    _statusMessageKey = null;
    notifyListeners();

    final mutation = SubmissionMutationInput(
      token: token,
      clientName: _clientName.trim().isEmpty ? "Client" : _clientName.trim(),
      clientContact: _clientContact.trim(),
      contacts: _contacts,
      fieldResponses: _responsesByFieldId.values.toList(growable: false),
      expectedFormVersion: session.formVersion,
      expectedSubmissionUpdatedAt: session.submissionUpdatedAt,
    );

    final outcome = session.mode == SubmissionMode.newSubmission
        ? await _repository.submit(mutation)
        : await _repository.resubmit(mutation);

    _isSubmitting = false;

    switch (outcome.kind) {
      case SubmissionOutcomeKind.success:
        _statusMessageKey = MessageKeys.submissionSuccess;
        _emitEvent(
          SubmissionEventName.submitSuccess,
          MessageKeys.submissionSuccess,
        );
        await _clearSensitiveSessionData();
        break;
      case SubmissionOutcomeKind.validationError:
        _statusMessageKey = MessageKeys.submissionValidationFailed;
        _emitEvent(
          SubmissionEventName.validationFailed,
          MessageKeys.submissionValidationFailed,
        );
        break;
      case SubmissionOutcomeKind.staleConflict:
        _statusMessageKey = MessageKeys.submissionStaleConflict;
        _emitEvent(
          SubmissionEventName.submitFailed,
          MessageKeys.submissionStaleConflict,
        );
        break;
      case SubmissionOutcomeKind.unauthorized:
        _statusMessageKey = MessageKeys.submissionUnauthorized;
        _emitEvent(
          SubmissionEventName.submitFailed,
          MessageKeys.submissionUnauthorized,
        );
        await _clearSensitiveSessionData();
        break;
      case SubmissionOutcomeKind.invalidToken:
        _statusMessageKey = MessageKeys.submissionInvalidToken;
        _emitEvent(
          SubmissionEventName.submitFailed,
          MessageKeys.submissionInvalidToken,
        );
        await _clearSensitiveSessionData();
        break;
      case SubmissionOutcomeKind.networkError:
      case SubmissionOutcomeKind.serverError:
        _statusMessageKey = MessageKeys.submissionServerFailure;
        _lastServerError = outcome.message;
        _emitEvent(
          SubmissionEventName.submitFailed,
          outcome.message.isNotEmpty
              ? outcome.message
              : MessageKeys.submissionServerFailure,
        );
        break;
    }

    notifyListeners();
  }

  Future<void> saveDraftNow() async {
    final token = _token;
    final session = _session;
    if (token == null || session == null) {
      return;
    }

    final tokenRef = await _secureDraftRepository.tokenRef(token);
    final draft = LocalDraft(
      draftId: "draft_${DateTime.now().microsecondsSinceEpoch}",
      tokenRef: tokenRef,
      clientName: _clientName,
      contacts: _contacts,
      fieldResponses: _responsesByFieldId.values.toList(growable: false),
      mediaQueue: _mediaQueueByFieldId.values.toList(growable: false),
      lastSyncedFormVersion: session.formVersion,
      submissionUpdatedAt: session.submissionUpdatedAt,
      lastSavedAt: DateTime.now().toUtc(),
    );

    await _secureDraftRepository.save(token, draft);
    _emitEvent(
      SubmissionEventName.draftSaved,
      MessageKeys.submissionSaveDraft,
    );
  }

  Future<void> _loadSessionAndDraft() async {
    final token = _token;
    if (token == null) {
      return;
    }

    final session =
        await _repository.loadSession(token, localeCode: _localeCode);
    _session = session.copyWith(isOnline: _isOnline);

    if (_pusherKey.isNotEmpty) {
      unawaited(SocketService.instance.subscribe(
        channelName: "submission-$token",
        eventName: "status-updated",
        onData: (data) {
          if (kDebugMode) {
            print("Pusher: Status updated signal received. Refreshing...");
          }
          refresh();
        },
      ));
    }

    _clientName = _session!.clientName;
    _clientContact = _session!.clientContact;
    _contacts = List<ContactRecord>.from(_session!.contacts);

    _responsesByFieldId
      ..clear()
      ..addEntries(_session!.fieldResponses
          .map((response) => MapEntry(response.fieldDefinitionId, response)));

    final draft = await _secureDraftRepository.load(token);
    if (draft != null) {
      _applyDraft(draft);
      _emitEvent(
        SubmissionEventName.draftRestored,
        MessageKeys.submissionSaveDraft,
      );
    }
  }

  void _emitEvent(
    SubmissionEventName name,
    String messageKey, {
    String? fieldId,
    Map<String, Object?> payload = const <String, Object?>{},
  }) {
    _eventBus?.emit(
      SubmissionEvent(
        name: name,
        messageKey: messageKey,
        fieldId: fieldId,
        payload: payload,
      ),
    );
  }

  void _applyDraft(LocalDraft draft) {
    if (draft.clientName.trim().isNotEmpty) {
      _clientName = draft.clientName;
    }

    if (draft.contacts.isNotEmpty) {
      _contacts = draft.contacts;
    }

    for (final response in draft.fieldResponses) {
      _responsesByFieldId[response.fieldDefinitionId] = response;
    }

    _mediaQueueByFieldId
      ..clear()
      ..addEntries(draft.mediaQueue
          .map((item) => MapEntry(item.fieldDefinitionId, item)));
  }

  bool _isFieldMediaRequired(String fieldDefinitionId) {
    final field = _session?.fields.firstWhere(
      (item) => item.id == fieldDefinitionId,
      orElse: () => const SubmissionFieldDefinition(
        id: "",
        nameEn: "",
        nameAr: "",
        inputType: SubmissionFieldType.text,
        isMultiple: false,
        validation: SubmissionFieldValidation(),
        dropdownOptionsEn: <String>[],
        dropdownOptionsAr: <String>[],
      ),
    );

    if (field == null || field.id.isEmpty) {
      return false;
    }

    return (field.inputType == SubmissionFieldType.image ||
            field.inputType == SubmissionFieldType.file) &&
        field.validation.required;
  }

  bool _isFieldMultipleMedia(String fieldDefinitionId) {
    final field = _session?.fields.firstWhere(
      (item) => item.id == fieldDefinitionId,
      orElse: () => const SubmissionFieldDefinition(
        id: "",
        nameEn: "",
        nameAr: "",
        inputType: SubmissionFieldType.text,
        isMultiple: false,
        validation: SubmissionFieldValidation(),
        dropdownOptionsEn: <String>[],
        dropdownOptionsAr: <String>[],
      ),
    );

    if (field == null || field.id.isEmpty) {
      return false;
    }

    final isMedia = field.inputType == SubmissionFieldType.image ||
        field.inputType == SubmissionFieldType.file;

    return isMedia && field.isMultiple;
  }

  String _cloudinaryFieldTypeFor(String fieldDefinitionId) {
    final field = _session?.fields.firstWhere(
      (item) => item.id == fieldDefinitionId,
      orElse: () => const SubmissionFieldDefinition(
        id: "",
        nameEn: "",
        nameAr: "",
        inputType: SubmissionFieldType.text,
        isMultiple: false,
        validation: SubmissionFieldValidation(),
        dropdownOptionsEn: <String>[],
        dropdownOptionsAr: <String>[],
      ),
    );

    return field?.inputType == SubmissionFieldType.image ? "image" : "file";
  }

  String _newContactId() {
    return "contact_${DateTime.now().microsecondsSinceEpoch}";
  }

  String _mapFatalMessage(String? code, int statusCode) {
    final normalized = (code ?? "").toUpperCase();
    if (statusCode == 401 || normalized == "UNAUTHORIZED") {
      return MessageKeys.submissionUnauthorized;
    }
    if (statusCode == 404 || normalized == "NOT_FOUND") {
      return MessageKeys.submissionInvalidToken;
    }
    return MessageKeys.submissionServerFailure;
  }

  Future<void> _clearSensitiveSessionData() async {
    final token = _token;
    if (token != null) {
      await _secureDraftRepository.clear(token);
    }
    await _repository.clearSessionSecrets();
  }

  void _scheduleAutosave() {
    _autosaveTimer?.cancel();
    _autosaveTimer = Timer(
      Duration(milliseconds: _draftAutosaveDebounceMs),
      () {
        unawaited(saveDraftNow());
      },
    );
  }

  @override
  void dispose() {
    if (_token != null) {
      SocketService.instance.unsubscribe("submission-$_token");
    }
    _connectivitySubscription?.cancel();
    _autosaveTimer?.cancel();
    super.dispose();
  }
}
