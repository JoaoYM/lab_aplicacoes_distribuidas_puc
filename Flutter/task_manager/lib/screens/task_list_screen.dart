import 'package:flutter/material.dart';
import '../models/task.dart';
import '../services/database_service.dart';

class TaskListScreen extends StatefulWidget {
  const TaskListScreen({Key? key}) : super(key: key);

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  List<Task> _tasks = [];
  List<Task> _filteredTasks = [];
  final _titleController = TextEditingController();
  Priority _selectedPriority = Priority.medium;
  String _selectedFilter = 'Todas';

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    final tasks = await DatabaseService.instance.readAll();
    setState(() {
      _tasks = tasks;
      _applyFilter();
    });
  }

  void _applyFilter() {
    switch (_selectedFilter) {
      case 'Completas':
        _filteredTasks = _tasks.where((task) => task.completed).toList();
        break;
      case 'Pendentes':
        _filteredTasks = _tasks.where((task) => !task.completed).toList();
        break;
      case 'Todas':
      default:
        _filteredTasks = _tasks;
        break;
    }
  }

  Future<void> _addTask() async {
    if (_titleController.text.trim().isEmpty) return;

    final task = Task(
      title: _titleController.text.trim(),
      priority: _selectedPriority,
    );
    await DatabaseService.instance.create(task);
    _titleController.clear();
    _loadTasks();
  }

  Future<void> _toggleTask(Task task) async {
    final updated = task.copyWith(completed: !task.completed);
    await DatabaseService.instance.update(updated);
    _loadTasks();
  }

  Future<void> _deleteTask(String id) async {
    await DatabaseService.instance.delete(id);
    _loadTasks();
  }

  Future<void> _editTask(Task task) async {
    final newTitleController = TextEditingController(text: task.title);
    Priority newPriority = task.priority;

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Editar Tarefa'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: newTitleController,
              decoration: const InputDecoration(
                labelText: 'Título',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField<Priority>(
              value: newPriority,
              items: Priority.values.map((priority) {
                return DropdownMenuItem(
                  value: priority,
                  child: Text(_getPriorityText(priority)),
                );
              }).toList(),
              onChanged: (value) {
                newPriority = value!;
              },
              decoration: const InputDecoration(
                labelText: 'Prioridade',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              final updatedTask = task.copyWith(
                title: newTitleController.text.trim(),
                priority: newPriority,
              );
              await DatabaseService.instance.update(updatedTask);
              Navigator.of(context).pop();
              _loadTasks();
            },
            child: const Text('Salvar'),
          ),
        ],
      ),
    );
  }

  String _getPriorityText(Priority priority) {
    switch (priority) {
      case Priority.low:
        return 'Baixa';
      case Priority.medium:
        return 'Média';
      case Priority.high:
        return 'Alta';
    }
  }

  Color _getPriorityColor(Priority priority) {
    switch (priority) {
      case Priority.low:
        return Colors.green;
      case Priority.medium:
        return Colors.orange;
      case Priority.high:
        return Colors.red;
    }
  }

  int get _completedCount => _tasks.where((task) => task.completed).length;
  int get _pendingCount => _tasks.where((task) => !task.completed).length;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas Tarefas'),
        actions: [
          // Filtro dropdown
          DropdownButton<String>(
            value: _selectedFilter,
            icon: const Icon(Icons.filter_list, color: Colors.white),
            dropdownColor: Colors.blue[700],
            onChanged: (String? newValue) {
              setState(() {
                _selectedFilter = newValue!;
                _applyFilter();
              });
            },
            items: <String>['Todas', 'Completas', 'Pendentes']
                .map<DropdownMenuItem<String>>((String value) {
              return DropdownMenuItem<String>(
                value: value,
                child: Text(
                  value,
                  style: const TextStyle(color: Colors.white),
                ),
              );
            }).toList(),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Column(
        children: [
          // Contador de tarefas
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey[100],
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    Text(
                      _tasks.length.toString(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue,
                      ),
                    ),
                    const Text('Total'),
                  ],
                ),
                Column(
                  children: [
                    Text(
                      _completedCount.toString(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                    const Text('Completas'),
                  ],
                ),
                Column(
                  children: [
                    Text(
                      _pendingCount.toString(),
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Colors.orange,
                      ),
                    ),
                    const Text('Pendentes'),
                  ],
                ),
              ],
            ),
          ),

          // Campo para adicionar nova tarefa
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _titleController,
                        decoration: const InputDecoration(
                          hintText: 'Nova tarefa...',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      onPressed: _addTask,
                      child: const Text('Adicionar'),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                // Dropdown de prioridade
                DropdownButtonFormField<Priority>(
                  value: _selectedPriority,
                  items: Priority.values.map((priority) {
                    return DropdownMenuItem(
                      value: priority,
                      child: Row(
                        children: [
                          Icon(
                            Icons.circle,
                            color: _getPriorityColor(priority),
                            size: 12,
                          ),
                          const SizedBox(width: 8),
                          Text(_getPriorityText(priority)),
                        ],
                      ),
                    );
                  }).toList(),
                  onChanged: (Priority? value) {
                    setState(() {
                      _selectedPriority = value!;
                    });
                  },
                  decoration: const InputDecoration(
                    labelText: 'Prioridade',
                    border: OutlineInputBorder(),
                    contentPadding: EdgeInsets.symmetric(horizontal: 12),
                  ),
                ),
              ],
            ),
          ),

          // Lista de tarefas
          Expanded(
            child: ListView.builder(
              itemCount: _filteredTasks.length,
              itemBuilder: (context, index) {
                final task = _filteredTasks[index];
                return ListTile(
                  leading: Checkbox(
                    value: task.completed,
                    onChanged: (_) => _toggleTask(task),
                  ),
                  title: Text(
                    task.title,
                    style: TextStyle(
                      decoration: task.completed
                          ? TextDecoration.lineThrough
                          : null,
                    ),
                  ),
                  subtitle: Text(
                    _getPriorityText(task.priority),
                    style: TextStyle(
                      color: _getPriorityColor(task.priority),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.edit, color: Colors.blue),
                        onPressed: () => _editTask(task),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete, color: Colors.red),
                        onPressed: () => _deleteTask(task.id),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}