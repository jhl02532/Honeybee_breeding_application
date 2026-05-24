import 'package:dio/dio.dart';
import '../../config/app_config.dart';

class ApiClient {
  late final Dio dio;

  ApiClient({String? baseUrl}) {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl ?? AppConfig.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Logging & Error Interception
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          print('--> [API REQUEST] ${options.method} ${options.uri}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          print('<-- [API RESPONSE] ${response.statusCode} ${response.requestOptions.uri}');
          return handler.next(response);
        },
        onError: (DioException e, handler) {
          print('[API ERROR] Path: ${e.requestOptions.path}');
          print('[API ERROR] Status: ${e.response?.statusCode}');
          print('[API ERROR] Message: ${e.message}');
          return handler.next(e);
        },
      ),
    );
  }
}
