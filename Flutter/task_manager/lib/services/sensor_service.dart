import 'dart:async';
import 'dart:math' as math;
import 'package:sensors_plus/sensors_plus.dart';
import 'package:vibration/vibration.dart';

class SensorService {
  static final SensorService instance = SensorService._init();
  SensorService._init();

  StreamSubscription<AccelerometerEvent>? _accelerometerSubscription;
  Function()? _onShake;

  static const double _shakeThreshold = 15.0;
  static const Duration _shakeCooldown = Duration(milliseconds: 500);

  DateTime? _lastShakeTime;
  bool _isActive = false;

  bool get isActive => _isActive;

  void startShakeDetection(Function() onShake) {
    if (_isActive) {
      print('▲ Detecção já ativa');
      return;
    }

    _onShake = onShake;
    _isActive = true;

    _accelerometerSubscription = accelerometerEvents.listen(
      (AccelerometerEvent event) {
        _detectShake(event);
      },
      onError: (error) {
        print('✗ Erro no acelerômetro: $error');
      },
    );

    print('■ Detecção de shake iniciada');
  }

  void _detectShake(AccelerometerEvent event) {
    final now = DateTime.now();

    if (_lastShakeTime != null &&
        now.difference(_lastShakeTime!) < _shakeCooldown) {
      return;
    }

    final double magnitude = math.sqrt(
      event.x * event.x +
      event.y * event.y +
      event.z * event.z
    );

    if (magnitude > _shakeThreshold) {
      print('■ Shake! Magnitude: ${magnitude.toStringAsFixed(2)}');
      _lastShakeTime = now;
      _vibrateDevice();
      _onShake?.call();
    }
  }

  Future<void> _vibrateDevice() async {
    if (await Vibration.hasVibrator() ?? false) {
      Vibration.vibrate(duration: 100);
    }
  }

  void stopShakeDetection() {
    _accelerometerSubscription?.cancel();
    _isActive = false;
    _onShake = null;
    print('■ Detecção de shake parada');
  }
}