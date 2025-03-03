#!/bin/bash

# Farbige Ausgabe für bessere Lesbarkeit
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧠 DeepSeek-V3-4bit RAM-Disk Creator${NC}"
echo -e "${CYAN}Dieses Skript erstellt eine RAM-Disk für das DeepSeek-V3-4bit Modell${NC}"
echo

# Konfiguration
RAMDISK_NAME="deepseek_ramdisk"
RAMDISK_SIZE_MB=8192 # 8 GB RAM-Disk
MOUNT_POINT="$HOME/deepseek_ramdisk"

# Prüfe, ob RAM-Disk bereits existiert
if mount | grep -q "$MOUNT_POINT"; then
    echo -e "${GREEN}✓ RAM-Disk ist bereits eingehängt unter $MOUNT_POINT${NC}"
else
    # Erstelle Mount-Point, falls nicht vorhanden
    mkdir -p "$MOUNT_POINT"
    
    echo -e "${CYAN}Erstelle RAM-Disk mit ${RAMDISK_SIZE_MB}MB...${NC}"
    # macOS-spezifische RAM-Disk-Erstellung
    RAMDISK_SECTORS=$((${RAMDISK_SIZE_MB} * 2048)) # 512 bytes per sector
    DISK_ID=$(hdiutil attach -nomount ram://${RAMDISK_SECTORS})
    
    if [ $? -eq 0 ]; then
        echo -e "${CYAN}Formatiere RAM-Disk...${NC}"
        diskutil erasevolume HFS+ "${RAMDISK_NAME}" ${DISK_ID}
        
        echo -e "${CYAN}Symlink zum Home-Verzeichnis erstellen...${NC}"
        rm -f "$MOUNT_POINT"
        ln -s "/Volumes/${RAMDISK_NAME}" "$MOUNT_POINT"
        
        echo -e "${GREEN}✓ RAM-Disk erfolgreich erstellt und eingehängt unter $MOUNT_POINT${NC}"
        echo -e "${CYAN}Um die RAM-Disk zu nutzen, setze folgende Umgebungsvariable:${NC}"
        echo -e "export DEEPSEEK_MODEL_PATH=\"$MOUNT_POINT\""
    else
        echo -e "${RED}❌ Fehler beim Erstellen der RAM-Disk!${NC}"
        exit 1
    fi
fi

# Informationen zur RAM-Disk anzeigen
echo
echo -e "${CYAN}RAM-Disk Informationen:${NC}"
df -h "$MOUNT_POINT" | grep -v "Filesystem"

echo
echo -e "${YELLOW}Wichtig: Die RAM-Disk wird nach einem Neustart gelöscht!${NC}"
echo -e "${YELLOW}Zum Aushängen der RAM-Disk: diskutil unmount \"${RAMDISK_NAME}\"${NC}"
echo 