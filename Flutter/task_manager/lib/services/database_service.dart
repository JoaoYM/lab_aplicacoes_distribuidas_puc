import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/task.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._init();
  static Database? _database;

  DatabaseService._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('tasks.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 3, // AUMENTE A VERSÃO para 3
      onCreate: _createDB,
      onUpgrade: _upgradeDB, 
    );
  }

  Future<void> _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER NOT NULL,
        priority TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        dueDate TEXT,           -- EXERCÍCIO 1
        category TEXT,          -- EXERCÍCIO 2  
        reminder TEXT,          -- EXERCÍCIO 3
        
        -- NOVAS COLUNAS AULA 03
        photoPath TEXT,         -- Câmera
        completedAt TEXT,       -- Sensores
        completedBy TEXT,       -- Sensores ('manual', 'shake')
        latitude REAL,          -- GPS
        longitude REAL,         -- GPS
        locationName TEXT       -- GPS
      )
    ''');
  }

  Future<void> _upgradeDB(Database db, int oldVersion, int newVersion) async {
    // Migração da versão 1 para 2 (Exercícios anteriores)
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE tasks ADD COLUMN dueDate TEXT');
      await db.execute('ALTER TABLE tasks ADD COLUMN category TEXT');
      await db.execute('ALTER TABLE tasks ADD COLUMN reminder TEXT');
    }
    
    // Migração da versão 2 para 3 (Aula 03)
    if (oldVersion < 3) {
      await db.execute('ALTER TABLE tasks ADD COLUMN photoPath TEXT');
      await db.execute('ALTER TABLE tasks ADD COLUMN completedAt TEXT');
      await db.execute('ALTER TABLE tasks ADD COLUMN completedBy TEXT');
      await db.execute('ALTER TABLE tasks ADD COLUMN latitude REAL');
      await db.execute('ALTER TABLE tasks ADD COLUMN longitude REAL');
      await db.execute('ALTER TABLE tasks ADD COLUMN locationName TEXT');
      
      print('✅ Banco de dados atualizado para versão 3 (Aula 03)');
    }
  }

  Future<Task> create(Task task) async {
    final db = await database;
    await db.insert('tasks', task.toMap());
    return task;
  }

  Future<Task?> read(String id) async {
    final db = await database;
    final maps = await db.query(
      'tasks',
      where: 'id = ?',
      whereArgs: [id],
    );

    if (maps.isNotEmpty) {
      return Task.fromMap(maps.first);
    }
    return null;
  }

  Future<List<Task>> readAll() async {
    final db = await database;
    const orderBy = 'createdAt DESC';
    final result = await db.query('tasks', orderBy: orderBy);
    return result.map((map) => Task.fromMap(map)).toList();
  }

  Future<int> update(Task task) async {
    final db = await database;
    return db.update(
      'tasks',
      task.toMap(),
      where: 'id = ?',
      whereArgs: [task.id],
    );
  }

  Future<int> delete(String id) async {
    final db = await database;
    return await db.delete(
      'tasks',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  // NOVO MÉTODO: buscar tarefas por proximidade
  Future<List<Task>> getTasksNearLocation({
    required double latitude,
    required double longitude,
    double radiusInMeters = 1000,
  }) async {
    final allTasks = await readAll();

    return allTasks.where((task) {
      if (!task.hasLocation) return false;

      // Cálculo de distância usando fórmula simplificada
      final latDiff = (task.latitude! - latitude).abs();
      final lonDiff = (task.longitude! - longitude).abs();
      final distance = ((latDiff * 111000) + (lonDiff * 111000)) / 2;

      return distance <= radiusInMeters;
    }).toList();
  }

  Future<void> resetDatabase() async {
    final db = await database;
    await db.delete('tasks');
  }

  // Método para debug: ver estrutura da tabela
  Future<void> debugTableStructure() async {
    final db = await database;
    final tableInfo = await db.rawQuery('PRAGMA table_info(tasks)');
    print('=== ESTRUTURA DA TABELA tasks ===');
    for (var column in tableInfo) {
      print('Coluna: ${column['name']} - Tipo: ${column['type']}');
    }
    print('=================================');
  }
}