import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart'; // EXERCÍCIO 4
import '../models/task.dart';
import '../models/category.dart';

class TaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback onTap;
  final VoidCallback onToggle;
  final VoidCallback onDelete;

  const TaskCard({
    super.key,
    required this.task,
    required this.onTap,
    required this.onToggle,
    required this.onDelete,
  });

  Map<String, dynamic> _getPriorityStyle(Priority priority) {
    switch (priority) {
      case Priority.low:
        return {
          'color': Colors.green,
          'icon': Icons.flag_outlined,
          'label': 'Baixa',
        };
      case Priority.medium:
        return {
          'color': Colors.orange,
          'icon': Icons.flag,
          'label': 'Média',
        };
      case Priority.high:
        return {
          'color': Colors.red,
          'icon': Icons.flag,
          'label': 'Alta',
        };
      case Priority.urgent:
        return {
          'color': Colors.purple,
          'icon': Icons.warning,
          'label': 'Urgente',
        };
    }
  }

  // EXERCÍCIO 4: Compartilhar tarefa
  void _shareTask() {
    final String shareText = '''
📋 ${task.title}

${task.description.isNotEmpty ? '📝 ${task.description}' : ''}
${task.dueDate != null ? '📅 Vencimento: ${DateFormat('dd/MM/yyyy').format(task.dueDate!)}' : ''}
${task.category != null ? '🏷️ Categoria: ${Category.fromId(task.category)?.name ?? task.category}' : ''}
🎯 Prioridade: ${task.priority.displayName}
${task.completed ? '✅ Concluída' : '⏳ Pendente'}
'''.trim();

    Share.share(shareText, subject: 'Tarefa: ${task.title}');
  }

  @override
  Widget build(BuildContext context) {
    final priorityStyle = _getPriorityStyle(task.priority);
    final dateFormat = DateFormat('dd/MM/yyyy HH:mm');
    final category = Category.fromId(task.category); // EXERCÍCIO 2

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: task.completed ? 1 : 3,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: task.completed 
            ? Colors.grey.shade300 
            : task.isOverdue 
              ? Colors.red // EXERCÍCIO 1: Destaque para tarefas vencidas
              : priorityStyle['color'],
          width: 2,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Checkbox
              Checkbox(
                value: task.completed,
                onChanged: (_) => onToggle(),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(4),
                ),
              ),

              const SizedBox(width: 12),

              // Conteúdo Principal
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Título com indicador de vencimento
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            task.title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              decoration: task.completed 
                                  ? TextDecoration.lineThrough 
                                  : null,
                              color: task.completed 
                                  ? Colors.grey 
                                  : task.isOverdue 
                                    ? Colors.red // EXERCÍCIO 1: Texto vermelho para vencidas
                                    : Colors.black,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (task.isOverdue) // EXERCÍCIO 1: Indicador de vencimento
                          const Icon(Icons.warning, color: Colors.red, size: 16),
                      ],
                    ),

                    if (task.description.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        task.description,
                        style: TextStyle(
                          fontSize: 14,
                          color: task.completed 
                              ? Colors.grey.shade400 
                              : Colors.grey.shade700,
                          decoration: task.completed 
                              ? TextDecoration.lineThrough 
                              : null,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],

                    const SizedBox(height: 8),

                    // Metadata Row
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        // Prioridade
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: priorityStyle['color'],
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                priorityStyle['icon'],
                                size: 14,
                                color: priorityStyle['color'],
                              ),
                              const SizedBox(width: 4),
                              Text(
                                priorityStyle['label'],
                                style: TextStyle(
                                  fontSize: 12,
                                  color: priorityStyle['color'],
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // EXERCÍCIO 2: Categoria
                        if (category != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: category.color,
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: category.color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  category.name,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: category.color,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // EXERCÍCIO 1: Data de Vencimento
                        if (task.dueDate != null)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: task.isOverdue ? Colors.red : Colors.blue,
                                width: 1,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.calendar_today,
                                  size: 14,
                                  color: task.isOverdue ? Colors.red : Colors.blue,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  DateFormat('dd/MM/yyyy').format(task.dueDate!),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: task.isOverdue ? Colors.red : Colors.blue,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),

                        // Data de criação
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.grey.shade400,
                              width: 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.access_time,
                                size: 14,
                                color: Colors.grey.shade600,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                dateFormat.format(task.createdAt),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(width: 8),

              // Botões de Ação
              Column(
                children: [
                  // EXERCÍCIO 4: Botão Compartilhar
                  IconButton(
                    onPressed: _shareTask,
                    icon: const Icon(Icons.share, size: 20),
                    color: Colors.blue,
                    tooltip: 'Compartilhar tarefa',
                  ),
                  
                  // Botão Deletar
                  IconButton(
                    onPressed: onDelete,
                    icon: const Icon(Icons.delete_outline, size: 20),
                    color: Colors.red,
                    tooltip: 'Deletar tarefa',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}