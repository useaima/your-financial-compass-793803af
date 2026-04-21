import 'package:flutter/material.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:eva_app/providers/public_user_provider.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _countryController = TextEditingController();
  final _phoneController = TextEditingController();
  final _verificationCodeController = TextEditingController();

  bool _isSignUp = false;
  bool _isLoading = false;
  bool _updatesOptIn = false;
  bool _isVerificationMode = false;
  bool _useCodeVerification = false;
  String _verificationEmail = '';

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    _countryController.dispose();
    _phoneController.dispose();
    _verificationCodeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                _isVerificationMode ? 'Verify your email' : 'Welcome to EVA',
                style: Theme.of(context).textTheme.headlineMedium,
                textAlign: TextAlign.center,
              ),
              if (_isVerificationMode) ...[
                const SizedBox(height: 12),
                Text(
                  'Open the verification email sent to $_verificationEmail, or switch to code verification below.',
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: 32),
              if (_isVerificationMode) ...[
                SegmentedButton<bool>(
                  segments: const [
                    ButtonSegment<bool>(value: false, label: Text('Magic Link')),
                    ButtonSegment<bool>(value: true, label: Text('Verification Code')),
                  ],
                  selected: {_useCodeVerification},
                  onSelectionChanged: (selection) {
                    setState(() => _useCodeVerification = selection.first);
                  },
                ),
                const SizedBox(height: 16),
                if (_useCodeVerification) ...[
                  TextField(
                    controller: _verificationCodeController,
                    decoration: const InputDecoration(
                      labelText: 'Verification Code',
                      border: OutlineInputBorder(),
                    ),
                    keyboardType: TextInputType.number,
                  ),
                  const SizedBox(height: 16),
                ],
              ] else if (_isSignUp) ...[
                TextField(
                  controller: _fullNameController,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _countryController,
                  decoration: const InputDecoration(
                    labelText: 'Country',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _phoneController,
                  decoration: const InputDecoration(
                    labelText: 'Phone Number',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                CheckboxListTile(
                  title: const Text('Receive updates and tips'),
                  value: _updatesOptIn,
                  onChanged: (value) {
                    setState(() => _updatesOptIn = value ?? false);
                  },
                ),
                const SizedBox(height: 16),
              ],
              TextField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _isLoading ? null : (_isVerificationMode ? _handleVerification : _handleSubmit),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFF3A21C),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator()
                    : Text(
                        _isVerificationMode
                            ? (_useCodeVerification ? 'Verify Code' : 'I opened the magic link')
                            : (_isSignUp ? 'Sign Up' : 'Sign In'),
                      ),
              ),
              const SizedBox(height: 16),
              if (_isVerificationMode) ...[
                TextButton(
                  onPressed: _isLoading
                      ? null
                      : () async {
                          setState(() => _isLoading = true);
                          try {
                            await ref
                                .read(publicUserProvider.notifier)
                                .resendVerificationEmail(_verificationEmail);
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Verification email sent again')),
                              );
                            }
                          } catch (e) {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text(e.toString())),
                              );
                            }
                          } finally {
                            if (mounted) {
                              setState(() => _isLoading = false);
                            }
                          }
                        },
                  child: const Text('Resend verification email'),
                ),
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isVerificationMode = false;
                      _useCodeVerification = false;
                    });
                  },
                  child: const Text('Back to sign in'),
                ),
              ] else
                TextButton(
                  onPressed: () {
                    setState(() => _isSignUp = !_isSignUp);
                  },
                  child: Text(_isSignUp
                      ? 'Already have an account? Sign In'
                      : "Don't have an account? Sign Up"),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleSubmit() async {
    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please fill in all fields')),
        );
      }
      return;
    }

    setState(() => _isLoading = true);

    try {
      if (_isSignUp) {
        final requiresVerification =
            await ref.read(publicUserProvider.notifier).signUpWithPassword(
              fullName: _fullNameController.text,
              email: _emailController.text,
              country: _countryController.text,
              phoneNumber: _phoneController.text,
              password: _passwordController.text,
              updatesOptIn: _updatesOptIn,
            );
        if (mounted) {
          if (requiresVerification) {
            setState(() {
              _verificationEmail = _emailController.text.trim().toLowerCase();
              _isVerificationMode = true;
            });
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Check your email to verify your account')),
            );
          }
        }
      } else {
        await ref.read(publicUserProvider.notifier).signInWithPassword(
              _emailController.text,
              _passwordController.text,
            );
      }
    } catch (e) {
      final message = e.toString();
      if (mounted) {
        if ((message.toLowerCase().contains('email') &&
                message.toLowerCase().contains('confirm')) ||
            message.toLowerCase().contains('verify')) {
          setState(() {
            _verificationEmail = _emailController.text.trim().toLowerCase();
            _isVerificationMode = true;
          });
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message)),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _handleVerification() async {
    if (_verificationEmail.isEmpty) {
      return;
    }

    setState(() => _isLoading = true);
    try {
      if (_useCodeVerification) {
        await ref.read(publicUserProvider.notifier).verifyEmailCode(
              _verificationEmail,
              _verificationCodeController.text,
            );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Email verified successfully')),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('After opening the magic link, return to EVA and sign in again if needed.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString())),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
}
