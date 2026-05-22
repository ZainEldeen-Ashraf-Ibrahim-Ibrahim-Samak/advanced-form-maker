import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  
  var secureTextField: UITextField?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
      
      let controller : FlutterViewController = window?.rootViewController as! FlutterViewController
      let secureChannel = FlutterMethodChannel(name: "com.scct.app/secure",
                                              binaryMessenger: controller.binaryMessenger)
      
      secureChannel.setMethodCallHandler({
          [weak self] (call: FlutterMethodCall, result: FlutterResult) -> Void in
          
          if call.method == "enableSecure" {
              self?.enableSecureView()
              result(nil)
          } else if call.method == "disableSecure" {
              self?.disableSecureView()
              result(nil)
          } else {
              result(FlutterMethodNotImplemented)
          }
      })
      
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  private func enableSecureView() {
      if secureTextField == nil {
          secureTextField = UITextField()
          secureTextField?.isSecureTextEntry = true
          secureTextField?.translatesAutoresizingMaskIntoConstraints = false
          if let rootView = window?.rootViewController?.view {
              rootView.addSubview(secureTextField!)
              rootView.sendSubviewToBack(secureTextField!)
              // Constrain it over the view
              secureTextField?.layer.sublayers?.first?.addSublayer(rootView.layer)
          }
      }
  }

  private func disableSecureView() {
      if secureTextField != nil {
          secureTextField?.removeFromSuperview()
          secureTextField = nil
      }
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
  }
}
