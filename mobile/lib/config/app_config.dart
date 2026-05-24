import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class AppConfig {
  static String _baseUrl = '';

  static String get baseUrl {
    if (_baseUrl.isNotEmpty) return _baseUrl;
    
    if (kIsWeb) {
      return 'http://localhost:8000';
    }
    
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:8000';
      }
    } catch (e) {
      // Platform check will throw on Web, catch it silently
    }
    
    return 'http://localhost:8000';
  }

  // Asynchronously loads config.json on app startup
  static Future<void> loadConfig() async {
    try {
      final configString = await rootBundle.loadString('assets/config.json');
      final jsonMap = json.decode(configString) as Map<String, dynamic>;
      
      final loadedUrl = jsonMap['api_base_url'] as String?;
      if (loadedUrl != null && loadedUrl.isNotEmpty) {
        _baseUrl = loadedUrl;
        print('[AppConfig] Base API URL loaded successfully: $_baseUrl');
      }
    } catch (e) {
      // In case the asset is missing or during tests, fall back silently
      print('[AppConfig] Warning: Failed to load config.json, falling back to default loopback. Error: $e');
    }
  }
}
