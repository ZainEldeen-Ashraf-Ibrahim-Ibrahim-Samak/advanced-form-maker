import "package:flutter/material.dart";
import "package:webview_flutter/webview_flutter.dart";

import "../../domain/constants/message_keys.dart";
import "../../i18n/index.dart";
import "../components/app_logo.dart";

class WebviewScreen extends StatefulWidget {
  const WebviewScreen({
    super.key,
    required this.initialUrl,
    this.themeMode = ThemeMode.light,
    this.currentLocale = const Locale("en"),
    this.onToggleTheme,
    this.onLocaleSelected,
  });

  final Uri initialUrl;
  final ThemeMode themeMode;
  final Locale currentLocale;
  final VoidCallback? onToggleTheme;
  final ValueChanged<String>? onLocaleSelected;

  @override
  State<WebviewScreen> createState() => _WebviewScreenState();
}

class _WebviewScreenState extends State<WebviewScreen> {
  late final WebViewController _controller;
  double _loadingProgress = 0;
  bool _canGoBack = false;
  bool _canGoForward = false;
  String _hostLabel = "";
  String _pathLabel = "";

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

  Future<void> _refreshNavigationState() async {
    final canBack = await _controller.canGoBack();
    final canForward = await _controller.canGoForward();
    if (!mounted) return;
    setState(() {
      _canGoBack = canBack;
      _canGoForward = canForward;
    });
  }

  void _setUrlContext(String? rawUrl) {
    final uri = rawUrl == null ? null : Uri.tryParse(rawUrl);
    if (uri == null) return;
    if (!mounted) return;
    setState(() {
      _hostLabel = uri.host;
      final path = uri.path.trim();
      _pathLabel = path.isEmpty ? "/" : path;
    });
  }

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (progress) {
            if (!mounted) return;
            setState(() {
              _loadingProgress = progress / 100;
            });
          },
          onPageStarted: (url) {
            _setUrlContext(url);
          },
          onPageFinished: (url) {
            _setUrlContext(url);
            _refreshNavigationState();
          },
        ),
      )
      ..loadRequest(widget.initialUrl);

    _setUrlContext(widget.initialUrl.toString());
    _refreshNavigationState();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.themeMode == ThemeMode.dark;
    final localeCode = _localeCode();
    final topBarStart =
        isDark ? const Color(0xFF0F2A43) : const Color(0xFFE7F2FB);
    final topBarEnd =
        isDark ? const Color(0xFF0A2033) : const Color(0xFFF5FAFF);
    final titleColor =
        isDark ? const Color(0xFFE5F1FC) : const Color(0xFF11324C);
    final subColor = isDark ? const Color(0xFFA9C1D8) : const Color(0xFF5A7590);

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 68,
        elevation: 0,
        scrolledUnderElevation: 0,
        backgroundColor: Colors.transparent,
        flexibleSpace: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [topBarStart, topBarEnd],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        titleSpacing: 10,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AppLogo(
                  size: 26,
                  radius: 8,
                  backgroundColor: isDark
                      ? const Color(0xFF14334F)
                      : const Color(0xFFDDEAF7),
                  borderColor: isDark
                      ? const Color(0xFF2B5778)
                      : const Color(0xFFC9DEEF),
                ),
                const SizedBox(width: 8),
                Text(
                  _t(MessageKeys.webviewTitle),
                  style: TextStyle(
                    color: titleColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
            if (_hostLabel.isNotEmpty)
              Text(
                _pathLabel.isEmpty ? _hostLabel : "$_hostLabel$_pathLabel",
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: subColor,
                  fontSize: 12,
                ),
              ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: _t(MessageKeys.scanThemeToggle),
            onPressed: widget.onToggleTheme,
            icon: Icon(
                isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded),
            color: titleColor,
          ),
          PopupMenuButton<String>(
            tooltip: _t(MessageKeys.scanLanguage),
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
                    color: isDark
                        ? const Color(0xFF14334F)
                        : const Color(0xFFDDEAF7),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    localeCode.toUpperCase(),
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 12,
                      color: titleColor,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            height: _loadingProgress < 1 ? 3 : 0,
            child: LinearProgressIndicator(
              value: _loadingProgress == 0 ? null : _loadingProgress,
              backgroundColor:
                  isDark ? const Color(0xFF1A3E5E) : const Color(0xFFD7E7F5),
              color: const Color(0xFF0B5F91),
            ),
          ),
          Expanded(child: WebViewWidget(controller: _controller)),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
              decoration: BoxDecoration(
                color:
                    isDark ? const Color(0xFF0F2438) : const Color(0xFFF1F7FD),
                border: Border(
                  top: BorderSide(
                    color: isDark
                        ? const Color(0xFF204560)
                        : const Color(0xFFD2E4F3),
                  ),
                ),
              ),
              child: Row(
                children: [
                   Expanded(
                    child: FilledButton.tonalIcon(
                      onPressed: _canGoBack
                          ? () async {
                              await _controller.goBack();
                              await _refreshNavigationState();
                            }
                          : null,
                      icon: const Icon(Icons.arrow_back_rounded, size: 18),
                      label: Text(_t(MessageKeys.webviewBack)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.tonalIcon(
                      onPressed: _canGoForward
                          ? () async {
                              await _controller.goForward();
                              await _refreshNavigationState();
                            }
                          : null,
                      icon: const Icon(Icons.arrow_forward_rounded, size: 18),
                      label: Text(_t(MessageKeys.webviewForward)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () {
                        _controller.reload();
                      },
                      icon: const Icon(Icons.refresh_rounded, size: 18),
                      label: Text(_t(MessageKeys.webviewReload)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
