import 'package:flutter/material.dart';
import '../models/task.dart';
import '../models/category.dart';
import '../services/database_service.dart';
import '../widgets/task_card.dart';
import 'task_form_screen.dart';

class TaskListScreen extends StatefulWidget {
  const TaskListScreen({super.key});

  @override
  State<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends State<TaskListScreen> {
  List<Task> _tasks = [];
  String _filter = 'all'; 
  String _searchQuery = '';
  String _sortBy = 'date'; 
  String? _selectedCategory; 
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    final tasks = await DatabaseService.instance.readAll();
    setState(() {
      _tasks = tasks;
      _isLoading = false;
    });
  }

  List<Task> get _filteredTasks {
    var tasks = _tasks;

    // Filtro por status
    switch (_filter) {
      case 'completed':
        tasks = tasks.where((t) => t.completed).toList();
        break;
      case 'pending':
        tasks = tasks.where((t) => !t.completed).toList();
        break;
      case 'overdue': 
        tasks = tasks.where((t) => t.isOverdue).toList();
        break;
    }

    if (_selectedCategory != null) {
      tasks = tasks.where((t) => t.category == _selectedCategory).toList();
    }

    // Filtro por busca
    if (_searchQuery.isNotEmpty) {
      tasks = tasks.where((t) {
        return t.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
               t.description.toLowerCase().contains(_searchQuery.toLowerCase());
      }).toList();
    }

    // Ordenação
    switch (_sortBy) {
      case 'priority':
        final priorityOrder = {
          Priority.urgent: 0,
          Priority.high: 1,
          Priority.medium: 2,
          Priority.low: 3,
        };
        tasks.sort((a, b) {
          final orderA = priorityOrder[a.priority] ?? 2;
          final orderB = priorityOrder[b.priority] ?? 2;
          return orderA.compareTo(orderB);
        });
        break;
      case 'title':
        tasks.sort((a, b) => a.title.compareTo(b.title));
        break;
      case 'dueDate': 
        tasks.sort((a, b) {
          if (a.dueDate == null && b.dueDate == null) return 0;
          if (a.dueDate == null) return 1;
          if (b.dueDate == null) return -1;
          return a.dueDate!.compareTo(b.dueDate!);
        });
        break;
      case 'date':
      default:
        tasks.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    }

    return tasks;
  }

  Future<void> _toggleTask(Task task) async {
    final updated = task.copyWith(completed: !task.completed);
    await DatabaseService.instance.update(updated);
    
    await _loadTasks();
  }

  Future<void> _deleteTask(Task task) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar exclusão'),
        content: Text('Deseja realmente excluir "${task.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Excluir'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await DatabaseService.instance.delete(task.id);
      
      await _loadTasks();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tarefa excluída'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _openTaskForm([Task? task]) async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => TaskFormScreen(task: task),
      ),
    );

    if (result == true) {
      await _loadTasks();
    }
  }

  void _clearSearch() {
    setState(() {
      _searchQuery = '';
    });
  }

  Future<void> _exportData() async {
    try {
      final exportData = _tasks.map((task) => task.toMap()).toList();

      // Por simplicidade, vamos mostrar um snackbar
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${_tasks.length} tarefas exportadas'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao exportar: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _getSortLabel() {
    switch (_sortBy) {
      case 'date':
        return 'Data';
      case 'priority':
        return 'Prioridade';
      case 'title':
        return 'Título';
      case 'dueDate':
        return 'Vencimento';
      default:
        return 'Data';
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredTasks = _filteredTasks;
    final stats = _calculateStats();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Minhas Tarefas'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        elevation: 2,
        actions: [
          // Botão de busca
          if (_searchQuery.isEmpty)
            IconButton(
              icon: const Icon(Icons.search),
              onPressed: () {
                FocusScope.of(context).requestFocus(FocusNode());
              },
              tooltip: 'Buscar tarefas',
            ),
          
          IconButton(
            icon: const Icon(Icons.backup),
            onPressed: _exportData,
            tooltip: 'Exportar dados',
          ),

          IconButton(
            icon: const Icon(Icons.bug_report),
            onPressed: () => Navigator.pushNamed(context, '/debug'),
            tooltip: 'Debug Services',
          ),
          
          // Menu de Ordenação
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort),
            tooltip: 'Ordenar tarefas',
            onSelected: (value) => setState(() => _sortBy = value),
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'date',
                child: Row(
                  children: [
                    Icon(
                      Icons.access_time,
                      color: _sortBy == 'date' ? Colors.blue : null,
                    ),
                    const SizedBox(width: 8),
                    const Text('Ordenar por Data'),
                    if (_sortBy == 'date') ...[
                      const Spacer(),
                      const Icon(Icons.check, color: Colors.blue),
                    ],
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'priority',
                child: Row(
                  children: [
                    Icon(
                      Icons.flag,
                      color: _sortBy == 'priority' ? Colors.blue : null,
                    ),
                    const SizedBox(width: 8),
                    const Text('Ordenar por Prioridade'),
                    if (_sortBy == 'priority') ...[
                      const Spacer(),
                      const Icon(Icons.check, color: Colors.blue),
                    ],
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'title',
                child: Row(
                  children: [
                    Icon(
                      Icons.title,
                      color: _sortBy == 'title' ? Colors.blue : null,
                    ),
                    const SizedBox(width: 8),
                    const Text('Ordenar por Título'),
                    if (_sortBy == 'title') ...[
                      const Spacer(),
                      const Icon(Icons.check, color: Colors.blue),
                    ],
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'dueDate',
                child: Row(
                  children: [
                    Icon(
                      Icons.calendar_today,
                      color: _sortBy == 'dueDate' ? Colors.blue : null,
                    ),
                    const SizedBox(width: 8),
                    const Text('Ordenar por Vencimento'),
                    if (_sortBy == 'dueDate') ...[
                      const Spacer(),
                      const Icon(Icons.check, color: Colors.blue),
                    ],
                  ],
                ),
              ),
            ],
          ),
          
          // Filtro
          PopupMenuButton<String>(
            icon: const Icon(Icons.filter_list),
            tooltip: 'Filtrar tarefas',
            onSelected: (value) => setState(() => _filter = value),
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'all',
                child: Row(
                  children: [
                    const Icon(Icons.list),
                    const SizedBox(width: 8),
                    const Text('Todas'),
                    if (_filter == 'all') ...[
                      const Spacer(),
                      const Icon(Icons.check, color: Colors.blue),
                    ],
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'pending',
                child: Row(
                  children: [
                    const Icon(Icons.pending_actions),
                    const SizedBox(width: 8),
                    const Text('Pendentes'),
                    if (_filter == 'pending') ...[
                      const Spacer(),
                      const Icon(Icons.check, color: Colors.blue),
                    ],
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'completed',
                child: Row(
                  children: [
                    const Icon(Icons.check_circle),
                    const SizedBox(width: 8),
                    const Text('Concluídas'),
                    if (_filter == 'completed') ...[
                      const Spacer(),
                      const Icon(Icons.check, color: Colors.blue),
                    ],
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'overdue',
                child: Row(
                  children: [
                    const Icon(Icons.warning, color: Colors.red),
                    const SizedBox(width: 8),
                    const Text('Vencidas'),
                    if (_filter == 'overdue') ...[
                      const Spacer(),
                      const Icon(Icons.check, color: Colors.blue),
                    ],
                  ],
                ),
              ),
            ],
          ),

          PopupMenuButton<String>(
            icon: const Icon(Icons.category),
            tooltip: 'Filtrar por categoria',
            onSelected: (value) => setState(() => _selectedCategory = value == 'all' ? null : value),
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'all',
                child: Row(
                  children: [
                    const Icon(Icons.clear_all),
                    const SizedBox(width: 8),
                    const Text('Todas categorias'),
                    if (_selectedCategory == null) ...[
                      const Spacer(),
                      const Icon(Icons.check, color: Colors.blue),
                    ],
                  ],
                ),
              ),
              ...Category.predefinedCategories.map((category) {
                return PopupMenuItem(
                  value: category.id,
                  child: Row(
                    children: [
                      Container(
                        width: 12,
                        height: 12,
                        decoration: BoxDecoration(
                          color: category.color,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(category.name),
                      if (_selectedCategory == category.id) ...[
                        const Spacer(),
                        const Icon(Icons.check, color: Colors.blue),
                      ],
                    ],
                  ),
                );
              }),
            ],
          ),
        ],
      ),

      body: Column(
        children: [
          // Barra de Busca
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Buscar tarefas...',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: _clearSearch,
                        tooltip: 'Limpar busca',
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
              ),
              onChanged: (value) {
                setState(() => _searchQuery = value);
              },
              textInputAction: TextInputAction.search,
            ),
          ),

          // Indicadores de Filtro e Ordenação
          if (_tasks.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  // Indicador de Ordenação
                  if (_searchQuery.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.blue.shade100),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.sort, size: 14, color: Colors.blue),
                          const SizedBox(width: 4),
                          Text(
                            'Ordenado por ${_getSortLabel()}',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.blue,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),

                  // Indicador de Filtro
                  if (_filter != 'all' && _searchQuery.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.orange.shade100),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            _filter == 'completed' 
                                ? Icons.check_circle 
                                : _filter == 'overdue'
                                  ? Icons.warning
                                  : Icons.pending_actions,
                            size: 14,
                            color: Colors.orange,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _filter == 'completed' 
                              ? 'Concluídas' 
                              : _filter == 'overdue'
                                ? 'Vencidas'
                                : 'Pendentes',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.orange.shade700,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),

                  if (_selectedCategory != null && _searchQuery.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.green.shade100),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: Category.fromId(_selectedCategory)?.color ?? Colors.green,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            Category.fromId(_selectedCategory)?.name ?? _selectedCategory!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.green.shade700,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

          // Card de Estatísticas (apenas se houver tarefas e não estiver buscando)
          if (_tasks.isNotEmpty && _searchQuery.isEmpty)
            Container(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Colors.blue, Colors.blueAccent],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStatItem(
                    Icons.list,
                    'Total',
                    stats['total'].toString(),
                  ),
                  _buildStatItem(
                    Icons.pending_actions,
                    'Pendentes',
                    stats['pending'].toString(),
                  ),
                  _buildStatItem(
                    Icons.check_circle,
                    'Concluídas',
                    stats['completed'].toString(),
                  ),
                  _buildStatItem( 
                    Icons.warning,
                    'Vencidas',
                    stats['overdue'].toString(),
                    color: Colors.red,
                  ),
                ],
              ),
            ),

          // Indicador de resultados da busca
          if (_searchQuery.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Text(
                    '${filteredTasks.length} tarefa${filteredTasks.length != 1 ? 's' : ''} encontrada${filteredTasks.length != 1 ? 's' : ''}',
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 14,
                    ),
                  ),
                  const Spacer(),
                  TextButton(
                    onPressed: _clearSearch,
                    child: const Text('Limpar busca'),
                  ),
                ],
              ),
            ),

          // Lista de Tarefas
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : filteredTasks.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadTasks,
                        child: ListView.builder(
                          padding: const EdgeInsets.only(bottom: 80),
                          itemCount: filteredTasks.length,
                          itemBuilder: (context, index) {
                            final task = filteredTasks[index];
                            return TaskCard(
                              task: task,
                              onTap: () => _openTaskForm(task),
                              onToggle: () => _toggleTask(task),
                              onDelete: () => _deleteTask(task),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),

      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openTaskForm(),
        icon: const Icon(Icons.add),
        label: const Text('Nova Tarefa'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String label, String value, {Color? color}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: color ?? Colors.white, size: 32),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: color ?? Colors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: (color ?? Colors.white).withOpacity(0.8),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    String message;
    IconData icon;

    if (_searchQuery.isNotEmpty) {
      message = 'Nenhuma tarefa encontrada para "$_searchQuery"';
      icon = Icons.search_off;
    } else if (_selectedCategory != null) {
      final categoryName = Category.fromId(_selectedCategory)?.name ?? _selectedCategory;
      message = 'Nenhuma tarefa na categoria "$categoryName"';
      icon = Icons.category;
    } else {
      switch (_filter) {
        case 'completed':
          message = 'Nenhuma tarefa concluída ainda';
          icon = Icons.check_circle_outline;
          break;
        case 'pending':
          message = 'Nenhuma tarefa pendente';
          icon = Icons.pending_actions;
          break;
        case 'overdue':
          message = 'Nenhuma tarefa vencida';
          icon = Icons.warning;
          break;
        default:
          message = 'Nenhuma tarefa cadastrada';
          icon = Icons.task_alt;
      }
    }

    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 100, color: Colors.grey.shade300),
          const SizedBox(height: 16),
          Text(
            message,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 18,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 8),
          if (_searchQuery.isEmpty && _selectedCategory == null)
            TextButton.icon(
              onPressed: () => _openTaskForm(),
              icon: const Icon(Icons.add),
              label: const Text('Criar primeira tarefa'),
            )
          else
            TextButton.icon(
              onPressed: () {
                setState(() {
                  _searchQuery = '';
                  _selectedCategory = null;
                  _filter = 'all';
                });
              },
              icon: const Icon(Icons.clear_all),
              label: const Text('Limpar filtros'),
            ),
        ],
      ),
    );
  }

  Map<String, int> _calculateStats() {
    return {
      'total': _tasks.length,
      'completed': _tasks.where((t) => t.completed).length,
      'pending': _tasks.where((t) => !t.completed).length,
      'overdue': _tasks.where((t) => t.isOverdue).length,
    };
  }
}