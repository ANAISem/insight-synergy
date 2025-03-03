## Marktanalyse-Modul

Das Marktanalyse-Modul bietet umfassende Finanzmarktinformationen und -analysen direkt in der Nexus-App. Es nutzt das Node.js-Backend für Web-Scraping und Marktdaten-APIs, um aktuelle und relevante Finanzinformationen bereitzustellen.

### Funktionen

- **Marktüberblick**: Aktuelle Informationen zu wichtigen Marktindizes, Top-Gewinnern und -Verlierern sowie neuesten Finanznachrichten.
- **Aktiendaten**: Detaillierte Kurshistorien für verschiedene Zeitintervalle mit Optionen für angepasste Kurse.
- **Unternehmensprofile**: Umfassende Informationen über Unternehmen, einschließlich Finanzkennzahlen, Management-Teams und Branchenklassifizierungen.
- **Trendanalyse**: Technische Analysen von Aktientrends, Volatilität und Unterstützungs-/Widerstandsniveaus.
- **Marktberichte**: Zusammengefasste Berichte mit Analysen und Handlungsempfehlungen für spezifische Aktien.
- **Finanznachrichten**: Aktuelle Nachrichten aus der Finanzwelt, gefiltert nach Themen und Relevanz.

### Architektur

Das Marktanalyse-Modul folgt einer klaren Schichtenarchitektur:

1. **Models**: Datenmodelle für verschiedene Marktentitäten (`market_models.dart`)
2. **Services**: Kommunikationsschicht mit dem Backend (`market_service.dart`)
3. **Controller**: Verwaltung der Anwendungslogik und des Zustands (`market_controller.dart`)
4. **UI-Komponenten**: Wiederverwendbare Widgets für Marktdatenanzeigen
5. **Screens**: Vollständige Bildschirme für verschiedene Marktanalysefunktionen

### Integration

Das Marktanalyse-Modul ist in das bestehende Provider-System der App integriert, wodurch ein einheitliches Zustandsmanagement gewährleistet wird. Die Backend-Verbindung erfolgt über den ApiService mit sicherer Authentifizierung über den AuthService.

### Verwendung

Um auf die Marktanalyse zuzugreifen, navigieren Sie zur Marktübersicht:

```dart
Navigator.pushNamed(context, '/market_overview');
```

Um Marktdaten in eigenen Widgets zu verwenden, nutzen Sie den MarketController:

```dart
final controller = context.read<MarketController>();
await controller.fetchMarketOverview();
final marketOverview = controller.marketOverview;
```

### Beispiel: Aktiendaten abrufen

```dart
// Im UI-Code
ElevatedButton(
  onPressed: () async {
    final controller = context.read<MarketController>();
    await controller.fetchStockData('AAPL');
    // UI aktualisieren
  },
  child: Text('Apple-Aktien laden'),
)

// Beim Anzeigen der Daten
Consumer<MarketController>(
  builder: (context, controller, child) {
    if (controller.status == MarketControllerStatus.loading) {
      return LoadingIndicator();
    }
    
    final stockData = controller.stockData;
    if (stockData == null) {
      return Text('Keine Daten verfügbar');
    }
    
    return Text('Aktueller Preis: \$${stockData.dataPoints.last.close}');
  },
)
```

### Erweiterbarkeit

Das Marktanalyse-Modul ist für einfache Erweiterung konzipiert:

- Neue Datenmodelle können zu `market_models.dart` hinzugefügt werden
- Zusätzliche API-Endpunkte können im `market_service.dart` implementiert werden
- Die Benutzeroberfläche kann durch Erstellen neuer spezialisierter Widgets erweitert werden 