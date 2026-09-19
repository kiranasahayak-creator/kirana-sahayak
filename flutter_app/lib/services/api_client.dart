import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/forecast.dart';
import '../models/product.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => message;
}

class ApiClient {
  /// Backend URL. Override at build time, e.g.:
  ///   flutter run --dart-define=API_BASE_URL=https://your-app.onrender.com
  /// Default targets the Android emulator's alias for the host machine's
  /// localhost — change this before testing on a physical device.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000',
  );

  static const _tokenKey = 'kirana_token';
  String? _token;

  Future<void> _loadToken() async {
    if (_token != null) return;
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_tokenKey);
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<bool> hasToken() async {
    await _loadToken();
    return _token != null;
  }

  Future<Map<String, String>> _headers({bool json = true}) async {
    await _loadToken();
    return {
      if (json) 'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };
  }

  void _throwIfError(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) return;
    String message = 'Request failed (${res.statusCode})';
    try {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      message = data['error'] as String? ?? message;
    } catch (_) {
      // Response wasn't JSON — keep the generic message.
    }
    throw ApiException(res.statusCode, message);
  }

  Future<Map<String, dynamic>> login(String storeCode, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'storeCode': storeCode, 'password': password}),
    );
    _throwIfError(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<List<Product>> listProducts({String? category}) async {
    final uri = Uri.parse('$baseUrl/api/products').replace(
      queryParameters: category != null ? {'category': category} : null,
    );
    final res = await http.get(uri, headers: await _headers());
    _throwIfError(res);
    final list = jsonDecode(res.body) as List<dynamic>;
    return list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Product>> searchProducts(String query) async {
    final uri = Uri.parse('$baseUrl/api/products/search').replace(
      queryParameters: {'q': query},
    );
    final res = await http.get(uri, headers: await _headers());
    _throwIfError(res);
    final list = jsonDecode(res.body) as List<dynamic>;
    return list.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<void> createSale(List<CartLine> lines, {String source = 'search'}) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/sales'),
      headers: await _headers(),
      body: jsonEncode({
        'items': lines.map((l) => {'productId': l.product.id, 'quantity': l.quantity}).toList(),
        'source': source,
      }),
    );
    _throwIfError(res);
  }

  Future<List<Forecast>> weeklyRecommendations() async {
    final res = await http.get(
      Uri.parse('$baseUrl/api/recommendations/weekly'),
      headers: await _headers(),
    );
    _throwIfError(res);
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final list = data['recommendations'] as List<dynamic>;
    return list.map((e) => Forecast.fromJson(e as Map<String, dynamic>)).toList();
  }
}
