import 'package:flutter/material.dart';

// EXERCÍCIO 2: Modelo de Categoria
class Category {
  final String id;
  final String name;
  final Color color;

  const Category({
    required this.id,
    required this.name,
    required this.color,
  });

  // Categorias pré-definidas
  static final List<Category> predefinedCategories = [
    const Category(id: 'work', name: 'Trabalho', color: Colors.blue),
    const Category(id: 'personal', name: 'Pessoal', color: Colors.green),
    const Category(id: 'shopping', name: 'Compras', color: Colors.orange),
    const Category(id: 'health', name: 'Saúde', color: Colors.red),
    const Category(id: 'study', name: 'Estudo', color: Colors.purple),
    const Category(id: 'other', name: 'Outros', color: Colors.grey),
  ];

  static Category get defaultCategory => predefinedCategories.firstWhere(
    (cat) => cat.id == 'personal',
  );

  static Category? fromId(String? id) {
    if (id == null) return null;
    try {
      return predefinedCategories.firstWhere((cat) => cat.id == id);
    } catch (e) {
      return null;
    }
  }
}