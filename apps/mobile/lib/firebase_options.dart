// File generated from the EVA Firebase project configuration.
// ignore_for_file: type=lint
import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show TargetPlatform, defaultTargetPlatform, kIsWeb;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      case TargetPlatform.windows:
        return windows;
      case TargetPlatform.linux:
        throw UnsupportedError(
          'DefaultFirebaseOptions have not been configured for linux.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyBsACpYqr1QtrQRtAll5L9uEfu4XV2UN7w',
    appId: '1:668184544863:web:3d4952404383bf1eccfdea',
    messagingSenderId: '668184544863',
    projectId: 'eva-aima',
    authDomain: 'eva-aima.firebaseapp.com',
    storageBucket: 'eva-aima.firebasestorage.app',
    measurementId: 'G-RPCLQ5WLWW',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDVvSofbUq03vOcLOrTG_hSKqz4yTInuJI',
    appId: '1:668184544863:android:4b6a50ec958bcc0bccfdea',
    messagingSenderId: '668184544863',
    projectId: 'eva-aima',
    storageBucket: 'eva-aima.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyCocjTgl9jZNFrV3LxPpTS8K8Cs8LRFfMs',
    appId: '1:668184544863:ios:7f6bd8d08ace49acccfdea',
    messagingSenderId: '668184544863',
    projectId: 'eva-aima',
    storageBucket: 'eva-aima.firebasestorage.app',
    iosClientId: '668184544863-1pb7n3ekdevs3jp32uhf9663hi4ealkl.apps.googleusercontent.com',
    iosBundleId: 'com.example.evaFlutterApp',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyCocjTgl9jZNFrV3LxPpTS8K8Cs8LRFfMs',
    appId: '1:668184544863:ios:7f6bd8d08ace49acccfdea',
    messagingSenderId: '668184544863',
    projectId: 'eva-aima',
    storageBucket: 'eva-aima.firebasestorage.app',
    iosClientId: '668184544863-1pb7n3ekdevs3jp32uhf9663hi4ealkl.apps.googleusercontent.com',
    iosBundleId: 'com.example.evaFlutterApp',
  );

  static const FirebaseOptions windows = FirebaseOptions(
    apiKey: 'AIzaSyBsACpYqr1QtrQRtAll5L9uEfu4XV2UN7w',
    appId: '1:668184544863:web:3d4952404383bf1eccfdea',
    messagingSenderId: '668184544863',
    projectId: 'eva-aima',
    authDomain: 'eva-aima.firebaseapp.com',
    storageBucket: 'eva-aima.firebasestorage.app',
    measurementId: 'G-RPCLQ5WLWW',
  );
}
