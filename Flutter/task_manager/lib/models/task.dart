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
  final DateTime? dueDate;
  final String? category;
  final DateTime? reminder;

  // NOVOS CAMPOS - Aula 03
  final String? photoPath; // Câmera
  final DateTime? completedAt; // Sensores
  final String? completedBy; // 'manual', 'shake'
  final double? latitude; // GPS
  final double? longitude;
  final String? locationName;

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
    // NOVOS CAMPOS
    this.photoPath,
    this.completedAt,
    this.completedBy,
    this.latitude,
    this.longitude,
    this.locationName,
  })  : id = id ?? const Uuid().v4(),
        createdAt = createdAt ?? DateTime.now();

  // NOVOS GETTERS
  bool get hasPhoto => photoPath != null && photoPath!.isNotEmpty;
  bool get hasLocation => latitude != null && longitude != null;
  bool get wasCompletedByShake => completedBy == 'shake';

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'completed': completed ? 1 : 0,
      'priority': priority.name,
      'createdAt': createdAt.toIso8601String(),
      'dueDate': dueDate?.toIso8601String(),
      'category': category,
      'reminder': reminder?.toIso8601String(),
      // NOVOS CAMPOS
      'photoPath': photoPath,
      'completedAt': completedAt?.toIso8601String(),
      'completedBy': completedBy,
      'latitude': latitude,
      'longitude': longitude,
      'locationName': locationName,
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
      dueDate: map['dueDate'] != null ? DateTime.parse(map['dueDate']) : null,
      category: map['category'],
      reminder: map['reminder'] != null ? DateTime.parse(map['reminder']) : null,
      // NOVOS CAMPOS
      photoPath: map['photoPath'],
      completedAt: map['completedAt'] != null ? DateTime.parse(map['completedAt']) : null,
      completedBy: map['completedBy'],
      latitude: map['latitude'] != null ? map['latitude'] as double : null,
      longitude: map['longitude'] != null ? map['longitude'] as double : null,
      locationName: map['locationName'],
    );
  }

  Task copyWith({
    String? id,
    String? title,
    String? description,
    bool? completed,
    Priority? priority,
    DateTime? createdAt,
    DateTime? dueDate,
    String? category,
    DateTime? reminder,
    // NOVOS CAMPOS
    String? photoPath,
    DateTime? completedAt,
    String? completedBy,
    double? latitude,
    double? longitude,
    String? locationName,
  }) {
    return Task(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      completed: completed ?? this.completed,
      priority: priority ?? this.priority,
      createdAt: createdAt ?? this.createdAt,
      dueDate: dueDate ?? this.dueDate,
      category: category ?? this.category,
      reminder: reminder ?? this.reminder,
      // NOVOS CAMPOS
      photoPath: photoPath ?? this.photoPath,
      completedAt: completedAt ?? this.completedAt,
      completedBy: completedBy ?? this.completedBy,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      locationName: locationName ?? this.locationName,
    );
  }

  bool get isOverdue {
    if (dueDate == null || completed) return false;
    return dueDate!.isBefore(DateTime.now());
  }

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
        other.reminder == reminder &&
        other.photoPath == photoPath &&
        other.completedAt == completedAt &&
        other.completedBy == completedBy &&
        other.latitude == latitude &&
        other.longitude == longitude &&
        other.locationName == locationName;
  }

  @override
  int get hashCode {
    return Object.hash(
      id, title, description, completed, priority, createdAt, 
      dueDate, category, reminder, photoPath, completedAt, 
      completedBy, latitude, longitude, locationName
    );
  }

  @override
  String toString() {
    return 'Task(id: $id, title: $title, completed: $completed, priority: $priority, hasPhoto: $hasPhoto, hasLocation: $hasLocation)';
  }
}