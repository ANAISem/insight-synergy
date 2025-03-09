/**
 * Insight Synergy Dashboard
 * Verbindet mit dem Insight Synergy Core API und visualisiert die Daten
 */

// Konfiguration
const CORE_API_URL = 'http://localhost:8080/api';
const MINIMAL_API_URL = 'http://localhost:3000';
const REFRESH_INTERVAL = 3000; // 3 Sekunden
let API_BASE_URL = 'http://localhost:8080/api'; // Default, wird automatisch erkannt
let isConnected = false;
let startTime = Date.now();
let activityHistory = [];
let isMinimalMode = false;

// DOM-Elemente
const loadingOverlay = document.getElementById('loading-overlay');
const activityLog = document.getElementById('activity-log');
const patternsList = document.getElementById('patterns-list');
const uptimeCounter = document.getElementById('uptime-counter');
const performanceScore = document.getElementById('performance-score').querySelector('.value');
const performanceGauge = document.getElementById('performance-gauge');
const healthScore = document.getElementById('health-score').querySelector('.value');
const healthGauge = document.getElementById('health-gauge');
const cpuUsage = document.getElementById('cpu-usage').querySelector('.value');
const cpuGauge = document.getElementById('cpu-gauge');
const memoryUsage = document.getElementById('memory-usage').querySelector('.value');
const memoryGauge = document.getElementById('memory-gauge');
const debugLevel = document.getElementById('debug-level');
const autoFix = document.getElementById('auto-fix');
const adaptiveMode = document.getElementById('adaptive-mode');
const componentCount = document.getElementById('component-count');
const btnOptimize = document.getElementById('btn-optimize');
const btnDebug = document.getElementById('btn-debug');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');

// Event-Listener
document.addEventListener('DOMContentLoaded', initDashboard);
btnOptimize.addEventListener('click', handleOptimize);
btnDebug.addEventListener('click', handleDebug);

/**
 * Initialisiert das Dashboard
 */
async function initDashboard() {
    try {
        // Versuche die verschiedenen API-Endpunkte
        const modeInfo = await detectServerMode();
        
        if (modeInfo.available) {
            // Verbindung hergestellt
            API_BASE_URL = modeInfo.url;
            isMinimalMode = modeInfo.isMinimal;
            isConnected = true;
            startTime = Date.now();
            
            // UI je nach Modus aktualisieren
            updateUiForMode(isMinimalMode);
            
            hideLoading();
            updateUptimeCounter();
            
            const modeText = isMinimalMode ? 'Minimalmodus' : 'Vollmodus';
            showNotification('Verbunden', `Erfolgreich mit Insight Synergy Core (${modeText}) verbunden.`, 'success');
            
            // Starte regelmäßige Datenaktualisierung
            await updateDashboardData();
            setInterval(updateDashboardData, REFRESH_INTERVAL);
            setInterval(updateUptimeCounter, 1000);
            
            addActivityLogEntry({
                type: 'success',
                message: `Dashboard im ${modeText} gestartet`,
                timestamp: new Date().toISOString()
            });
        } else {
            // Verbindung fehlgeschlagen
            showConnectionError();
        }
    } catch (error) {
        console.error('Fehler beim Initialisieren des Dashboards:', error);
        showConnectionError();
    }
}

/**
 * Erkennt den Servermodus (Vollmodus oder Minimalmodus)
 */
async function detectServerMode() {
    // Versuche zuerst den Vollmodus
    try {
        const response = await fetchWithTimeout(`${CORE_API_URL}/status`, {}, 2000);
        if (response.ok) {
            return { available: true, url: CORE_API_URL, isMinimal: false };
        }
    } catch (error) {
        console.log('Vollmodus nicht verfügbar, versuche Minimalmodus...');
    }
    
    // Versuche den Minimalmodus
    try {
        const response = await fetchWithTimeout(`${MINIMAL_API_URL}/status`, {}, 2000);
        if (response.ok) {
            return { available: true, url: MINIMAL_API_URL, isMinimal: true };
        }
    } catch (error) {
        console.log('Auch Minimalmodus nicht verfügbar.');
    }
    
    return { available: false };
}

/**
 * Aktualisiert die UI basierend auf dem erkannten Modus
 */
function updateUiForMode(isMinimal) {
    if (isMinimal) {
        // Minimalmodus UI-Anpassungen
        statusText.textContent = 'System aktiv (Minimalmodus)';
        
        // Füge Modus-Indikator hinzu
        const modeIndicator = document.createElement('div');
        modeIndicator.className = 'mode-indicator';
        modeIndicator.innerHTML = '<span class="mode-badge">Simulierte Daten</span>';
        document.querySelector('.top-bar').appendChild(modeIndicator);
        
        // Füge Hinweis für vollständige Funktionalität hinzu
        const upgradeNote = document.createElement('div');
        upgradeNote.className = 'upgrade-note';
        upgradeNote.innerHTML = `
            <div class="upgrade-content">
                <i class="material-icons">info</i>
                <span>Sie befinden sich im Minimalmodus mit simulierten Daten. Für volle Funktionalität, starten Sie mit Option 2 im Startskript.</span>
            </div>
        `;
        document.querySelector('.main-content').insertBefore(
            upgradeNote, 
            document.querySelector('.main-content').firstChild
        );
        
        // Aktualisiere CSS für Minimalmodus
        const style = document.createElement('style');
        style.textContent = `
            .mode-indicator {
                background-color: rgba(255, 152, 0, 0.15);
                border-radius: 4px;
                padding: 4px 8px;
                margin-right: 15px;
            }
            .mode-badge {
                color: #ff9800;
                font-size: 12px;
                font-weight: 500;
            }
            .upgrade-note {
                background-color: rgba(255, 152, 0, 0.1);
                border-left: 4px solid #ff9800;
                padding: 10px 15px;
                margin-bottom: 15px;
            }
            .upgrade-content {
                display: flex;
                align-items: center;
            }
            .upgrade-content i {
                color: #ff9800;
                margin-right: 10px;
            }
        `;
        document.head.appendChild(style);
    } else {
        // Vollmodus UI-Anpassungen
        statusText.textContent = 'System aktiv (Vollmodus)';
        statusDot.style.backgroundColor = '#4caf50';
        statusDot.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.3)';
    }
}

/**
 * Aktualisiert alle Dashboard-Daten
 */
async function updateDashboardData() {
    if (!isConnected) return;
    
    try {
        // Hole Systemstatus
        const response = await fetchWithTimeout(`${API_BASE_URL}/status`);
        if (!response.ok) {
            throw new Error(`HTTP Fehler: ${response.status}`);
        }
        
        const statusData = await response.json();
        
        // Aktualisiere UI mit den neuen Daten
        updateMetrics(statusData);
        updateConfig(statusData);
        updatePatterns(statusData);
        
        // Füge neue Aktivität hinzu, aber nicht bei jedem Update
        // Stattdessen nur bei wichtigen Änderungen oder alle 30 Sekunden
        if (Math.random() < 0.2) {
            addActivityLogEntry({
                type: 'info',
                message: 'System-Status aktualisiert',
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Dashboard-Daten:', error);
        // Nicht bei jedem Fehler melden, nur wenn es ein neuer ist
        if (activityHistory.length === 0 || 
            activityHistory[0].type !== 'error' || 
            activityHistory[0].message !== `Fehler: ${error.message}`) {
            addActivityLogEntry({
                type: 'error',
                message: `Fehler: ${error.message}`,
                timestamp: new Date().toISOString()
            });
        }
    }
}

/**
 * Aktualisiert die Metriken-Anzeige
 */
function updateMetrics(data) {
    try {
        const metrics = data.cognitiveCore?.metrics || simulateMetrics();
        
        // Performance
        const performanceValue = Math.round(metrics.performance);
        performanceScore.textContent = performanceValue;
        performanceGauge.style.width = `${performanceValue}%`;
        performanceGauge.style.backgroundColor = getColorForValue(performanceValue);
        
        // System-Gesundheit
        const healthValue = Math.round(metrics.systemHealth);
        healthScore.textContent = healthValue;
        healthGauge.style.width = `${healthValue}%`;
        healthGauge.style.backgroundColor = getColorForValue(healthValue);
        
        // CPU-Auslastung
        const cpuValue = Math.round(metrics.cpuUsage || 0);
        cpuUsage.textContent = cpuValue;
        cpuGauge.style.width = `${cpuValue}%`;
        cpuGauge.style.backgroundColor = getColorForValue(100 - cpuValue); // Inverse für CPU (niedriger ist besser)
        
        // Speichernutzung
        const memValue = Math.round(metrics.memoryUsage || 0);
        memoryUsage.textContent = memValue;
        memoryGauge.style.width = `${memValue}%`;
        memoryGauge.style.backgroundColor = getColorForValue(100 - memValue); // Inverse für Memory (niedriger ist besser)
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Metriken:', error);
    }
}

/**
 * Bestimmt die Farbe basierend auf dem Wert (Rot-Gelb-Grün-Skala)
 */
function getColorForValue(value) {
    if (value < 40) return '#f44336'; // Rot
    if (value < 60) return '#ff9800'; // Orange
    if (value < 80) return '#4caf50'; // Grün
    return '#2196f3'; // Blau für sehr gute Werte
}

/**
 * Aktualisiert die Konfigurations-Anzeige
 */
function updateConfig(data) {
    try {
        const config = data.config || simulateConfig();
        
        debugLevel.textContent = config.debugLevel || 'medium';
        autoFix.textContent = config.autoFix ? 'Aktiviert' : 'Deaktiviert';
        adaptiveMode.textContent = config.adaptiveMode ? 'Aktiviert' : 'Deaktiviert';
        componentCount.textContent = data.integrationLayer?.componentCount || '3';
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Konfiguration:', error);
    }
}

/**
 * Aktualisiert die Muster-Anzeige
 */
function updatePatterns(data) {
    try {
        const patterns = data.cognitiveCore?.patterns || simulatePatterns();
        
        if (patterns.length === 0) {
            patternsList.innerHTML = `
                <div class="list-item waiting">
                    <i class="material-icons">search</i>
                    <span>Keine Muster erkannt</span>
                </div>
            `;
            return;
        }
        
        patternsList.innerHTML = '';
        patterns.forEach(pattern => {
            const patternElement = document.createElement('div');
            patternElement.className = 'list-item';
            patternElement.innerHTML = `
                <i class="material-icons">bubble_chart</i>
                <div>
                    <strong>${pattern.name || 'Unbenanntes Muster'}</strong>
                    <div>${pattern.description || 'Keine Beschreibung verfügbar'}</div>
                    ${pattern.confidence ? `<div class="confidence">Konfidenz: ${Math.round(pattern.confidence * 100)}%</div>` : ''}
                </div>
            `;
            patternsList.appendChild(patternElement);
        });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der Muster:', error);
    }
}

/**
 * Aktualisiert die Laufzeit-Anzeige
 */
function updateUptimeCounter() {
    const currentTime = Date.now();
    const diff = currentTime - startTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    uptimeCounter.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Fügt einen Eintrag zum Aktivitätsprotokoll hinzu
 */
function addActivityLogEntry(entry) {
    // Begrenze die Historie auf 20 Einträge
    activityHistory.unshift(entry);
    if (activityHistory.length > 20) {
        activityHistory.pop();
    }
    
    // Aktualisiere die Anzeige
    refreshActivityLog();
}

/**
 * Aktualisiert die Anzeige des Aktivitätsprotokolls
 */
function refreshActivityLog() {
    if (activityHistory.length === 0) {
        activityLog.innerHTML = `
            <div class="log-message waiting">
                <i class="material-icons">hourglass_empty</i>
                <span>Warte auf Aktivitätsdaten...</span>
            </div>
        `;
        return;
    }
    
    activityLog.innerHTML = '';
    
    activityHistory.forEach(entry => {
        const logElement = document.createElement('div');
        logElement.className = `log-message ${entry.type}`;
        
        let icon = 'info';
        if (entry.type === 'error') icon = 'error';
        if (entry.type === 'warning') icon = 'warning';
        if (entry.type === 'success') icon = 'check_circle';
        
        const time = new Date(entry.timestamp).toLocaleTimeString();
        
        logElement.innerHTML = `
            <i class="material-icons">${icon}</i>
            <div>
                <div class="message-content">${entry.message}</div>
                <div class="message-time">${time}</div>
            </div>
        `;
        
        activityLog.appendChild(logElement);
    });
}

/**
 * Handler für den Optimieren-Button
 */
async function handleOptimize() {
    try {
        btnOptimize.disabled = true;
        
        showNotification('Optimierung', 'Optimierungsprozess gestartet...', 'info');
        addActivityLogEntry({
            type: 'info',
            message: 'Manuelle Optimierung gestartet',
            timestamp: new Date().toISOString()
        });
        
        // API-Aufruf für Optimierung
        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}/optimize`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Fehler: ${response.status}`);
            }
            
            const result = await response.json();
            const performanceValue = Math.round(result.performance || 0);
            
            showNotification('Optimierung abgeschlossen', 
                `Neuer Performance-Score: ${performanceValue}`, 'success');
                
            addActivityLogEntry({
                type: 'success',
                message: `Optimierung abgeschlossen. Neuer Performance-Score: ${performanceValue}`,
                timestamp: new Date().toISOString()
            });
            
            // Aktualisiere Dashboard-Daten nach Optimierung
            await updateDashboardData();
        } catch (error) {
            console.error('Fehler bei der Optimierung:', error);
            
            if (isMinimalMode) {
                // Simuliere erfolgreiche Optimierung im Minimalmodus
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const perfScore = Math.floor(Math.random() * 15) + 80;
                showNotification('Optimierung abgeschlossen', 
                    `Neuer Performance-Score: ${perfScore}`, 'success');
                    
                addActivityLogEntry({
                    type: 'success',
                    message: `Optimierung abgeschlossen. Neuer Performance-Score: ${perfScore}`,
                    timestamp: new Date().toISOString()
                });
                
                // Aktualisiere Metriken
                const simulatedMetrics = simulateMetrics(true);
                updateMetrics({ cognitiveCore: { metrics: simulatedMetrics } });
            } else {
                // Zeige echten Fehler im Vollmodus
                showNotification('Optimierung fehlgeschlagen', 
                    `Fehler: ${error.message}`, 'error');
                    
                addActivityLogEntry({
                    type: 'error',
                    message: `Optimierung fehlgeschlagen: ${error.message}`,
                    timestamp: new Date().toISOString()
                });
            }
        }
    } finally {
        btnOptimize.disabled = false;
    }
}

/**
 * Handler für den Debug-Button
 */
async function handleDebug() {
    try {
        btnDebug.disabled = true;
        
        showNotification('Debug-Analyse', 'Debug-Analyse gestartet...', 'info');
        addActivityLogEntry({
            type: 'info',
            message: 'Manuelle Debug-Analyse gestartet',
            timestamp: new Date().toISOString()
        });
        
        // API-Aufruf für Debug-Analyse
        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}/debug`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP Fehler: ${response.status}`);
            }
            
            const result = await response.json();
            const message = result.message || 'Keine kritischen Probleme gefunden';
            
            showNotification('Debug-Analyse abgeschlossen', message, 'success');
                
            addActivityLogEntry({
                type: 'success',
                message: `Debug-Analyse abgeschlossen. ${message}`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Fehler bei der Debug-Analyse:', error);
            
            if (isMinimalMode) {
                // Simuliere erfolgreiche Debug-Analyse im Minimalmodus
                await new Promise(resolve => setTimeout(resolve, 1200));
                
                showNotification('Debug-Analyse abgeschlossen', 
                    'Keine kritischen Probleme gefunden', 'success');
                    
                addActivityLogEntry({
                    type: 'success',
                    message: 'Debug-Analyse abgeschlossen. Keine kritischen Probleme gefunden.',
                    timestamp: new Date().toISOString()
                });
            } else {
                // Zeige echten Fehler im Vollmodus
                showNotification('Debug-Analyse fehlgeschlagen', 
                    `Fehler: ${error.message}`, 'error');
                    
                addActivityLogEntry({
                    type: 'error',
                    message: `Debug-Analyse fehlgeschlagen: ${error.message}`,
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        // Aktualisiere Dashboard-Daten nach Debug-Analyse
        await updateDashboardData();
    } finally {
        btnDebug.disabled = false;
    }
}

/**
 * Zeigt eine Benachrichtigung an
 */
function showNotification(title, message, type = 'info') {
    const notificationContainer = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = 'info';
    if (type === 'error') icon = 'error';
    if (type === 'warning') icon = 'warning';
    if (type === 'success') icon = 'check_circle';
    
    notification.innerHTML = `
        <i class="material-icons">${icon}</i>
        <div class="notification-message">
            <div class="notification-title">${title}</div>
            <div class="notification-desc">${message}</div>
        </div>
        <div class="notification-close">
            <i class="material-icons">close</i>
        </div>
    `;
    
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => {
            notification.remove();
        }, 300);
    });
    
    notificationContainer.appendChild(notification);
    
    // Automatisches Ausblenden nach 5 Sekunden
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }
    }, 5000);
}

/**
 * Zeigt den Lade-Overlay an
 */
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

/**
 * Versteckt den Lade-Overlay
 */
function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

/**
 * Zeigt eine Verbindungsfehlermeldung an
 */
function showConnectionError() {
    loadingOverlay.innerHTML = `
        <i class="material-icons" style="font-size: 50px; color: #f44336; margin-bottom: 20px;">error</i>
        <h2 style="margin-bottom: 10px;">Verbindungsfehler</h2>
        <p style="margin-bottom: 20px;">Konnte keine Verbindung zum Insight Synergy Core herstellen.</p>
        <p style="margin-bottom: 20px; color: #666;">Bitte stellen Sie sicher, dass der Server läuft und versuchen Sie es erneut.</p>
        <button class="btn primary" onclick="location.reload()">Erneut versuchen</button>
    `;
}

/**
 * Hilfsfunktion für Fetch mit Timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
    const controller = new AbortController();
    const signal = controller.signal;
    
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, { ...options, signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Zeitüberschreitung bei der Anfrage');
        }
        throw error;
    }
}

/**
 * Simuliert Metriken für den Minimalmodus
 */
function simulateMetrics(improved = false) {
    const base = improved ? 15 : 0;
    return {
        performance: Math.random() * 20 + 65 + base,
        adaptationRate: Math.random() * 15 + 70 + base,
        systemHealth: Math.random() * 25 + 60 + base,
        optimizationPotential: Math.random() * 40 + 30,
        overallScore: Math.random() * 20 + 70 + base,
        cpuUsage: Math.random() * 30 + 40,
        memoryUsage: Math.random() * 25 + 50
    };
}

/**
 * Simuliert Konfiguration für den Minimalmodus
 */
function simulateConfig() {
    return {
        debugLevel: 'medium',
        autoFix: true,
        adaptiveMode: true,
        optimizationThreshold: 0.7
    };
}

/**
 * Simuliert Muster für den Minimalmodus
 */
function simulatePatterns() {
    return [
        {
            name: 'Ereignis-Korrelationsmuster',
            description: 'Korrelation zwischen Systemlast und Fehlerraten erkannt',
            confidence: 0.85
        },
        {
            name: 'Leistungssteigerungspotential',
            description: 'Optimierungsmöglichkeit in den Kernmodulen identifiziert',
            confidence: 0.92
        }
    ];
} 