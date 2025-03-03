#!/bin/bash

# Farbige Ausgabe für bessere Lesbarkeit
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${YELLOW}🚀 DeepSeek-V3-4bit MLX Starter${NC}"
echo -e "${CYAN}Dieses Skript startet die DeepSeek-V3-4bit MLX Inferenz${NC}"
echo

# Modellverzeichnis
MODEL_CACHE="$HOME/mlx_models"
mkdir -p "$MODEL_CACHE"

# Prüfe, ob MLX installiert ist
if ! python -c "import mlx" &> /dev/null; then
    echo -e "${RED}❌ MLX ist nicht installiert!${NC}"
    echo -e "Installiere MLX mit: ${CYAN}pip install mlx${NC}"
    exit 1
fi

echo -e "${GREEN}✓ MLX ist installiert${NC}"

# Prüfe, ob huggingface_hub installiert ist
if ! python -c "import huggingface_hub" &> /dev/null; then
    echo -e "${RED}❌ huggingface_hub ist nicht installiert!${NC}"
    echo -e "Installiere huggingface_hub mit: ${CYAN}pip install huggingface_hub${NC}"
    exit 1
fi

echo -e "${GREEN}✓ huggingface_hub ist installiert${NC}"

# Prüfe verfügbaren Speicher
DISK_SPACE=$(df -h ~/ | awk 'NR==2 {print $4}')
echo -e "${CYAN}Verfügbarer Speicher: ${DISK_SPACE}${NC}"

# Modi
echo
echo -e "${CYAN}Verfügbare Modi:${NC}"
echo -e "1. ${GREEN}Einzelabfrage - Standard-Prompt${NC}"
echo -e "2. ${GREEN}Einzelabfrage - Benutzerdefinierter Prompt${NC}"
echo -e "3. ${GREEN}Chat-Modus${NC}"
echo
read -p "Wähle einen Modus (1-3): " MODE

case $MODE in
    1)
        echo -e "${YELLOW}Starte DeepSeek-V3-4bit mit Standard-Prompt...${NC}"
        python "$SCRIPT_DIR/run_deepseek_v3_4bit.py"
        ;;
    2)
        echo -e "${YELLOW}Gib deinen Prompt ein:${NC}"
        read -p "> " USER_PROMPT
        python "$SCRIPT_DIR/run_deepseek_v3_4bit.py" --prompt "$USER_PROMPT"
        ;;
    3)
        echo -e "${YELLOW}Starte DeepSeek-V3-4bit Chat-Modus...${NC}"
        python "$SCRIPT_DIR/run_deepseek_v3_4bit.py" --chat
        ;;
    *)
        echo -e "${RED}Ungültige Auswahl!${NC}"
        exit 1
        ;;
esac

echo -e "${GREEN}✓ Fertig!${NC}" 