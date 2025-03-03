# Einrichtungsanleitung für DeepSeek-V3-4bit auf einem externen Laufwerk

Diese Anleitung beschreibt, wie das DeepSeek-V3-4bit-Modell (mlx-community/DeepSeek-V3-4bit) auf einem externen Laufwerk eingerichtet und mit der Ollama-Integration verwendet werden kann.

## Übersicht

Das DeepSeek-V3-4bit-Modell ist eine optimierte Version des DeepSeek-V3-Modells, die speziell für Apple Silicon-Macs (M1/M2/M3) mit der MLX-Bibliothek entwickelt wurde. Die 4-bit-Quantisierung reduziert den Speicherbedarf erheblich, wodurch das Modell effizienter auf Apple-Hardware laufen kann.

## Voraussetzungen

- macOS auf Apple Silicon (M1/M2/M3)
- Python 3.10 oder höher
- MLX-Bibliothek installiert auf dem Hauptsystem (`pip install mlx`)
- Ausreichend Speicherplatz auf dem externen Laufwerk (ca. 5-10 GB)

## Schritte zur Einrichtung

### 1. MLX auf dem Hauptsystem installieren

Aufgrund der festgestellten Probleme beim Installieren von Paketen auf dem externen Laufwerk, empfehlen wir, MLX auf dem Hauptsystem zu installieren:

```bash
pip install mlx
```

### 2. DeepSeek-V3-4bit herunterladen

Es gibt drei Möglichkeiten, das Modell zu bekommen:

#### Option A: Direkt von Hugging Face

Sie können das Modell direkt von Hugging Face mit dem MLX-Skript herunterladen:

```bash
# Erstelle einen Ordner für das Modell auf dem externen Laufwerk
mkdir -p /Volumes/NO\ NAME/deepseek_v3/models

# Wechsle in das Verzeichnis
cd /Volumes/NO\ NAME/deepseek_v3/models

# Lade das Modell mit der Hugging Face CLI herunter
python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='mlx-community/DeepSeek-V3-4bit', local_dir='./DeepSeek-V3-4bit')"
```

#### Option B: Manueller Download und Entpacken

1. Besuchen Sie [mlx-community/DeepSeek-V3-4bit auf Hugging Face](https://huggingface.co/mlx-community/DeepSeek-V3-4bit)
2. Laden Sie die einzelnen Modelldateien herunter
3. Speichern Sie diese in einem Verzeichnis auf dem externen Laufwerk

#### Option C: Mit git-lfs

```bash
# Installiere git-lfs, falls noch nicht vorhanden
brew install git-lfs
git lfs install

# Klone das Repository
cd /Volumes/NO\ NAME/deepseek_v3
git lfs clone https://huggingface.co/mlx-community/DeepSeek-V3-4bit
```

### 3. Minimales Testskript anpassen

Passen Sie das vorhandene minimale Testskript an, um auf das heruntergeladene Modell zu verweisen:

```python
# Ändern Sie den MODEL_CACHE_DIR in Ihrem minimal_deepseek_test.py
MODEL_NAME = "mlx-community/DeepSeek-V3-4bit"
MODEL_CACHE_DIR = "/Volumes/NO NAME/deepseek_v3/models"  # Pfad zum lokal heruntergeladenen Modell
```

### 4. Test mit der Ollama-Integration

Um das Modell mit dem Ollama-Service zu testen (ähnlich wie Mistral):

1. Stellen Sie sicher, dass Ollama auf das externe Laufwerk verweist:

```bash
# Ollama-Service stoppen
pkill ollama

# Ollama mit dem richtigen Modellpfad starten
OLLAMA_MODELS=/Volumes/NO\ NAME/ollama_models ollama serve
```

2. Verwenden Sie das externe Testskript, um zu prüfen, ob die Ollama-API funktioniert:

```bash
cd /Volumes/NO\ NAME/deepseek_v3
python test_external_deepseek.py
```

## Fehlerbehebung

### Problem: "No space left on device"

Wenn Sie immer noch Probleme mit "No space left on device" haben, obwohl genügend Speicher vorhanden zu sein scheint:

1. Prüfen Sie die Anzahl der verfügbaren Inodes:
   ```bash
   df -i /Volumes/NO\ NAME/
   ```

2. Prüfen Sie die Attribute des Dateisystems:
   ```bash
   mount | grep "/Volumes/NO NAME"
   ```

3. Versuchen Sie, temporäre Dateien zu bereinigen:
   ```bash
   find /Volumes/NO\ NAME/ -name "._*" -delete
   ```

### Problem: MLX-Installation schlägt fehl

Wenn die MLX-Installation weiterhin fehlschlägt, nutzen Sie eine der folgenden Alternativen:

1. Verwenden Sie eine virtuelle Umgebung auf dem Hauptsystem statt auf dem externen Laufwerk
2. Installieren Sie MLX global auf dem Hauptsystem und verweisen Sie nur auf die Modelldateien auf dem externen Laufwerk
3. Verwenden Sie die ollama_service.py-Integration mit Mistral als Fallback

## Nächste Schritte

- Sobald das Modell erfolgreich installiert ist, können Sie es in Ihre eigenen Anwendungen integrieren
- Experimentieren Sie mit unterschiedlichen Prompts und Parametern
- Vergleichen Sie die Leistung mit dem Mistral-Modell

## Ressourcen

- [MLX GitHub Repository](https://github.com/ml-explore/mlx)
- [DeepSeek-V3-4bit auf Hugging Face](https://huggingface.co/mlx-community/DeepSeek-V3-4bit)
- [Ollama Dokumentation](https://github.com/ollama/ollama/blob/main/docs/api.md) 