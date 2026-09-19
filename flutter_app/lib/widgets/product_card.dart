import 'package:flutter/material.dart';
import '../models/product.dart';

class ProductCardWidget extends StatelessWidget {
  final Product product;
  final VoidCallback onAdd;

  const ProductCardWidget({super.key, required this.product, required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: ListTile(
        title: Text(product.name, maxLines: 1, overflow: TextOverflow.ellipsis),
        subtitle: Text(
          '${product.brand != null ? '${product.brand} · ' : ''}${product.packSize ?? ''} · ₹${product.sellingPrice}',
        ),
        trailing: IconButton.filled(
          icon: const Icon(Icons.add),
          onPressed: onAdd,
        ),
      ),
    );
  }
}
