import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuthentication();
  }

  Future<void> _checkAuthentication() async {
    // Kurze Verzögerung, damit der Splash-Screen sichtbar ist
    await Future.delayed(const Duration(seconds: 1));
    
    if (!mounted) return;
    
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    try {
      final isAuthenticated = await authProvider.checkAuthentication();
      
      if (!mounted) return;
      
      if (isAuthenticated) {
        // Zum Chat-Screen navigieren, wenn authentifiziert
        Navigator.of(context).pushReplacementNamed('/chat');
      } else {
        // Zum Login-Screen navigieren, wenn nicht authentifiziert
        Navigator.of(context).pushReplacementNamed('/login');
      }
    } catch (e) {
      if (!mounted) return;
      
      // Bei einem Fehler zum Login-Screen navigieren
      Navigator.of(context).pushReplacementNamed('/login');
      
      // Fehler anzeigen
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Fehler bei der Authentifizierung: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const FlutterLogo(size: 120),
            const SizedBox(height: 40),
            const Text(
              'Insight Synergy',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.deepPurple,
              ),
            ),
            const SizedBox(height: 40),
            const CircularProgressIndicator(),
            const SizedBox(height: 20),
            Text(
              'Wird geladen...',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
} 