/**
 * AdminLedgerHistory - View all ledger entries and balance adjustments
 * Follows Material UI design patterns
 */

import React, { useState } from 'react'
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Stack,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TablePagination,
  CircularProgress,
  Tabs,
  Tab,
  Autocomplete,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { AdminLedgerService } from '@/services/admin-ledger-service'
import { UsersService } from '@/api/services/UsersService'
import { LedgerType, LedgerStatus, AdminActionType } from '@/types/ledger'
import { Panel } from '@/components/shared'

type TabValue = 'ledger' | 'adjustments'

export const AdminLedgerHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('ledger')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  
  // Filters
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [ledgerType, setLedgerType] = useState<LedgerType | ''>('')
  const [ledgerStatus, setLedgerStatus] = useState<LedgerStatus | ''>('')
  const [actionType, setActionType] = useState<AdminActionType | ''>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [assetFilter, setAssetFilter] = useState('')

  // Fetch users for filter
  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => UsersService.usersReadUsers(0, 1000),
  })

  const users = usersQuery.data?.data ?? []
  const selectedUser = users.find((u) => u.id === selectedUserId)

  // Fetch ledger entries
  const ledgerQuery = useQuery({
    queryKey: [
      'admin-ledger-entries',
      page,
      rowsPerPage,
      selectedUserId,
      ledgerType,
      ledgerStatus,
      startDate,
      endDate,
      assetFilter,
    ],
    queryFn: () =>
      AdminLedgerService.listLedgerEntries({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        user_id: selectedUserId || undefined,
        ledger_type: ledgerType || undefined,
        status: ledgerStatus || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        asset: assetFilter || undefined,
      }),
    enabled: activeTab === 'ledger',
  })

  // Fetch adjustments
  const adjustmentsQuery = useQuery({
    queryKey: [
      'admin-adjustments',
      page,
      rowsPerPage,
      selectedUserId,
      actionType,
      startDate,
      endDate,
    ],
    queryFn: () =>
      AdminLedgerService.listBalanceAdjustments({
        skip: page * rowsPerPage,
        limit: rowsPerPage,
        user_id: selectedUserId || undefined,
        action_type: actionType || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
    enabled: activeTab === 'adjustments',
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)

  const formatDateTime = (value?: string | null) =>
    value
      ? new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeStyle: 'short' }).format(
          new Date(value)
        )
      : 'N/A'

  const handleResetFilters = () => {
    setSelectedUserId('')
    setLedgerType('')
    setLedgerStatus('')
    setActionType('')
    setStartDate('')
    setEndDate('')
    setAssetFilter('')
    setPage(0)
  }

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage)
  }

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10))
    setPage(0)
  }

  const renderLedgerStatusChip = (status: LedgerStatus) => {
    const colorMap: Record<LedgerStatus, 'default' | 'warning' | 'success' | 'error'> = {
      [LedgerStatus.PENDING]: 'warning',
      [LedgerStatus.APPROVED]: 'success',
      [LedgerStatus.COMPLETED]: 'success',
      [LedgerStatus.REJECTED]: 'error',
    }
    return <Chip label={status} color={colorMap[status]} size="small" />
  }

  const renderActionTypeChip = (action: AdminActionType) => {
    const isCredit = action === AdminActionType.ADD_FUNDS
    return <Chip label={action.replace(/_/g, ' ')} color={isCredit ? 'success' : 'warning'} size="small" />
  }

  return (
    <Stack spacing={3}>
      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, val) => { setActiveTab(val); setPage(0); }}>
        <Tab label="Ledger Entries" value="ledger" sx={{ minHeight: 44 }} />
        <Tab label="Balance Adjustments" value="adjustments" sx={{ minHeight: 44 }} />
      </Tabs>

      {/* Filters */}
      <Panel title="Filters">
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {/* User Filter */}
            <Autocomplete
              sx={{ flex: 1 }}
              options={users}
              getOptionLabel={(option) => `${option.full_name || option.email} (${option.email})`}
              value={selectedUser || null}
              onChange={(_, newValue) => {
                setSelectedUserId(newValue?.id || '')
                setPage(0)
              }}
              disabled={usersQuery.isLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by User"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {usersQuery.isLoading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            {/* Ledger Type Filter */}
            {activeTab === 'ledger' && (
              <FormControl sx={{ flex: 1 }} size="small">
                <InputLabel>Ledger Type</InputLabel>
                <Select
                  value={ledgerType}
                  label="Ledger Type"
                  onChange={(e) => {
                    setLedgerType(e.target.value as LedgerType | '')
                    setPage(0)
                  }}
                >
                  <MenuItem value="">All Types</MenuItem>
                  {Object.values(LedgerType).map((type) => (
                    <MenuItem key={type} value={type}>
                      {type.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Action Type Filter */}
            {activeTab === 'adjustments' && (
              <FormControl sx={{ flex: 1 }} size="small">
                <InputLabel>Action Type</InputLabel>
                <Select
                  value={actionType}
                  label="Action Type"
                  onChange={(e) => {
                    setActionType(e.target.value as AdminActionType | '')
                    setPage(0)
                  }}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {Object.values(AdminActionType).map((action) => (
                    <MenuItem key={action} value={action}>
                      {action.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {/* Status Filter (Ledger only) */}
            {activeTab === 'ledger' && (
              <FormControl sx={{ flex: 1 }} size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={ledgerStatus}
                  label="Status"
                  onChange={(e) => {
                    setLedgerStatus(e.target.value as LedgerStatus | '')
                    setPage(0)
                  }}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  {Object.values(LedgerStatus).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            {/* Date Range */}
            <TextField
              label="Start Date"
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(0)
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />
            <TextField
              label="End Date"
              type="date"
              size="small"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(0)
              }}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1 }}
            />

            {/* Asset Filter (Ledger only) */}
            {activeTab === 'ledger' && (
              <TextField
                label="Asset"
                size="small"
                value={assetFilter}
                onChange={(e) => {
                  setAssetFilter(e.target.value)
                  setPage(0)
                }}
                placeholder="e.g., BTC, ETH"
                sx={{ flex: 1 }}
              />
            )}

            <Button onClick={handleResetFilters} variant="outlined" size="small" sx={{ minHeight: 44, width: { xs: '100%', md: 'auto' } }}>
              Reset
            </Button>
          </Stack>
        </Stack>
      </Panel>

      {/* Content */}
      {activeTab === 'ledger' && (
        <>
          {ledgerQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Amount USD</TableCell>
                      <TableCell>Asset</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>TX Ref</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ledgerQuery.data?.data.map((entry) => {
                      const user = users.find((u) => u.id === entry.user_id)
                      return (
                        <TableRow key={entry.id}>
                          <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                          <TableCell>{user?.email || entry.user_id.slice(0, 8)}</TableCell>
                          <TableCell>
                            <Chip label={entry.ledger_type.replace(/_/g, ' ')} size="small" />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>{entry.description}</TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: entry.amount_usd >= 0 ? 'success.main' : 'error.main',
                              fontWeight: 600,
                            }}
                          >
                            {formatCurrency(entry.amount_usd)}
                          </TableCell>
                          <TableCell>{entry.asset || 'USD'}</TableCell>
                          <TableCell>{renderLedgerStatusChip(entry.status)}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {entry.tx_reference}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {!ledgerQuery.data?.data.length && (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          No ledger entries found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={ledgerQuery.data?.count || 0}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </>
      )}

      {activeTab === 'adjustments' && (
        <>
          {adjustmentsQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell align="right">Previous Balance</TableCell>
                      <TableCell align="right">New Balance</TableCell>
                      <TableCell align="right">Delta</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {adjustmentsQuery.data?.data.map((adjustment) => {
                      const user = users.find((u) => u.id === adjustment.user_id)
                      return (
                        <TableRow key={adjustment.id}>
                          <TableCell>{formatDateTime(adjustment.created_at)}</TableCell>
                          <TableCell>{user?.email || adjustment.user_id.slice(0, 8)}</TableCell>
                          <TableCell>{renderActionTypeChip(adjustment.action_type)}</TableCell>
                          <TableCell sx={{ maxWidth: 300 }}>{adjustment.reason}</TableCell>
                          <TableCell align="right">
                            {formatCurrency(adjustment.previous_balance)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(adjustment.new_balance)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: adjustment.delta >= 0 ? 'success.main' : 'error.main',
                              fontWeight: 600,
                            }}
                          >
                            {adjustment.delta >= 0 ? '+' : ''}
                            {formatCurrency(adjustment.delta)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {!adjustmentsQuery.data?.data.length && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          No adjustments found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={adjustmentsQuery.data?.count || 0}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
              />
            </>
          )}
        </>
      )}
    </Stack>
  )
}
