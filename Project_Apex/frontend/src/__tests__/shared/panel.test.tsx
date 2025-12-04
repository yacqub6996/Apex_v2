import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from '@/components/shared/panel';

describe('Panel', () => {
  it('renders children content', () => {
    render(
      <Panel>
        <div>Test content</div>
      </Panel>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <Panel title="Test Panel">
        <div>Content</div>
      </Panel>
    );
    
    expect(screen.getByRole('heading', { name: /test panel/i })).toBeInTheDocument();
  });

  it('renders with title and subtitle', () => {
    render(
      <Panel title="Test Panel" subtitle="Panel description">
        <div>Content</div>
      </Panel>
    );
    
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
    expect(screen.getByText('Panel description')).toBeInTheDocument();
  });

  it('renders with actions', () => {
    render(
      <Panel
        title="Test Panel"
        actions={<button>Action Button</button>}
      >
        <div>Content</div>
      </Panel>
    );
    
    expect(screen.getByRole('button', { name: /action button/i })).toBeInTheDocument();
  });

  it('renders with footer', () => {
    render(
      <Panel
        footer={<div>Footer content</div>}
      >
        <div>Main content</div>
      </Panel>
    );
    
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('renders with all props', () => {
    render(
      <Panel
        title="Complete Panel"
        subtitle="With all features"
        actions={<button>Edit</button>}
        footer={<button>Save</button>}
      >
        <div>Panel body</div>
      </Panel>
    );
    
    expect(screen.getByText('Complete Panel')).toBeInTheDocument();
    expect(screen.getByText('With all features')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByText('Panel body')).toBeInTheDocument();
  });

  it('renders without header when no title, subtitle, or actions', () => {
    const { container } = render(
      <Panel>
        <div>Simple content</div>
      </Panel>
    );
    
    expect(screen.getByText('Simple content')).toBeInTheDocument();
    
    // Should not have a divider at the top
    const dividers = container.querySelectorAll('hr');
    expect(dividers.length).toBe(0);
  });
});
