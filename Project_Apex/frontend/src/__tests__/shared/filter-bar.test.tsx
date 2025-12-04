import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilterBar } from '@/components/shared/filter-bar';
import { TextField, Button } from '@mui/material';

describe('FilterBar', () => {
  it('renders children controls', () => {
    render(
      <FilterBar>
        <TextField label="Search" />
        <Button>Apply</Button>
      </FilterBar>
    );
    
    expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
  });

  it('renders multiple filter controls', () => {
    render(
      <FilterBar spacing={2}>
        <TextField label="Name" />
        <TextField label="Email" />
        <TextField label="Status" />
      </FilterBar>
    );
    
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it('renders with different directions', () => {
    const { rerender } = render(
      <FilterBar direction="row">
        <TextField label="Test" />
      </FilterBar>
    );
    
    expect(screen.getByLabelText(/test/i)).toBeInTheDocument();
    
    rerender(
      <FilterBar direction="column">
        <TextField label="Test" />
      </FilterBar>
    );
    
    expect(screen.getByLabelText(/test/i)).toBeInTheDocument();
  });

  it('renders with custom alignment and justification', () => {
    render(
      <FilterBar
        alignItems="center"
        justifyContent="space-between"
      >
        <TextField label="Left" />
        <Button>Right</Button>
      </FilterBar>
    );
    
    expect(screen.getByLabelText(/left/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /right/i })).toBeInTheDocument();
  });

  it('renders with custom spacing', () => {
    render(
      <FilterBar spacing={4}>
        <TextField label="Input 1" />
        <TextField label="Input 2" />
      </FilterBar>
    );
    
    expect(screen.getByLabelText(/input 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/input 2/i)).toBeInTheDocument();
  });

  it('renders with wrap disabled', () => {
    render(
      <FilterBar wrap={false}>
        <TextField label="Field 1" />
        <TextField label="Field 2" />
        <TextField label="Field 3" />
      </FilterBar>
    );
    
    expect(screen.getByLabelText(/field 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/field 2/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/field 3/i)).toBeInTheDocument();
  });
});
