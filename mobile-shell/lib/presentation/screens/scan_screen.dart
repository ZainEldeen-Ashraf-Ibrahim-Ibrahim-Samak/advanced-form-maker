import "dart:io";
import "dart:math" as math;
import "dart:typed_data";

import "package:desktop_drop/desktop_drop.dart";
import "package:flutter/foundation.dart";
import "package:flutter/material.dart";
import "package:flutter_image_compress/flutter_image_compress.dart";
import "package:image_picker/image_picker.dart";
import "package:mobile_scanner/mobile_scanner.dart";
import "package:path_provider/path_provider.dart";

import "../../domain/constants/message_keys.dart";
import "../../i18n/index.dart";
import "../../config/brand_config.dart";
import "../components/app_logo.dart";
import "scan_error_sheet.dart";
import "../view_models/scan_view_model.dart";

class ScanScreen extends StatefulWidget {
  const ScanScreen({
    super.key,
    required this.viewModel,
    required this.onAccepted,
    this.themeMode = ThemeMode.light,
    this.currentLocale = const Locale("en"),
    this.onToggleTheme,
    this.onLocaleSelected,
  });

  final ScanViewModel viewModel;
  final ValueChanged<ScanResult> onAccepted;
  final ThemeMode themeMode;
  final Locale currentLocale;
  final VoidCallback? onToggleTheme;
  final ValueChanged<String>? onLocaleSelected;

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  final TextEditingController _controller = TextEditingController();
  final ImagePicker _imagePicker = ImagePicker();
  final MobileScannerController _scannerController = MobileScannerController(
    autoStart: false,
    formats: const <BarcodeFormat>[BarcodeFormat.qrCode],
  );

  String? _error;
  XFile? _selectedPhoto;
  Uint8List? _selectedPhotoBytes;
  bool _isDraggingPhoto = false;
  bool _isDecodingPhoto = false;

  @override
  void dispose() {
    _controller.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  void _submit() {
    final result = widget.viewModel.processScan(_controller.text);
    if (result.acceptedUri != null) {
      setState(() => _error = null);
      widget.onAccepted(result);
      return;
    }

    setState(() => _error = result.messageKey ?? "mobile.scan.invalid");
  }

  Future<void> _chooseFromLibrary() async {
    final selected = await _imagePicker.pickImage(source: ImageSource.gallery);
    if (selected == null) {
      return;
    }
    await _setSelectedPhoto(selected);
  }

  Future<void> _handleDroppedPhotos(Iterable<XFile?> files) async {
    final nonNullFiles = files.whereType<XFile>().toList();
    if (nonNullFiles.isEmpty) {
      return;
    }

    final photo = nonNullFiles.firstWhere(
      (file) => _isSupportedImage(file.name),
      orElse: () => nonNullFiles.first,
    );

    await _setSelectedPhoto(photo);
  }

  Future<void> _setSelectedPhoto(XFile photo) async {
    final bytes = await photo.readAsBytes();

    setState(() {
      _selectedPhoto = photo;
      _selectedPhotoBytes = bytes;
      _error = null;
    });

    await _decodeQrFromPhoto(photo);
  }

  void _clearSelectedPhoto() {
    setState(() {
      _selectedPhoto = null;
      _selectedPhotoBytes = null;
      _isDecodingPhoto = false;
      _error = null;
    });
  }

  Future<void> _openCameraScanner() async {
    final cameraController = MobileScannerController(
      autoStart: true,
      facing: CameraFacing.back,
      detectionSpeed: DetectionSpeed.noDuplicates,
      formats: const <BarcodeFormat>[BarcodeFormat.qrCode],
    );

    var handled = false;
    var isTorchOn = false;

    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      backgroundColor: Colors.black,
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            return SizedBox(
              height: MediaQuery.of(sheetContext).size.height * 0.78,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final frameSize = math.min(
                      constraints.maxWidth * 0.74, constraints.maxHeight * 0.5);
                  final frameLeft = (constraints.maxWidth - frameSize) / 2;
                  final frameTop = (constraints.maxHeight - frameSize) / 2;
                  final overlayColor = Colors.black.withValues(alpha: 0.50);

                  return Stack(
                    fit: StackFit.expand,
                    children: [
                      MobileScanner(
                        controller: cameraController,
                        onDetect: (capture) {
                          if (handled || !mounted) {
                            return;
                          }

                          final decodedValue = capture.barcodes
                              .map((barcode) => barcode.rawValue?.trim() ?? "")
                              .firstWhere((value) => value.isNotEmpty,
                                  orElse: () => "")
                              .trim();

                          if (decodedValue.isEmpty) {
                            return;
                          }

                          handled = true;
                          _controller.text = decodedValue;

                          if (Navigator.of(sheetContext).canPop()) {
                            Navigator.of(sheetContext).pop();
                          }

                          _submit();
                        },
                      ),
                      Positioned(
                          top: 0,
                          left: 0,
                          right: 0,
                          height: frameTop,
                          child: ColoredBox(color: overlayColor)),
                      Positioned(
                        top: frameTop + frameSize,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: ColoredBox(color: overlayColor),
                      ),
                      Positioned(
                        top: frameTop,
                        left: 0,
                        width: frameLeft,
                        height: frameSize,
                        child: ColoredBox(color: overlayColor),
                      ),
                      Positioned(
                        top: frameTop,
                        right: 0,
                        width: frameLeft,
                        height: frameSize,
                        child: ColoredBox(color: overlayColor),
                      ),
                      Positioned(
                        top: frameTop,
                        left: frameLeft,
                        width: frameSize,
                        height: frameSize,
                        child: IgnorePointer(
                          child: Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.95),
                                  width: 2),
                            ),
                            child: Stack(
                              children: [
                                Positioned(
                                    top: 0,
                                    left: 0,
                                    width: 46,
                                    height: 4,
                                    child: _cornerStripe()),
                                Positioned(
                                    top: 0,
                                    left: 0,
                                    width: 4,
                                    height: 46,
                                    child: _cornerStripe()),
                                Positioned(
                                    top: 0,
                                    right: 0,
                                    width: 46,
                                    height: 4,
                                    child: _cornerStripe()),
                                Positioned(
                                    top: 0,
                                    right: 0,
                                    width: 4,
                                    height: 46,
                                    child: _cornerStripe()),
                                Positioned(
                                    bottom: 0,
                                    left: 0,
                                    width: 46,
                                    height: 4,
                                    child: _cornerStripe()),
                                Positioned(
                                    bottom: 0,
                                    left: 0,
                                    width: 4,
                                    height: 46,
                                    child: _cornerStripe()),
                                Positioned(
                                    bottom: 0,
                                    right: 0,
                                    width: 46,
                                    height: 4,
                                    child: _cornerStripe()),
                                Positioned(
                                    bottom: 0,
                                    right: 0,
                                    width: 4,
                                    height: 46,
                                    child: _cornerStripe()),
                              ],
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        top: 14,
                        left: 14,
                        child: IconButton.filledTonal(
                          onPressed: () async {
                            try {
                              await cameraController.toggleTorch();
                              setSheetState(() => isTorchOn = !isTorchOn);
                            } catch (_) {
                              // Ignore torch failures for unsupported devices.
                            }
                          },
                          icon: Icon(isTorchOn
                              ? Icons.flash_on_rounded
                              : Icons.flash_off_rounded),
                        ),
                      ),
                      Positioned(
                        top: 14,
                        left: 72,
                        child: IconButton.filledTonal(
                          tooltip: _t("mobile.scan.switchCamera"),
                          onPressed: () async {
                            try {
                              await cameraController.switchCamera();
                            } catch (_) {
                              // Ignore failures for devices with single camera.
                            }
                          },
                          icon: const Icon(Icons.flip_camera_ios_rounded),
                        ),
                      ),
                      Positioned(
                        top: 12,
                        right: 12,
                        child: IconButton.filledTonal(
                          onPressed: () {
                            if (Navigator.of(sheetContext).canPop()) {
                              Navigator.of(sheetContext).pop();
                            }
                          },
                          icon: const Icon(Icons.close),
                        ),
                      ),
                      Positioned(
                        left: 18,
                        right: 18,
                        top: frameTop - 56,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.58),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            child: Text(
                              _t("mobile.scan.alignCode"),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: 20,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.62),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            child: Text(
                              _t("mobile.scan.cameraHint"),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            );
          },
        );
      },
    );

    await cameraController.dispose();
  }

  Widget _cornerStripe() {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xFFE33B43),
        borderRadius: BorderRadius.circular(999),
      ),
    );
  }

  Future<void> _decodeQrFromPhoto(XFile photo) async {
    setState(() {
      _isDecodingPhoto = true;
      _error = null;
    });

    try {
      // Step 1: Try decoding the ORIGINAL image first.
      // This is the most accurate for high-density QR codes.
      final originalCapture = await _scannerController.analyzeImage(photo.path);
      final originalValue = originalCapture?.barcodes
              .map((barcode) => barcode.rawValue?.trim() ?? "")
              .firstWhere((value) => value.isNotEmpty, orElse: () => "") ??
          "";

      if (originalValue.isNotEmpty) {
        _controller.text = originalValue;
        _submit();
        return;
      }

      // Step 2: Try with an OPTIMIZED compressed image if original analysis fails.
      // Sometimes raw sensor noise interference blocks detection on ultra-res images.
      XFile fileToScan = photo;
      try {
        final bytes = await photo.readAsBytes();
        final compressedBytes = await FlutterImageCompress.compressWithList(
          bytes,
          minWidth: 1024,
          minHeight: 1024,
          quality: 90,
          format: CompressFormat.jpeg,
        );

        if (kIsWeb) {
          fileToScan = XFile.fromData(compressedBytes, name: "scan_preview.jpg");
        } else {
          final tempDir = await getTemporaryDirectory();
          final tempFile = File(
              '${tempDir.path}/qr_scan_${DateTime.now().millisecondsSinceEpoch}.jpg');
          await tempFile.writeAsBytes(compressedBytes);
          fileToScan = XFile(tempFile.path);
        }
      } catch (e) {
        // Fallback to original photo if compression fails
        fileToScan = photo;
      }

      if (kIsWeb) {
        // analyzeImage is currently not supported on Flutter Web for mobile_scanner.
        setState(() {
          _error = MessageKeys.scanDecodeError;
        });
        return;
      }

      final capture = await _scannerController.analyzeImage(fileToScan.path);
      final decodedValue = capture?.barcodes
              .map((barcode) => barcode.rawValue?.trim() ?? "")
              .firstWhere((value) => value.isNotEmpty, orElse: () => "") ??
          "";

      if (decodedValue.isEmpty) {
        setState(() {
          _error = MessageKeys.scanNoQrInPhoto;
        });
        return;
      }

      _controller.text = decodedValue;
      _submit();
    } catch (e) {
      if (kDebugMode) {
        print("QR Decode Error: $e");
      }
      setState(() {
        _error = MessageKeys.scanDecodeError;
      });
    } finally {
      if (mounted) {
        setState(() {
          _isDecodingPhoto = false;
        });
      }
    }
  }

  bool _isSupportedImage(String filename) {
    final lower = filename.toLowerCase();
    return lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif") ||
        lower.endsWith(".ico");
  }

  String _selectedPhotoLabel() {
    final selected = _selectedPhoto;
    if (selected == null) {
      return _t(MessageKeys.scanNoPhoto);
    }
    if (selected.name.isNotEmpty) {
      return selected.name;
    }
    final segments = selected.path.split(RegExp(r"[/\\]"));
    return segments.isEmpty ? selected.path : segments.last;
  }

  Widget _buildPhotoPreviewCard({
    required Color cardColor,
    required Color borderColor,
    required Color textPrimary,
    required Color textSecondary,
  }) {
    final bytes = _selectedPhotoBytes;
    if (bytes == null) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: const EdgeInsets.only(top: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _t(MessageKeys.scanPhotoPreview),
            style: TextStyle(
              color: textPrimary,
              fontSize: 13,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _selectedPhotoLabel(),
            style: TextStyle(
              color: textSecondary,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.memory(
              bytes,
              height: 170,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTag({required IconData icon, required String label}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.white),
          const SizedBox(width: 6),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  ButtonStyle _filledButtonStyle(
      {required Color background, required Color foreground}) {
    return ButtonStyle(
      backgroundColor: WidgetStatePropertyAll<Color>(background),
      foregroundColor: WidgetStatePropertyAll<Color>(foreground),
      padding: const WidgetStatePropertyAll<EdgeInsets>(
        EdgeInsets.symmetric(vertical: 13, horizontal: 14),
      ),
      shape: WidgetStatePropertyAll<RoundedRectangleBorder>(
        RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }

  String _localeCode() {
    final code = widget.currentLocale.languageCode.toLowerCase();
    return code == "ar" ? "ar" : "en";
  }

  String _t(String key) {
    final locale = _localeCode();
    final catalog =
        I18nCatalog.getCached(locale) ?? I18nCatalog.getCached("ar");
    return catalog?.t(key) ?? key;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.themeMode == ThemeMode.dark;
    final localeCode = _localeCode();

    const brandBlue = Color(0xFF0B5F91);
    const brandBlueDeep = Color(0xFF083C63);
    const brandRed = Color(0xFFE33B43);

    final appBarColor =
        isDark ? const Color(0xFF081E33) : const Color(0xFFE9F2FA);
    final bgTop = isDark ? const Color(0xFF061221) : const Color(0xFFF3F8FD);
    final bgBottom = isDark ? const Color(0xFF0D2942) : const Color(0xFFE6EFF8);
    final cardColor =
        isDark ? const Color(0xFF0F263D) : const Color(0xFFFFFFFF);
    final cardBorder =
        isDark ? const Color(0xFF285375) : const Color(0xFFD6E4F1);
    final textPrimary =
        isDark ? const Color(0xFFE8F1FA) : const Color(0xFF11283D);
    final textSecondary =
        isDark ? const Color(0xFFB9CCDD) : const Color(0xFF4F6479);
    final inputFill =
        isDark ? const Color(0xFF142E49) : const Color(0xFFF7FBFF);
    final dropBase = isDark ? const Color(0xFF11283E) : const Color(0xFFF6FAFE);
    final dropDrag = isDark ? const Color(0xFF164166) : const Color(0xFFD9ECFD);
    final infoBg = isDark ? const Color(0xFF183A57) : const Color(0xFFEAF5FF);
    final infoText = isDark ? const Color(0xFFB9DFFF) : const Color(0xFF1F5C8E);
    final actionChipBg =
        isDark ? const Color(0xFF12314D) : const Color(0xFFE4EFF9);
    final actionChipBorder =
        isDark ? const Color(0xFF2D5D84) : const Color(0xFFD0E0EF);
    final actionChipFg =
        isDark ? const Color(0xFFE5F2FF) : const Color(0xFF1B4B75);

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 16,
        flexibleSpace: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                appBarColor,
                isDark ? const Color(0xFF0B2439) : const Color(0xFFF1F7FD),
              ],
            ),
          ),
        ),
        title: Row(
          children: [
            AppLogo(
              size: 30,
              radius: 10,
              backgroundColor:
                  isDark ? const Color(0xFF17324B) : const Color(0xFFE4EFF9),
              borderColor:
                  isDark ? const Color(0xFF2D5D84) : const Color(0xFFD0E0EF),
            ),
            const SizedBox(width: 10),
            Text(
              BrandConfig.siteName,
              style: TextStyle(
                color: textPrimary,
                fontWeight: FontWeight.w700,
                fontSize: 16,
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsetsDirectional.only(end: 8),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  margin: const EdgeInsetsDirectional.only(end: 8),
                  decoration: BoxDecoration(
                    color: actionChipBg,
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: actionChipBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black
                            .withValues(alpha: isDark ? 0.30 : 0.08),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: IconButton(
                    tooltip: _t(MessageKeys.scanThemeToggle),
                    onPressed: widget.onToggleTheme,
                    iconSize: 18,
                    color: actionChipFg,
                    visualDensity: VisualDensity.compact,
                    icon: AnimatedSwitcher(
                      duration: const Duration(milliseconds: 220),
                      transitionBuilder: (child, animation) =>
                          ScaleTransition(scale: animation, child: child),
                      child: Icon(
                        isDark
                            ? Icons.light_mode_rounded
                            : Icons.dark_mode_rounded,
                        key: ValueKey<bool>(isDark),
                      ),
                    ),
                  ),
                ),
                PopupMenuButton<String>(
                  tooltip: _t(MessageKeys.scanLanguage),
                  initialValue: localeCode,
                  onSelected: widget.onLocaleSelected,
                  color: cardColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                    side: BorderSide(color: cardBorder),
                  ),
                  itemBuilder: (context) => <PopupMenuEntry<String>>[
                    PopupMenuItem<String>(
                      value: "en",
                      child: Row(
                        children: [
                          Icon(
                            Icons.check_rounded,
                            size: 16,
                            color: localeCode == "en"
                                ? brandBlue
                                : Colors.transparent,
                          ),
                          const SizedBox(width: 8),
                          Text(_t(MessageKeys.commonLanguageEnglish)),
                        ],
                      ),
                    ),
                    PopupMenuItem<String>(
                      value: "ar",
                      child: Row(
                        children: [
                          Icon(
                            Icons.check_rounded,
                            size: 16,
                            color: localeCode == "ar"
                                ? brandBlue
                                : Colors.transparent,
                          ),
                          const SizedBox(width: 8),
                          Text(_t(MessageKeys.commonLanguageArabic)),
                        ],
                      ),
                    ),
                  ],
                  child: Container(
                    height: 38,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: actionChipBg,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: actionChipBorder),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black
                              .withValues(alpha: isDark ? 0.30 : 0.08),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.language_rounded,
                            size: 16, color: actionChipFg),
                        const SizedBox(width: 6),
                        Text(
                          localeCode.toUpperCase(),
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 12,
                            color: actionChipFg,
                          ),
                        ),
                        const SizedBox(width: 2),
                        Icon(Icons.expand_more_rounded,
                            size: 16, color: actionChipFg),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [bgTop, bgBottom],
          ),
        ),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(
                  colors: [brandBlue, brandBlueDeep],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                boxShadow: [
                  BoxShadow(
                    color: brandBlue.withValues(alpha: 0.30),
                    blurRadius: 16,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _t(MessageKeys.homeTitle),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _t(MessageKeys.homeSubtitle),
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.92),
                      fontSize: 14,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildTag(
                          icon: Icons.verified_user_outlined,
                          label: _t(MessageKeys.scanSecure)),
                      _buildTag(
                          icon: Icons.language_rounded,
                          label: localeCode.toUpperCase()),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: cardColor,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _t(MessageKeys.scanManual),
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _controller,
                    style: TextStyle(color: textPrimary),
                    decoration: InputDecoration(
                      labelText: _t(MessageKeys.scanPrompt),
                      hintText: _t(MessageKeys.scanLinkHint),
                      hintStyle: TextStyle(color: textSecondary),
                      labelStyle: TextStyle(color: textSecondary),
                      filled: true,
                      fillColor: inputFill,
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(14),
                        borderSide: BorderSide(color: cardBorder),
                      ),
                      focusedBorder: const OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(14)),
                        borderSide: BorderSide(color: brandBlue, width: 1.4),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _openCameraScanner,
                          icon: const Icon(Icons.qr_code_scanner_rounded),
                          label: Text(_t(MessageKeys.scanOpenCamera)),
                          style: _filledButtonStyle(
                            background: brandRed,
                            foreground: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: _submit,
                          icon: const Icon(Icons.open_in_new_rounded),
                          label: Text(_t(MessageKeys.scanOpen)),
                          style: _filledButtonStyle(
                            background: brandBlue,
                            foreground: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: cardColor,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _t(MessageKeys.scanQuickActions),
                    style: TextStyle(
                      color: textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      FilledButton.icon(
                        onPressed: _chooseFromLibrary,
                        icon: const Icon(Icons.photo_library_outlined),
                        label: Text(_t(MessageKeys.scanChoosePhoto)),
                        style: _filledButtonStyle(
                          background: isDark
                              ? const Color(0xFF1A4568)
                              : const Color(0xFFE3F1FF),
                          foreground: isDark
                              ? const Color(0xFFE3F1FF)
                              : const Color(0xFF174B78),
                        ),
                      ),
                      if (_selectedPhoto != null)
                        FilledButton.icon(
                          onPressed: _clearSelectedPhoto,
                          icon: const Icon(Icons.clear_rounded),
                          label: Text(_t(MessageKeys.scanClearPhoto)),
                          style: _filledButtonStyle(
                            background: isDark
                                ? const Color(0xFF563136)
                                : const Color(0xFFFBE5E8),
                            foreground: isDark
                                ? const Color(0xFFFFCDD2)
                                : const Color(0xFF942F35),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _t(MessageKeys.scanDragHint),
                    style: TextStyle(
                      color: textSecondary,
                      fontSize: 12,
                    ),
                  ),
                  const SizedBox(height: 10),
                  DropTarget(
                    onDragDone: (details) =>
                        _handleDroppedPhotos(details.files),
                    onDragEntered: (_) =>
                        setState(() => _isDraggingPhoto = true),
                    onDragExited: (_) =>
                        setState(() => _isDraggingPhoto = false),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: _isDraggingPhoto ? dropDrag : dropBase,
                        border: Border.all(
                          color: _isDraggingPhoto ? brandBlue : cardBorder,
                          width: _isDraggingPhoto ? 1.5 : 1,
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.upload_file_rounded,
                                  color: textSecondary),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _t(MessageKeys.scanDropPhoto),
                                  style: TextStyle(
                                    color: textPrimary,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            "${_t(MessageKeys.scanSelectedPhoto)}: ${_selectedPhotoLabel()}",
                            style: TextStyle(color: textSecondary),
                          ),
                        ],
                      ),
                    ),
                  ),
                  _buildPhotoPreviewCard(
                    cardColor: isDark
                        ? const Color(0xFF0D2135)
                        : const Color(0xFFF8FBFF),
                    borderColor: cardBorder,
                    textPrimary: textPrimary,
                    textSecondary: textSecondary,
                  ),
                ],
              ),
            ),
            if (_isDecodingPhoto) ...[
              const SizedBox(height: 12),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: infoBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: infoText,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _t(MessageKeys.scanDecoding),
                        style: TextStyle(
                          color: infoText,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: 12),
              ScanErrorSheet(
                title: _t(MessageKeys.scanErrorTitle),
                message: _t(_error!),
                themeMode: widget.themeMode,
                onDismiss: () {
                  setState(() {
                    _error = null;
                  });
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}
