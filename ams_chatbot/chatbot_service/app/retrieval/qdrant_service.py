import asyncio
import logging
from functools import partial

from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from app.core.settings import settings

logger = logging.getLogger(__name__)

class QdrantRetrievalService:
    def __init__(self):
        import os
        db_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "qdrant_db")
        self.client = QdrantClient(path=db_path)
        self.collection = settings.qdrant_collection
        # Use fastembed for embedding
        from fastembed import TextEmbedding
        self.embedding_model = TextEmbedding("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

    async def search(self, query: str, role: str) -> list[dict]:
        try:
            loop = asyncio.get_running_loop()

            # Normalize role for policy matching
            role_map = {
                "ADMIN": "ADMIN",
                "HR": "HR",
                "MANAGER": "Manager",
                "EMPLOYEE": "Employee",
                "Admin": "ADMIN",
                "Hr": "HR",
                "Manager": "Manager",
                "Employee": "Employee",
            }
            search_role = role_map.get(role, role)

            def _embed_and_search():
                embeddings = list(self.embedding_model.embed([query]))
                query_vector = embeddings[0].tolist()

                query_filter = Filter(
                    must=[
                        FieldCondition(
                            key="role_visibility",
                            match=MatchValue(value=search_role)
                        )
                    ]
                )

                # Modern qdrant-client uses query_points, older uses search
                if hasattr(self.client, "query_points"):
                    res = self.client.query_points(
                        collection_name=self.collection,
                        query=query_vector,
                        query_filter=query_filter,
                        limit=settings.qdrant_top_k,
                    )
                    results = res.points
                else:
                    results = self.client.search(
                        collection_name=self.collection,
                        query_vector=query_vector,
                        query_filter=query_filter,
                        limit=settings.qdrant_top_k,
                    )
                return results

            results = await loop.run_in_executor(None, _embed_and_search)
            
            logger.info(f"Qdrant query='{query}', role='{search_role}', results found: {len(results)}. Scores: {[h.score for h in results]}")
            formatted_results = []
            # Use threshold 0.40 to ensure high recall for natural Vietnamese queries
            threshold = min(settings.qdrant_score_threshold, 0.40)
            for hit in results:
                if hit.score >= threshold:
                    payload = hit.payload or {}
                    formatted_results.append({
                        "doc_id": payload.get("id"),
                        "title": payload.get("title"),
                        "content": payload.get("document", ""),
                        "score": hit.score,
                        "role_visibility": payload.get("role_visibility"),
                        "external_links": payload.get("external_links", [])
                    })
            logger.info(f"Formatted results after threshold ({threshold}): {len(formatted_results)}")
            return formatted_results
        except Exception as e:
            logger.error(f"Failed to query Qdrant: {str(e)}", exc_info=True)
            return []
