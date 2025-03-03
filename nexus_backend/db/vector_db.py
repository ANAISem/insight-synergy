"""
Vector-Datenbank-Implementierung für das Nexus-Backend.
Verwendet ChromaDB und Sentence-Transformers für Embedding und semantische Suche.
"""

import os
from typing import List, Dict, Any, Optional, Union
import logging
from pathlib import Path

import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from langchain.schema import Document
from langchain.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorDB:
    """
    Vektordatenbank für semantische Suche und Wissensrückgewinnung.
    Basiert auf ChromaDB mit Sentence-Transformers als Embedding-Modell.
    """
    
    def __init__(
        self, 
        persist_directory: str = "./data/vector_db",
        collection_name: str = "knowledge_base",
        embedding_model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        create_if_not_exists: bool = True
    ):
        """
        Initialisiert die Vektordatenbank.
        
        Args:
            persist_directory: Verzeichnis zum Speichern der Vektordatenbank
            collection_name: Name der Kollektion in der Datenbank
            embedding_model_name: Name des Embedding-Modells von HuggingFace
            create_if_not_exists: Datenbank erstellen, falls sie nicht existiert
        """
        self.persist_directory = os.path.abspath(persist_directory)
        self.collection_name = collection_name
        self.embedding_model_name = embedding_model_name
        
        # Verzeichnis erstellen, falls es nicht existiert
        if create_if_not_exists:
            os.makedirs(self.persist_directory, exist_ok=True)
        
        # HuggingFace-Embedding-Funktion initialisieren
        self.embeddings = HuggingFaceEmbeddings(model_name=embedding_model_name)
        logger.info(f"Embedding-Modell '{embedding_model_name}' initialisiert")
        
        # ChromaDB-Client initialisieren
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Collection abrufen oder erstellen
        try:
            self.collection = self.client.get_collection(name=self.collection_name)
            logger.info(f"Collection '{collection_name}' gefunden mit {self.collection.count()} Dokumenten")
        except ValueError:
            # Collection existiert nicht, erstelle sie
            if create_if_not_exists:
                self.create_collection()
                logger.info(f"Neue Collection '{collection_name}' erstellt")
            else:
                logger.error(f"Collection '{collection_name}' existiert nicht und create_if_not_exists=False")
                raise
        
        # Langchain-Chroma-Integration für erweiterte Funktionalität
        self._langchain_db = Chroma(
            persist_directory=self.persist_directory,
            collection_name=self.collection_name,
            embedding_function=self.embeddings
        )
        
    def create_collection(self):
        """Erstellt eine neue Collection in der Datenbank."""
        embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name=self.embedding_model_name
        )
        self.collection = self.client.create_collection(
            name=self.collection_name,
            embedding_function=embedding_func,
            metadata={"description": "Nexus Knowledge Base"}
        )
        
    def add_documents(self, documents: List[Union[Dict[str, Any], Document]]) -> List[str]:
        """
        Fügt Dokumente zur Vektordatenbank hinzu.
        
        Args:
            documents: Liste von Dokumenten (Dictionary oder langchain Document)
            
        Returns:
            Liste von IDs der hinzugefügten Dokumente
        """
        doc_ids = []
        
        # Batch-weise verarbeiten für bessere Performance
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i+batch_size]
            
            # Langchain-Dokumente konvertieren
            if isinstance(batch[0], Document):
                # Document-Objekte in ChromaDB-Format konvertieren
                ids = [f"doc_{i+j}" for j in range(len(batch))]
                texts = [doc.page_content for doc in batch]
                metadatas = [doc.metadata for doc in batch]
                
                # In ChromaDB einfügen
                self.collection.add(
                    ids=ids,
                    documents=texts,
                    metadatas=metadatas
                )
                doc_ids.extend(ids)
            else:
                # Direktes Hinzufügen als Dictionaries
                ids = [doc.get("id", f"doc_{i+j}") for j, doc in enumerate(batch)]
                texts = [doc["content"] for doc in batch]
                metadatas = [doc.get("metadata", {}) for doc in batch]
                
                # In ChromaDB einfügen
                self.collection.add(
                    ids=ids,
                    documents=texts,
                    metadatas=metadatas
                )
                doc_ids.extend(ids)
                
        logger.info(f"{len(doc_ids)} Dokumente zur Collection hinzugefügt")
        return doc_ids
    
    def search(
        self, 
        query: str, 
        n_results: int = 5,
        filter_criteria: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Führt eine semantische Suche in der Vektordatenbank durch.
        
        Args:
            query: Suchanfrage
            n_results: Anzahl der Ergebnisse
            filter_criteria: Filter für die Suche (z.B. {"source": "website"})
            
        Returns:
            Dictionary mit Suchergebnissen
        """
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=filter_criteria
        )
        
        logger.info(f"Suche nach '{query}' ergab {len(results['documents'][0])} Ergebnisse")
        return results
    
    def search_with_langchain(self, query: str, k: int = 5) -> List[Document]:
        """
        Führt eine semantische Suche mit Langchain-Integration durch.
        
        Args:
            query: Suchanfrage
            k: Anzahl der Ergebnisse
            
        Returns:
            Liste von Langchain-Document-Objekten
        """
        docs = self._langchain_db.similarity_search(query, k=k)
        logger.info(f"Langchain-Suche nach '{query}' ergab {len(docs)} Ergebnisse")
        return docs
    
    def delete_collection(self):
        """Löscht die gesamte Collection aus der Datenbank."""
        if hasattr(self, 'collection'):
            self.client.delete_collection(self.collection_name)
            logger.warning(f"Collection '{self.collection_name}' wurde gelöscht")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Gibt Statistiken über die Vektordatenbank zurück.
        
        Returns:
            Dictionary mit Statistiken
        """
        count = self.collection.count()
        return {
            "document_count": count,
            "collection_name": self.collection_name,
            "embedding_model": self.embedding_model_name,
            "directory": self.persist_directory
        }
    
# Beispielverwendung:
if __name__ == "__main__":
    # Vektordatenbank initialisieren
    db = VectorDB(
        persist_directory="./data/vector_db",
        collection_name="test_collection"
    )
    
    # Beispieldokumente hinzufügen
    documents = [
        {
            "id": "doc1",
            "content": "Berlin ist die Hauptstadt von Deutschland.",
            "metadata": {"source": "wiki", "category": "geography"}
        },
        {
            "id": "doc2",
            "content": "Deutschland ist ein Land in Europa mit 83 Millionen Einwohnern.",
            "metadata": {"source": "wiki", "category": "geography"}
        }
    ]
    
    db.add_documents(documents)
    
    # Semantische Suche durchführen
    results = db.search("Wie viele Menschen leben in Deutschland?")
    print(results) 