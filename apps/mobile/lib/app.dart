import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:eva_app/providers/public_user_provider.dart';
import 'package:eva_app/screens/auth_screen.dart';
import 'package:eva_app/screens/budget_screen.dart';
import 'package:eva_app/screens/chat_screen.dart';
import 'package:eva_app/screens/dashboard_screen.dart';
import 'package:eva_app/screens/goals_screen.dart';
import 'package:eva_app/screens/onboarding_screen.dart';
import 'package:eva_app/screens/transactions_screen.dart';
import 'package:eva_app/widgets/layout.dart';

class EvaApp extends ConsumerWidget {
  const EvaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final publicUser = ref.watch(publicUserProvider);

    final router = GoRouter(
      routes: [
        GoRoute(
          path: '/',
          builder: (context, state) => const LandingScreen(),
        ),
        GoRoute(
          path: '/auth',
          builder: (context, state) => const AuthScreen(),
        ),
        GoRoute(
          path: '/onboarding',
          builder: (context, state) => const OnboardingScreen(),
        ),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const Layout(child: DashboardScreen()),
        ),
        GoRoute(
          path: '/chat',
          builder: (context, state) => const Layout(child: ChatScreen()),
        ),
        GoRoute(
          path: '/transactions',
          builder: (context, state) => const Layout(child: TransactionsScreen()),
        ),
        GoRoute(
          path: '/goals',
          builder: (context, state) => const Layout(child: GoalsScreen()),
        ),
        GoRoute(
          path: '/budget',
          builder: (context, state) => const Layout(child: BudgetScreen()),
        ),
      ],
      redirect: (context, state) {
        final isAuthenticated = publicUser.isAuthenticated;
        final hasOnboarded = publicUser.bootstrap?.hasOnboarded ?? false;
        final requiresPasswordSetup = publicUser.requiresPasswordSetup;
        final location = state.matchedLocation;
        final isPublicRoute = location == '/' || location.startsWith('/auth');

        if (!isAuthenticated) {
          return isPublicRoute ? null : '/auth';
        }

        if (requiresPasswordSetup) {
          return '/auth?mode=set-password';
        }

        if (isPublicRoute) {
          return hasOnboarded ? '/dashboard' : '/onboarding';
        }

        if (!hasOnboarded) {
          return '/onboarding';
        }

        return null;
      },
    );

    return MaterialApp.router(
      title: 'EVA - Your AI Finance Assistant',
      theme: ThemeData(
        primaryColor: const Color(0xFFF3A21C),
        scaffoldBackgroundColor: const Color(0xFFFBF4EA),
        fontFamily: 'Inter',
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(height: 24),
            Text(
              'Welcome to EVA',
              style: Theme.of(context).textTheme.headlineLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Your AI Finance Assistant',
              style: Theme.of(context).textTheme.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 48),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF3A21C),
                padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 16),
              ),
              onPressed: () => context.go('/auth'),
              child: const Text('Sign Up'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => context.go('/auth'),
              child: const Text('Sign In'),
            ),
          ],
        ),
      ),
    );
  }
}
