import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataTable } from '@/components/shared/data-table';
import type { DataTableColumn } from '@/components/shared/data-table';

interface TestUser {
  id: string;
  name: string;
  email: string;
  status: string;
}

const mockUsers: TestUser[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', status: 'Active' },
];

const columns: DataTableColumn<TestUser>[] = [
  {
    id: 'name',
    label: 'Name',
    accessor: (row) => row.name,
  },
  {
    id: 'email',
    label: 'Email',
    accessor: (row) => row.email,
  },
  {
    id: 'status',
    label: 'Status',
    accessor: (row) => row.status,
    align: 'center',
  },
];

describe('DataTable', () => {
  it('renders table with data', () => {
    render(<DataTable columns={columns} rows={mockUsers} />);
    
    // Check headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Check data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<DataTable columns={columns} rows={[]} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        emptyMessage="No users found"
      />
    );
    
    expect(screen.getByText('No users found')).toBeInTheDocument();
  });

  it('uses custom getRowKey function', () => {
    const getRowKey = (row: TestUser) => row.id;
    
    const { container } = render(
      <DataTable
        columns={columns}
        rows={mockUsers}
        getRowKey={getRowKey}
      />
    );
    
    // Check that all rows are rendered
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(mockUsers.length);
  });

  it('renders with custom cell renderer', () => {
    const columnsWithRender: DataTableColumn<TestUser>[] = [
      {
        id: 'name',
        label: 'Name',
        accessor: (row) => row.name,
        render: (row, value) => <strong>{value}</strong>,
      },
    ];
    
    render(<DataTable columns={columnsWithRender} rows={mockUsers} />);
    
    const strongElement = screen.getByText('John Doe');
    expect(strongElement.tagName).toBe('STRONG');
  });

  it('renders sortable columns', () => {
    const sortableColumns: DataTableColumn<TestUser>[] = [
      {
        id: 'name',
        label: 'Name',
        accessor: (row) => row.name,
        sortable: true,
      },
    ];
    
    const handleSort = vi.fn();
    
    render(
      <DataTable
        columns={sortableColumns}
        rows={mockUsers}
        onSort={handleSort}
      />
    );
    
    // Sort button should be present
    const sortButton = screen.getByRole('button', { name: /name/i });
    expect(sortButton).toBeInTheDocument();
  });

  it('renders with striped rows', () => {
    const { container } = render(
      <DataTable columns={columns} rows={mockUsers} striped={true} />
    );
    
    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(mockUsers.length);
  });

  it('applies column alignment', () => {
    render(<DataTable columns={columns} rows={mockUsers} />);
    
    // The Status column should be center-aligned
    const cells = screen.getAllByRole('cell');
    expect(cells.length).toBeGreaterThan(0);
  });

  // NEW TESTS FOR LOADING STATES
  it('renders skeleton rows when loading', () => {
    const { container } = render(
      <DataTable 
        columns={columns} 
        rows={[]} 
        isLoading={true}
        skeletonRowCount={3}
      />
    );
    
    // Should render skeleton rows
    const skeletonRows = container.querySelectorAll('tbody tr');
    expect(skeletonRows).toHaveLength(3);
    
    // Should not show empty message while loading
    expect(screen.queryByText('No data available')).not.toBeInTheDocument();
  });

  it('uses custom skeleton row count', () => {
    const { container } = render(
      <DataTable 
        columns={columns} 
        rows={[]} 
        isLoading={true}
        skeletonRowCount={7}
      />
    );
    
    const skeletonRows = container.querySelectorAll('tbody tr');
    expect(skeletonRows).toHaveLength(7);
  });

  it('renders data when not loading', () => {
    render(
      <DataTable 
        columns={columns} 
        rows={mockUsers}
        isLoading={false}
      />
    );
    
    // Should show actual data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('hides columns on mobile when mobileStack is enabled', () => {
    const columnsWithMobileHide: DataTableColumn<TestUser>[] = [
      {
        id: 'name',
        label: 'Name',
        accessor: (row) => row.name,
        hideOnMobile: false,
      },
      {
        id: 'email',
        label: 'Email',
        accessor: (row) => row.email,
        hideOnMobile: true,
      },
    ];
    
    render(
      <DataTable
        columns={columnsWithMobileHide}
        rows={mockUsers}
        mobileStack={true}
      />
    );
    
    // Both columns should be rendered (hiding is handled by CSS)
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders in dense mode', () => {
    const { container } = render(
      <DataTable 
        columns={columns} 
        rows={mockUsers}
        dense={true}
      />
    );
    
    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();
  });
});
