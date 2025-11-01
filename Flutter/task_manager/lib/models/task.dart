import 'package:uuid/uuid.dart';

enum Priority { low, medium, high, urgent }

extension PriorityExtension on Priority {
  String get name {
    switch (this) {
      case Priority.low:
        return 'low';
      case Priority.medium:
        return 'medium';
      case Priority.high:
        return 'high';
      case Priority.urgent:
        return 'urgent';
    }
  }

  String get displayName {
    switch (this) {
      case Priority.low:
        return 'Baixa';
      case Priority.medium:
        return 'Média';
      case Priority.high:
        return 'Alta';
      case Priority.urgent:
        return 'Urgente';
    }
  }

  // Color get color {
  //   switch (this) {
  //     case Priority.low:
  //       return Colors.green;
  //     case Priority.medium:
  //       return Colors.orange;
  //     case Priority.high:
  //       return Colors.red;
  //     case Priority.urgent:
  //       return Colors.purple;
  //   }
  // }

  // IconData get icon {
  //   switch (this) {
  //     case Priority.low:
  //       return Icons.flag_outlined;
  //     case Priority.medium:
  //       return Icons.flag;
  //     case Priority.high:
  //       return Icons.flag;
  //     case Priority.urgent:
  //       return Icons.warning;
  //   }
  // }

  static Priority fromString(String value) {
    switch (value) {
      case 'low':
        return Priority.low;
      case 'medium':
        return Priority.medium;
      case 'high':
        return Priority.high;
      case 'urgent':
        return Priority.urgent;
      default:
        return Priority.medium;
    }
  }

  static List<Priority> get values => [Priority.low, Priority.medium, Priority.high, Priority.urgent];
}

class Task {
  final String id;
  final String title;
  final String description;
  final bool completed;
  final Priority priority;
  final DateTime createdAt;

  Task({
    String? id,
    required this.title,
    this.description = '',
    this.completed = false,
    this.priority = Priority.medium,
    DateTime? createdAt,
  })  : id = id ?? const Uuid().v4(),
        createdAt = createdAt ?? DateTime.now();

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'completed': completed ? 1 : 0,
      'priority': priority.name, // Usa a extension para converter para string
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory Task.fromMap(Map<String, dynamic> map) {
    return Task(
      id: map['id'],
      title: map['title'],
      description: map['description'] ?? '',
      completed: map['completed'] == 1,
      priority: PriorityExtension.fromString(map['priority']), // Usa a extension para converter da string
      createdAt: DateTime.parse(map['createdAt']),
    );
  }

  Task copyWith({
    String? id,
    String? title,
    String? description,
    bool? completed,
    Priority? priority,
    DateTime? createdAt,
  }) {
    return Task(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      completed: completed ?? this.completed,
      priority: priority ?? this.priority,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Task &&
        other.id == id &&
        other.title == title &&
        other.description == description &&
        other.completed == completed &&
        other.priority == priority &&
        other.createdAt == createdAt;
  }

  @override
  int get hashCode {
    return Object.hash(id, title, description, completed, priority, createdAt);
  }

  @override
  String toString() {
    return 'Task(id: $id, title: $title, description: $description, completed: $completed, priority: $priority, createdAt: $createdAt)';
  }
}