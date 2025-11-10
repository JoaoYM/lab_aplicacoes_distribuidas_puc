// lib/screens/debug_screen.dart
import 'package:flutter/material.dart';
import '../services/camera_service.dart';
import '../services/location_service.dart';
import '../services/sensor_service.dart';

class DebugScreen extends StatelessWidget {
  const DebugScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Debug - Verificar Serviços'),
        backgroundColor: Colors.orange,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildServiceCard(
            '📸 Câmera',
            'Verificar disponibilidade da câmera',
            Icons.camera_alt,
            Colors.blue,
            () async {
              final hasCameras = CameraService.instance.hasCameras;
              _showResultDialog(
                context, 
                'Câmera', 
                hasCameras ? '✅ Câmeras disponíveis' : '❌ Nenhuma câmera encontrada'
              );
            },
          ),
          
          _buildServiceCard(
            '📍 GPS',
            'Testar localização atual',
            Icons.gps_fixed,
            Colors.green,
            () async {
              try {
                final position = await LocationService.instance.getCurrentLocation();
                _showResultDialog(
                  context,
                  'GPS',
                  position != null 
                    ? '✅ Localização obtida:\nLat: ${position.latitude.toStringAsFixed(6)}\nLon: ${position.longitude.toStringAsFixed(6)}'
                    : '❌ GPS não disponível ou permissão negada'
                );
              } catch (e) {
                _showResultDialog(context, 'GPS', '❌ Erro: $e');
              }
            },
          ),
          
          _buildServiceCard(
            '📱 Sensores',
            'Verificar detecção de shake',
            Icons.vibration,
            Colors.purple,
            () {
              final isActive = SensorService.instance.isActive;
              _showResultDialog(
                context,
                'Sensores',
                isActive ? '✅ Detecção ativa' : '❌ Detecção inativa'
              );
            },
          ),
          
          _buildServiceCard(
            '🔄 Iniciar Shake',
            'Ativar detecção de movimento',
            Icons.play_arrow,
            Colors.red,
            () {
              SensorService.instance.startShakeDetection(() {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('🎉 Shake detectado!'),
                    backgroundColor: Colors.green,
                  ),
                );
              });
              _showResultDialog(context, 'Shake', '✅ Detecção iniciada!\nAgite o dispositivo para testar.');
            },
          ),
          
          _buildTestTaskCard(context),
        ],
      ),
    );
  }

  Widget _buildServiceCard(
    String title, 
    String subtitle, 
    IconData icon, 
    Color color, 
    VoidCallback onTap
  ) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.only(bottom: 16),
      child: ListTile(
        leading: Icon(icon, color: color, size: 32),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.arrow_forward_ios),
        onTap: onTap,
      ),
    );
  }

  Widget _buildTestTaskCard(BuildContext context) {
    return Card(
      elevation: 4,
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '🧪 Teste Rápido',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text('Crie uma tarefa de teste com todas as features:'),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => Navigator.pushNamed(context, '/task-form'),
                    icon: const Icon(Icons.add),
                    label: const Text('Criar Tarefa Teste'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showResultDialog(BuildContext context, String title, String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }
}