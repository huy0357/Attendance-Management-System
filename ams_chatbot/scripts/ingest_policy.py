import os
import json
from dotenv import load_dotenv
from qdrant_client import QdrantClient

# Load env file from the project root
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
# Override to localhost if running script locally from host machine
if "qdrant" in QDRANT_URL:
    QDRANT_URL = "http://localhost:6333"

COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "ams_knowledge_v1")
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2" # Hỗ trợ tiếng Việt và tương thích fastembed mặc định

def main():
    print(f"Connecting to Qdrant at {QDRANT_URL}...")
    client = QdrantClient(url=QDRANT_URL)
    
    print(f"Setting Embedding Model: {EMBEDDING_MODEL}")
    client.set_model(EMBEDDING_MODEL)
    
    # Load policies
    file_path = os.path.join(os.path.dirname(__file__), "..", "data", "policies.json")
    print(f"Loading documents from {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        docs_raw = json.load(f)
        
    documents = []
    metadata = []
    ids = []
    for idx, d in enumerate(docs_raw):
        # Tạo chuỗi text gộp cả title để search tốt hơn
        txt = f"Tiêu đề: {d['title']}\nNội dung: {d['content']}"
        documents.append(txt)
        metadata.append({
            "id": d["id"],
            "title": d["title"],
            "role_visibility": d["role_visibility"]
        })
        ids.append(idx + 1)
        
    print(f"Initiating ingestion to collection '{COLLECTION_NAME}'...")
    # client.add() tự động tạo collection nếu chưa có, và tự động gọi FastEmbed để băm text
    client.add(
        collection_name=COLLECTION_NAME,
        documents=documents,
        metadata=metadata,
        ids=ids
    )
    
    print("Ingestion completed successfully!")

if __name__ == "__main__":
    main()
