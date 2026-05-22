// ignore: avoid_web_libraries_in_flutter
import "dart:js" as js;

void hideWebSplash() {
  try {
    if (js.context.hasProperty("removeSplashFromWeb")) {
      js.context.callMethod("removeSplashFromWeb");
    }
  } catch (e) {
    // Silently fail if JS environment is not as expected.
  }
}
