import 'package:flutter/material.dart';
import 'screens/home_shell.dart';
import 'screens/login_screen.dart';
import 'services/api_client.dart';

void main() {
  runApp(const KiranaSahayakApp());
}

class KiranaSahayakApp extends StatelessWidget {
  const KiranaSahayakApp({super.key});

  @override
  Widget build(BuildContext context) {
    final api = ApiClient();
    return MaterialApp(
      title: 'Kirana Sahayak',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorSchemeSeed: const Color(0xFF16A34A),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
      ),
      home: FutureBuilder<bool>(
        future: api.hasToken(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return const Scaffold(body: Center(child: CircularProgressIndicator()));
          }
          return snapshot.data! ? HomeShell(api: api) : LoginScreen(api: api);
        },
      ),
    );
  }
}
