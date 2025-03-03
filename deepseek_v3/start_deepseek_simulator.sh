#!/bin/bash

# Farbdefinitionen
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Hilfsfunktion für farbige Ausgabe
print_header() {
    echo -e "\n${CYAN}========================================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================================${NC}\n"
}

print_info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[WARNUNG] $1${NC}"
}

print_error() {
    echo -e "${RED}[FEHLER] $1${NC}"
}

# Prüfung der Python-Installation
check_python() {
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 ist nicht installiert oder nicht im PATH verfügbar."
        exit 1
    fi
    
    print_info "Python 3 gefunden: $(python3 --version)"
}

# Hauptprogramm
main() {
    print_header "DeepSeek-V3-4bit Simulator"
    
    print_info "Dies ist ein Simulator, der die Funktionalität des DeepSeek-V3-4bit Modells nachahmt."
    print_info "Es werden keine großen Modelle geladen - ideal für Systeme mit begrenztem Speicher."
    
    check_python
    
    echo ""
    echo -e "${CYAN}Bitte wählen Sie einen Modus:${NC}"
    echo "1) Vordefinierten Prompt ausführen"
    echo "2) Eigenen Prompt eingeben"
    echo "3) Chat-Modus starten"
    echo "q) Beenden"
    echo ""
    
    read -p "Ihre Wahl [1-3/q]: " choice
    
    simulator_path="$(dirname "$0")/simulate_deepseek.py"
    
    case $choice in
        1)
            print_info "Starte mit Standard-Prompt..."
            python3 "$simulator_path"
            ;;
        2)
            echo ""
            read -p "Geben Sie Ihren Prompt ein: " custom_prompt
            print_info "Verarbeite Prompt: '$custom_prompt'"
            python3 "$simulator_path" --prompt "$custom_prompt"
            ;;
        3)
            print_info "Starte Chat-Modus..."
            python3 "$simulator_path" --chat
            ;;
        q|Q)
            print_info "Programm wird beendet."
            exit 0
            ;;
        *)
            print_error "Ungültige Auswahl!"
            exit 1
            ;;
    esac
}

# Programm ausführen
main 