import 'package:firebase_auth/firebase_auth.dart';

class AuthService {
  static final _auth = FirebaseAuth.instance;

  static Future<void> signUpWithPassword({
    required String fullName,
    required String email,
    required String country,
    required String phoneNumber,
    required String password,
    required bool updatesOptIn,
  }) async {
    final credential = await _auth.createUserWithEmailAndPassword(
      email: email.trim().toLowerCase(),
      password: password,
    );

    if (credential.user == null) {
      throw Exception('We could not create your EVA account right now.');
    }

    if (fullName.trim().isNotEmpty) {
      await credential.user!.updateDisplayName(fullName.trim());
    }

    await credential.user!.sendEmailVerification();
  }

  static Future<void> signInWithPassword(String email, String password) async {
    final credential = await _auth.signInWithEmailAndPassword(
      email: email.trim().toLowerCase(),
      password: password,
    );

    if (credential.user == null) {
      throw Exception('Invalid email or password');
    }

    if (!credential.user!.emailVerified) {
      throw Exception(
        'Verify your email before signing in. Check your inbox or use the web app to resend the verification email.',
      );
    }
  }

  static Future<void> signOut() async {
    await _auth.signOut();
  }

  static Future<bool> requiresPasswordSetup(User user) async {
    return false;
  }
}
