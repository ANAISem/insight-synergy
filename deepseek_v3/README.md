# DeepSeek-V3-4bit Simulator

## Übersicht

Dieses Repository enthält einen Simulator für das DeepSeek-V3-4bit Modell, der speziell für Systeme mit begrenztem Speicherplatz entwickelt wurde. Anstatt das vollständige 4-bit-quantisierte Modell zu laden, bietet der Simulator eine leichtgewichtige Alternative, die die Funktionalität des Modells nachahmt.

### Warum ein Simulator?

Das vollständige DeepSeek-V3-4bit Modell benötigt:
- Ca. 4-10 GB Speicherplatz für die Modelldateien
- MLX-Bibliothek muss korrekt installiert sein
- Ausreichend RAM für die Modellausführung (mindestens 8 GB empfohlen)

Wenn eines dieser Anforderungen nicht erfüllt werden kann, ist der Simulator eine praktische Alternative.

## Systemvoraussetzungen

Der Simulator hat minimale Anforderungen:
- Python 3.6 oder höher
- Weniger als 10 MB freier Speicherplatz
- Funktioniert auf allen Betriebssystemen, die Python unterstützen

## Installation

1. Stellen Sie sicher, dass Python 3 installiert ist:
   ```bash
   python3 --version
   ```

2. Das ist alles! Keine zusätzlichen Abhängigkeiten erforderlich.

## Verwendung

### Methode 1: Start-Skript (empfohlen)

Führen Sie das Start-Skript aus und folgen Sie den Anweisungen:

```bash
./start_deepseek_simulator.sh
```

Das Skript bietet verschiedene Optionen:
1. Vordefinierten Prompt ausführen
2. Eigenen Prompt eingeben
3. Chat-Modus starten

### Methode 2: Direkter Aufruf

Sie können das Python-Skript auch direkt ausführen:

```bash
# Mit Standard-Prompt
./simulate_deepseek.py

# Mit eigenem Prompt
./simulate_deepseek.py --prompt "Dein Prompt hier"

# Im Chat-Modus
./simulate_deepseek.py --chat
```

## Technische Details

Der Simulator:
- Simuliert Ladezeiten und Generierungsverhalten des Modells
- Stellt vordefinierte Antworten für häufige Fragen bereit
- Bietet eine Fallback-Antwort für unbekannte Prompts
- Verfügt über einen interaktiven Chat-Modus

## Unterschiede zum echten Modell

Der Simulator ist **keine** echte KI und verwendet **keine** Transformer-Modelle. Er dient als:
- Demonstration der Benutzeroberfläche und des erwarteten Verhaltens
- Platzhalter bis das vollständige Modell eingerichtet werden kann
- Lernmaterial für die Interaktion mit DeepSeek-ähnlichen Modellen

## Fehlerbehebung

### Q: Warum kann ich das echte Modell nicht verwenden?
A: Das echte DeepSeek-V3-4bit Modell benötigt mehr freien Speicherplatz und eine richtig konfigurierte MLX-Umgebung. Der Simulator umgeht diese Anforderungen.

### Q: Wie kann ich das echte Modell einrichten?
A: Falls Sie später das echte Modell einrichten möchten:
1. Stellen Sie sicher, dass mindestens 10 GB freier Speicherplatz verfügbar sind
2. Installieren Sie MLX mit `pip install mlx`
3. Laden Sie das 4-bit-quantisierte Modell von HuggingFace herunter

## Weiterentwicklung

Der Simulator kann angepasst werden, um spezifische Antworten für bestimmte Themen hinzuzufügen. Öffnen Sie die Datei `simulate_deepseek.py` und ergänzen Sie das Wörterbuch `responses` in der Methode `_get_simulated_response()`.

## Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

---

*Hinweis: Dieser Simulator ist keine offizielle Implementierung des DeepSeek-V3-4bit Modells und dient lediglich als Workaround für Systeme mit Ressourcenbeschränkungen.* 