import 'dart:convert';

import 'package:eva_app/models/bootstrap_data.dart';
import 'package:eva_app/services/auth_service.dart';
import 'package:eva_app/services/workspace_service.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final publicUserProvider = StateNotifierProvider<PublicUserNotifier, PublicUserState>((ref) {
  return PublicUserNotifier();
});

class PublicUserState {
  final String? sessionToken;
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
    this.sessionToken,
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
    String? sessionToken,
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
      sessionToken: sessionToken ?? this.sessionToken,
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
    FirebaseAuth.instance.idTokenChanges().listen((user) {
      _handleAuthStateChange(user);
    });

    await _handleAuthStateChange(FirebaseAuth.instance.currentUser);
  }

  Future<void> _handleAuthStateChange(User? user) async {
    if (user == null) {
      state = PublicUserState();
      await _clearCachedBootstrap();
      return;
    }

    try {
      await user.reload();
    } catch (_) {
      // Keep going with the cached user if reload fails.
    }

    final activeUser = FirebaseAuth.instance.currentUser ?? user;
    final token = await activeUser.getIdToken();
    final isVerified = activeUser.emailVerified;

    state = state.copyWith(
      sessionToken: token,
      user: activeUser,
      userId: activeUser.uid,
      isAuthenticated: isVerified,
      authLoading: false,
      requiresPasswordSetup: false,
    );

    if (isVerified) {
      await _loadBootstrap();
    } else {
      await _clearCachedBootstrap();
      state = state.copyWith(bootstrap: null, loading: false);
    }
  }

  Future<void> _loadBootstrap() async {
    if (state.user == null || !state.isAuthenticated) return;

    state = state.copyWith(loading: true);

    try {
      final cached = await _getCachedBootstrap();
      if (cached != null) {
        state = state.copyWith(bootstrap: cached, loading: false);
      }

      final bootstrap = await WorkspaceService.fetchBootstrap();
      state = state.copyWith(bootstrap: bootstrap, loading: false);
      await _cacheBootstrap(bootstrap);
    } catch (e) {
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
      } catch (_) {
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

  Future<void> signUpWithPassword({
    required String fullName,
    required String email,
    required String country,
    required String phoneNumber,
    required String password,
    required bool updatesOptIn,
  }) async {
    await AuthService.signUpWithPassword(
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

  Future<void> signOut() async {
    await AuthService.signOut();
    await _clearCachedBootstrap();
    state = PublicUserState();
  }

  Future<void> refresh() async {
    await _loadBootstrap();
  }

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

  Future<void> _runMutation(
    Future<BootstrapData> Function() operation,
  ) async {
    if (!state.isAuthenticated) {
      throw Exception('Sign in and verify your email to continue.');
    }

    state = state.copyWith(saving: true);
    try {
      final bootstrap = await operation();
      state = state.copyWith(bootstrap: bootstrap, saving: false);
      await _cacheBootstrap(bootstrap);
    } catch (e) {
      state = state.copyWith(saving: false);
      rethrow;
    }
  }
}
