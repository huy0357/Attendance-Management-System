import asyncio
import logging
from functools import partial

from qdrant_client import QdrantClient
from qdrant_client.http.models import Filter, FieldCondition, MatchValue
from app.core.settings import settings

logger = logging.getLogger(__name__)

class QdrantRetrievalService:
    def __init__(self):
        self.client = QdrantClient(url=settings.qdrant_url)
        self.collection = settings.qdrant_collection
        # Using the same small/fast embedding model as ingest script
        self.client.set_model("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

    async def search(self, query: str, role: str) -> list[dict]:
        try:
            # Run blocking qdrant_client.query() in a thread executor so it
            # does NOT block the FastAPI / uvicorn async event loop.
            loop = asyncio.get_running_loop()
            results = await loop.run_in_executor(
                None,
                partial(
                    self.client.query,
                    collection_name=self.collection,
                    query_text=query,
                    query_filter=Filter(
                        must=[
                            FieldCondition(
                                key="role_visibility",
                                match=MatchValue(value=role)
                            )
                        ]
                    ),
                    limit=settings.qdrant_top_k,
                ),
            )
            
            logger.warning(f"Qdrant results found: {len(results)}. Scores: {[h.score for h in results]}")
            # Formatting results
            formatted_results = []
            for hit in results:
                if hit.score >= settings.qdrant_score_threshold:
                    formatted_results.append({
                        "doc_id": hit.metadata.get("id"),
                        "title": hit.metadata.get("title"),
                        "content": hit.document,
                        "score": hit.score,
                        "role_visibility": hit.metadata.get("role_visibility")
                    })
            logger.warning(f"Formatted results after threshold: {len(formatted_results)}")
            return formatted_results
        except Exception as e:
            logger.error(f"Failed to query Qdrant: {str(e)}")
            return []
