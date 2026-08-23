from __future__ import annotations

import httpx

from app.core.settings import settings


class OpenRouterClient:
    def __init__(self) -> None:
        self._base_url = settings.openrouter_base_url.rstrip("/")
        self._api_key = settings.openrouter_api_key
        self._model = settings.openrouter_model
        self._timeout = settings.openrouter_timeout_seconds

    async def synthesize(self, system_prompt: str, user_prompt: str, history: list[dict] | None = None) -> dict:
        if not self._api_key:
            return {"content": "[stub] OPENROUTER_API_KEY chưa được cấu hình.", "model": self._model}

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        
        messages = [{"role": "system", "content": system_prompt}]
        if history:
            messages.extend(history)
        messages.append({"role": "user", "content": user_prompt})

        payload = {
            "model": self._model,
            "messages": messages,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(f"{self._base_url}/chat/completions", headers=headers, json=payload)
            response.raise_for_status()
            with open("openrouter_debug.txt", "w", encoding="utf-8") as f:
                f.write(response.text)
            data = response.json()
            return {
                "content": data["choices"][0]["message"]["content"],
                "model": data.get("model", self._model),
            }
