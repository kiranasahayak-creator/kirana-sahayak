import 'package:flutter/material.dart';
import '../models/product.dart';

class CartLineWidget extends StatelessWidget {
  final CartLine line;
  final ValueChanged<int> onChangeQuantity;
  final VoidCallback onRemove;

  const CartLineWidget({
    super.key,
    required this.line,
    required this.onChangeQuantity,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      title: Text(line.product.name, maxLines: 1, overflow: TextOverflow.ellipsis),
      subtitle: Text('₹${line.product.sellingPrice} each'),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: const Icon(Icons.remove_circle_outline),
            onPressed: () => line.quantity <= 1 ? onRemove() : onChangeQuantity(line.quantity - 1),
          ),
          Text('${line.quantity}', style: const TextStyle(fontWeight: FontWeight.w600)),
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            onPressed: () => onChangeQuantity(line.quantity + 1),
          ),
          const SizedBox(width: 8),
          Text('₹${line.subtotal}', style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
