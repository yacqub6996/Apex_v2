import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricCard } from '@/components/shared/metric-card';
import PeopleIcon from '@mui/icons-material/People';

describe('MetricCard', () => {
  it('renders with title and value', () => {
    render(<MetricCard title="Total Users" value={1200} />);
    
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1200')).toBeInTheDocument();
  });

  it('renders with formatted string value', () => {
    render(<MetricCard title="Revenue" value="$50,000" />);
    
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$50,000')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<MetricCard title="Users" value={100} icon={PeopleIcon} />);
    
    // Icon should be rendered (check for svg element with data-testid)
    const iconElement = screen.getByTestId('PeopleIcon');
    expect(iconElement).toBeInTheDocument();
  });

  it('renders with secondary text', () => {
    render(
      <MetricCard
        title="Sales"
        value="$1000"
        secondaryText="+5% this month"
      />
    );
    
    expect(screen.getByText('+5% this month')).toBeInTheDocument();
  });

  it('renders with different color themes', () => {
    const { rerender } = render(
      <MetricCard title="Test" value={100} color="primary" icon={PeopleIcon} />
    );
    
    expect(screen.getByText('Test')).toBeInTheDocument();
    
    rerender(
      <MetricCard title="Test" value={100} color="success" icon={PeopleIcon} />
    );
    
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders with children', () => {
    render(
      <MetricCard title="Custom" value={100}>
        <div>Extra content</div>
      </MetricCard>
    );
    
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });
});
