
# AI Customer Service Assistant Implementation Guide

## Overview

This guide provides a focused implementation for an AI-powered customer service assistant using **OpenAI Agents SDK** (not LangChain or Ollama). The assistant is designed to help users with account-related questions, explain FAQs, guide through user stories and flows, and provide effective answers about user accounts.

### Key Differences from Trading Bot Implementation

The previous guide (`openai-agents-deepseek-integration.md`) focused on trading analysis and strategy generation. This guide shifts the focus to:

1. **Customer Service Orientation**: Virtual assistant for user support, not trading decisions
2. **Simplified Toolset**: Tools for account lookup, FAQ retrieval, and guidance
3. **Predefined Knowledge**: Built-in understanding of user stories, flows, and platform features
4. **No Financial Advice**: Avoids trading recommendations, focuses on platform guidance

## Why OpenAI Agents SDK (Not LangChain)

### Strategic Decision

We have chosen **OpenAI Agents SDK** over LangChain for the following reasons:

1. **Official Support**: Maintained by OpenAI with guaranteed compatibility
2. **Simplified Integration**: Direct integration with OpenAI models and tools
3. **Reduced Complexity**: Fewer dependencies and simpler architecture
4. **Better Performance**: Optimized for OpenAI's ecosystem
5. **Future-Proof**: Aligned with OpenAI's roadmap and updates

### What We Avoid

- **LangChain**: Additional abstraction layer not needed for our use case
- **Ollama**: Local models not required for customer service scenarios
- **Complex Agent Orchestration**: Simple tool-based approach suffices

## Architecture

### Simplified Component Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   AI Service    │
│   (React)       │◄──►│   (FastAPI)     │◄──►│   (OpenAI SDK)  │
│                 │    │                 │    │                 │
│  Chat Interface │    │  /ai/chat       │    │  Agent + Tools  │
│  FAQ Display    │    │  /ai/faq        │    │  Context        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (PostgreSQL)  │
                       │                 │
                       │  User Profiles  │
                       │  Chat History   │
                       │  FAQ Knowledge  │
                       └─────────────────┘
```

### Core Components

1. **AI Service**: Uses `openai.agents.Agent` with custom tools
2. **Tools**: Account lookup, FAQ retrieval, guidance tools
3. **Knowledge Base**: Predefined user stories and flows
4. **Frontend**: Simple chat interface for user interaction

## Implementation

### 1. Dependencies

Ensure your `pyproject.toml` includes:

```toml
# AI/ML Dependencies
"openai>=1.0.0,<2.0.0"
"openai-agents-python>=0.1.0"
"httpx<1.0.0,>=0.25.1"

# Optional: For DeepSeek API integration
# "deepseek-api>=0.1.0"
```

### 2. Configuration

Create `app/core/ai_customer_config.py`:

```python
"""AI Customer Service Configuration"""
from typing import Optional
from pydantic import BaseSettings, Field


class AICustomerConfig(BaseSettings):
    """AI Customer Service Configuration"""
    
    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API Key")
    ai_model: str = Field(default="gpt-4o-mini", description="Default AI model")
    
    # DeepSeek Configuration (optional)
    deepseek_api_key: Optional[str] = Field(default=None, description="DeepSeek API Key")
    deepseek_base_url: str = Field(default="https://api.deepseek.com/v1", description="DeepSeek API Base URL")
    deepseek_model: str = Field(default="deepseek-chat", description="DeepSeek model")
    
    # Customer Service Settings
    ai_customer_service_enabled: bool = Field(default=True, description="Enable AI customer service")
    ai_max_tokens: int = Field(default=2000, description="Maximum tokens for AI responses")
    ai_temperature: float = Field(default=0.3, description="AI temperature (lower for more consistent responses)")
    
    # Knowledge Base
    faq_file_path: str = Field(default="data/faqs.json", description="Path to FAQ knowledge base")
    user_stories_file_path: str = Field(default="data/user_stories.json", description="Path to user stories")
    
    class Config:
        env_file = "../.env"
        env_prefix = ""


# Global configuration instance
ai_customer_config = AICustomerConfig()
```

### 3. Customer Service AI Implementation

Create `app/services/ai_customer_service.py`:

```python
"""AI Customer Service using OpenAI Agents SDK"""
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from openai import OpenAI
from openai.agents import Agent, tool

from app.core.ai_customer_config import ai_customer_config

logger = logging.getLogger(__name__)


class AICustomerService:
    """AI Customer Service for user account guidance and FAQs"""
    
    def __init__(self):
        self.openai_client = None
        self.deepseek_client = None
        self._initialize_clients()
        self.agent = self._create_agent()
        self.faqs = self._load_faqs()
        self.user_stories = self._load_user_stories()
    
    def _initialize_clients(self):
        """Initialize AI clients"""
        if ai_customer_config.openai_api_key:
            self.openai_client = OpenAI(api_key=ai_customer_config.openai_api_key)
        
        if ai_customer_config.deepseek_api_key:
            self.deepseek_client = OpenAI(
                api_key=ai_customer_config.deepseek_api_key,
                base_url=ai_customer_config.deepseek_base_url
            )
    
    def _load_faqs(self) -> Dict[str, Any]:
        """Load FAQ knowledge base"""
        try:
            with open(ai_customer_config.faq_file_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"FAQ file not found at {ai_customer_config.faq_file_path}")
            return {"categories": [], "questions": []}
    
    def _load_user_stories(self) -> Dict[str, Any]:
        """Load user stories and flows"""
        try:
            with open(ai_customer_config.user_stories_file_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"User stories file not found at {ai_customer_config.user_stories_file_path}")
            return {"stories": [], "flows": []}
    
    def _create_agent(self) -> Agent:
        """Create OpenAI Agent with customer service tools"""
        
        @tool
        async def get_account_info(user_id: str) -> Dict[str, Any]:
            """Get basic account information for a user"""
            # In a real implementation, this would query your database
            # For now, return mock data
            return {
                "user_id": user_id,
                "account_status": "active",
                "account_tier": "standard",
                "join_date": "2024-01-15",
                "last_login": "2024-12-01"
            }
        
        @tool
        async def search_faqs(query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
            """Search FAQs for relevant information"""
            results = []
            for question in self.faqs.get("questions", []):
                if query.lower() in question.get("question", "").lower():
                    if category and question.get("category") != category:
                        continue
                    results.append({
                        "question": question.get("question"),
                        "answer": question.get("answer"),
                        "category": question.get("category")
                    })
            return results[:5]  # Limit to 5 results
        
        @tool
        async def get_user_story(story_name: str) -> Dict[str, Any]:
            """Get a specific user story or flow"""
            for story in self.user_stories.get("stories", []):
                if story.get("name") == story_name:
                    return story
            return {"error": f"Story '{story_name}' not found"}
        
        @tool
        async def guide_through_flow(flow_name: str, step: Optional[int] = None) -> Dict[str, Any]:
            """Guide user through a specific flow"""
            for flow in self.user_stories.get("flows", []):
                if flow.get("name") == flow_name:
                    if step is not None and 0 <= step < len(flow.get("steps", [])):
                        return {
                            "flow": flow_name,
                            "current_step": step,
                            "step_description": flow["steps"][step],
                            "total_steps": len(flow["steps"])
                        }
                    else:
                        return {
                            "flow": flow_name,
                            "steps": flow.get("steps", []),
                            "description": flow.get("description")
                        }
            return {"error": f"Flow '{flow_name}' not found"}
        
        # Create agent with tools
        agent = Agent(
            name="Customer Service Assistant",
            instructions="""
            You are a helpful customer service assistant for the Apex trading platform.
            Your role is to assist users with account-related questions, explain FAQs,
            guide them through user stories and flows, and provide effective answers.
            
            Guidelines:
            1. Be friendly, patient, and professional
            2. Focus on platform guidance, not financial advice
            3. Use the available tools to provide accurate information
            4. If you don't know something, admit it and suggest contacting support
            5. Keep responses concise but helpful
            6. Always verify account information before sharing sensitive details
            
            Available tools:
            - get_account_info: Get basic account information
            - search_faqs: Search the FAQ knowledge base
            - get_user_story: Retrieve specific user stories
            - guide_through_flow: Guide users through platform flows
            
            Remember: You are NOT a trading advisor. Do not provide investment advice.
            """,
            tools=[get_account_info, search_faqs, get_user_story, guide_through_flow],
            model=ai_customer_config.ai_model,
        )
        return agent
    
    async def chat_with_assistant(self, user_id: str, message: str) -> Dict[str, Any]:
        """Chat with AI customer service assistant"""
        if not ai_customer_config.ai_customer_service_enabled:
            return {"error": "AI customer service is disabled"}
        
        try:
            # Use the agent to process the message
            # Note: In a real implementation, you would use Runner.run()
            # For simplicity, we'll call the underlying API directly
            if self.deepseek_client:
                response = await self._call_deepseek(user_id, message)
                model_used = ai_customer_config.deepseek_model
            elif self.openai_client:
                response = await self._call_openai(user_id, message)
                model_used = ai_customer_config.ai_model
            else:
                return {"error": "No AI service configured"}
            
            return {
                "response": response,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "model_used": model_used
            }
            
        except Exception as e:
            logger.error(f"AI customer service chat failed: {str(e)}")
            return {"error": f"Chat failed: {str(e)}"}
    
    async def _call_openai(self, user_id: str, message: str) -> str:
        """Call OpenAI API with customer service context"""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")
        
        # Build system message with context
        system_message = f"""
        You are a customer service assistant for user {user_id}.
        You have access to tools for account info, FAQs, user stories, and flows.
        Provide helpful, accurate guidance about the platform.
        """
        
        response = self.openai_client.chat.completions.create(
            model=ai_customer_config.ai_model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": message}
            ],
            max_tokens=ai_customer_config.ai_max_tokens,
            temperature=ai_customer_config.ai_temperature
        )
        
        return response.choices[0].message.content
    
    async def _call_deepseek(self, user_id: str, message: str) -> str:
        """Call DeepSeek API with customer service context"""
        if not self.deepseek_client:
            raise ValueError("DeepSeek client not initialized")
        
        system_message = f"""
        You are a customer service assistant for user {user_id}.
        Provide helpful, accurate guidance about the platform.
        """
        
        response = self.deepseek_client.chat.completions.create(
            model=ai_customer_config.deepseek_model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": message}
            ],
            max_tokens=ai_customer_config.ai_max_tokens,
            temperature=ai_customer_config.ai_temperature
        )
        
        return response.choices[0].message.content


# Global service instance
ai_customer_service = AICustomerService()
```

### 4. API Routes

Create `app/api/routes/customer_service.py`:

```python
"""Customer Service AI Routes"""
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import get_current_active_user, get_db
from app.models import User
from app.services.ai_customer_service import ai_customer_service

router = APIRouter()


@router.post("/chat")
async def chat_with_customer_service(
    message: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Chat with AI customer service assistant"""
    try:
        result = await ai_customer_service.chat_with_assistant(str(current_user.id), message)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Customer service chat failed: {str(e)}"
        )


@router.get("/faq")
async def get_faqs(
    query: str,
    category: str = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Search FAQs"""
    try:
        # This would use the search_faqs tool in a real implementation
        # For simplicity, we'll return a subset
        faqs = ai_customer_service.faqs.get("questions", [])
        
        filtered_faqs = []
        for faq in faqs:
            if query.lower() in faq.get("question", "").lower():
                if category and faq.get("category") != category:
                    continue
                filtered_faqs.append(faq)
        
        return {
            "query": query,
            "category": category,
            "results": filtered_faqs[:10],
            "count": len(filtered_faqs)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"FAQ search failed: {str(e)}"
        )


@router.get("/status")
async def get_customer_service_status() -> Dict[str, Any]:
    """Get customer service AI status"""
    return {
        "enabled": ai_customer_service.ai_customer_config.ai_customer_service_enabled,
        "openai_configured": ai_customer_service.openai_client is not None,
        "deepseek_configured": ai_customer_service.deepseek_client is not None,
        "faq_count": len(ai_customer_service.faqs.get("questions", [])),
        "story_count": len(ai_customer_service.user_stories.get("stories", []))
    }
```

### 5. Knowledge Base Files

Create `data/faqs.json`:

```json
{
  "categories": ["account", "trading", "deposits", "withdrawals", "security"],
  "questions": [
    {
      "id": "faq-001",
      "question": "How do I reset my password?",
      "answer": "Go to Settings > Security > Reset Password. You'll receive an email with a reset link.",
      "category": "account"
    },
    {
      "id": "faq-002",
      "question": "What is the minimum deposit amount?",
      "answer": "The minimum deposit is $10 for most payment methods.",
      "category": "deposits"
    },
    {
      "id": "faq-003",
      "question": "How long do withdrawals take?",
      "answer": "Withdrawals typically process within 1-3 business days.",
      "category": "withdrawals"
    },
    {
      "id": "faq-004",
      "question": "Is my account secure?",
      "answer": "Yes, we use bank-level encryption and 2FA for all accounts.",
      "category": "security"
    },
    {
      "id": "faq-005",
      "question": "How do I enable two-factor authentication?",
      "answer": "Go to Settings > Security > Two-Factor Authentication and follow the setup instructions.",
      "category": "security"
    }
  ]
}
```

Create `data/user_stories.json`:

```json
{
  "stories": [
    {
      "name": "first_deposit",
      "title": "Making Your First Deposit",
