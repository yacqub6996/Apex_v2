import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileSettings } from '../../pages/settings/profile-settings';

// Mock the auth provider
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'test@example.com',
      full_name: 'Test User',
    },
  }),
}));

describe('ProfileSettings', () => {
  const mockUser = {
    email: 'test@example.com',
    full_name: 'Test User',
  };

  it('renders profile settings form with user data', () => {
    render(<ProfileSettings user={mockUser} />);

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Full Name')).toHaveValue('Test User');
    expect(screen.getByLabelText('Email Address')).toHaveValue('test@example.com');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(<ProfileSettings user={mockUser} />);

    const fullNameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email Address');
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    // Clear required fields
    fireEvent.change(fullNameInput, { target: { value: '' } });
    fireEvent.change(emailInput, { target: { value: '' } });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    render(<ProfileSettings user={mockUser} />);

    const emailInput = screen.getByLabelText('Email Address');
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('validates full name length', async () => {
    render(<ProfileSettings user={mockUser} />);

    const fullNameInput = screen.getByLabelText('Full Name');
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    fireEvent.change(fullNameInput, { target: { value: 'A' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Full name must be at least 2 characters')).toBeInTheDocument();
    });
  });

  it('clears errors when user starts typing', async () => {
    render(<ProfileSettings user={mockUser} />);

    const fullNameInput = screen.getByLabelText('Full Name');
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    // Trigger validation error
    fireEvent.change(fullNameInput, { target: { value: '' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
    });

    // Start typing to clear error
    fireEvent.change(fullNameInput, { target: { value: 'New Name' } });

    await waitFor(() => {
      expect(screen.queryByText('Full name is required')).not.toBeInTheDocument();
    });
  });

  it('shows loading state when saving', async () => {
    render(<ProfileSettings user={mockUser} />);

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
    });
  });

  it('shows success message after save', async () => {
    render(<ProfileSettings user={mockUser} />);

    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('clears success message when form changes', async () => {
    render(<ProfileSettings user={mockUser} />);

    const fullNameInput = screen.getByLabelText('Full Name');
    const saveButton = screen.getByRole('button', { name: 'Save Changes' });

    // First save to show success message
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Change form to clear success message
    fireEvent.change(fullNameInput, { target: { value: 'Updated Name' } });

    await waitFor(() => {
      expect(screen.queryByText('Profile updated successfully!')).not.toBeInTheDocument();
    });
  });

  it('handles field changes correctly', () => {
    render(<ProfileSettings user={mockUser} />);

    const fullNameInput = screen.getByLabelText('Full Name');
    const emailInput = screen.getByLabelText('Email Address');

    fireEvent.change(fullNameInput, { target: { value: 'Updated Name' } });
    fireEvent.change(emailInput, { target: { value: 'updated@example.com' } });

    expect(fullNameInput).toHaveValue('Updated Name');
    expect(emailInput).toHaveValue('updated@example.com');
  });

  it('renders with empty user data', () => {
    render(<ProfileSettings user={null} />);

    expect(screen.getByLabelText('Full Name')).toHaveValue('');
    expect(screen.getByLabelText('Email Address')).toHaveValue('');
  });

  it('renders with partial user data', () => {
    render(<ProfileSettings user={{ email: 'test@example.com' }} />);

    expect(screen.getByLabelText('Full Name')).toHaveValue('');
    expect(screen.getByLabelText('Email Address')).toHaveValue('test@example.com');
  });
});