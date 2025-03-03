import 'package:flutter/material.dart';

/// Ein Widget, das einen Ladeindikator anzeigt
class LoadingIndicator extends StatelessWidget {
  /// Text, der unter dem Ladeindikator angezeigt wird
  final String? message;

  /// Erstellt ein neues LoadingIndicator-Widget
  const LoadingIndicator({
    Key? key,
    this.message,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator(),
          if (message != null) ...[
            const SizedBox(height: 16.0),
            Text(
              message!,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 16.0,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ],
      ),
    );
  }
} 