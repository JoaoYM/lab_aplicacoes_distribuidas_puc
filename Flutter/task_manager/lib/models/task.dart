import 'package:uuid/uuid.dart';

enum Priority { low, medium, high }

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
      'priority': priority.name,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  factory Task.fromMap(Map<String, dynamic> map) {
    return Task(
      id: map['id'],
      title: map['title'],
      description: map['description'] ?? '',
      completed: map['completed'] == 1,
      priority: Priority.values.firstWhere(
        (e) => e.name == map['priority'],
        orElse: () => Priority.medium,
      ),
      createdAt: DateTime.parse(map['createdAt']),
    );
  }

  Task copyWith({
    String? title,
    String? description,
    bool? completed,
    Priority? priority,
  }) {
    return Task(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      completed: completed ?? this.completed,
      priority: priority ?? this.priority,
      createdAt: createdAt,
    );
  }
}