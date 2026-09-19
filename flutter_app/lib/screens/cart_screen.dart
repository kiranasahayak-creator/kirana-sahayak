import 'package:flutter/material.dart';
import '../models/product.dart';
import '../services/api_client.dart';
import '../widgets/cart_line_widget.dart';
import '../widgets/product_card.dart';

class CartScreen extends StatefulWidget {
  final ApiClient api;
  const CartScreen({super.key, required this.api});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _searchController = TextEditingController();
  List<Product> _products = [];
  List<Product>? _searchResults;
  final List<CartLine> _cart = [];
  bool _sending = false;
  String? _banner;

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    try {
      final products = await widget.api.listProducts();
      if (mounted) setState(() => _products = products);
    } catch (_) {
      // Quietly ignore on first load — the empty state below still lets the
      // shopkeeper search directly.
    }
  }

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _searchResults = null);
      return;
    }
    try {
      final results = await widget.api.searchProducts(query);
      if (mounted) setState(() => _searchResults = results);
    } catch (_) {
      if (mounted) setState(() => _searchResults = []);
    }
  }

  void _addToCart(Product product) {
    setState(() {
      final existing = _cart.where((l) => l.product.id == product.id).toList();
      if (existing.isNotEmpty) {
        existing.first.quantity += 1;
      } else {
        _cart.add(CartLine(product: product, quantity: 1));
      }
    });
  }

  void _changeQuantity(CartLine line, int quantity) {
    setState(() => line.quantity = quantity);
  }

  void _removeFromCart(CartLine line) {
    setState(() => _cart.remove(line));
  }

  void _voiceComingSoon() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Voice capture (Sarvam) is wired up on web; the Flutter recording '
          'plugin + mic permissions are the next step for this screen. '
          'Use search or quick add for now.',
        ),
      ),
    );
  }

  Future<void> _send() async {
    if (_cart.isEmpty) return;
    setState(() {
      _sending = true;
      _banner = null;
    });
    try {
      await widget.api.createSale(_cart, source: 'quickadd');
      setState(() {
        _cart.clear();
        _banner = 'Sale recorded successfully';
      });
      _loadProducts();
    } catch (e) {
      setState(() => _banner = e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalItems = _cart.fold<int>(0, (s, l) => s + l.quantity);
    final totalValue = _cart.fold<num>(0, (s, l) => s + l.subtotal);
    final displayProducts = _searchResults ?? _products.take(12).toList();

    return Stack(
      children: [
        ListView(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 140),
          children: [
            if (_banner != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(_banner!, style: TextStyle(color: Colors.green.shade800)),
              ),
            TextField(
              controller: _searchController,
              onChanged: _search,
              decoration: const InputDecoration(
                hintText: "Search products (e.g. Lay's, Coke, Maggi)",
                prefixIcon: Icon(Icons.search),
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              _searchResults != null ? 'Search results' : 'Quick add',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            ...displayProducts.map(
              (p) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: ProductCardWidget(product: p, onAdd: () => _addToCart(p)),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Column(
                children: [
                  const Padding(
                    padding: EdgeInsets.all(12),
                    child: Align(alignment: Alignment.centerLeft, child: Text('Cart', style: TextStyle(fontWeight: FontWeight.w600))),
                  ),
                  if (_cart.isEmpty)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Column(
                        children: [
                          Text('Cart is empty', style: TextStyle(fontWeight: FontWeight.w600)),
                          SizedBox(height: 4),
                          Text('Add products using search, quick add, or voice.', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    )
                  else
                    ..._cart.map(
                      (line) => CartLineWidget(
                        line: line,
                        onChangeQuantity: (q) => _changeQuantity(line, q),
                        onRemove: () => _removeFromCart(line),
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        Positioned(
          right: 16,
          bottom: 96,
          child: FloatingActionButton(
            heroTag: 'voice',
            onPressed: _voiceComingSoon,
            child: const Icon(Icons.mic),
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, -2))],
            ),
            child: SafeArea(
              top: false,
              child: Row(
                children: [
                  Expanded(
                    child: Text('$totalItems items · ₹$totalValue', style: const TextStyle(fontWeight: FontWeight.w600)),
                  ),
                  FilledButton(
                    onPressed: _cart.isEmpty || _sending ? null : _send,
                    child: Text(_sending ? 'Sending...' : 'SEND'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
