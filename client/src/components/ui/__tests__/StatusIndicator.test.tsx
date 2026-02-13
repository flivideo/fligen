import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusIndicator } from '../StatusIndicator';

describe('StatusIndicator', () => {
  it('renders with label', () => {
    render(<StatusIndicator status="success" label="Connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders dot by default', () => {
    const { container } = render(<StatusIndicator status="success" label="Connected" />);
    const dot = container.querySelector('.rounded-full');
    expect(dot).toBeInTheDocument();
  });

  it('hides dot when showDot is false', () => {
    const { container } = render(
      <StatusIndicator status="success" label="Connected" showDot={false} />
    );
    const dot = container.querySelector('.rounded-full');
    expect(dot).not.toBeInTheDocument();
  });

  it('renders different status types', () => {
    const { rerender } = render(<StatusIndicator status="success" label="Success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();

    rerender(<StatusIndicator status="error" label="Error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();

    rerender(<StatusIndicator status="warning" label="Warning" />);
    expect(screen.getByText('Warning')).toBeInTheDocument();

    rerender(<StatusIndicator status="info" label="Info" />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });
});
