import "package:flutter/material.dart";

import "../../config/brand_config.dart";

class AppLogo extends StatelessWidget {
  const AppLogo({
    super.key,
    this.size = 32,
    this.radius = 10,
    this.padding = 3,
    this.backgroundColor,
    this.borderColor,
  });

  final double size;
  final double radius;
  final double padding;
  final Color? backgroundColor;
  final Color? borderColor;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final resolvedBackground =
        backgroundColor ?? (isDark ? const Color(0xFF10273D) : const Color(0xFFEAF3FC));
    final resolvedBorder =
        borderColor ?? (isDark ? const Color(0xFF2E4E69) : const Color(0xFFD3E4F3));

    return Container(
      width: size,
      height: size,
      padding: EdgeInsets.all(padding),
      decoration: BoxDecoration(
        color: resolvedBackground,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: resolvedBorder),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius - 2),
        child: Image.asset(
          BrandConfig.appLogoPath,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => const ColoredBox(
            color: Color(0xFF0B5F91),
            child: Icon(Icons.broken_image_rounded, color: Colors.white, size: 16),
          ),
        ),
      ),
    );
  }
}
