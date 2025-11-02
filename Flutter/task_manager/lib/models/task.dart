import 'package:flutter/material.dart';
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

  Color get color {
    switch (this) {
      case Priority.low:
        return Colors.green;
      case Priority.medium:
        return Colors.orange;
      case Priority.high:
        return Colors.red;
      case Priority.urgent:
        return Colors.purple;
    }
  }

  IconData get icon {
    switch (this) {
      case Priority.low:
        return Icons.flag_outlined;
      case Priority.medium:
        return Icons.flag;
      case Priority.high:
        return Icons.flag;
      case Priority.urgent:
        return Icons.warning;
    }
  }

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
}

class Task {
  final String id;
  final String title;
  final String description;
  final bool completed;
  final Priority priority;
  final DateTime createdAt;
  final DateTime? dueDate; // EXERCÍCIO 1: Data de vencimento
  final String? category; // EXERCÍCIO 2: Categoria
  final DateTime? reminder; // EXERCÍCIO 3: Lembrete

  Task({
    String? id,
    required this.title,
    this.description = '',
    this.completed = false,
    this.priority = Priority.medium,
    DateTime? createdAt,
    this.dueDate,
    this.category,
    this.reminder,
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
      'dueDate': dueDate?.toIso8601String(), // EXERCÍCIO 1
      'category': category, // EXERCÍCIO 2
      'reminder': reminder?.toIso8601String(), // EXERCÍCIO 3
    };
  }

  factory Task.fromMap(Map<String, dynamic> map) {
    return Task(
      id: map['id'],
      title: map['title'],
      description: map['description'] ?? '',
      completed: map['completed'] == 1,
      priority: PriorityExtension.fromString(map['priority']),
      createdAt: DateTime.parse(map['createdAt']),
      dueDate: map['dueDate'] != null ? DateTime.parse(map['dueDate']) : null, // EXERCÍCIO 1
      category: map['category'], // EXERCÍCIO 2
      reminder: map['reminder'] != null ? DateTime.parse(map['reminder']) : null, // EXERCÍCIO 3
    );
  }

  Task copyWith({
    String? id,
    String? title,
    String? description,
    bool? completed,
    Priority? priority,
    DateTime? createdAt,
    DateTime? dueDate, // EXERCÍCIO 1
    String? category, // EXERCÍCIO 2
    DateTime? reminder, // EXERCÍCIO 3
  }) {
    return Task(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      completed: completed ?? this.completed,
      priority: priority ?? this.priority,
      createdAt: createdAt ?? this.createdAt,
      dueDate: dueDate ?? this.dueDate, // EXERCÍCIO 1
      category: category ?? this.category, // EXERCÍCIO 2
      reminder: reminder ?? this.reminder, // EXERCÍCIO 3
    );
  }

  // EXERCÍCIO 1: Verificar se a tarefa está vencida
  bool get isOverdue {
    if (dueDate == null || completed) return false;
    return dueDate!.isBefore(DateTime.now());
  }

  // EXERCÍCIO 1: Dias até o vencimento
  int? get daysUntilDue {
    if (dueDate == null) return null;
    final now = DateTime.now();
    final difference = dueDate!.difference(DateTime(now.year, now.month, now.day));
    return difference.inDays;
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
        other.createdAt == createdAt &&
        other.dueDate == dueDate &&
        other.category == category &&
        other.reminder == reminder;
  }

  @override
  int get hashCode {
    return Object.hash(
      id, title, description, completed, priority, createdAt, dueDate, category, reminder
    );
  }

  @override
  String toString() {
    return 'Task(id: $id, title: $title, description: $description, completed: $completed, priority: $priority, createdAt: $createdAt, dueDate: $dueDate, category: $category, reminder: $reminder)';
  }
}