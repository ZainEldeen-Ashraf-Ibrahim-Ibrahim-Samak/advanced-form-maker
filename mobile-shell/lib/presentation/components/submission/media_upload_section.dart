import "package:flutter/material.dart";
import "package:file_picker/file_picker.dart";
import "package:image_picker/image_picker.dart";

import "../../../domain/constants/message_keys.dart";
import "../../../domain/entities/field_response.dart";
import "../../../domain/entities/submission_session.dart";

class MediaUploadSection extends StatefulWidget {
  const MediaUploadSection({
    super.key,
    required this.fieldId,
    required this.fieldType,
    required this.isMultiple,
    required this.response,
    required this.requiredMedia,
    required this.enabled,
    required this.isUploading,
    required this.onUpload,
    required this.onClear,
    required this.t,
    this.errorText,
  });

  final String fieldId;
  final SubmissionFieldType fieldType;
  final bool isMultiple;
  final FieldResponse response;
  final bool requiredMedia;
  final bool enabled;
  final bool isUploading;
  final Future<void> Function(String fieldId, XFile file) onUpload;
  final ValueChanged<String> onClear;
  final String Function(String key) t;
  final String? errorText;

  @override
  State<MediaUploadSection> createState() => _MediaUploadSectionState();
}

class _MediaUploadSectionState extends State<MediaUploadSection> {
  final ImagePicker _picker = ImagePicker();

  Future<void> _pickAndUpload() async {
    if (widget.fieldType == SubmissionFieldType.file) {
      await _pickAndUploadFiles();
      return;
    }

    await _pickAndUploadImages();
  }

  Future<void> _pickAndUploadImages() async {
    if (widget.isMultiple) {
      final selected = await _picker.pickMultiImage();
      if (selected.isEmpty) {
        return;
      }

      for (final image in selected) {
        await widget.onUpload(widget.fieldId, image);
      }
      return;
    }

    final selected = await _picker.pickImage(source: ImageSource.gallery);
    if (selected == null) {
      return;
    }

    await widget.onUpload(widget.fieldId, selected);
  }

  Future<void> _pickAndUploadFiles() async {
    final picked = await FilePicker.platform.pickFiles(
      allowMultiple: widget.isMultiple,
      withData: true,
    );

    if (picked == null || picked.files.isEmpty) {
      return;
    }

    for (final file in picked.files) {
      final xFile = file.path != null
          ? XFile(file.path!, name: file.name)
          : XFile.fromData(file.bytes!, name: file.name);

      await widget.onUpload(widget.fieldId, xFile);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mediaUrl = widget.response.mediaUrl?.trim();
    final mediaItems = widget.response.mediaItems;

    final references = mediaItems.isNotEmpty
        ? mediaItems
        : (mediaUrl != null && mediaUrl.isNotEmpty)
            ? <MediaReference>[
                MediaReference(
                  url: mediaUrl,
                  publicId: widget.response.mediaPublicId ?? "single_media",
                ),
              ]
            : const <MediaReference>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            FilledButton.tonalIcon(
              onPressed:
                  widget.enabled && !widget.isUploading ? _pickAndUpload : null,
              icon: const Icon(Icons.upload_file_rounded),
              label: Text(
                widget.requiredMedia
                    ? widget.t(MessageKeys.submissionMediaUploadRequired)
                    : widget.t(MessageKeys.submissionMediaUpload),
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed:
                  widget.enabled ? () => widget.onClear(widget.fieldId) : null,
              icon: const Icon(Icons.clear_rounded),
              label: Text(widget.t(MessageKeys.submissionMediaClear)),
            ),
          ],
        ),
        if (widget.isUploading)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: LinearProgressIndicator(),
          ),
        if (references.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: widget.fieldType == SubmissionFieldType.image
                ? _buildImagePreviewList(context, references)
                : _buildFileLinks(context, references),
          ),
        if (widget.errorText != null)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Text(
              widget.errorText!,
              style: TextStyle(
                color: Theme.of(context).colorScheme.error,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildImagePreviewList(
    BuildContext context,
    List<MediaReference> references,
  ) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: references.map((reference) {
        return GestureDetector(
          onTap: () => _showImageViewer(context, reference.url),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: Container(
              width: 112,
              height: 112,
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Image.network(
                reference.url,
                fit: BoxFit.cover,
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) {
                    return child;
                  }

                  return Center(
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      value: loadingProgress.expectedTotalBytes == null
                          ? null
                          : loadingProgress.cumulativeBytesLoaded /
                              loadingProgress.expectedTotalBytes!,
                    ),
                  );
                },
                errorBuilder: (_, __, ___) => Center(
                  child: Icon(
                    Icons.broken_image_outlined,
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(growable: false),
    );
  }

  Widget _buildFileLinks(
    BuildContext context,
    List<MediaReference> references,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: references.map((reference) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 6),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.only(top: 2),
                child: Icon(Icons.attach_file_rounded, size: 16),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: SelectableText(
                  reference.url,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ],
          ),
        );
      }).toList(growable: false),
    );
  }

  Future<void> _showImageViewer(BuildContext context, String imageUrl) async {
    await showDialog<void>(
      context: context,
      barrierColor: Colors.black87,
      builder: (dialogContext) {
        return Dialog.fullscreen(
          backgroundColor: Colors.black,
          child: Stack(
            children: [
              Center(
                child: InteractiveViewer(
                  minScale: 0.8,
                  maxScale: 4,
                  child: Image.network(
                    imageUrl,
                    fit: BoxFit.contain,
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) {
                        return child;
                      }

                      return Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          value: loadingProgress.expectedTotalBytes == null
                              ? null
                              : loadingProgress.cumulativeBytesLoaded /
                                  loadingProgress.expectedTotalBytes!,
                        ),
                      );
                    },
                    errorBuilder: (_, __, ___) => const Center(
                      child: Icon(
                        Icons.broken_image_outlined,
                        color: Colors.white70,
                        size: 40,
                      ),
                    ),
                  ),
                ),
              ),
              Positioned(
                top: 12,
                right: 12,
                child: IconButton.filled(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
