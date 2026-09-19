class Forecast {
  final String id;
  final String productName;
  final String category;
  final double predictedDemand;
  final int currentStockSnapshot;
  final int recommendedOrder;
  final double? expectedGrossProfit;
  final String explanation;

  Forecast({
    required this.id,
    required this.productName,
    required this.category,
    required this.predictedDemand,
    required this.currentStockSnapshot,
    required this.recommendedOrder,
    required this.expectedGrossProfit,
    required this.explanation,
  });

  factory Forecast.fromJson(Map<String, dynamic> json) {
    final product = json['product'] as Map<String, dynamic>;
    return Forecast(
      id: json['id'] as String,
      productName: product['name'] as String,
      category: product['category'] as String,
      predictedDemand: (json['predictedDemand'] as num).toDouble(),
      currentStockSnapshot: (json['currentStockSnapshot'] as num).toInt(),
      recommendedOrder: (json['recommendedOrder'] as num).toInt(),
      expectedGrossProfit: (json['expectedGrossProfit'] as num?)?.toDouble(),
      explanation: json['explanation'] as String,
    );
  }
}
