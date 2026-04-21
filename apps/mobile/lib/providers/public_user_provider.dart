import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:eva_app/models/bootstrap_data.dart';
import 'package:eva_app/services/auth_service.dart';
import 'package:eva_app/services/workspace_service.dart';

final publicUserProvider = StateNotifierProvider<PublicUserNotifier, PublicUserState>((ref) {
  return PublicUserNotifier();
});

class PublicUserState {
  final Session? session;
  final User? user;
  final String userId;
  final String legacyPublicUserId;
  final bool isAuthenticated;
  final bool authLoading;
  final bool requiresPasswordSetup;
  final BootstrapData? bootstrap;
  final bool loading;
  final bool refreshing;
  final bool saving;

  PublicUserState({
    this.session,
    this.user,
    this.userId = '',
    this.legacyPublicUserId = '',
    this.isAuthenticated = false,
    this.authLoading = true,
    this.requiresPasswordSetup = false,
    this.bootstrap,
    this.loading = true,
    this.refreshing = false,
    this.saving = false,
  });

  PublicUserState copyWith({
    Session? session,
    User? user,
    String? userId,
    String? legacyPublicUserId,
    bool? isAuthenticated,
    bool? authLoading,
    bool? requiresPasswordSetup,
    BootstrapData? bootstrap,
    bool? loading,
    bool? refreshing,
    bool? saving,
  }) {
    return PublicUserState(
      session: session ?? this.session,
      user: user ?? this.user,
      userId: userId ?? this.userId,
      legacyPublicUserId: legacyPublicUserId ?? this.legacyPublicUserId,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      authLoading: authLoading ?? this.authLoading,
      requiresPasswordSetup: requiresPasswordSetup ?? this.requiresPasswordSetup,
      bootstrap: bootstrap ?? this.bootstrap,
      loading: loading ?? this.loading,
      refreshing: refreshing ?? this.refreshing,
      saving: saving ?? this.saving,
    );
  }
}

class PublicUserNotifier extends StateNotifier<PublicUserState> {
  static const String _bootstrapCacheKey = 'eva-workspace-cache';

  PublicUserNotifier() : super(PublicUserState()) {
    _initialize();
  }

  Future<void> _initialize() async {
    // Listen to auth state changes
    Supabase.instance.client.auth.onAuthStateChange.listen((event) {
      _handleAuthStateChange(event.session);
    });

    // Get initial session
    final session = Supabase.instance.client.auth.currentSession;
    await _handleAuthStateChange(session);
  }

  Future<void> _handleAuthStateChange(Session? session) async {
    if (session == null) {
      state = PublicUserState();
      await _clearCachedBootstrap();
      return;
    }

    state = state.copyWith(
      session: session,
      user: session.user,
      userId: session.user.id,
      isAuthenticated: true,
      authLoading: false,
    );

    // Check if password setup is required
    final requiresPasswordSetup = await AuthService.requiresPasswordSetup(session.user);
    state = state.copyWith(requiresPasswordSetup: requiresPasswordSetup);

    // Load bootstrap data
    await _loadBootstrap();
  }

  Future<void> _loadBootstrap() async {
    if (state.user == null) return;

    state = state.copyWith(loading: true);

    try {
      // Try cached first
      final cached = await _getCachedBootstrap();
      if (cached != null) {
        state = state.copyWith(bootstrap: cached, loading: false);
      }

      // Fetch fresh data
      final bootstrap = await WorkspaceService.fetchBootstrap();
      state = state.copyWith(bootstrap: bootstrap, loading: false);
      await _cacheBootstrap(bootstrap);
    } catch (e) {
      // If fetch fails, use cached if available
      final cached = await _getCachedBootstrap();
      if (cached != null) {
        state = state.copyWith(bootstrap: cached, loading: false);
      } else {
        state = state.copyWith(loading: false);
      }
      debugPrint('Failed to load bootstrap: $e');
    }
  }

  Future<BootstrapData?> _getCachedBootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    final cached = prefs.getString(_bootstrapCacheKey);
    if (cached != null) {
      try {
        final json = jsonDecode(cached) as Map<String, dynamic>;
        final bootstrap = BootstrapData.fromJson(json);
        return bootstrap.userId == state.userId ? bootstrap : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  Future<void> _cacheBootstrap(BootstrapData bootstrap) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_bootstrapCacheKey, jsonEncode(bootstrap.toJson()));
  }

  Future<void> _clearCachedBootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_bootstrapCacheKey);
  }

  // Auth methods
  Future<bool> signUpWithPassword({
    required String fullName,
    required String email,
    required String country,
    required String phoneNumber,
    required String password,
    required bool updatesOptIn,
  }) async {
    return AuthService.signUpWithPassword(
      fullName: fullName,
      email: email,
      country: country,
      phoneNumber: phoneNumber,
      password: password,
      updatesOptIn: updatesOptIn,
    );
  }

  Future<void> signInWithPassword(String email, String password) async {
    await AuthService.signInWithPassword(email, password);
  }

  Future<void> resendVerificationEmail(String email) async {
    await AuthService.resendVerificationEmail(email);
  }

  Future<void> verifyEmailCode(String email, String code) async {
    await AuthService.verifyEmailCode(email, code);
  }

  Future<void> signOut() async {
    await AuthService.signOut();
    await _clearCachedBootstrap();
    state = PublicUserState();
  }

  Future<void> refresh() async {
    await _loadBootstrap();
  }

  // Workspace mutations
  Future<void> completeOnboarding(Map<String, dynamic> payload) async {
    await _runMutation(() async {
      final bootstrap = await WorkspaceService.completeOnboarding(payload);
      state = state.copyWith(bootstrap: bootstrap);
      return bootstrap;
    });
  }

  Future<void> saveGoal(Map<String, dynamic> goal) async {
    await _runMutation(() async {
      final bootstrap = await WorkspaceService.saveGoal(goal);
      state = state.copyWith(bootstrap: bootstrap);
      return bootstrap;
    });
  }

  Future<void> deleteGoal(String goalId) async {
    await _runMutation(() async {
      final bootstrap = await WorkspaceService.deleteGoal(goalId);
      state = state.copyWith(bootstrap: bootstrap);
      return bootstrap;
    });
  }

  Future<void> saveBudgetLimit(Map<String, dynamic> limit) async {
    await _runMutation(() async {
      final bootstrap = await WorkspaceService.saveBudgetLimit(limit);
      state = state.copyWith(bootstrap: bootstrap);
      return bootstrap;
    });
  }

  Future<void> deleteBudgetLimit(String limitId) async {
    await _runMutation(() async {
      final bootstrap = await WorkspaceService.deleteBudgetLimit(limitId);
      state = state.copyWith(bootstrap: bootstrap);
      return bootstrap;
    });
  }

  Future<void> saveSubscription(Map<String, dynamic> subscription) async {
    await _runMutation(() async {
      final bootstrap = await WorkspaceService.saveSubscription(subscription);
      state = state.copyWith(bootstrap: bootstrap);
      return bootstrap;
    });
  }

  Future<void> deleteSubscription(String subscriptionId) async {
    await _runMutation(() async {
      final bootstrap = await WorkspaceService.deleteSubscription(subscriptionId);
      state = state.copyWith(bootstrap: bootstrap);
      return bootstrap;
    });
  }

  Future<void> saveFinancialEntry(Map<String, dynamic> entry) async {
    await _runMutation(() async {
      final bootstrap = await WorkspaceService.saveFinancialEntry(entry);
      state = state.copyWith(bootstrap: bootstrap);
      return bootstrap;
    });
  }

  Future<void> deleteFinancialEntry(String entryId) async {
    await _runMutation(() async {
      final bootstrap = await WorkspaceService.deleteFinancialEntry(entryId);
      state = state.copyWith(bootstrap: bootstrap);
      return bootstrap;
    });
  }

  Future<void> _runMutation(Future<BootstrapData> Function() operation) async {
    if (state.user == null) {
      throw Exception('Sign in to continue.');
    }

    state = state.copyWith(saving: true);
    try {
      final bootstrap = await operation();
      state = state.copyWith(bootstrap: bootstrap, saving: false);
    } catch (e) {
      state = state.copyWith(saving: false);
      rethrow;
    }
  }
}
