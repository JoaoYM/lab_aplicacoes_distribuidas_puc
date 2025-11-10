import 'package:flutter/material.dart';
import 'package:task_manager/screens/debug_screen.dart';
import 'package:task_manager/screens/task_form_screen.dart';
import 'screens/task_list_screen.dart';
import 'services/camera_service.dart'; // NOVO

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar câmera - NOVO
  await CameraService.instance.initialize();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Task Manager Pro',
      debugShowCheckedModeBanner: false,

      // Tema Claro
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),

      // Tema Escuro
      darkTheme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: Colors.blue,
          brightness: Brightness.dark,
        ),
        useMaterial3: true,
      ),

      // Seguir configuração do sistema
      themeMode: ThemeMode.system,

      home: const TaskListScreen(),

      routes: {
        '/debug': (context) => const DebugScreen(),
        '/task-form': (context) => const TaskFormScreen(), // se já não tiver
      },
    );
  }
}