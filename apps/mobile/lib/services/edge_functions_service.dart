import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class EdgeFunctionsService {
  static final _supabase = Supabase.instance.client;

  static Future<Map<String, dynamic>> invoke(String functionName, Map<String, dynamic> body) async {
    final url = '${dotenv.env['VITE_SUPABASE_URL']}/functions/v1/$functionName';
    final apiKey = dotenv.env['VITE_SUPABASE_PUBLISHABLE_KEY'];

    // Get access token
    final session = _supabase.auth.currentSession;
    String? accessToken;

    if (session != null) {
      accessToken = session.accessToken;
    }

    final headers = {
      'Content-Type': 'application/json',
      'apikey': apiKey ?? '',
      if (accessToken != null) 'Authorization': 'Bearer $accessToken',
    };

    final response = await http.post(
      Uri.parse(url),
      headers: headers,
      body: jsonEncode(body),
    );

    if (response.statusCode == 401) {
      await Future.delayed(const Duration(seconds: 2));
      await _supabase.auth.refreshSession();
      final newSession = _supabase.auth.currentSession;
      if (newSession != null) {
        final retryHeaders = {
          ...headers,
          'Authorization': 'Bearer ${newSession.accessToken}',
        };
        final retryResponse = await http.post(
          Uri.parse(url),
          headers: retryHeaders,
          body: jsonEncode(body),
        );
        return _handleResponse(retryResponse);
      }
    }

    return _handleResponse(response);
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    final body = response.body;
    Map<String, dynamic>? parsed;

    if (body.isNotEmpty) {
      try {
        parsed = jsonDecode(body) as Map<String, dynamic>;
      } catch (e) {
        parsed = null;
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final errorMessage = parsed?['error'] ??
          parsed?['message'] ??
          (response.statusCode == 401
              ? 'Your session was not ready. Please wait a moment and try again.'
              : 'We could not complete that request right now. Please try again.');
      throw Exception(errorMessage);
    }

    if (parsed?['error'] != null) {
      throw Exception(parsed!['error']);
    }

    return parsed ?? {};
  }
}
