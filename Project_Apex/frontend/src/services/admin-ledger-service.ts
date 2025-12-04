/**
 * Service for Admin Ledger API endpoints
 * Manually created until API client is regenerated
 */

import { OpenAPI } from '@/api/core/OpenAPI'
import { request as __request } from '@/api/core/request'
import type {
  CreateAdjustmentRequest,
  CreateAdjustmentResponse,
  AdminBalanceAdjustmentsResponse,
  LedgerEntriesResponse,
  AdminActionType,
  LedgerType,
  LedgerStatus,
  BalanceOverrideRequest,
  BalanceOverrideResponse,
} from '@/types/ledger'

export class AdminLedgerService {
  /**
   * Create a balance adjustment
   */
  public static async createBalanceAdjustment(
    requestBody: CreateAdjustmentRequest
  ): Promise<CreateAdjustmentResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/v1/admin/ledger/adjustments',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        403: 'Admin access required',
        404: 'User not found',
        400: 'Validation error',
        500: 'Server error',
      },
    })
  }

  /**
   * List balance adjustments with optional filters
   */
  public static async listBalanceAdjustments(params?: {
    skip?: number
    limit?: number
    user_id?: string
    admin_id?: string
    action_type?: AdminActionType
    start_date?: string
    end_date?: string
  }): Promise<AdminBalanceAdjustmentsResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/v1/admin/ledger/adjustments',
      query: params,
      errors: {
        403: 'Admin access required',
      },
    })
  }

  /**
   * List ledger entries with optional filters
   */
  public static async listLedgerEntries(params?: {
    skip?: number
    limit?: number
    user_id?: string
    ledger_type?: LedgerType
    status?: LedgerStatus
    start_date?: string
    end_date?: string
    asset?: string
  }): Promise<LedgerEntriesResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/v1/admin/ledger/entries',
      query: params,
      errors: {
        403: 'Admin access required',
      },
    })
  }

  /**
   * Get a specific ledger entry by ID
   */
  public static async getLedgerEntry(entryId: string): Promise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: `/api/v1/admin/ledger/entries/${entryId}`,
      errors: {
        403: 'Admin access required',
        404: 'Ledger entry not found',
      },
    })
  }

  /**
   * Superuser balance override - directly set any balance field
   */
  public static async overrideBalance(
    requestBody: BalanceOverrideRequest
  ): Promise<BalanceOverrideResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/v1/admin/ledger/balance/override',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        403: 'Admin access required',
        404: 'User not found',
        400: 'Invalid balance field',
        500: 'Server error',
      },
    })
  }
}
