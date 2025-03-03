import 'package:flutter/material.dart';

/// Ein Widget, das eine Fehlermeldung anzeigt
class ErrorMessage extends StatelessWidget {
  /// Die anzuzeigende Fehlermeldung
  final String message;

  /// Callback, der aufgerufen wird, wenn der Benutzer auf die Schaltfläche "Erneut versuchen" tippt
  final VoidCallback? onRetry;

  /// Erstellt ein neues ErrorMessage-Widget
  const ErrorMessage({
    Key? key,
    required this.message,
    this.onRetry,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              color: Colors.red,
              size: 60.0,
            ),
            const SizedBox(height: 16.0),
            Text(
              message,
              style: const TextStyle(
                fontSize: 16.0,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24.0),
            if (onRetry != null)
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Erneut versuchen'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24.0,
                    vertical: 12.0,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
} 