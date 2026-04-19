import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

class EdgeFunctionsService {
  static final _auth = FirebaseAuth.instance;
  static const Map<String, String> _functionMap = {
    'finance-core': 'financeCore',
    'chat': 'chat',
    'generate-insights': 'generateInsights',
    'generate-statement': 'generateStatement',
    'receipt-ingress': 'receiptIngress',
    'scheduled-summaries': 'scheduledSummaries',
    'stock-recommendations': 'stockRecommendations',
    'fetch-finance-news': 'fetchFinanceNews',
  };

  static String get _baseUrl {
    final explicit = dotenv.env['VITE_FIREBASE_FUNCTIONS_BASE_URL'];
    if (explicit != null && explicit.isNotEmpty) {
      return explicit;
    }

    final projectId = dotenv.env['VITE_FIREBASE_PROJECT_ID'] ?? '';
    final region = dotenv.env['VITE_FIREBASE_FUNCTIONS_REGION'] ?? 'us-central1';
    return 'https://$region-$projectId.cloudfunctions.net';
  }

  static Future<Map<String, dynamic>> invoke(
    String functionName,
    Map<String, dynamic> body,
  ) async {
    final mappedName = _functionMap[functionName] ?? functionName;
    final url = '$_baseUrl/$mappedName';
    final user = _auth.currentUser;
    final accessToken = await user?.getIdToken();

    final headers = {
      'Content-Type': 'application/json',
      if (accessToken != null) 'Authorization': 'Bearer $accessToken',
    };

    final response = await http.post(
      Uri.parse(url),
      headers: headers,
      body: jsonEncode(body),
    );

    if (response.statusCode == 401 && user != null) {
      final refreshedToken = await user.getIdToken(true);
      final retryResponse = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $refreshedToken',
        },
        body: jsonEncode(body),
      );
      return _handleResponse(retryResponse);
    }

    return _handleResponse(response);
  }

  static Map<String, dynamic> _handleResponse(http.Response response) {
    final body = response.body;
    Map<String, dynamic>? parsed;

    if (body.isNotEmpty) {
      try {
        parsed = jsonDecode(body) as Map<String, dynamic>;
      } catch (_) {
        parsed = null;
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final errorMessage = parsed?['error'] ??
          parsed?['message'] ??
          (response.statusCode == 401
              ? 'Your EVA session is not ready yet. Please sign in again.'
              : 'We could not complete that request right now. Please try again.');
      throw Exception(errorMessage);
    }

    if (parsed?['error'] != null) {
      throw Exception(parsed!['error']);
    }

    return parsed ?? {};
  }
}
