import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionHeader } from '@/components/shared/section-header';
import DashboardIcon from '@mui/icons-material/Dashboard';

describe('SectionHeader', () => {
  it('renders children text', () => {
    render(<SectionHeader>Section Title</SectionHeader>);
    
    expect(screen.getByText('Section Title')).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    const { rerender } = render(
      <SectionHeader variant="h4">Heading 4</SectionHeader>
    );
    
    expect(screen.getByRole('heading', { level: 4 })).toBeInTheDocument();
    
    rerender(<SectionHeader variant="h5">Heading 5</SectionHeader>);
    
    expect(screen.getByRole('heading', { level: 5 })).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <SectionHeader icon={DashboardIcon}>
        Dashboard
      </SectionHeader>
    );
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    // Icon should be rendered but hidden from screen readers
    const icons = document.querySelectorAll('[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('renders with subtitle', () => {
    render(
      <SectionHeader subtitle="This is a description">
        Main Title
      </SectionHeader>
    );
    
    expect(screen.getByText('Main Title')).toBeInTheDocument();
    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    render(
      <SectionHeader actions={<button>View All</button>}>
        Title with Actions
      </SectionHeader>
    );
    
    expect(screen.getByText('Title with Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view all/i })).toBeInTheDocument();
  });

  it('renders with all props', () => {
    render(
      <SectionHeader
        variant="h6"
        icon={DashboardIcon}
        subtitle="Complete example"
        actions={<button>Action</button>}
      >
        Full Header
      </SectionHeader>
    );
    
    expect(screen.getByText('Full Header')).toBeInTheDocument();
    expect(screen.getByText('Complete example')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument();
  });
});
