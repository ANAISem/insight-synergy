#!/bin/bash

# DeepSeek-V3 Setup-Skript für Ollama
# Dieses Skript richtet das DeepSeek-V3-Modell mit Ollama ein

echo "🔄 Starte DeepSeek-V3 Setup..."

# Verzeichnis mit der Modelldefinition
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODEL_DIR="/Volumes/NO NAME/ollama_models"

# Sicherstellen, dass Ollama läuft
if ! pgrep -x "ollama" > /dev/null; then
    echo "🚀 Starte Ollama-Dienst..."
    OLLAMA_MODELS="$MODEL_DIR" ollama serve &
    
    # Warte kurz, bis der Dienst läuft
    sleep 3
fi

echo "📥 Erstelle lokales DeepSeek-V3-Modell mit der Modelldefinition..."
ollama create deepseek:local -f "$SCRIPT_DIR/deepseek-v3.modelfile"

echo "✅ DeepSeek-V3 lokales Modell ist jetzt eingerichtet!"
echo "📋 Verfügbare Modelle:"
ollama list

echo "🧪 Teste das DeepSeek-V3-Modell mit einem einfachen Prompt..."
ollama run deepseek:local "Erkläre den Unterschied zwischen künstlicher Intelligenz und maschinellem Lernen in drei Sätzen."

echo "🎉 Setup abgeschlossen!" 