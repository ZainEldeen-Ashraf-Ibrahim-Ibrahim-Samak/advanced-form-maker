import "dart:async";

import "package:flutter/material.dart";

import "../../data/adapters/connectivity_adapter.dart";
import "../../data/adapters/secure_storage_adapter.dart";
import "../../data/mappers/submission_mapper.dart";
import "../../data/repositories/secure_draft_repository.dart";
import "../../data/repositories/submission_repository_impl.dart";
import "../../data/services/cloudinary_sign_client.dart";
import "../../data/services/submission_api_client.dart";
import "../../domain/constants/message_keys.dart";
import "../../domain/services/connectivity_service.dart";
import "../../domain/use_cases/validate_submission_draft.dart";
import "../../i18n/index.dart";
import "../components/submission/contact_records_section.dart";
import "../components/submission/field_response_section.dart";
import "../components/submission/offline_banner.dart";
import "../components/submission/submission_toast_host.dart";
import "../view_models/native_submission_view_model.dart";
import "../../domain/services/submission_event_bus.dart";

class NativeSubmissionScreen extends StatefulWidget {
  const NativeSubmissionScreen({
    super.key,
    required this.token,
    required this.appBaseUrl,
    required this.localeCode,
    required this.apiTimeoutMs,
    required this.draftAutosaveDebounceMs,
    required this.pusherKey,
    required this.pusherCluster,
    this.themeMode = ThemeMode.light,
    this.currentLocale = const Locale("en"),
    this.onToggleTheme,
    this.onLocaleSelected,
  });

  final String token;
  final Uri appBaseUrl;
  final String localeCode;
  final int apiTimeoutMs;
  final int draftAutosaveDebounceMs;
  final String pusherKey;
  final String pusherCluster;
  final ThemeMode themeMode;
  final Locale currentLocale;
  final VoidCallback? onToggleTheme;
  final ValueChanged<String>? onLocaleSelected;

  @override
  State<NativeSubmissionScreen> createState() => _NativeSubmissionScreenState();
}

class _NativeSubmissionScreenState extends State<NativeSubmissionScreen> {
  NativeSubmissionViewModel? _viewModel;
  final SubmissionEventBus _eventBus = SubmissionEventBus();
  I18nCatalog? _catalog;
  bool _isBootstrapping = true;
  String? _bootstrapError;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  @override
  void didUpdateWidget(covariant NativeSubmissionScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.localeCode != widget.localeCode) {
      _reloadCatalog();
    }
  }

  Future<void> _bootstrap() async {
    try {
      final secureStorage = SecureStorageAdapter();
      final repository = SubmissionRepositoryImpl(
        submissionApiClient: SubmissionApiClient(
          baseUrl: widget.appBaseUrl,
          timeoutMs: widget.apiTimeoutMs,
        ),
        mapper: const SubmissionMapper(),
        secureStorage: secureStorage,
      );

      final secureDraftRepository = await SecureDraftRepository.create(
        secureStorage: secureStorage,
      );

      final viewModel = NativeSubmissionViewModel(
        repository: repository,
        secureDraftRepository: secureDraftRepository,
        cloudinarySignClient: CloudinarySignClient(
          baseUrl: widget.appBaseUrl,
          timeoutMs: widget.apiTimeoutMs,
        ),
        connectivityService: ConnectivityService(ConnectivityAdapter()),
        validator: const ValidateSubmissionDraftUseCase(),
        localeCode: widget.localeCode,
        draftAutosaveDebounceMs: widget.draftAutosaveDebounceMs,
        pusherKey: widget.pusherKey,
        pusherCluster: widget.pusherCluster,
        eventBus: _eventBus,
      );

      final catalog = await I18nCatalog.load(widget.localeCode);
      await viewModel.initialize(widget.token);

      if (!mounted) return;
      setState(() {
        _viewModel = viewModel;
        _catalog = catalog;
        _isBootstrapping = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _bootstrapError = MessageKeys.submissionServerFailure;
        _isBootstrapping = false;
      });
    }
  }

  Future<void> _reloadCatalog() async {
    final catalog = await I18nCatalog.load(widget.localeCode);
    if (!mounted) return;
    setState(() {
      _catalog = catalog;
    });
  }

  String _t(String key) {
    return _catalog?.t(key) ?? key;
  }

  @override
  void dispose() {
    unawaited(_eventBus.dispose());
    _viewModel?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final localeCode =
        widget.currentLocale.languageCode.toLowerCase() == "ar" ? "ar" : "en";

    return Scaffold(
      appBar: AppBar(
        title: Text(_t(MessageKeys.submissionTitle)),
        actions: [
          IconButton(
            tooltip: _t("mobile.scan.themeToggle"),
            onPressed: widget.onToggleTheme,
            icon: Icon(widget.themeMode == ThemeMode.dark
                ? Icons.light_mode_rounded
                : Icons.dark_mode_rounded),
          ),
          PopupMenuButton<String>(
            tooltip: _t("mobile.scan.language"),
            initialValue: localeCode,
            onSelected: widget.onLocaleSelected,
            itemBuilder: (context) => <PopupMenuEntry<String>>[
              PopupMenuItem<String>(
                value: "en",
                child: Text(_t(MessageKeys.commonLanguageEnglish)),
              ),
              PopupMenuItem<String>(
                value: "ar",
                child: Text(_t(MessageKeys.commonLanguageArabic)),
              ),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainer,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    localeCode.toUpperCase(),
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isBootstrapping) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 12),
            Text(_t(MessageKeys.submissionLoading)),
          ],
        ),
      );
    }

    if (_bootstrapError != null || _viewModel == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, size: 36),
              const SizedBox(height: 8),
              Text(_t(_bootstrapError ?? MessageKeys.submissionServerFailure)),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () {
                  setState(() {
                    _isBootstrapping = true;
                    _bootstrapError = null;
                  });
                  _bootstrap();
                },
                child: Text(_t(MessageKeys.submissionRetry)),
              ),
            ],
          ),
        ),
      );
    }

    return AnimatedBuilder(
      animation: _viewModel!,
      builder: (context, _) {
        final viewModel = _viewModel!;
        final fieldErrors = <String, String>{
          for (final entry in viewModel.fieldErrorKeys.entries)
            entry.key: _t(entry.value),
        };

        if (viewModel.isLoading) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(),
                const SizedBox(height: 12),
                Text(_t(MessageKeys.submissionLoading)),
              ],
            ),
          );
        }

        if (viewModel.fatalMessageKey != null) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.info_outline_rounded, size: 36),
                  const SizedBox(height: 8),
                  Text(_t(viewModel.fatalMessageKey!)),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: viewModel.refresh,
                    child: Text(_t(MessageKeys.submissionRetry)),
                  ),
                ],
              ),
            ),
          );
        }

        return SubmissionToastHost(
          eventBus: _eventBus,
          t: _t,
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!viewModel.isOnline)
                    OfflineBanner(
                        text: _t(MessageKeys.submissionOfflineBlocked)),
                  if (viewModel.statusMessageKey != null)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _t(viewModel.statusMessageKey!),
                                  style: TextStyle(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onPrimaryContainer,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                if (viewModel.lastServerError != null &&
                                    viewModel.statusMessageKey ==
                                        MessageKeys.submissionServerFailure)
                                  Padding(
                                    padding: const EdgeInsets.only(top: 2),
                                    child: Text(
                                      viewModel.lastServerError!,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .onPrimaryContainer
                                            .withValues(alpha: 0.85),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          if (viewModel.statusMessageKey ==
                              MessageKeys.submissionStaleConflict)
                            TextButton(
                              onPressed: viewModel.refresh,
                              child: Text(_t(MessageKeys.submissionRetry)),
                            ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 4),
                  ContactRecordsSection(
                    contacts: viewModel.contacts,
                    contactFields:
                        viewModel.session?.contactFormFields ?? const [],
                    enabled: viewModel.isEditable,
                    localeCode: widget.localeCode,
                    errorText: viewModel.contactErrorKey == null
                        ? null
                        : _t(viewModel.contactErrorKey!),
                    t: _t,
                    onContactChanged: (contactId, fieldKey, value) {
                      switch (fieldKey) {
                        case "name":
                          viewModel.updateContactField(
                              id: contactId, name: value);
                          break;
                        case "email":
                          viewModel.updateContactField(
                              id: contactId, email: value);
                          break;
                        case "phone":
                          viewModel.updateContactField(
                              id: contactId, phone: value);
                          break;
                        case "address":
                        case "contact":
                          viewModel.updateContactField(
                              id: contactId, contact: value);
                          break;
                      }
                    },
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _t(MessageKeys.submissionSectionForm),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  FieldResponseSection(
                    fields: viewModel.session?.fields ?? const [],
                    responsesByFieldId: viewModel.responsesByFieldId,
                    fieldErrorTextById: fieldErrors,
                    enabled: viewModel.isEditable,
                    localeCode: widget.localeCode,
                    onValueChanged: viewModel.setFieldValue,
                    onUploadMedia: (fieldId, file) {
                      return viewModel.uploadMediaForField(
                        fieldDefinitionId: fieldId,
                        file: file,
                      );
                    },
                    onClearMedia: viewModel.clearFieldMedia,
                    isFieldUploading: viewModel.isFieldUploading,
                    t: _t,
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: (!viewModel.isEditable ||
                                  viewModel.isSubmitting ||
                                  viewModel.isAnyFieldUploading)
                              ? null
                              : viewModel.submitOrResubmit,
                          icon: (viewModel.isSubmitting ||
                                  viewModel.isAnyFieldUploading)
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.send_rounded),
                          label: Text(
                            viewModel.isAnyFieldUploading
                                ? _t(MessageKeys.submissionWaitingForUploads)
                                : _t(viewModel.submitActionKey),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
