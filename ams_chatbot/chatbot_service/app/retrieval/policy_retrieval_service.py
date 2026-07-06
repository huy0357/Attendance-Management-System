from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from unidecode import unidecode

from app.core.settings import settings

logger = logging.getLogger(__name__)


class PolicyRetrievalService:
    def __init__(self) -> None:
        self._policies_path = Path(settings.policies_file_path)
        self._policies: list[dict[str, Any]] = self._load_policies()

    def _load_policies(self) -> list[dict[str, Any]]:
        try:
            if not self._policies_path.exists():
                logger.error("policies.json not found at %s", self._policies_path)
                return []
            with self._policies_path.open("r", encoding="utf-8") as f:
                raw = json.load(f)
            if not isinstance(raw, list):
                logger.error("policies.json format is invalid: expected array")
                return []
            return [item for item in raw if isinstance(item, dict)]
        except Exception as exc:
            logger.exception("Failed to load policies.json: %s", exc)
            return []

    def search(self, query: str, role: str, top_k: int | None = None) -> list[dict[str, Any]]:
        if not self._policies:
            return []

        if top_k is None:
            top_k = settings.policies_search_top_k

        role_lower = (role or "").strip().lower()
        q_norm = unidecode((query or "").lower()).strip()
        terms = [term for term in q_norm.split() if len(term) > 1]
        if not terms and q_norm:
            terms = [q_norm]
        scored: list[tuple[int, dict[str, Any]]] = []

        for policy in self._policies:
            visibility = policy.get("role_visibility", [])
            if not isinstance(visibility, list):
                continue
            visibility_lower = {str(v).lower() for v in visibility}
            if role_lower not in visibility_lower:
                continue

            raw = f"{policy.get('title', '')} {policy.get('content', '')}"
            haystack = unidecode(raw.lower())
            score = 0
            for term in terms:
                if term in haystack:
                    score += 1
            if score > 0:
                scored.append((score, policy))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            {
                "doc_id": item.get("id"),
                "title": item.get("title"),
                "content": item.get("content"),
                "role_visibility": item.get("role_visibility", []),
                "score": score,
            }
            for score, item in scored[:top_k]
        ]

