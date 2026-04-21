import 'package:supabase_flutter/supabase_flutter.dart';

class AuthService {
  static final _supabase = Supabase.instance.client;

  static Future<bool> signUpWithPassword({
    required String fullName,
    required String email,
    required String country,
    required String phoneNumber,
    required String password,
    required bool updatesOptIn,
  }) async {
    final names = _splitFullName(fullName);

    final response = await _supabase.auth.signUp(
      email: email,
      password: password,
      data: {
        'full_name': fullName.trim(),
        'first_name': names['first']!,
        'last_name': names['last']!,
        'country': country.trim(),
        'phone_number': phoneNumber.trim(),
        'updates_opt_in': updatesOptIn,
        'password_setup_completed': true,
      },
    );

    if (response.user == null) {
      throw Exception('We could not create your account right now.');
    }

    return response.session == null;
  }

  static Future<void> signInWithPassword(String email, String password) async {
    final response = await _supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );

    if (response.user == null) {
      throw Exception('Invalid email or password');
    }
  }

  static Future<void> signOut() async {
    await _supabase.auth.signOut();
  }

  static Future<void> resendVerificationEmail(String email) async {
    await _supabase.auth.resend(
      type: OtpType.signup,
      email: email.trim().toLowerCase(),
    );
  }

  static Future<void> verifyEmailCode(String email, String code) async {
    await _supabase.auth.verifyOTP(
      type: OtpType.signup,
      email: email.trim().toLowerCase(),
      token: code.trim(),
    );
  }

  static Future<bool> requiresPasswordSetup(User user) async {
    return user.userMetadata?['password_setup_completed'] != true;
  }

  static Map<String, String> _splitFullName(String fullName) {
    final parts = fullName.trim().split(' ');
    if (parts.length == 1) {
      return {'first': parts[0], 'last': ''};
    }
    return {
      'first': parts.first,
      'last': parts.sublist(1).join(' '),
    };
  }
}
