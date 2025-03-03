import 'package:flutter/material.dart';
import '../navigation/app_router.dart';
import '../navigation/routes.dart';

/// Ein Scaffold, das für die gesamte App konsistent ist und
/// ein gemeinsames Layout mit AppBar und optionaler Navigationsleiste bietet.
class AppScaffold extends StatelessWidget {
  final String title;
  final Widget body;
  final List<Widget>? actions;
  final Widget? floatingActionButton;
  final bool showNavigationBar;
  final int currentIndex;

  const AppScaffold({
    Key? key,
    required this.title,
    required this.body,
    this.actions,
    this.floatingActionButton,
    this.showNavigationBar = true,
    this.currentIndex = 0,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(title),
        elevation: 0,
        actions: actions,
      ),
      body: body,
      floatingActionButton: floatingActionButton,
      bottomNavigationBar: showNavigationBar ? _buildBottomNavigationBar(context) : null,
    );
  }

  Widget _buildBottomNavigationBar(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex,
      onDestinationSelected: (index) => _onNavigationItemSelected(context, index),
      destinations: const [
        NavigationDestination(
          icon: Icon(Icons.home_outlined),
          selectedIcon: Icon(Icons.home),
          label: 'Home',
        ),
        NavigationDestination(
          icon: Icon(Icons.book_outlined),
          selectedIcon: Icon(Icons.book),
          label: 'Wissensbasis',
        ),
        NavigationDestination(
          icon: Icon(Icons.hub_outlined),
          selectedIcon: Icon(Icons.hub),
          label: 'Graph',
        ),
        NavigationDestination(
          icon: Icon(Icons.search_outlined),
          selectedIcon: Icon(Icons.search),
          label: 'Suche',
        ),
      ],
    );
  }

  void _onNavigationItemSelected(BuildContext context, int index) {
    if (currentIndex == index) return;

    switch (index) {
      case 0:
        Navigator.pushNamedAndRemoveUntil(
          context,
          AppRoutes.home,
          (route) => false,
        );
        break;
      case 1:
        Navigator.pushNamed(context, AppRoutes.knowledgeBase);
        break;
      case 2:
        Navigator.pushNamed(context, AppRoutes.knowledgeGraph);
        break;
      case 3:
        Navigator.pushNamed(context, AppRoutes.search);
        break;
    }
  }
} 