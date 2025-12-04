from __future__ import annotations

import logging
import os
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any, Dict, List

from agents import (
    Runner,
    TResponseInputItem,
    set_default_openai_api,
    set_default_openai_client,
    set_tracing_disabled,
)
from chatkit.agents import AgentContext, simple_to_agent_input, stream_agent_response
from chatkit.server import ChatKitServer, NonStreamingResult, StreamingResult
from chatkit.store import NotFoundError, Store
from chatkit.types import (
    Attachment,
    Page,
    ThreadItem,
    ThreadMetadata,
    ThreadStreamEvent,
    UserMessageItem,
)
from openai import AsyncOpenAI
from pydantic import TypeAdapter
from sqlmodel import Session, select

from app.core.db import engine
from app.models import (
    SupportAttachment,
    SupportThread,
    SupportThreadItem,
    User,
)
from app.services.ai.customer_support_agent import get_customer_support_agent

# Force legacy chat completions API mode for DeepSeek compatibility
set_default_openai_api("chat_completions")

ChatContext = Dict[str, Any]

logger = logging.getLogger(__name__)


_thread_item_adapter = TypeAdapter(ThreadItem)


class DatabaseStore(Store[ChatContext]):
    """Persistent Store implementation backed by the database.

    Threads and items are keyed by the ChatKit thread ID, and associated
    with the authenticated user via the ChatContext. This allows a single,
    continuous conversation thread to be restored across sessions and devices.
    """

    def _get_user_id(self, context: ChatContext) -> uuid.UUID | None:
        raw = context.get("user_id")
        if raw is None:
            return None
        try:
            return uuid.UUID(str(raw))
        except Exception:
            return None

    async def load_thread(self, thread_id: str, context: ChatContext) -> ThreadMetadata:
        with Session(engine) as session:
            db_thread = session.get(SupportThread, thread_id)
            if db_thread is None:
                # Auto-create a thread record when ChatKit refers to a thread
                # ID that does not yet exist in the persistent store. This can
                # happen when switching from the in-memory store to the DB.
                now = datetime.now(timezone.utc)
                meta_dict: Dict[str, Any] = {
                    "id": thread_id,
                    "created_at": now,
                    "title": "Apex Support Assistant",
                    "metadata": {},
                }
                thread_meta = ThreadMetadata.model_validate(meta_dict)
                db_thread = SupportThread(
                    id=thread_id,
                    user_id=self._get_user_id(context),
                    thread_metadata=thread_meta.model_dump(mode="python"),
                    created_at=now,
                    updated_at=now,
                )
                session.add(db_thread)
                session.commit()
                session.refresh(db_thread)
            return ThreadMetadata.model_validate(db_thread.thread_metadata)

    async def save_thread(self, thread: ThreadMetadata, context: ChatContext) -> None:
        user_id = self._get_user_id(context)
        data = thread.model_dump(mode="python")
        with Session(engine) as session:
            db_thread = session.get(SupportThread, thread.id)
            if db_thread is None:
                created_at = data.get("created_at") or datetime.now(timezone.utc)
                db_thread = SupportThread(
                    id=thread.id,
                    user_id=user_id,
                    thread_metadata=data,
                    created_at=created_at,
                    updated_at=created_at,
                )
                session.add(db_thread)
            else:
                db_thread.thread_metadata = data
                if user_id is not None and db_thread.user_id is None:
                    db_thread.user_id = user_id
                db_thread.updated_at = datetime.now(timezone.utc)
            session.commit()

    async def load_thread_items(
        self,
        thread_id: str,
        after: str | None,
        limit: int,
        order: str,
        context: ChatContext,
    ) -> Page[ThreadItem]:
        with Session(engine) as session:
            stmt = select(SupportThreadItem).where(SupportThreadItem.thread_id == thread_id)
            if order == "desc":
                stmt = stmt.order_by(SupportThreadItem.created_at.desc(), SupportThreadItem.id.desc())
            else:
                stmt = stmt.order_by(SupportThreadItem.created_at, SupportThreadItem.id)
            rows = list(session.exec(stmt))

        start_index = 0
        if after is not None:
            for idx, row in enumerate(rows):
                if row.id == after:
                    start_index = idx + 1
                    break

        paged_rows = rows[start_index : start_index + limit]
        has_more = start_index + limit < len(rows)
        after_cursor = paged_rows[-1].id if has_more and paged_rows else None

        items: List[ThreadItem] = [
            _thread_item_adapter.validate_python(row.payload) for row in paged_rows
        ]

        return Page[ThreadItem](data=items, has_more=has_more, after=after_cursor)

    async def save_attachment(
        self, attachment: Attachment, context: ChatContext
    ) -> None:
        user_id = self._get_user_id(context)
        data = attachment.model_dump(mode="python")
        with Session(engine) as session:
            db = session.get(SupportAttachment, attachment.id)
            if db is None:
                db = SupportAttachment(
                    id=attachment.id,
                    user_id=user_id,
                    payload=data,
                )
                session.add(db)
            else:
                db.payload = data
                if user_id is not None and db.user_id is None:
                    db.user_id = user_id
            session.commit()

    async def load_attachment(
        self, attachment_id: str, context: ChatContext
    ) -> Attachment:
        with Session(engine) as session:
            db = session.get(SupportAttachment, attachment_id)
            if db is None:
                raise NotFoundError(f"Attachment '{attachment_id}' not found")
            return Attachment.model_validate(db.payload)

    async def delete_attachment(
        self, attachment_id: str, context: ChatContext
    ) -> None:
        with Session(engine) as session:
            db = session.get(SupportAttachment, attachment_id)
            if db is not None:
                session.delete(db)
                session.commit()

    async def load_threads(
        self,
        limit: int,
        after: str | None,
        order: str,
        context: ChatContext,
    ) -> Page[ThreadMetadata]:
        user_id = self._get_user_id(context)
        with Session(engine) as session:
            stmt = select(SupportThread)
            if user_id is not None:
                stmt = stmt.where(SupportThread.user_id == user_id)
            if order == "desc":
                stmt = stmt.order_by(SupportThread.created_at.desc(), SupportThread.id.desc())
            else:
                stmt = stmt.order_by(SupportThread.created_at, SupportThread.id)
            rows = list(session.exec(stmt))

        start_index = 0
        if after is not None:
            for idx, row in enumerate(rows):
                if row.id == after:
                    start_index = idx + 1
                    break

        paged_rows = rows[start_index : start_index + limit]
        has_more = start_index + limit < len(rows)
        after_cursor = paged_rows[-1].id if has_more and paged_rows else None

        threads = [
            ThreadMetadata.model_validate(row.thread_metadata) for row in paged_rows
        ]
        return Page[ThreadMetadata](data=threads, has_more=has_more, after=after_cursor)

    async def add_thread_item(
        self, thread_id: str, item: ThreadItem, context: ChatContext
    ) -> None:
        await self.save_item(thread_id, item, context)

    async def save_item(
        self, thread_id: str, item: ThreadItem, context: ChatContext
    ) -> None:
        user_id = self._get_user_id(context)
        data = item.model_dump(mode="python")
        item_id = data.get("id")
        if item_id is None:
            # ChatKit items are expected to have stable IDs; fall back to a UUID
            item_id = str(uuid.uuid4())
            data["id"] = item_id
        created_at = data.get("created_at") or datetime.now(timezone.utc)
        item_type = data.get("type", "unknown")

        with Session(engine) as session:
            db_item = session.get(SupportThreadItem, item_id)
            if db_item is None:
                db_item = SupportThreadItem(
                    id=item_id,
                    thread_id=thread_id,
                    user_id=user_id,
                    item_type=item_type,
                    created_at=created_at,
                    payload=data,
                )
                session.add(db_item)
            else:
                db_item.payload = data
                db_item.item_type = item_type
                db_item.created_at = created_at
                if user_id is not None and db_item.user_id is None:
                    db_item.user_id = user_id
            session.commit()

    async def load_item(
        self, thread_id: str, item_id: str, context: ChatContext
    ) -> ThreadItem:
        with Session(engine) as session:
            db_item = session.get(SupportThreadItem, item_id)
            if db_item is None or db_item.thread_id != thread_id:
                raise NotFoundError(f"Item '{item_id}' not found in thread '{thread_id}'")
            return _thread_item_adapter.validate_python(db_item.payload)

    async def delete_thread(self, thread_id: str, context: ChatContext) -> None:
        with Session(engine) as session:
            items = session.exec(
                select(SupportThreadItem).where(SupportThreadItem.thread_id == thread_id)
            ).all()
            for db_item in items:
                session.delete(db_item)

            thread = session.get(SupportThread, thread_id)
            if thread is not None:
                session.delete(thread)

            session.commit()

    async def delete_thread_item(
        self, thread_id: str, item_id: str, context: ChatContext
    ) -> None:
        with Session(engine) as session:
            db_item = session.get(SupportThreadItem, item_id)
            if db_item is not None and db_item.thread_id == thread_id:
                session.delete(db_item)
                session.commit()


class InMemoryStore(Store[ChatContext]):
    """Simple in-memory Store implementation, scoped per user.

    This is kept as a fallback when the database tables for the
    DatabaseStore are not yet available (e.g., before migrations run).
    """

    def __init__(self) -> None:
        self._threads: dict[str, ThreadMetadata] = {}
        self._items: dict[str, list[ThreadItem]] = {}
        self._attachments: dict[str, Attachment] = {}

    def _user_key(self, context: ChatContext) -> str:
        return str(context.get("user_id", "anonymous"))

    def _thread_key(self, thread_id: str, context: ChatContext) -> str:
        return f"{self._user_key(context)}:{thread_id}"

    async def load_thread(self, thread_id: str, context: ChatContext) -> ThreadMetadata:
        key = self._thread_key(thread_id, context)
        thread = self._threads.get(key)
        if thread is None:
            raise NotFoundError(f"Thread '{thread_id}' not found")
        return thread

    async def save_thread(self, thread: ThreadMetadata, context: ChatContext) -> None:
        key = self._thread_key(thread.id, context)
        self._threads[key] = thread

    async def load_thread_items(
        self,
        thread_id: str,
        after: str | None,
        limit: int,
        order: str,
        context: ChatContext,
    ) -> Page[ThreadItem]:
        key = self._thread_key(thread_id, context)
        items: List[ThreadItem] = list(self._items.get(key, []))

        # Sort by created_at
        reverse = order == "desc"
        items.sort(key=lambda i: i.created_at, reverse=reverse)  # type: ignore[attr-defined]

        start_index = 0
        if after is not None:
            for idx, item in enumerate(items):
                if item.id == after:
                    start_index = idx + 1
                    break

        paged = items[start_index : start_index + limit]
        has_more = start_index + limit < len(items)
        after_cursor = paged[-1].id if has_more and paged else None

        return Page[ThreadItem](data=paged, has_more=has_more, after=after_cursor)

    async def save_attachment(
        self, attachment: Attachment, context: ChatContext
    ) -> None:
        self._attachments[attachment.id] = attachment

    async def load_attachment(
        self, attachment_id: str, context: ChatContext
    ) -> Attachment:
        attachment = self._attachments.get(attachment_id)
        if attachment is None:
            raise NotFoundError(f"Attachment '{attachment_id}' not found")
        return attachment

    async def delete_attachment(
        self, attachment_id: str, context: ChatContext
    ) -> None:
        self._attachments.pop(attachment_id, None)

    async def load_threads(
        self,
        limit: int,
        after: str | None,
        order: str,
        context: ChatContext,
    ) -> Page[ThreadMetadata]:
        user_prefix = f"{self._user_key(context)}:"
        threads: list[ThreadMetadata] = [
            thread
            for key, thread in self._threads.items()
            if key.startswith(user_prefix)
        ]

        reverse = order == "desc"
        threads.sort(key=lambda t: t.created_at, reverse=reverse)

        start_index = 0
        if after is not None:
            for idx, thread in enumerate(threads):
                if thread.id == after:
                    start_index = idx + 1
                    break

        paged = threads[start_index : start_index + limit]
        has_more = start_index + limit < len(threads)
        after_cursor = paged[-1].id if has_more and paged else None

        return Page[ThreadMetadata](data=paged, has_more=has_more, after=after_cursor)

    async def add_thread_item(
        self, thread_id: str, item: ThreadItem, context: ChatContext
    ) -> None:
        key = self._thread_key(thread_id, context)
        items = self._items.setdefault(key, [])
        items.append(item)

    async def save_item(
        self, thread_id: str, item: ThreadItem, context: ChatContext
    ) -> None:
        key = self._thread_key(thread_id, context)
        items = self._items.setdefault(key, [])
        for idx, existing in enumerate(items):
            if existing.id == item.id:
                items[idx] = item
                break
        else:
            items.append(item)

    async def load_item(
        self, thread_id: str, item_id: str, context: ChatContext
    ) -> ThreadItem:
        key = self._thread_key(thread_id, context)
        items = self._items.get(key, [])
        for item in items:
            if item.id == item_id:
                return item
        raise NotFoundError(f"Item '{item_id}' not found in thread '{thread_id}'")

    async def delete_thread(self, thread_id: str, context: ChatContext) -> None:
        key = self._thread_key(thread_id, context)
        self._threads.pop(key, None)
        self._items.pop(key, None)

    async def delete_thread_item(
        self, thread_id: str, item_id: str, context: ChatContext
    ) -> None:
        key = self._thread_key(thread_id, context)
        items = self._items.get(key, [])
        self._items[key] = [item for item in items if item.id != item_id]


class CustomerServiceChatKitServer(ChatKitServer[ChatContext]):
    """ChatKit server wired to the Apex Support Agent."""

    def __init__(self) -> None:
        # Prefer the persistent database-backed store when the support tables
        # are available, but fall back to the in-memory store during local
        # development before migrations have been applied.
        try:
            with Session(engine) as session:
                # Lightweight check to ensure the SupportThread table exists
                session.exec(select(SupportThread).limit(1))
            store: Store[ChatContext] = DatabaseStore()
            logger.info("CustomerServiceChatKitServer using DatabaseStore for persistence")
        except Exception:  # pragma: no cover - defensive fallback
            logger.warning(
                "SupportThread tables not available; falling back to InMemoryStore. "
                "Chat history will not persist across backend restarts."
            )
            store = InMemoryStore()
        super().__init__(store=store)

        # Configure DeepSeek as the primary model provider via OpenAI-compatible client.
        deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
        deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        deepseek_model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

        if deepseek_api_key:
            try:
                client = AsyncOpenAI(api_key=deepseek_api_key, base_url=deepseek_base_url)
                # Use DeepSeek for LLM calls, but don't attempt to send traces to OpenAI.
                set_default_openai_client(client, use_for_tracing=False)
                # DeepSeek currently implements the chat completions API, not the Responses API.
                set_default_openai_api("chat_completions")
                set_tracing_disabled(True)
            except Exception:
                logger.exception("Failed to initialize DeepSeek AsyncOpenAI client")
        else:
            logger.warning(
                "DEEPSEEK_API_KEY is not set; customer service assistant will not be able to respond."
            )

    async def respond(
        self,
        thread: ThreadMetadata,
        input_user_message: UserMessageItem | None,
        context: ChatContext,
    ) -> AsyncIterator[ThreadStreamEvent]:
        """Bridge ChatKit threads to the Agents SDK."""

        # Load the current thread items for this user/thread
        items_page = await self.store.load_thread_items(
            thread.id,
            after=None,
            limit=100,
            order="asc",
            context=context,
        )
        thread_items = items_page.data

        # Convert thread items into Agents SDK input format
        agent_input: list[TResponseInputItem] = await simple_to_agent_input(
            thread_items
        )

        # Resolve the user object from context (or DB as fallback)
        user: User | None = context.get("user")
        if user is None:
            user_id = context.get("user_id")
            if user_id:
                try:
                    with Session(engine) as session:
                        user = session.get(User, user_id)
                except Exception:  # pragma: no cover - defensive
                    user = None
        if user is None:
            raise ValueError("CustomerServiceChatKitServer.respond: user context is required")

        # Build a fresh agent instance for this user
        agent = get_customer_support_agent(user)

        # Run the agent in streaming mode
        result = Runner.run_streamed(
            agent,
            agent_input,
            context=context,
        )

        # Create an AgentContext so ChatKit can translate streaming events
        agent_context = AgentContext[ChatContext](
            previous_response_id=None,
            thread=thread,
            store=self.store,
            request_context=context,
        )

        async for event in stream_agent_response(agent_context, result):
            yield event


__all__ = [
    "ChatContext",
    "CustomerServiceChatKitServer",
    "DatabaseStore",
    "InMemoryStore",
    "NonStreamingResult",
    "StreamingResult",
]

chatkit_server = CustomerServiceChatKitServer()
