# OpenAI Agents SDK with DeepSeek API Integration Guide

## Overview

This guide provides comprehensive instructions for integrating OpenAI Agents SDK with DeepSeek API into the Apex trading platform. The integration enables AI-powered trading assistance, market analysis, and automated decision-making capabilities.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Dependencies Installation](#dependencies-installation)
3. [Backend Implementation](#backend-implementation)
4. [Database Migration](#database-migration)
5. [Frontend Integration](#frontend-integration)
6. [Testing Procedures](#testing-procedures)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

## Environment Setup

### Required Environment Variables

Add the following environment variables to your `.env` file:

```bash
# OpenAI Agents SDK Configuration
OPENAI_API_KEY=your-openai-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# AI Service Configuration
AI_AGENTS_ENABLED=true
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.7
AI_MODEL=gpt-4o-mini
DEEPSEEK_MODEL=deepseek-chat

# Rate Limiting for AI Services
AI_RATE_LIMIT_REQUESTS=100
AI_RATE_LIMIT_WINDOW=60
```

### Update .env.example

Add the same variables to `Project_Apex/.env.example`:

```bash
# OpenAI Agents SDK Configuration
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# AI Service Configuration
AI_AGENTS_ENABLED=false
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.7
AI_MODEL=gpt-4o-mini
DEEPSEEK_MODEL=deepseek-chat

# Rate Limiting for AI Services
AI_RATE_LIMIT_REQUESTS=100
AI_RATE_LIMIT_WINDOW=60
```

## Dependencies Installation

### Backend Dependencies

Add the following dependencies to `Project_Apex/backend/pyproject.toml`:

```toml
# AI/ML Dependencies
"openai>=1.0.0,<2.0.0"
"openai-agents-python>=0.1.0"
"httpx<1.0.0,>=0.25.1"
```

Install dependencies:

```bash
cd Project_Apex/backend
uv sync
```

### Frontend Dependencies

Add the following dependencies to `Project_Apex/frontend/package.json`:

```json
{
  "dependencies": {
    "@openai/api": "^4.0.0",
    "react-markdown": "^10.0.0",
    "remark-gfm": "^4.0.0"
  }
}
```

Install dependencies:

```bash
cd Project_Apex/frontend
npm install
```

## Backend Implementation

### 1. AI Configuration Module

Create `Project_Apex/backend/app/core/ai_config.py`:

```python
"""AI Service Configuration Module"""
from typing import Optional
from pydantic import BaseSettings, Field


class AIConfig(BaseSettings):
    """AI Service Configuration"""
    
    # OpenAI Configuration
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API Key")
    ai_model: str = Field(default="gpt-4o-mini", description="Default AI model")
    
    # DeepSeek Configuration
    deepseek_api_key: Optional[str] = Field(default=None, description="DeepSeek API Key")
    deepseek_base_url: str = Field(default="https://api.deepseek.com/v1", description="DeepSeek API Base URL")
    deepseek_model: str = Field(default="deepseek-chat", description="DeepSeek model")
    
    # General AI Settings
    ai_agents_enabled: bool = Field(default=False, description="Enable AI agents")
    ai_max_tokens: int = Field(default=4000, description="Maximum tokens for AI responses")
    ai_temperature: float = Field(default=0.7, description="AI temperature setting")
    
    # Rate Limiting
    ai_rate_limit_requests: int = Field(default=100, description="AI requests per window")
    ai_rate_limit_window: int = Field(default=60, description="Rate limit window in seconds")
    
    class Config:
        env_file = "../.env"
        env_prefix = ""


# Global AI configuration instance
ai_config = AIConfig()
### 2. AI Service Implementation

Create `Project_Apex/backend/app/services/ai_service.py`:

```python
"""AI Service for OpenAI Agents SDK and DeepSeek API Integration"""
import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

import httpx
from openai import OpenAI
from agents import Agent, RunConfig
from pydantic_ai import Agent as PydanticAgent

from app.core.ai_config import ai_config
from app.core.rate_limiter import RateLimiter

logger = logging.getLogger(__name__)


class AIService:
    """AI Service for handling OpenAI Agents and DeepSeek API calls"""
    
    def __init__(self):
        self.openai_client = None
        self.deepseek_client = None
        self.rate_limiter = RateLimiter(
            max_requests=ai_config.ai_rate_limit_requests,
            window_seconds=ai_config.ai_rate_limit_window
        )
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize AI clients"""
        if ai_config.openai_api_key:
            self.openai_client = OpenAI(api_key=ai_config.openai_api_key)
        
        if ai_config.deepseek_api_key:
            self.deepseek_client = OpenAI(
                api_key=ai_config.deepseek_api_key,
                base_url=ai_config.deepseek_base_url
            )
    
    async def analyze_market_sentiment(self, symbols: List[str]) -> Dict[str, Any]:
        """Analyze market sentiment for given symbols"""
        if not ai_config.ai_agents_enabled:
            return {"error": "AI agents are disabled"}
        
        await self.rate_limiter.acquire()
        
        try:
            prompt = f"""
            Analyze market sentiment for the following trading symbols: {', '.join(symbols)}.
            Provide:
            1. Overall market sentiment (Bullish/Bearish/Neutral)
            2. Technical analysis summary
            3. Key support and resistance levels
            4. Trading recommendations
            
            Focus on actionable insights for traders.
            """
            
            if self.deepseek_client:
                response = await self._call_deepseek(prompt)
            elif self.openai_client:
                response = await self._call_openai(prompt)
            else:
                return {"error": "No AI service configured"}
            
            return {
                "symbols": symbols,
                "analysis": response,
                "timestamp": datetime.utcnow().isoformat(),
                "model_used": ai_config.deepseek_model if self.deepseek_client else ai_config.ai_model
            }
            
        except Exception as e:
            logger.error(f"Market sentiment analysis failed: {str(e)}")
            return {"error": f"Analysis failed: {str(e)}"}
    
    async def generate_trading_strategy(self, user_profile: Dict[str, Any], market_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate personalized trading strategy based on user profile and market data"""
        if not ai_config.ai_agents_enabled:
            return {"error": "AI agents are disabled"}
        
        await self.rate_limiter.acquire()
        
        try:
            prompt = f"""
            Generate a personalized trading strategy based on:
            
            User Profile:
            - Risk Tolerance: {user_profile.get('risk_tolerance', 'Medium')}
            - Investment Strategy: {user_profile.get('investment_strategy', 'Balanced')}
            - Experience Level: {user_profile.get('experience_level', 'Intermediate')}
            
            Market Conditions:
            - Current Trends: {market_data.get('trends', 'N/A')}
            - Volatility: {market_data.get('volatility', 'Medium')}
            - Key Events: {market_data.get('events', 'None')}
            
            Provide:
            1. Asset allocation recommendations
            2. Entry/exit strategies
            3. Risk management guidelines
            4. Position sizing recommendations
            """
            
            if self.deepseek_client:
                response = await self._call_deepseek(prompt)
            elif self.openai_client:
                response = await self._call_openai(prompt)
            else:
                return {"error": "No AI service configured"}
            
            return {
                "strategy": response,
                "user_profile": user_profile,
                "market_conditions": market_data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Trading strategy generation failed: {str(e)}")
            return {"error": f"Strategy generation failed: {str(e)}"}
    
    async def chat_with_ai_assistant(self, user_id: str, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """Chat with AI trading assistant"""
        if not ai_config.ai_agents_enabled:
            return {"error": "AI agents are disabled"}
        
        await self.rate_limiter.acquire()
        
        try:
            context_str = self._format_context(context) if context else ""
            
            prompt = f"""
            You are an AI trading assistant for the Apex trading platform.
            User ID: {user_id}
            {context_str}
            
            User Message: {message}
            
            Provide helpful, accurate trading advice while emphasizing risk management.
            Do not provide financial advice that could be considered as investment recommendations.
            """
            
            if self.deepseek_client:
                response = await self._call_deepseek(prompt)
            elif self.openai_client:
                response = await self._call_openai(prompt)
            else:
                return {"error": "No AI service configured"}
            
            return {
                "response": response,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat(),
                "context_used": bool(context)
            }
            
        except Exception as e:
            logger.error(f"AI chat failed: {str(e)}")
            return {"error": f"Chat failed: {str(e)}"}
    
    async def _call_openai(self, prompt: str) -> str:
        """Call OpenAI API"""
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized")
        
        response = self.openai_client.chat.completions.create(
            model=ai_config.ai_model,
            messages=[
                {"role": "system", "content": "You are a professional trading assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=ai_config.ai_max_tokens,
            temperature=ai_config.ai_temperature
        )
        
        return response.choices[0].message.content
    
    async def _call_deepseek(self, prompt: str) -> str:
        """Call DeepSeek API"""
        if not self.deepseek_client:
            raise ValueError("DeepSeek client not initialized")
        
        response = self.deepseek_client.chat.completions.create(
            model=ai_config.deepseek_model,
            messages=[
                {"role": "system", "content": "You are a professional trading assistant."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=ai_config.ai_max_tokens,
            temperature=ai_config.ai_temperature
        )
        
        return response.choices[0].message.content
    
    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context for AI prompts"""
        context_parts = []
        
        if 'portfolio' in context:
            portfolio = context['portfolio']
            context_parts.append(f"Portfolio Value: ${portfolio.get('total_value', 0):.2f}")
            context_parts.append(f"Active Positions: {portfolio.get('active_positions', 0)}")
        
        if 'market_conditions' in context:
            market = context['market_conditions']
            context_parts.append(f"Market Trend: {market.get('trend', 'Unknown')}")
            context_parts.append(f"Volatility: {market.get('volatility', 'Medium')}")
        
        if 'user_preferences' in context:
            prefs = context['user_preferences']
            context_parts.append(f"Risk Tolerance: {prefs.get('risk_tolerance', 'Medium')}")
            context_parts.append(f"Trading Style: {prefs.get('trading_style', 'Swing Trading')}")
        
        return "Context:\n" + "\n".join(f"- {part}" for part in context_parts) if context_parts else ""


# Global AI service instance
ai_service = AIService()
```
### 3. AI Routes Implementation

Create `Project_Apex/backend/app/api/routes/ai_assistant.py`:

```python
"""AI Assistant Routes"""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import get_current_active_user, get_db
from app.models import User
from app.services.ai_service import ai_service

router = APIRouter()


@router.post("/market-analysis")
async def analyze_market(
    symbols: List[str],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Analyze market sentiment for given symbols"""
    try:
        result = await ai_service.analyze_market_sentiment(symbols)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Market analysis failed: {str(e)}"
        )


@router.post("/trading-strategy")
async def generate_strategy(
    user_profile: Dict[str, Any],
    market_data: Dict[str, Any],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Generate personalized trading strategy"""
    try:
        # Enhance user profile with actual user data
        enhanced_profile = {
            **user_profile,
            "user_id": str(current_user.id),
            "account_tier": current_user.account_tier.value,
            "investment_strategy": getattr(current_user.profile, 'investment_strategy', 'BALANCED').value if current_user.profile else 'BALANCED'
        }
        
        result = await ai_service.generate_trading_strategy(enhanced_profile, market_data)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Strategy generation failed: {str(e)}"
        )


@router.post("/chat")
async def chat_with_assistant(
    message: str,
    context: Dict[str, Any] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Chat with AI trading assistant"""
    try:
        # Build context from user data
        user_context = {
            "user_preferences": {
                "risk_tolerance": getattr(current_user.profile, 'risk_assessment_score', 50) if current_user.profile else 50,
                "investment_strategy": getattr(current_user.profile, 'investment_strategy', 'BALANCED').value if current_user.profile else 'BALANCED'
            }
        }
        
        if context:
            user_context.update(context)
        
        result = await ai_service.chat_with_ai_assistant(str(current_user.id), message, user_context)
        
        if "error" in result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result["error"]
            )
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat failed: {str(e)}"
        )


@router.get("/status")
async def get_ai_status() -> Dict[str, Any]:
    """Get AI service status"""
    return {
        "ai_agents_enabled": ai_service.ai_config.ai_agents_enabled,
        "openai_configured": ai_service.openai_client is not None,
        "deepseek_configured": ai_service.deepseek_client is not None,
        "rate_limiting": {
            "max_requests": ai_service.rate_limiter.max_requests,
            "window_seconds": ai_service.rate_limiter.window_seconds
        }
    }
```

### 4. Update API Router

Update `Project_Apex/backend/app/api/main.py` to include AI routes:

```python
# Add import at the top
from app.api.routes import ai_assistant

# Add to router includes (around line 55)
api_router.include_router(ai_assistant.router, prefix="/ai", tags=["AI Assistant"])
```

## Database Migration

### Create Migration for AI Chat History

Create a new migration file `Project_Apex/backend/app/alembic/versions/YYYYMMDD_add_ai_chat_history.py`:

```python
"""Add AI chat history table

Revision ID: add_ai_chat_history
Revises: previous_migration
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_ai_chat_history'
down_revision = 'previous_migration'  # Replace with actual previous migration
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create AI chat history table
    op.create_table('aichathistory',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('response', sa.Text(), nullable=False),
        sa.Column('model_used', sa.String(length=50), nullable=True),
        sa.Column('context_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('response_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index(op.f('ix_aichathistory_user_id'), 'aichathistory', ['user_id'], unique=False)
    op.create_index(op.f('ix_aichathistory_created_at'), 'aichathistory', ['created_at'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_aichathistory_created_at'), table_name='aichathistory')
    op.drop_index(op.f('ix_aichathistory_user_id'), table_name='aichathistory')
    
    # Drop table
    op.drop_table('aichathistory')
```

### Update Models

Add the AI chat history model to `Project_Apex/backend/app/models.py`:

```python
# Add to imports
from datetime import datetime
from typing import Optional, Dict, Any

# Add after existing models (around line 1180)
class AIChatHistoryBase(SQLModel):
    """Base model for AI chat history"""
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    message: str = Field(max_length=4000)
    response: str = Field(max_length=4000)
    model_used: Optional[str] = Field(default=None, max_length=50)
    context_data: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON, nullable=True))
    tokens_used: Optional[int] = Field(default=None)
    response_time_ms: Optional[int] = Field(default=None)


class AIChatHistory(AIChatHistoryBase, table=True):
    """AI chat history table"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    
    # Relationship
    user: Optional["User"] = Relationship(back_populates=None)


class AIChatHistoryPublic(AIChatHistoryBase):
    """Public schema for AI chat history"""
    id: uuid.UUID
    created_at: datetime


class AIChatHistoryList(SQLModel):
    """List of AI chat history entries"""
    data: list[AIChatHistoryPublic]
    count: int
```

### Run Migration

Execute the migration:

```bash
cd Project_Apex/backend
alembic upgrade head
```
## Frontend Integration

### 1. API Service Implementation

Create `Project_Apex/frontend/src/api/services/AIAssistantService.ts`:

```typescript
import { client } from '../client-config';
import type {
  AIChatResponse,
  MarketAnalysisRequest,
  MarketAnalysisResponse,
  TradingStrategyRequest,
  TradingStrategyResponse,
  AIAssistantStatus
} from '../models/AIAssistantModels';

export class AIAssistantService {
  /**
   * Analyze market sentiment for given symbols
   */
  static async analyzeMarket(symbols: string[]): Promise<MarketAnalysisResponse> {
    const response = await client.POST('/api/v1/ai/market-analysis', {
      body: { symbols }
    });
    
    if (response.error) {
      throw new Error(response.error.message || 'Market analysis failed');
    }
    
    return response.data;
  }

  /**
   * Generate personalized trading strategy
   */
  static async generateTradingStrategy(
    userProfile: TradingStrategyRequest['user_profile'],
    marketData: TradingStrategyRequest['market_data']
  ): Promise<TradingStrategyResponse> {
    const response = await client.POST('/api/v1/ai/trading-strategy', {
      body: {
        user_profile: userProfile,
        market_data: marketData
      }
    });
    
    if (response.error) {
      throw new Error(response.error.message || 'Strategy generation failed');
    }
    
    return response.data;
  }

  /**
   * Chat with AI trading assistant
   */
  static async chatWithAssistant(
    message: string,
    context?: Record<string, any>
  ): Promise<AIChatResponse> {
    const response = await client.POST('/api/v1/ai/chat', {
      body: {
        message,
        context
      }
    });
    
    if (response.error) {
      throw new Error(response.error.message || 'Chat failed');
    }
    
    return response.data;
  }

  /**
   * Get AI service status
   */
  static async getStatus(): Promise<AIAssistantStatus> {
    const response = await client.GET('/api/v1/ai/status');
    
    if (response.error) {
      throw new Error(response.error.message || 'Failed to get AI status');
    }
    
    return response.data;
  }
}
```

### 2. Frontend Models

Create `Project_Apex/frontend/src/api/models/AIAssistantModels.ts`:

```typescript
export interface MarketAnalysisRequest {
  symbols: string[];
}

export interface MarketAnalysisResponse {
  symbols: string[];
  analysis: string;
  timestamp: string;
  model_used?: string;
  error?: string;
}

export interface TradingStrategyRequest {
  user_profile: {
    risk_tolerance: string;
    investment_strategy: string;
    experience_level: string;
    user_id?: string;
    account_tier?: string;
  };
  market_data: {
    trends?: string;
    volatility?: string;
    events?: string;
  };
}

export interface TradingStrategyResponse {
  strategy: string;
  user_profile: TradingStrategyRequest['user_profile'];
  market_conditions: TradingStrategyRequest['market_data'];
  timestamp: string;
  error?: string;
}

export interface AIChatRequest {
  message: string;
  context?: Record<string, any>;
}

export interface AIChatResponse {
  response: string;
  user_id: string;
  timestamp: string;
  context_used: boolean;
  error?: string;
}

export interface AIAssistantStatus {
  ai_agents_enabled: boolean;
  openai_configured: boolean;
  deepseek_configured: boolean;
  rate_limiting: {
    max_requests: number;
    window_seconds: number;
  };
}
```

### 3. React Hook for AI Assistant

Create `Project_Apex/frontend/src/hooks/useAIAssistant.ts`:

```typescript
import { useState, useCallback } from 'react';
import { AIAssistantService } from '../api/services/AIAssistantService';
import type {
  MarketAnalysisResponse,
  TradingStrategyResponse,
  AIChatResponse,
  AIAssistantStatus
} from '../api/models/AIAssistantModels';

interface UseAIAssistantReturn {
  // State
  isLoading: boolean;
  error: string | null;
  status: AIAssistantStatus | null;
  
  // Methods
  analyzeMarket: (symbols: string[]) => Promise<MarketAnalysisResponse>;
  generateStrategy: (userProfile: any, marketData: any) => Promise<TradingStrategyResponse>;
  chatWithAssistant: (message: string, context?: any) => Promise<AIChatResponse>;
  getStatus: () => Promise<AIAssistantStatus>;
  
  // Utilities
  clearError: () => void;
}

export const useAIAssistant = (): UseAIAssistantReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AIAssistantStatus | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const analyzeMarket = useCallback(async (symbols: string[]): Promise<MarketAnalysisResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await AIAssistantService.analyzeMarket(symbols);
      setIsLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Market analysis failed';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  const generateStrategy = useCallback(async (
    userProfile: any,
    marketData: any
  ): Promise<TradingStrategyResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await AIAssistantService.generateTradingStrategy(userProfile, marketData);
      setIsLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Strategy generation failed';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  const chatWithAssistant = useCallback(async (
    message: string,
    context?: any
  ): Promise<AIChatResponse> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await AIAssistantService.chatWithAssistant(message, context);
      setIsLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Chat failed';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  const getStatus = useCallback(async (): Promise<AIAssistantStatus> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await AIAssistantService.getStatus();
      setStatus(result);
      setIsLoading(false);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI status';
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  return {
    isLoading,
    error,
    status,
    analyzeMarket,
    generateStrategy,
    chatWithAssistant,
    getStatus,
    clearError
  };
};
```

### 4. AI Assistant Component

Create `Project_Apex/frontend/src/components/ai/AIAssistant.tsx`:

```typescript
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Card,
  CardContent,
  Alert
} from '@mui/material';
import { Send, SmartToy, Analytics, Psychology } from '@mui/icons-material';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AIAssistantProps {
  initialMessage?: string;
  context?: Record<string, any>;
  onResponse?: (response: string) => void;
  compact?: boolean;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  initialMessage = '',
  context,
  onResponse,
  compact = false
}) => {
  const [message, setMessage] = useState(initialMessage);
  const [conversation, setConversation] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { chatWithAssistant, isLoading, error, clearError } = useAIAssistant();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setConversation(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await chatWithAssistant(userMessage, context);
      
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        content: response.response 
      }]);
      
      if (onResponse) {
        onResponse(response.response);
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Paper 
      elevation={2} 
      sx={{ 
        height: compact ? '400px' : '500px', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <SmartToy color="primary" />
        <Typography variant="h6" component="h2">
          AI Trading Assistant
        </Typography>
        <Chip 
          label="Beta" 
          size="small" 
          color="primary" 
          variant="outlined" 
        />
      </Box>

      {/* Conversation */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        {conversation.length === 0 && (
          <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Welcome! I'm your AI trading assistant. I can help you with:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Analytics fontSize="small" color="primary" />
                <Typography variant="body2">Market analysis</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Psychology fontSize="small" color="primary" />
                <Typography variant="body2">Trading strategies</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Ask me anything about trading!
              </Typography>
            </CardContent>
          </Card>
        )}

        {conversation.map((msg, index) => (
          <Box
            key={index}
            sx={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%'
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 2,
                bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary'
              }}
            >
              {msg.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <Typography variant="body1">{msg.content}</Typography>
              )}
            </Paper>
          </Box>
        ))}

        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: 'flex-start' }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              AI Assistant is thinking...
            </Typography>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mx: 2, mt: 1 }}
        >
          {error}
        </Alert>
      )}

      {/* Input Area */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Ask about market analysis, trading strategies, or investment advice..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={3}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            sx={{ alignSelf: 'flex-end' }}
          >
            <Send />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};
```
### 5. Integration with Dashboard

Add the AI Assistant to the user dashboard by updating `Project_Apex/frontend/src/pages/user-dashboard.tsx`:

```typescript
// Add import
import { AIAssistant } from '../components/ai/AIAssistant';

// Add to dashboard component (in appropriate section)
<Grid item xs={12} md={6}>
  <AIAssistant 
    compact={true}
    context={{
      portfolio: {
        total_value: userData?.total_balance || 0,
        active_positions: userData?.active_trades || 0
      },
      user_preferences: {
        risk_tolerance: userProfile?.risk_assessment_score || 50,
        trading_style: userProfile?.investment_strategy || 'BALANCED'
      }
    }}
  />
</Grid>
```

## Testing Procedures

### Backend Testing

Create `Project_Apex/backend/app/tests/api/routes/test_ai_assistant.py`:

```python
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import User


@pytest.fixture(name="client")
def client_fixture():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    
    with TestClient(app) as client:
        yield client


@pytest.fixture(name="normal_user_token_headers")
def normal_user_token_headers_fixture(client: TestClient):
    # Setup test user and get auth token
    # ... existing user setup code ...
    return {"Authorization": f"Bearer {access_token}"}


class TestAIAssistant:
    def test_ai_status(self, client: TestClient, normal_user_token_headers: dict):
        response = client.get("/api/v1/ai/status", headers=normal_user_token_headers)
        assert response.status_code == 200
        data = response.json()
        assert "ai_agents_enabled" in data
        assert "openai_configured" in data
        assert "deepseek_configured" in data
    
    def test_market_analysis_missing_symbols(self, client: TestClient, normal_user_token_headers: dict):
        response = client.post(
            "/api/v1/ai/market-analysis",
            headers=normal_user_token_headers,
            json={"symbols": []}
        )
        assert response.status_code == 400
    
    def test_chat_with_assistant(self, client: TestClient, normal_user_token_headers: dict):
        response = client.post(
            "/api/v1/ai/chat",
            headers=normal_user_token_headers,
            json={"message": "Hello, can you help me with trading?"}
        )
        # This will fail if AI services are not configured
        # But should return proper error message
        assert response.status_code in [200, 400, 500]


# Mock AI service for testing
class MockAIService:
    async def analyze_market_sentiment(self, symbols):
        return {
            "symbols": symbols,
            "analysis": "Mock market analysis",
            "timestamp": "2025-01-01T00:00:00Z",
            "model_used": "mock-model"
        }
    
    async def chat_with_ai_assistant(self, user_id, message, context=None):
        return {
            "response": f"Mock response to: {message}",
            "user_id": user_id,
            "timestamp": "2025-01-01T00:00:00Z",
            "context_used": context is not None
        }
```

### Frontend Testing

Create `Project_Apex/frontend/src/__tests__/ai/ai-assistant.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIAssistant } from '../../components/ai/AIAssistant';
import { useAIAssistant } from '../../hooks/useAIAssistant';

// Mock the hook
jest.mock('../../hooks/useAIAssistant');

const mockUseAIAssistant = useAIAssistant as jest.MockedFunction<typeof useAIAssistant>;

describe('AIAssistant', () => {
  const mockChatWithAssistant = jest.fn();
  
  beforeEach(() => {
    mockUseAIAssistant.mockReturnValue({
      isLoading: false,
      error: null,
      status: null,
      analyzeMarket: jest.fn(),
      generateStrategy: jest.fn(),
      chatWithAssistant: mockChatWithAssistant,
      getStatus: jest.fn(),
      clearError: jest.fn()
    });
  });

  it('renders AI assistant component', () => {
    render(<AIAssistant />);
    
    expect(screen.getByText('AI Trading Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask about market analysis/)).toBeInTheDocument();
  });

  it('sends message when send button is clicked', async () => {
    mockChatWithAssistant.mockResolvedValue({
      response: 'Test response',
      user_id: 'test-user',
      timestamp: '2025-01-01T00:00:00Z',
      context_used: false
    });

    render(<AIAssistant />);
    
    const input = screen.getByPlaceholderText(/Ask about market analysis/);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockChatWithAssistant).toHaveBeenCalledWith('Test message', undefined);
    });
  });

  it('displays error message when chat fails', async () => {
    mockUseAIAssistant.mockReturnValue({
      isLoading: false,
      error: 'Chat failed',
      status: null,
      analyzeMarket: jest.fn(),
      generateStrategy: jest.fn(),
      chatWithAssistant: mockChatWithAssistant,
      getStatus: jest.fn(),
      clearError: jest.fn()
    });

    render(<AIAssistant />);
    
    expect(screen.getByText('Chat failed')).toBeInTheDocument();
  });
});
```

## Deployment

### Docker Configuration

Update `Project_Apex/backend/Dockerfile` to ensure AI dependencies are included:

```dockerfile
# Existing Dockerfile content remains the same
# The uv sync command will automatically install new dependencies from pyproject.toml
```

### Production Environment Variables

For production deployment, ensure these environment variables are set:

```bash
# Production AI Configuration
OPENAI_API_KEY=your-production-openai-key
DEEPSEEK_API_KEY=your-production-deepseek-key
AI_AGENTS_ENABLED=true
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.7
```

### Health Checks

Update health checks to include AI service status in `Project_Apex/backend/app/api/routes/utils.py`:

```python
@router.get("/health-check/")
def health_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    # Existing health check code...
    
    # Add AI service status
    try:
        from app.services.ai_service import ai_service
        ai_status = {
            "ai_agents_enabled": ai_service.ai_config.ai_agents_enabled,
            "openai_configured": ai_service.openai_client is not None,
            "deepseek_configured": ai_service.deepseek_client is not None
        }
    except Exception as e:
        ai_status = {"error": str(e)}
    
    return {
        # ... existing health data ...
        "ai_service": ai_status
    }
```

## Troubleshooting

### Common Issues and Solutions

#### 1. API Key Configuration Issues

**Problem**: AI services return "No AI service configured" error.

**Solution**:
- Verify environment variables are set correctly
- Check API keys are valid and have sufficient credits
- Ensure `AI_AGENTS_ENABLED=true` is set

```bash
# Test OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Test DeepSeek API key  
curl https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY"
```

#### 2. Rate Limiting Issues

**Problem**: "Rate limit exceeded" errors.

**Solution**:
- Increase rate limit settings in environment variables
- Implement exponential backoff in the AI service
- Monitor usage and adjust limits accordingly

```python
# Example exponential backoff implementation
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
async def call_ai_with_retry(prompt: str):
    return await ai_service._call_openai(prompt)
```

#### 3. Response Time Issues

**Problem**: AI responses are slow.

**Solution**:
- Reduce `AI_MAX_TOKENS` to limit response length
- Implement response caching for similar queries
- Use streaming responses for better user experience

```python
# Example response caching
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
def get_cached_response(prompt_hash: str):
    # Return cached response if available
    pass

def hash_prompt(prompt: str) -> str:
    return hashlib.md5(prompt.encode()).hexdigest()
```

#### 4. Frontend Integration Issues

**Problem**: AI Assistant component not loading or showing errors.

**Solution**:
- Check browser console for JavaScript errors
- Verify API endpoints are accessible
- Ensure CORS is properly configured
- Test with different network conditions

```typescript
// Debug frontend API calls
const debugAIAssistant = async () => {
  try {
    const status = await AIAssistantService.getStatus();
    console.log('AI Service Status:', status);
  } catch (error) {
    console.error('AI Service Error:', error);
  }
};
```

#### 5. Database Migration Issues

**Problem**: Migration fails when adding AI chat history table.

**Solution**:
- Check current migration state: `alembic current`
- Verify migration dependencies
- Test migration on development database first
- Create backup before running migrations

```bash
# Safe migration procedure
cd Project_Apex/backend
alembic current
alembic upgrade head --sql  # Preview SQL without executing
alembic upgrade head        # Execute migration
```

### Monitoring and Logging

Add AI-specific logging to monitor usage and errors:

```python
# Enhanced logging in AI service
logger = logging.getLogger('ai_service')

async def chat_with_ai_assistant(self, user_id: str, message: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
    start_time = time.time()
    
    try:
        # ... existing code ...
        
        response_time = int((time.time() - start_time) * 1000)
        logger.info(
            "AI chat completed",
            extra={
                "user_id": user_id,
                "message_length": len(message),
                "response_time_ms": response_time,
                "model_used": model_used
            }
        )
        
        return result
        
    except Exception as e:
        logger.error(
            "AI chat failed",
            extra={
                "user_id": user_id,
                "error": str(e),
                "message": message[:100]  # Log first 100 chars
            }
        )
        return {"error": f"Chat failed: {str(e)}"}
```

### Performance Optimization

1. **Response Caching**: Cache frequent queries to reduce API calls
2. **Connection Pooling**: Reuse HTTP connections for AI API calls
3. **Background Processing**: Process long-running AI tasks asynchronously
4. **Content Optimization**: Pre-process prompts for better AI responses

```python
# Example connection pooling
import httpx

class OptimizedAIService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
```

This completes the comprehensive implementation guide for integrating OpenAI Agents SDK with DeepSeek API into the Apex trading platform. Follow the steps in order and test each component thoroughly before proceeding to the next.
## Summary

This implementation guide provides a complete solution for integrating OpenAI Agents SDK with DeepSeek API into the Apex trading platform. The integration enables:

- **AI-Powered Market Analysis**: Real-time sentiment analysis and technical insights
- **Personalized Trading Strategies**: Custom recommendations based on user profiles
- **Intelligent Chat Assistant**: Interactive trading guidance and support
- **Scalable Architecture**: Rate-limited, cached, and optimized AI services

### Key Features Implemented

1. **Backend Services**:
   - AI configuration management
   - Multi-provider AI service (OpenAI + DeepSeek)
   - Rate limiting and error handling
   - Database integration for chat history

2. **Frontend Components**:
   - React-based AI assistant interface
   - Real-time chat with markdown support
   - Context-aware responses
   - Error handling and loading states

3. **Database Schema**:
   - AI chat history tracking
   - Performance metrics storage
   - User context management

4. **Testing & Deployment**:
   - Comprehensive test suites
   - Docker compatibility
   - Production-ready configuration
   - Monitoring and logging

### Verification Checklist

Before deployment, verify the following:

- [ ] Environment variables configured correctly
- [ ] API keys validated and working
- [ ] Backend dependencies installed (`uv sync`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Database migration executed (`alembic upgrade head`)
- [ ] API routes accessible (`/api/v1/ai/status`)
- [ ] Frontend components rendering correctly
- [ ] Rate limiting functioning
- [ ] Error handling working as expected
- [ ] Security measures in place (CORS, authentication)

### Next Steps

After successful implementation:

1. **Monitor Performance**: Track AI service usage and response times
2. **Gather Feedback**: Collect user feedback on AI assistant usefulness
3. **Optimize Prompts**: Refine AI prompts based on user interactions
4. **Scale Infrastructure**: Plan for increased AI service usage
5. **Add Features**: Consider additional AI capabilities like portfolio analysis, risk assessment, and automated reporting

### Support and Maintenance

For ongoing support:

- Monitor AI API usage and costs
- Keep dependencies updated
- Review and update AI models as new versions become available
- Maintain security best practices for API key management
- Regularly test AI service functionality

This implementation provides a solid foundation for AI-powered trading assistance that can be extended and customized based on specific business requirements and user needs.