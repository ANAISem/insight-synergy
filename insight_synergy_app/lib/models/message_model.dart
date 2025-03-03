enum MessageSender {
  user,
  system,
}

class Message {
  final String id;
  final String content;
  final MessageSender sender;
  final DateTime timestamp;
  final bool isError;

  Message({
    required this.id,
    required this.content,
    required this.sender,
    required this.timestamp,
    this.isError = false,
  });

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'],
      content: json['content'],
      sender: json['sender'] == 'user' ? MessageSender.user : MessageSender.system,
      timestamp: DateTime.parse(json['timestamp']),
      isError: json['isError'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'sender': sender == MessageSender.user ? 'user' : 'system',
      'timestamp': timestamp.toIso8601String(),
      'isError': isError,
    };
  }

  // Erstelle eine Fehlernachricht
  factory Message.error(String errorMessage) {
    return Message(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: "Fehler: $errorMessage",
      sender: MessageSender.system,
      timestamp: DateTime.now(),
      isError: true,
    );
  }

  // Erstelle eine Benutzernachricht
  factory Message.user(String content) {
    return Message(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: content,
      sender: MessageSender.user,
      timestamp: DateTime.now(),
    );
  }

  // Erstelle eine Systemnachricht
  factory Message.system(String content) {
    return Message(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      content: content,
      sender: MessageSender.system,
      timestamp: DateTime.now(),
    );
  }
} 