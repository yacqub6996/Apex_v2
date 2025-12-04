"""AI orchestrator stub.

This module provides a simple async AIOrchestrator class with an async
`handle_message` method that returns a mock response. In production this
would orchestrate calls to real LLMs, message history, and other services.
"""
from __future__ import annotations

import asyncio
from typing import Any


class AIOrchestrator:
    """A lightweight orchestrator stub for handling messages.

    The class is intentionally small and testable. Replace or extend it when
    wiring to real AI providers.
    """

    async def handle_message(self, user_id: Any, message: str) -> str:
        """Simulate processing and return a mock response.

        Args:
            user_id: The id of the authenticated user sending the message.
            message: The incoming text message from the client.

        Returns:
            A string representing the AI's reply.
        """
        # Simulate async work (e.g., querying a model, calling external APIs)
        await asyncio.sleep(0.05)

        # Simple mock reply — replace with real orchestration in future.
        return f"[ai-reply] user={user_id} echo: {message}"