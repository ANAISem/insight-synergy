"""
Beispielmodul zur Demonstration des adaptiven Debugging-Systems.

Zeigt die Verwendung von Debugging-Dekoratoren und Fix-Strategien.
"""

from typing import Dict, List, Any, Optional
import time
import random
import json

from .adaptive_debug import debug_function, debug_class, register_fix, get_debug_report


# Beispiel 1: Debugging einer einzelnen Funktion mit bekanntem Fehler
@debug_function
def divide_numbers(a: float, b: float) -> float:
    """Dividiert zwei Zahlen, kann eine ZeroDivisionError auslösen."""
    return a / b


# Beispiel 2: Eine gesamte Klasse mit Debugging versehen
@debug_class
class DataProcessor:
    """Demonstriert das Debugging einer ganzen Klasse."""
    
    def __init__(self, data: Optional[Dict[str, Any]] = None):
        self.data = data or {}
        
    def process_item(self, key: str) -> Any:
        """Verarbeitet ein Element aus den Daten, kann KeyError auslösen."""
        return self.data[key]
        
    def calculate_average(self, keys: List[str]) -> float:
        """Berechnet den Durchschnitt für bestimmte Schlüssel, kann verschiedene Fehler auslösen."""
        total = 0
        for key in keys:
            # Mehrere potenzielle Fehler:
            # - KeyError wenn der Schlüssel nicht existiert
            # - TypeError wenn der Wert nicht numerisch ist
            total += float(self.data[key])
            
        # Kann ZeroDivisionError auslösen wenn keys leer ist
        return total / len(keys)
    
    def save_to_file(self, filename: str) -> None:
        """Speichert Daten in eine Datei, kann IOError auslösen."""
        with open(filename, 'w') as f:
            json.dump(self.data, f)


# Beispiel 3: Eine Funktion, die gelegentlich zufällige Fehler auslöst
@debug_function
def unreliable_network_call(endpoint: str, timeout: float = 1.0) -> Dict[str, Any]:
    """Simuliert einen unzuverlässigen Netzwerkaufruf, der verschiedene Fehler auslösen kann."""
    # Simuliere Netzwerklatenz
    time.sleep(random.uniform(0.1, timeout * 1.5))
    
    # Zufällige Fehlerszenarien
    error_chance = random.random()
    
    if error_chance < 0.2:
        # Simuliere Timeout
        raise TimeoutError(f"Anfrage an {endpoint} hat das Zeitlimit überschritten")
    elif error_chance < 0.3:
        # Simuliere Verbindungsfehler
        raise ConnectionError(f"Verbindung zu {endpoint} fehlgeschlagen")
    elif error_chance < 0.4:
        # Simuliere ungültige JSON-Antwort
        raise ValueError(f"Ungültige JSON-Antwort von {endpoint}")
    
    # Erfolgreicher Fall
    return {"status": "success", "data": f"Daten von {endpoint}"}


# Beispiel 4: Registrierung einer Fix-Strategie für einen bekannten Fehler
# Fix für ZeroDivisionError in divide_numbers
DIVISION_FIX_CODE = """
def fix_function(a, b):
    # Verhindere Division durch Null
    if b == 0:
        print("Automatischer Fix: Vermeide Division durch Null")
        return float('inf') if a >= 0 else float('-inf')  # Rückgabe von Unendlich mit richtigem Vorzeichen
    return a / b
"""


def register_known_fixes():
    """Registriert bekannte Fix-Strategien für häufige Fehler."""
    # Hinweis: In einer realen Anwendung würden die error_ids dynamisch ermittelt
    # und nicht hart codiert sein. Dies ist nur zu Demonstrationszwecken.
    
    # Fix für division_by_zero in divide_numbers
    # In einer realen Anwendung würde die error_id aus dem ersten Auftreten des Fehlers stammen
    division_error_id = "f1852b366fb08dc794d9932bed21d951"  # Beispiel-ID
    register_fix(
        division_error_id,
        "Verhindert Division durch Null durch Rückgabe von Unendlich",
        DIVISION_FIX_CODE,
        automated=True
    )
    
    # Fix für KeyError in DataProcessor.process_item
    key_error_id = "a7bc86c24984638ba95d9d4dbd48bbde"  # Beispiel-ID
    register_fix(
        key_error_id,
        "Rückgabe eines Standardwerts bei fehlendem Schlüssel",
        """
def fix_function(self, key):
    # Verwende get mit Standardwert anstelle von direktem Zugriff
    print(f"Automatischer Fix: Verwende Standardwert für Schlüssel '{key}'")
    return self.data.get(key, None)
""",
        automated=True
    )


def run_examples():
    """Führt alle Beispiele aus, um das Debugging zu demonstrieren."""
    print("\n=== Adaptive Debugging-System Demonstration ===\n")
    
    # Registriere bekannte Fixes
    register_known_fixes()
    
    print("\n1. Test divide_numbers:")
    try:
        result = divide_numbers(10, 2)
        print(f"  Ergebnis: {result}")
    except Exception as e:
        print(f"  Fehler: {e}")
    
    try:
        result = divide_numbers(10, 0)
        print(f"  Ergebnis mit Auto-Fix: {result}")
    except Exception as e:
        print(f"  Fehler trotz Fix-Versuch: {e}")
    
    print("\n2. Test DataProcessor:")
    processor = DataProcessor({"a": 5, "b": 10, "c": "test"})
    
    try:
        result = processor.process_item("a")
        print(f"  process_item('a'): {result}")
    except Exception as e:
        print(f"  Fehler: {e}")
    
    try:
        result = processor.process_item("missing_key")
        print(f"  process_item('missing_key') mit Auto-Fix: {result}")
    except Exception as e:
        print(f"  Fehler trotz Fix-Versuch: {e}")
    
    try:
        result = processor.calculate_average(["a", "b"])
        print(f"  calculate_average(['a', 'b']): {result}")
    except Exception as e:
        print(f"  Fehler: {e}")
    
    try:
        result = processor.calculate_average(["a", "c"])
        print(f"  calculate_average(['a', 'c']): {result}")
    except Exception as e:
        print(f"  Fehler: {e}")
    
    print("\n3. Test unreliable_network_call:")
    for i in range(5):
        try:
            result = unreliable_network_call("api.example.com/data", timeout=0.2)
            print(f"  Aufruf {i+1}: Erfolgreich - {result}")
        except Exception as e:
            print(f"  Aufruf {i+1}: Fehler - {e}")
    
    print("\n4. Debug-Report:")
    report = get_debug_report()
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    run_examples() 