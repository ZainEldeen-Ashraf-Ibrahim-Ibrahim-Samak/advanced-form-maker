import "package:flutter/material.dart";

class ScanErrorSheet extends StatelessWidget {
  const ScanErrorSheet({
    super.key,
    required this.message,
    this.title,
    this.themeMode = ThemeMode.light,
    this.onDismiss,
  });

  final String message;
  final String? title;
  final ThemeMode themeMode;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    final isDark = themeMode == ThemeMode.dark;
    final bg = isDark ? const Color(0xFF4C2429) : const Color(0xFFFFEFF1);
    final border = isDark ? const Color(0xFF6D3B42) : const Color(0xFFF5C5CB);
    final titleColor = isDark ? const Color(0xFFFFD4D8) : const Color(0xFF9E2C35);
    final bodyColor = isDark ? const Color(0xFFFFC6CC) : const Color(0xFF8A1A1A);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 30,
            height: 30,
            margin: const EdgeInsets.only(top: 1),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDark ? const Color(0xFF633038) : const Color(0xFFFFDCE0),
            ),
            child: Icon(
              Icons.error_outline_rounded,
              size: 18,
              color: titleColor,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null)
                  Text(
                    title!,
                    style: TextStyle(
                      color: titleColor,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                if (title != null) const SizedBox(height: 3),
                Text(
                  message,
                  style: TextStyle(
                    color: bodyColor,
                    fontWeight: FontWeight.w600,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          if (onDismiss != null)
            IconButton(
              onPressed: onDismiss,
              visualDensity: VisualDensity.compact,
              icon: Icon(Icons.close_rounded, color: titleColor, size: 18),
            ),
        ],
      ),
    );
  }
}
