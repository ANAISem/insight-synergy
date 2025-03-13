# Anleitung zur Behebung von API-Verbindungsproblemen

Wenn die Meldung "Die API unter http://localhost:8000/api ist nicht erreichbar" erscheint, können Sie folgende Lösungen ausprobieren:

## 1. Verwendung des Mock-API-Servers

Wir haben einen einfachen Mock-API-Server erstellt, der alle benötigten Endpunkte für die Anwendung bereitstellt:

1. Öffnen Sie ein Terminal
2. Navigieren Sie zum Projektverzeichnis
3. Führen Sie den folgenden Befehl aus:

```bash
./start-mock-api.sh
```

Der Mock-API-Server wird auf Port 8000 gestartet und stellt die API unter http://localhost:8000/api bereit.

## 2. Ändern der API-URL in der Anwendung

Nach dem Start des Mock-API-Servers sollten Sie die API-URL in der Anwendung ändern:

1. Klicken Sie auf "API konfigurieren" in der Warnmeldung
2. Geben Sie `http://localhost:8000/api` ein
3. Klicken Sie auf "Verbinden"
4. Testen Sie die Verbindung mit dem "API-Verbindung testen" Button

## 3. Offline-Modus

Wenn keine API-Verbindung hergestellt werden kann, verwendet die Anwendung automatisch den Offline-Modus mit lokalen, vordefinierten Antworten. Dies ermöglicht Ihnen, die Funktionalität der Anwendung trotzdem zu erkunden, auch wenn keine echte API verfügbar ist.

Die Antworten im Offline-Modus werden aus dem eingebauten Beispiel-Datensatz generiert und sind nicht von einer KI erstellt.
