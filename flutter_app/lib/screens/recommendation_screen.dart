import 'package:flutter/material.dart';
import '../models/forecast.dart';
import '../services/api_client.dart';

class RecommendationScreen extends StatefulWidget {
  final ApiClient api;
  const RecommendationScreen({super.key, required this.api});

  @override
  State<RecommendationScreen> createState() => _RecommendationScreenState();
}

class _RecommendationScreenState extends State<RecommendationScreen> {
  bool _loading = true;
  String? _error;
  List<Forecast> _forecasts = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final forecasts = await widget.api.weeklyRecommendations();
      if (mounted) setState(() => _forecasts = forecasts);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!, style: const TextStyle(color: Colors.red)));

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Weekly Recommendation', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          const Text(
            'Based on recent sales, current inventory, and upcoming events.',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 16),
          if (_forecasts.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 48),
              child: Column(
                children: [
                  Text('No forecast yet for this store', style: TextStyle(fontWeight: FontWeight.w600)),
                  SizedBox(height: 4),
                  Text(
                    "The forecasting engine hasn't run for this store yet — run "
                    'ml/training/train_model.py then ml/prediction/generate_forecasts.py.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey),
                  ),
                ],
              ),
            )
          else
            ..._forecasts.map((f) => _ForecastCard(forecast: f)),
        ],
      ),
    );
  }
}

class _ForecastCard extends StatelessWidget {
  final Forecast forecast;
  const _ForecastCard({required this.forecast});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(forecast.productName, style: const TextStyle(fontWeight: FontWeight.w600)),
                      Text(forecast.category, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                ),
                Chip(label: Text('Order ${forecast.recommendedOrder}')),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _Stat(label: 'Current stock', value: '${forecast.currentStockSnapshot}'),
                _Stat(label: 'Predicted demand', value: forecast.predictedDemand.round().toString()),
                _Stat(label: 'Recommended order', value: '${forecast.recommendedOrder}'),
              ],
            ),
            if (forecast.expectedGrossProfit != null) ...[
              const SizedBox(height: 8),
              Text(
                'Expected gross profit if ordered: ₹${forecast.expectedGrossProfit!.round()}',
                style: const TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
            const SizedBox(height: 6),
            Text(forecast.explanation, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  final String label;
  final String value;
  const _Stat({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 2),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(8)),
        child: Column(
          children: [
            Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey), textAlign: TextAlign.center),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}
