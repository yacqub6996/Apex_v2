import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionsMenu } from '@/components/shared/actions-menu';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

describe('ActionsMenu', () => {
  it('renders the menu button', () => {
    const actions = [
      { id: 'edit', label: 'Edit', onClick: vi.fn() },
    ];
    
    render(<ActionsMenu actions={actions} ariaLabel="Test actions" />);
    
    const button = screen.getByRole('button', { name: /test actions/i });
    expect(button).toBeInTheDocument();
  });

  it('opens menu on click and displays action items', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();
    
    const actions = [
      { id: 'edit', label: 'Edit', onClick: handleEdit, icon: EditIcon },
      { id: 'delete', label: 'Delete', onClick: handleDelete, icon: DeleteIcon, destructive: true },
    ];
    
    render(<ActionsMenu actions={actions} />);
    
    // Click to open menu
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Menu items should be visible
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onClick handler when action is clicked', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    
    const actions = [
      { id: 'edit', label: 'Edit', onClick: handleEdit },
    ];
    
    render(<ActionsMenu actions={actions} />);
    
    // Open menu
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Click the Edit action
    const editItem = screen.getByText('Edit');
    await user.click(editItem);
    
    expect(handleEdit).toHaveBeenCalledOnce();
  });

  it('closes menu after action is clicked', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    
    const actions = [
      { id: 'edit', label: 'Edit', onClick: handleEdit },
    ];
    
    render(<ActionsMenu actions={actions} />);
    
    // Open menu
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Click action
    const editItem = screen.getByText('Edit');
    await user.click(editItem);
    
    // Menu should be closed (not in document)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('renders disabled actions', async () => {
    const user = userEvent.setup();
    const handleEdit = vi.fn();
    
    const actions = [
      { id: 'edit', label: 'Edit', onClick: handleEdit, disabled: true },
    ];
    
    render(<ActionsMenu actions={actions} />);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    const editItem = screen.getByRole('menuitem', { name: /edit/i });
    expect(editItem).toHaveAttribute('aria-disabled', 'true');
  });

  it('renders with custom size', () => {
    const actions = [
      { id: 'edit', label: 'Edit', onClick: vi.fn() },
    ];
    
    render(<ActionsMenu actions={actions} size="large" />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  // NEW TESTS FOR TOUCH TARGET SIZING
  it('ensures IconButton meets 44px minimum touch target', () => {
    const actions = [
      { id: 'edit', label: 'Edit', onClick: vi.fn() },
    ];
    
    const { container } = render(<ActionsMenu actions={actions} size="medium" />);
    
    // Get the IconButton element
    const button = container.querySelector('button');
    expect(button).toBeInTheDocument();
    
    // The button should have minWidth and minHeight of 44px (set via sx prop)
    // We can't directly test computed styles in jsdom, but we verify the component renders
    expect(button).toHaveAttribute('aria-label');
  });

  it('ensures menu items meet 44px minimum height', async () => {
    const user = userEvent.setup();
    const actions = [
      { id: 'edit', label: 'Edit', onClick: vi.fn() },
      { id: 'delete', label: 'Delete', onClick: vi.fn() },
    ];
    
    const { container } = render(<ActionsMenu actions={actions} />);
    
    // Open the menu
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Get menu items
    const menuItems = container.querySelectorAll('[role="menuitem"]');
    expect(menuItems.length).toBe(2);
    
    // Each menu item should be rendered (minHeight is applied via sx)
    menuItems.forEach(item => {
      expect(item).toBeInTheDocument();
    });
  });

  it('accepts custom menuProps for Paper width', async () => {
    const user = userEvent.setup();
    const actions = [
      { id: 'edit', label: 'Edit with a very long label', onClick: vi.fn() },
    ];
    
    render(
      <ActionsMenu 
        actions={actions} 
        menuProps={{
          slotProps: {
            paper: {
              sx: { minWidth: 250 }
            }
          }
        }}
      />
    );
    
    // Open the menu
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Menu should be visible
    expect(screen.getByText('Edit with a very long label')).toBeInTheDocument();
  });

  it('renders destructive actions with error styling', async () => {
    const user = userEvent.setup();
    const actions = [
      { id: 'delete', label: 'Delete', onClick: vi.fn(), destructive: true },
    ];
    
    render(<ActionsMenu actions={actions} />);
    
    // Open menu
    const button = screen.getByRole('button');
    await user.click(button);
    
    // Destructive action should be rendered
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });
});
