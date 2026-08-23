import os
import sys
import json
import shutil
import numpy as np

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
except ImportError:
    print("Installing qdrant-client and fastembed...")
    os.system(f"{sys.executable} -m pip install qdrant-client fastembed")
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct

try:
    from fastembed import TextEmbedding
except ImportError:
    os.system(f"{sys.executable} -m pip install fastembed")
    from fastembed import TextEmbedding

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

COLLECTION_NAME = os.getenv("QDRANT_COLLECTION", "ams_knowledge_v1")
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def main():
    db_path = os.path.join(os.path.dirname(__file__), "..", "data", "qdrant_db")

    # Remove old database to start fresh
    if os.path.exists(db_path):
        print(f"Removing old Qdrant DB at {db_path}...")
        shutil.rmtree(db_path)

    print(f"Creating fresh Qdrant DB at {db_path}...")
    client = QdrantClient(path=db_path)

    print(f"Loading embedding model: {EMBEDDING_MODEL}...")
    embedding_model = TextEmbedding(EMBEDDING_MODEL)

    # Determine vector size
    test_emb = list(embedding_model.embed(["test"]))[0]
    vector_size = len(test_emb)
    print(f"Vector size: {vector_size}")

    # Create collection
    client.recreate_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )

    # Load policies
    file_path = os.path.join(os.path.dirname(__file__), "..", "data", "policies.json")
    print(f"Loading documents from {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        docs_raw = json.load(f)

    # Flatten: one document per (policy, role) pair for accurate role filtering
    documents = []
    payloads = []
    doc_id = 1

    for d in docs_raw:
        roles = d.get("role_visibility", ["Employee"])
        for role in roles:
            txt = f"Tiêu đề: {d['title']}\nNội dung: {d['content']}"
            documents.append(txt)
            payloads.append({
                "id": d["id"],
                "title": d["title"],
                "document": d["content"],
                "role_visibility": role,
            })
            doc_id += 1

    print(f"Total documents to ingest: {len(documents)} (from {len(docs_raw)} policies × roles)")

    # Generate embeddings
    print("Generating embeddings...")
    embeddings = list(embedding_model.embed(documents))

    # Create points
    points = []
    for i, (emb, payload) in enumerate(zip(embeddings, payloads)):
        points.append(PointStruct(
            id=i + 1,
            vector=emb.tolist(),
            payload=payload,
        ))

    # Upsert in batches
    batch_size = 20
    for i in range(0, len(points), batch_size):
        batch = points[i:i + batch_size]
        client.upsert(collection_name=COLLECTION_NAME, points=batch)
        print(f"  Ingested batch {i // batch_size + 1}: {len(batch)} docs")

    print(f"\n✅ Ingestion completed! {len(documents)} documents indexed into '{COLLECTION_NAME}'.")
    print(f"   Policies: {len(docs_raw)}")
    print(f"   Unique roles: {sorted(set(role for d in docs_raw for role in d.get('role_visibility', [])))}")


if __name__ == "__main__":
    main()
