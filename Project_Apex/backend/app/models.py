import uuid
from datetime import date, datetime
from enum import Enum
from typing import Optional, Any, cast

from pydantic import AliasChoices, ConfigDict, EmailStr
from sqlalchemy import Column, DateTime, Integer, JSON, Numeric
from sqlalchemy import Enum as SAEnum
from sqlalchemy.ext.hybrid import hybrid_property
from sqlmodel import Field, Relationship, SQLModel


from .core.time import utc_now
class UserRole(str, Enum):
    ADMIN = "ADMIN"
    USER = "USER"



class KycStatus(str, Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"



class KycDocumentType(str, Enum):
    PASSPORT = "passport"
    DRIVERS_LICENSE = "drivers_license"
    NATIONAL_ID = "national_id"
    PROOF_OF_ADDRESS = "proof_of_address"


class AccountTier(str, Enum):
    BASIC = "BASIC"
    STANDARD = "STANDARD"
    PREMIUM = "PREMIUM"
    VIP = "VIP"


class InvestmentStrategy(str, Enum):
    ACTIVE_PORTFOLIO = "ACTIVE_PORTFOLIO"
    LONG_TERM_GROWTH = "LONG_TERM_GROWTH"
    BALANCED = "BALANCED"



class TransactionType(str, Enum):
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    ADJUSTMENT = "ADJUSTMENT"
    ROI = "ROI"
    LONG_TERM_ROI = "LONG_TERM_ROI"


class ROISource(str, Enum):
    ADMIN_PUSH = "ADMIN_PUSH"
    AUTO_COMPOUND = "AUTO_COMPOUND"
    TRADER_EVENT = "TRADER_EVENT"
    ADMIN_REVERSAL = "ADMIN_REVERSAL"



class TransactionStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"



class TradeSide(str, Enum):
    BUY = "BUY"
    SELL = "SELL"



class TradeStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class TradeSimulationStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"


class RiskTolerance(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class CopyStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    STOPPED = "STOPPED"


class LongTermPlanTier(str, Enum):
    FOUNDATION = "FOUNDATION"
    GROWTH = "GROWTH"
    ELITE = "ELITE"

class ExecutionEventType(str, Enum):
    TRADER_SIMULATION = "TRADER_SIMULATION"
    FOLLOWER_PROFIT = "FOLLOWER_PROFIT"
    MANUAL_ADJUSTMENT = "MANUAL_ADJUSTMENT"
    # Added for long-term maturity automation and system operations
    INVESTMENT_MATURED = "INVESTMENT_MATURED"
    SYSTEM_OPERATION = "SYSTEM_OPERATION"


class WithdrawalSource(str, Enum):
    COPY_TRADING_WALLET = "COPY_TRADING_WALLET"
    ACTIVE_ALLOCATION = "ACTIVE_ALLOCATION"
    LONG_TERM_WALLET = "LONG_TERM_WALLET"


class LedgerType(str, Enum):
    """Types of ledger entries for financial audit trail"""
    DEPOSIT = "DEPOSIT"
    WITHDRAWAL = "WITHDRAWAL"
    COPY_TRANSFER_IN = "COPY_TRANSFER_IN"
    COPY_TRANSFER_OUT = "COPY_TRANSFER_OUT"
    LONG_TERM_TRANSFER_IN = "LONG_TERM_TRANSFER_IN"
    LONG_TERM_TRANSFER_OUT = "LONG_TERM_TRANSFER_OUT"
    ADJUSTMENT = "ADJUSTMENT"
    ROI_CREDIT = "ROI_CREDIT"
    FEE_DEBIT = "FEE_DEBIT"


class LedgerStatus(str, Enum):
    """Status of ledger entries"""
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class AdminActionType(str, Enum):
    """Types of admin balance adjustment actions"""
    ADD_FUNDS = "ADD_FUNDS"
    DEDUCT_FUNDS = "DEDUCT_FUNDS"
    REVERSE_TRANSACTION = "REVERSE_TRANSACTION"
    FORCE_COMPLETE_WITHDRAWAL = "FORCE_COMPLETE_WITHDRAWAL"
    MANUAL_CORRECTION = "MANUAL_CORRECTION"



class UserBase(SQLModel):
    email: EmailStr = Field(unique=True, index=True, max_length=255)
    is_active: bool = True
    is_superuser: bool = False
    full_name: str | None = Field(default=None, max_length=255)


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=40)
    role: UserRole = UserRole.USER
    account_tier: AccountTier = AccountTier.BASIC
    kyc_status: KycStatus = KycStatus.PENDING
    kyc_notes: str | None = Field(default=None, max_length=255)


class UserRegister(SQLModel):
    email: EmailStr = Field(max_length=255)
    password: str = Field(min_length=8, max_length=40)
    full_name: str | None = Field(default=None, max_length=255)
    website: str | None = Field(default=None, max_length=255)  # Honeypot field


class UserUpdate(UserBase):
    email: EmailStr | None = Field(default=None, max_length=255)  # type: ignore
    password: str | None = Field(default=None, min_length=8, max_length=40)
    role: UserRole | None = None
    account_tier: AccountTier | None = None
    kyc_status: KycStatus | None = None
    kyc_notes: str | None = Field(default=None, max_length=255)


class UserUpdateMe(SQLModel):
    full_name: str | None = Field(default=None, max_length=255)
    email: EmailStr | None = Field(default=None, max_length=255)


class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)


class User(UserBase, table=True):
    # Instruct Pydantic to ignore SQLAlchemy hybrid_property attributes
    # Cast to satisfy SQLModel's expected config type for static type checkers
    model_config = cast(Any, ConfigDict(ignored_types=(hybrid_property,)))  # pyright: ignore[reportAssignmentType]
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    hashed_password: str
    balance: float = Field(default=0.0)  # Legacy field - will be migrated to wallet_balance
    wallet_balance: float = Field(default=0.0)
    copy_trading_balance: float = Field(default=0.0)
    long_term_balance: float = Field(default=0.0)
    is_locked: bool = Field(default=False)
    session_locked_until: datetime | None = Field(default=None)
    role: UserRole = Field(
        sa_column=Column(SAEnum(UserRole, name="userrole"), nullable=False, server_default=UserRole.USER.value),
        default=UserRole.USER,
    )
    account_tier: AccountTier = Field(
        sa_column=Column(SAEnum(AccountTier, name="accounttier"), nullable=False, server_default=AccountTier.BASIC.value),
        default=AccountTier.BASIC,
    )
    kyc_status: KycStatus = Field(
        sa_column=Column(SAEnum(KycStatus, name="kycstatus"), nullable=False, server_default=KycStatus.PENDING.value),
        default=KycStatus.PENDING,
    )
    kyc_submitted_at: datetime | None = Field(default=None)
    kyc_approved_at: datetime | None = Field(default=None)
    kyc_verified_at: datetime | None = Field(default=None)
    kyc_rejected_reason: str | None = Field(default=None)
    kyc_notes: str | None = Field(default=None, max_length=255)
    last_login_at: datetime | None = Field(default=None)
    oauth_provider: str | None = Field(default=None, max_length=50)
    oauth_provider_id: str | None = Field(default=None, max_length=255)
    oauth_account_email: str | None = Field(default=None, max_length=255)
    refresh_token: str | None = Field(default=None, max_length=512)
    refresh_token_expires_at: datetime | None = Field(default=None)
    profile_picture_url: str | None = Field(default=None, max_length=1024)
    # Email verification
    email_verified: bool = Field(default=False)
    email_verified_at: datetime | None = Field(default=None)
    failed_login_attempts: int = Field(default=0)
    account_locked_until: datetime | None = Field(default=None)
    # Notification preferences
    browser_notifications_enabled: bool = Field(default=False)
    email_notifications_enabled: bool = Field(default=True)
    profile: Optional["UserProfile"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"},
    )
    kyc_documents: list["KycDocument"] = Relationship(
        back_populates="user",
        cascade_delete=True,
        sa_relationship_kwargs={"foreign_keys": "[KycDocument.user_id]"}
    )
    items: list["Item"] = Relationship(back_populates="owner", cascade_delete=True)
    transactions: list["Transaction"] = Relationship(
        back_populates="user",
        cascade_delete=True,
        sa_relationship_kwargs={"foreign_keys": "[Transaction.user_id]"}
    )
    trades: list["Trade"] = Relationship(back_populates="user", cascade_delete=True)
    # Relationships
    daily_performance: list["DailyPerformance"] = Relationship(back_populates="user", cascade_delete=True)
    account_summaries: list["AccountSummary"] = Relationship(back_populates="user", cascade_delete=True)
    # Trader/copy-trading and progression relationships
    trader_profile: Optional["TraderProfile"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"},
    )
    user_trader_copies: list["UserTraderCopy"] = Relationship(back_populates="user", cascade_delete=True)
    execution_events: list["ExecutionEvent"] = Relationship(back_populates="user", cascade_delete=True)
    balance_transfers: list["BalanceTransfer"] = Relationship(back_populates="user", cascade_delete=True)
    long_term_investments: list["UserLongTermInvestment"] = Relationship(back_populates="user", cascade_delete=True)
    user_milestones: list["UserMilestone"] = Relationship(back_populates="user", cascade_delete=True)
    user_level: Optional["UserLevel"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"},
    )
    # New wallet one-to-one relationships
    copy_trading_wallet: Optional["CopyTradingWallet"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"},
    )
    long_term_wallet: Optional["LongTermWallet"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"},
    )
    notifications: list["Notification"] = Relationship(back_populates="user", cascade_delete=True)

    def get_overall_equity(self) -> float:
        """Calculate overall equity as the sum of wallet and copy trading balances."""
        return (self.wallet_balance or 0) + (self.copy_trading_balance or 0) + (self.long_term_balance or 0)

    # Expose wallet balances via properties for API schemas
    @hybrid_property
    def copy_trading_wallet_balance(self) -> float:
        wallet = getattr(self, "copy_trading_wallet", None)
        try:
            return float(wallet.balance) if wallet and wallet.balance is not None else 0.0
        except Exception:
            return 0.0

    @hybrid_property
    def long_term_wallet_balance(self) -> float:
        wallet = getattr(self, "long_term_wallet", None)
        try:
            return float(wallet.balance) if wallet and wallet.balance is not None else 0.0
        except Exception:
            return 0.0

    @hybrid_property
    def allocated_copy_balance(self) -> float:
        """Amount currently allocated to copy trading positions."""
        try:
            return float(self.copy_trading_balance or 0.0)
        except Exception:
            return 0.0

    @hybrid_property
    def total_balance(self) -> float:
        """Aggregate balance across all wallets and allocations."""
        wallet = float(self.wallet_balance or 0.0)
        copy_wallet = float(self.copy_trading_wallet_balance or 0.0)
        long_term_wallet = float(self.long_term_wallet_balance or 0.0)
        allocated_copy = float(self.allocated_copy_balance or 0.0)
        return wallet + copy_wallet + long_term_wallet + allocated_copy

class UserPublic(UserBase):
    id: uuid.UUID
    balance: float
    wallet_balance: float
    copy_trading_balance: float
    long_term_balance: float
    # New wallet-backed balance fields
    copy_trading_wallet_balance: float
    long_term_wallet_balance: float
    profile_picture_url: str | None = None
    is_locked: bool
    session_locked_until: datetime | None
    role: UserRole
    account_tier: AccountTier
    kyc_status: KycStatus
    kyc_submitted_at: datetime | None
    kyc_approved_at: datetime | None
    kyc_verified_at: datetime | None
    kyc_rejected_reason: str | None
    kyc_notes: str | None
    email_verified: bool | None = None
    email_verified_at: datetime | None = None
    last_login_at: datetime | None


class UsersPublic(SQLModel):
    data: list[UserPublic]
    count: int


class CopyTradingWallet(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, nullable=False)
    balance: float = Field(
        default=0.0,
        sa_column=Column(Numeric(20, 2), nullable=False, server_default="0"),
    )
    user: "User" = Relationship(
        back_populates="copy_trading_wallet",
        sa_relationship_kwargs={"uselist": False},
    )


class LongTermWallet(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, nullable=False)
    balance: float = Field(
        default=0.0,
        sa_column=Column(Numeric(20, 2), nullable=False, server_default="0"),
    )
    user: "User" = Relationship(
        back_populates="long_term_wallet",
        sa_relationship_kwargs={"uselist": False},
    )


class UserProfileBase(SQLModel):
    legal_first_name: str | None = Field(default=None, max_length=100)
    legal_last_name: str | None = Field(default=None, max_length=100)
    date_of_birth: date | None = None
    phone_number: str | None = Field(default=None, max_length=20)
    address_line_1: str | None = Field(default=None)
    address_line_2: str | None = Field(default=None)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country: str | None = Field(default=None, max_length=100)
    tax_id_number: str | None = Field(default=None, max_length=50)
    occupation: str | None = Field(default=None, max_length=100)
    source_of_funds: str | None = Field(default=None, max_length=100)
    investment_strategy: InvestmentStrategy = Field(
        default=InvestmentStrategy.BALANCED,
        sa_column=Column(SAEnum(InvestmentStrategy, name="investmentstrategy"), nullable=False, server_default=InvestmentStrategy.BALANCED.value)
    )


class UserProfileCreate(UserProfileBase):
    user_id: uuid.UUID
    risk_assessment_score: int = Field(default=0, ge=0, le=100)


class UserProfileUpdate(UserProfileBase):
    risk_assessment_score: int | None = Field(default=None, ge=0, le=100)


class UserProfile(UserProfileBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, nullable=False)
    risk_assessment_score: int = Field(default=0, ge=0, le=100)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column_kwargs={"onupdate": utc_now},
    )
    user: "User" = Relationship(
        back_populates="profile",
        sa_relationship_kwargs={"uselist": False},
    )


class UserProfilePublic(UserProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    risk_assessment_score: int
    created_at: datetime
    updated_at: datetime


class UserProfilesPublic(SQLModel):
    data: list[UserProfilePublic]
    count: int


class KycDocument(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    document_type: KycDocumentType = Field(
        sa_column=Column(SAEnum(KycDocumentType, name="kycdocumenttype"), nullable=False)
    )
    front_image_url: str | None = Field(default=None)
    back_image_url: str | None = Field(default=None)
    verified: bool = Field(default=False)
    verified_by: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    verified_at: datetime | None = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)
    user: "User" = Relationship(
        back_populates="kyc_documents",
        sa_relationship_kwargs={"foreign_keys": "[KycDocument.user_id]"}
    )


class KycDocumentPublic(SQLModel):
    id: uuid.UUID
    user_id: uuid.UUID
    document_type: KycDocumentType
    front_image_url: str | None
    back_image_url: str | None
    verified: bool
    verified_by: uuid.UUID | None
    verified_at: datetime | None
    created_at: datetime


class KycDocumentsPublic(SQLModel):
    data: list[KycDocumentPublic]
    count: int



class ItemBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=255)


class ItemCreate(ItemBase):
    pass


class ItemUpdate(ItemBase):
    title: str | None = Field(default=None, min_length=1, max_length=255)  # type: ignore


class Item(ItemBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, ondelete="CASCADE")
    owner: User | None = Relationship(back_populates="items")


class ItemPublic(ItemBase):
    id: uuid.UUID
    owner_id: uuid.UUID


class ItemsPublic(SQLModel):
    data: list[ItemPublic]
    count: int


class TransactionBase(SQLModel):
    amount: float
    transaction_type: TransactionType = TransactionType.DEPOSIT
    status: TransactionStatus = TransactionStatus.PENDING
    description: str | None = Field(default=None, max_length=255)
    long_term_investment_id: uuid.UUID | None = None


class TransactionCreate(TransactionBase):
    user_id: uuid.UUID | None = None


class TransactionUpdate(SQLModel):
    amount: float | None = None
    transaction_type: TransactionType | None = None
    status: TransactionStatus | None = None
    description: str | None = Field(default=None, max_length=255)
    long_term_investment_id: uuid.UUID | None = None

class Transaction(TransactionBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=utc_now)
    executed_at: datetime | None = Field(default=None)
    # ROI-specific fields
    roi_percent: float | None = Field(default=None, nullable=True)
    symbol: str | None = Field(default=None, max_length=32, nullable=True)
    source: ROISource | None = Field(
        default=ROISource.ADMIN_PUSH,
        sa_column=Column(SAEnum(ROISource, name="roisource"), nullable=True)
    )
    pushed_by_admin_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", nullable=True)
    reversal_of: uuid.UUID | None = Field(default=None, foreign_key="transaction.id", nullable=True)
    withdrawal_source: WithdrawalSource | None = Field(
        default=None,
        sa_column=Column(SAEnum(WithdrawalSource, name="withdrawalsource"), nullable=True)
    )
    long_term_investment_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="userlongterminvestment.id",
        nullable=True,
    )
    # Crypto-specific fields for deposit/withdrawal
    crypto_network: str | None = Field(default=None, max_length=50, nullable=True)
    crypto_address: str | None = Field(default=None, max_length=100, nullable=True)
    crypto_coin: str | None = Field(default=None, max_length=20, nullable=True)
    crypto_amount: str | None = Field(default=None, max_length=50, nullable=True)
    crypto_memo: str | None = Field(default=None, max_length=100, nullable=True)
    payment_confirmed_by_user: bool = Field(default=False, nullable=False)
    payment_confirmed_at: datetime | None = Field(default=None, nullable=True)
    address_expires_at: datetime | None = Field(default=None, nullable=True)
    vat_amount: float | None = Field(default=None, nullable=True)
    user: "User" = Relationship(
        back_populates="transactions",
        sa_relationship_kwargs={"foreign_keys": "[Transaction.user_id]"}
    )


class TransactionPublic(TransactionBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    executed_at: datetime | None
    roi_percent: float | None = None
    symbol: str | None = None
    source: ROISource | None = None
    pushed_by_admin_id: uuid.UUID | None = None
    reversal_of: uuid.UUID | None = None
    withdrawal_source: WithdrawalSource | None = None
    # Crypto-specific fields
    crypto_network: str | None = None
    crypto_address: str | None = None
    crypto_coin: str | None = None
    crypto_amount: str | None = None
    crypto_memo: str | None = None
    payment_confirmed_by_user: bool = False
    payment_confirmed_at: datetime | None = None
    address_expires_at: datetime | None = None
    vat_amount: float | None = None


class TransactionsPublic(SQLModel):
    data: list[TransactionPublic]
    count: int


class TradeBase(SQLModel):
    symbol: str = Field(max_length=50)
    side: TradeSide = TradeSide.BUY
    entry_price: float
    exit_price: float | None = None
    volume: float = Field(gt=0)
    profit_loss: float | None = None
    status: TradeStatus = TradeStatus.OPEN
    opened_at: datetime = Field(default_factory=utc_now)
    closed_at: datetime | None = None
    notes: str | None = Field(default=None, max_length=255)


class TradeCreate(TradeBase):
    user_id: uuid.UUID | None = None


class TradeUpdate(TradeBase):
    symbol: str | None = None
    side: Optional[TradeSide] = None
    entry_price: float | None = None
    volume: float | None = None
    status: Optional[TradeStatus] = None


class Trade(TradeBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    user: "User" = Relationship(back_populates="trades")


class TradePublic(TradeBase):
    id: uuid.UUID


class TradesPublic(SQLModel):
    data: list[TradePublic]
    count: int


class DailyPerformanceBase(SQLModel):
    performance_date: date
    profit_loss: float


class DailyPerformanceCreate(DailyPerformanceBase):
    user_id: uuid.UUID | None = None


class DailyPerformance(DailyPerformanceBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    created_at: datetime = Field(default_factory=utc_now)
    user: "User" = Relationship(back_populates="daily_performance")


class DailyPerformancePublic(DailyPerformanceBase):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime


class DailyPerformanceCollection(SQLModel):
    data: list[DailyPerformancePublic]
    count: int


class AccountSummaryBase(SQLModel):
    total_deposits: float = 0.0
    total_withdrawals: float = 0.0
    net_profit: float = 0.0
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0


class AccountSummary(AccountSummaryBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, nullable=False)
    updated_at: datetime = Field(default_factory=utc_now)
    user: "User" = Relationship(back_populates="account_summaries", sa_relationship_kwargs={"uselist": False})


class AccountSummaryPublic(AccountSummaryBase):
    id: uuid.UUID
    user_id: uuid.UUID
    updated_at: datetime


# --- Additional domain models matching Alembic migrations and route/service usage ---


class Message(SQLModel):
    message: str


class TokenPayload(SQLModel):
    """JWT token payload model.

    At minimum we expect a subject (sub) that maps to the user id.
    Additional fields from the token will be tolerated and ignored.
    """
    sub: uuid.UUID


class Token(SQLModel):
    """Auth token response schema for login."""
    access_token: str
    token_type: str = "bearer"
    role: UserRole


class NewPassword(SQLModel):
    """Payload for resetting a password via token."""
    token: str
    new_password: str


class BalanceTransferStatus(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class TraderProfileBase(SQLModel):
    trading_strategy: str | None = Field(default=None, max_length=500)
    risk_tolerance: RiskTolerance = Field(
        default=RiskTolerance.MEDIUM,
        sa_column=Column(SAEnum(RiskTolerance, name="risktolerance"), nullable=False),
    )
    performance_metrics: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    is_public: bool = Field(default=False)
    copy_fee_percentage: float = Field(default=0.0)
    minimum_copy_amount: float = Field(default=0.0)
    total_copiers: int = Field(default=0)
    total_assets_under_copy: float = Field(default=0.0)
    average_monthly_return: float = Field(default=0.0)


class TraderProfileCreate(TraderProfileBase):
    user_id: uuid.UUID
    display_name: str = Field(max_length=255)
    trader_code: str | None = Field(default=None, max_length=16)


class TraderProfileUpdate(SQLModel):
    trading_strategy: str | None = Field(default=None, max_length=500)
    risk_tolerance: RiskTolerance | None = None
    is_public: bool | None = None
    copy_fee_percentage: float | None = None
    minimum_copy_amount: float | None = None
    display_name: str | None = Field(default=None, max_length=255)
    # Performance fields editable by admin
    total_copiers: int | None = None
    total_assets_under_copy: float | None = None
    average_monthly_return: float | None = None


class TraderProfile(TraderProfileBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, nullable=False)
    display_name: str = Field(max_length=255)
    trader_code: str = Field(max_length=16, index=True)
    avatar_url: str | None = Field(default=None, max_length=1024)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now, sa_column_kwargs={"onupdate": utc_now})
    user: "User" = Relationship(back_populates="trader_profile", sa_relationship_kwargs={"uselist": False})


class TraderProfilePublic(TraderProfileBase):
    id: uuid.UUID
    user_id: uuid.UUID
    display_name: str
    trader_code: str
    avatar_url: str | None
    created_at: datetime
    updated_at: datetime


class ImageSource(str, Enum):
    PROFILE = "PROFILE"
    KYC = "KYC"
    TRADER = "TRADER"


class ImageMetadata(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    kyc_document_id: uuid.UUID | None = Field(default=None, foreign_key="kycdocument.id")
    source: ImageSource = Field(sa_column=Column(SAEnum(ImageSource, name="imagesource"), nullable=False))
    url: str = Field(max_length=1024)
    width: int | None = Field(default=None)
    height: int | None = Field(default=None)
    content_type: str | None = Field(default=None, max_length=100)
    size_bytes: int | None = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)


class TraderProfilesPublic(SQLModel):
    data: list[TraderProfilePublic]
    count: int


class TraderTradeBase(SQLModel):
    symbol: str = Field(max_length=50)
    side: TradeSide = Field(
        default=TradeSide.BUY,
        sa_column=Column(SAEnum(TradeSide, name="tradeside"), nullable=False),
    )
    entry_price: float
    exit_price: float | None = None
    volume: float = Field(gt=0)
    profit_loss: float | None = None
    status: TradeStatus = Field(
        default=TradeStatus.OPEN,
        sa_column=Column(SAEnum(TradeStatus, name="tradestatus"), nullable=False),
    )
    executed_at: datetime = Field(default_factory=utc_now)
    is_copyable: bool = Field(default=True)
    notes: str | None = Field(default=None, max_length=500)


class TraderTrade(TraderTradeBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    trader_profile_id: uuid.UUID = Field(foreign_key="traderprofile.id", nullable=False)
    trader_profile: TraderProfile | None = Relationship(back_populates=None)


class CopySettings(SQLModel):
    max_drawdown: float | None = None
    risk_multiplier: float | None = None


class UserTraderCopyBase(SQLModel):
    copy_amount: float
    copy_started_at: datetime = Field(default_factory=utc_now)
    copy_status: CopyStatus = Field(
        default=CopyStatus.ACTIVE,
        sa_column=Column(SAEnum(CopyStatus, name="copystatus"), nullable=False),
    )
    copy_settings: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON, nullable=True))


class UserTraderCopy(UserTraderCopyBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    trader_profile_id: uuid.UUID = Field(foreign_key="traderprofile.id", nullable=False)
    user: "User" = Relationship(back_populates="user_trader_copies")
    trader_profile: TraderProfile | None = Relationship(back_populates=None)


class ExecutionEventBase(SQLModel):
    event_type: ExecutionEventType = Field(
        sa_column=Column(SAEnum(ExecutionEventType, name="executioneventtype"), nullable=False)
    )
    description: str = Field(max_length=255)
    amount: float | None = None
    payload: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON, nullable=True))


class ExecutionEvent(ExecutionEventBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    trader_profile_id: uuid.UUID | None = Field(default=None, foreign_key="traderprofile.id")
    created_at: datetime = Field(default_factory=utc_now)
    user: Optional["User"] = Relationship(back_populates="execution_events")


class LongTermPlanBase(SQLModel):
    name: str = Field(max_length=100)
    tier: LongTermPlanTier | None = Field(
        default=None,
        sa_column=Column(SAEnum(LongTermPlanTier, name="longtermplantier"), nullable=True),
    )
    minimum_deposit: float
    maximum_deposit: float | None = None
    description: str | None = Field(default=None, max_length=500)
    due_date: datetime | None = None


class LongTermPlan(LongTermPlanBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)


class LongTermPlanPublic(LongTermPlanBase):
    id: uuid.UUID
    created_at: datetime


LONG_TERM_PLAN_CATALOG_VERSION_ID = "long_term_plan_catalog"


class LongTermPlanCatalogVersion(SQLModel, table=True):
    __tablename__ = "longtermplan_catalog_version"

    id: str = Field(
        default=LONG_TERM_PLAN_CATALOG_VERSION_ID,
        primary_key=True,
        max_length=64,
    )
    version: int = Field(
        default=0,
        sa_column=Column(Integer(), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class BalanceTransferBase(SQLModel):
    amount: float
    from_balance_type: str = Field(max_length=20)
    to_balance_type: str = Field(max_length=20)
    status: BalanceTransferStatus = Field(
        sa_column=Column(SAEnum(BalanceTransferStatus, name="balancetransferstatus"), nullable=False)
    )
    description: str | None = Field(default=None, max_length=255)


class BalanceTransfer(BalanceTransferBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    created_at: datetime = Field(default_factory=utc_now)
    completed_at: datetime | None = None
    user: "User" = Relationship(back_populates="balance_transfers")


class UserLevelBase(SQLModel):
    level: int
    title: str = Field(max_length=50)
    description: str = Field(max_length=255)
    requirements: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    unlocked_features: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON, nullable=True))


class UserLevel(UserLevelBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", unique=True, nullable=False)
    user: "User" = Relationship(back_populates="user_level", sa_relationship_kwargs={"uselist": False})


class UserLongTermInvestmentBase(SQLModel):
    allocation: float
    started_at: datetime = Field(default_factory=utc_now)
    status: CopyStatus = Field(
        sa_column=Column(SAEnum(CopyStatus, name="copystatus"), nullable=False)
    )


class UserLongTermInvestment(UserLongTermInvestmentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    plan_id: uuid.UUID = Field(foreign_key="longtermplan.id", nullable=False)
    investment_due_date: datetime | None = None
    user: "User" = Relationship(back_populates="long_term_investments")


class MilestoneType(str, Enum):
    FIRST_DEPOSIT = "FIRST_DEPOSIT"
    TRADING_VOLUME_100 = "TRADING_VOLUME_100"
    TRADING_VOLUME_1000 = "TRADING_VOLUME_1000"
    CONSISTENT_PROFITS = "CONSISTENT_PROFITS"
    PORTFOLIO_DIVERSIFICATION = "PORTFOLIO_DIVERSIFICATION"
    ACCOUNT_AGE_30 = "ACCOUNT_AGE_30"
    ACCOUNT_AGE_90 = "ACCOUNT_AGE_90"
    REFERRAL_BONUS = "REFERRAL_BONUS"


class UserMilestoneBase(SQLModel):
    milestone_type: MilestoneType = Field(
        sa_column=Column(SAEnum(MilestoneType, name="milestonetype"), nullable=False)
    )
    title: str = Field(max_length=100)
    description: str = Field(max_length=255)
    reward: str | None = Field(default=None, max_length=100)
    achieved_at: datetime = Field(default_factory=utc_now)


class UserMilestone(UserMilestoneBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False)
    user: "User" = Relationship(back_populates="user_milestones")


# --- Financial Ledger and Admin Audit Trail ---


class LedgerEntryBase(SQLModel):
    """Base model for immutable financial ledger entries"""
    user_id: uuid.UUID = Field(
        description="ID of the user affected by this ledger entry"
    )
    ledger_type: LedgerType = Field(
        description="Type of ledger event (DEPOSIT, WITHDRAWAL, ADJUSTMENT, etc.)"
    )
    tx_reference: str = Field(
        max_length=100,
        description="Human-readable transaction reference (e.g., TXN-123, blockchain hash)"
    )
    asset: str | None = Field(
        default=None,
        max_length=20,
        description="Asset code (BTC, ETH, USDT, USDC) for crypto, or None for fiat (USD)"
    )
    network: str | None = Field(
        default=None,
        max_length=50,
        description="Blockchain network (BITCOIN, ETHEREUM_ERC20, TRON_TRC20) when applicable, None for fiat"
    )
    amount_usd: float = Field(
        description="Monetary impact in USD. Positive for credits (deposits, gains), negative for debits (withdrawals, fees)"
    )
    crypto_amount: str | None = Field(
        default=None,
        max_length=50,
        description="Crypto asset amount as string for precision. None for fiat-only transactions"
    )
    description: str = Field(
        max_length=500,
        description="Human-readable summary for audit trail and user display"
    )
    status: LedgerStatus = Field(
        default=LedgerStatus.PENDING,
        description="Entry status: PENDING, APPROVED, REJECTED, or COMPLETED"
    )
    created_by_admin_id: uuid.UUID | None = Field(
        default=None,
        description="Admin user ID if entry was admin-initiated. None for user or system-initiated"
    )
    approved_at: datetime | None = Field(
        default=None,
        description="Timestamp when entry was approved. None if not yet approved or not required"
    )
    metadata_payload: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column("metadata", JSON, nullable=True),
        description="Extended JSON data: blockchain tx hashes, KYC refs, fee details, etc. Schema varies by ledger_type",
    )


class LedgerEntry(LedgerEntryBase, table=True):
    """Immutable ledger entry for all monetary events affecting user balances"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    ledger_type: LedgerType = Field(
        sa_column=Column(SAEnum(LedgerType, name="ledgertype"), nullable=False, index=True)
    )
    status: LedgerStatus = Field(
        default=LedgerStatus.PENDING,
        sa_column=Column(
            SAEnum(LedgerStatus, name="ledgerstatus"),
            nullable=False,
            server_default=LedgerStatus.PENDING.value,
        ),
    )
    created_at: datetime = Field(default_factory=utc_now, index=True)
    # Note: No update or delete allowed - append-only ledger


class LedgerEntryPublic(LedgerEntryBase):
    """Public schema for ledger entry"""
    id: uuid.UUID
    created_at: datetime


class LedgerEntriesPublic(SQLModel):
    data: list[LedgerEntryPublic]
    count: int


class AdminBalanceAdjustmentBase(SQLModel):
    """Base model for admin-initiated balance changes"""
    admin_id: uuid.UUID
    user_id: uuid.UUID
    action_type: AdminActionType
    previous_balance: float
    new_balance: float
    delta: float
    reason: str = Field(max_length=500)  # Required justification
    related_ledger_entry_id: uuid.UUID | None = Field(default=None)  # Link to ledger entry
    metadata_payload: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column("metadata", JSON, nullable=True),
    )


class AdminBalanceAdjustment(AdminBalanceAdjustmentBase, table=True):
    """Log of all admin-initiated balance changes with audit trail"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    admin_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    action_type: AdminActionType = Field(
        sa_column=Column(SAEnum(AdminActionType, name="adminactiontype"), nullable=False)
    )
    related_ledger_entry_id: uuid.UUID | None = Field(
        default=None,
        foreign_key="ledgerentry.id",
        nullable=True
    )
    created_at: datetime = Field(default_factory=utc_now, index=True)


class AdminBalanceAdjustmentPublic(AdminBalanceAdjustmentBase):
    """Public schema for admin balance adjustment"""
    id: uuid.UUID
    created_at: datetime


class AdminBalanceAdjustmentsPublic(SQLModel):
    data: list[AdminBalanceAdjustmentPublic]
    count: int


# ============================================================================
# Notification Models
# ============================================================================


class NotificationType(str, Enum):
    """Types of notifications that can be sent to users"""
    KYC_SUBMITTED = "KYC_SUBMITTED"
    KYC_APPROVED = "KYC_APPROVED"
    KYC_REJECTED = "KYC_REJECTED"
    WITHDRAWAL_APPROVED = "WITHDRAWAL_APPROVED"
    WITHDRAWAL_REJECTED = "WITHDRAWAL_REJECTED"
    DEPOSIT_CONFIRMED = "DEPOSIT_CONFIRMED"
    ROI_RECEIVED = "ROI_RECEIVED"
    COPY_TRADE_EXECUTED = "COPY_TRADE_EXECUTED"
    INVESTMENT_MATURED = "INVESTMENT_MATURED"
    SECURITY_ALERT = "SECURITY_ALERT"
    SYSTEM_ANNOUNCEMENT = "SYSTEM_ANNOUNCEMENT"


class NotificationBase(SQLModel):
    """Base model for notifications"""
    title: str = Field(max_length=255)
    message: str = Field(max_length=1000)
    notification_type: NotificationType = Field(
        sa_column=Column(SAEnum(NotificationType, name="notificationtype"), nullable=False)
    )
    is_read: bool = Field(default=False)
    related_entity_type: str | None = Field(default=None, max_length=50)  # e.g., "transaction", "kyc", "trade"
    related_entity_id: uuid.UUID | None = Field(default=None)  # ID of related entity
    action_url: str | None = Field(default=None, max_length=500)  # Optional link to relevant page


class Notification(NotificationBase, table=True):
    """Notification model for storing user notifications"""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True, index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", nullable=False, index=True)
    created_at: datetime = Field(default_factory=utc_now, index=True)
    read_at: datetime | None = Field(default=None)
    
    # Relationship to user
    user: Optional["User"] = Relationship(back_populates="notifications")


class NotificationCreate(SQLModel):
    """Schema for creating a notification"""
    user_id: uuid.UUID
    title: str = Field(max_length=255)
    message: str = Field(max_length=1000)
    notification_type: NotificationType
    related_entity_type: str | None = None
    related_entity_id: str | None = None
    action_url: str | None = None


class NotificationPublic(NotificationBase):
    """Public schema for notification"""
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    read_at: datetime | None


class NotificationsPublic(SQLModel):
    """Public schema for list of notifications"""
    data: list[NotificationPublic]
    count: int


class NotificationUpdate(SQLModel):
    """Schema for updating a notification"""
    is_read: bool | None = None


class UserNotificationPreferences(SQLModel):
    """User preferences for notifications"""
    email_notifications: bool = Field(default=True)
    browser_notifications: bool = Field(default=False)
    copy_trading_alerts: bool = Field(default=True)
    withdrawal_alerts: bool = Field(default=True)
    market_updates: bool = Field(default=False)
    security_alerts: bool = Field(default=True)


# ============================================================================
# Support Chat / Agent Conversation Models
# ============================================================================


class SupportThread(SQLModel, table=True):
    """Persistent thread metadata for the Apex support assistant.

    This stores the full ChatKit ThreadMetadata payload plus a user_id for
    quick lookup. The raw metadata is kept as JSON to remain forward-compatible
    with ChatKit schema changes.
    """

    id: str = Field(primary_key=True, max_length=128)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    # Full ThreadMetadata payload as returned by ChatKit.
    # Use a non-reserved attribute name; store in DB column "metadata".
    thread_metadata: dict[str, Any] = Field(sa_column=Column("metadata", JSON, nullable=False))
    created_at: datetime = Field(default_factory=utc_now, index=True)
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column_kwargs={"onupdate": utc_now},
    )


class SupportThreadItem(SQLModel, table=True):
    """Individual items within a support thread (messages, tool calls, etc.)."""

    id: str = Field(primary_key=True, max_length=128)
    thread_id: str = Field(foreign_key="supportthread.id", index=True)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    # Discriminator/type for quick inspection (e.g. "message", "tool_call")
    item_type: str = Field(max_length=64)
    created_at: datetime = Field(default_factory=utc_now, index=True)
    # Raw ThreadItem payload as JSON (ChatKit union model)
    payload: dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))


class SupportAttachment(SQLModel, table=True):
    """Stored attachments referenced from support threads."""

    id: str = Field(primary_key=True, max_length=128)
    user_id: uuid.UUID | None = Field(default=None, foreign_key="user.id", index=True)
    created_at: datetime = Field(default_factory=utc_now, index=True)
    payload: dict[str, Any] = Field(sa_column=Column(JSON, nullable=False))


