class Product {
  final String id;
  final String name;
  final String category;
  final String? brand;
  final String? packSize;
  final num sellingPrice;
  final int currentStock;

  Product({
    required this.id,
    required this.name,
    required this.category,
    this.brand,
    this.packSize,
    required this.sellingPrice,
    required this.currentStock,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] as String,
      name: json['name'] as String,
      category: json['category'] as String,
      brand: json['brand'] as String?,
      packSize: json['packSize'] as String?,
      sellingPrice: json['sellingPrice'] as num,
      currentStock: (json['currentStock'] as num).toInt(),
    );
  }
}

class CartLine {
  final Product product;
  int quantity;

  CartLine({required this.product, required this.quantity});

  num get subtotal => product.sellingPrice * quantity;
}
