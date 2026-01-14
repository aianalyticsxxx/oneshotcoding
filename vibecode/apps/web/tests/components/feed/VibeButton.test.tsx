import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../setup/test-utils';
import { VibeButton } from '../../../src/components/feed/VibeButton';

// Mock the API module
vi.mock('@/lib/api', () => ({
  api: {
    sparkleVibe: vi.fn().mockResolvedValue({}),
    unsparkleVibe: vi.fn().mockResolvedValue({}),
  },
}));

// Import the mocked api
import { api } from '@/lib/api';

describe('VibeButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with initial sparkle count', () => {
    render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={5}
        hasSparkled={false}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders without count when sparkleCount is 0', () => {
    render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={0}
        hasSparkled={false}
      />
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('displays sparkled state correctly', () => {
    const { container } = render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={5}
        hasSparkled={true}
      />
    );

    // When sparkled, the button should have accent styling
    const button = container.querySelector('button');
    expect(button).toHaveClass('border-terminal-accent');
  });

  it('displays unsparkled state correctly', () => {
    const { container } = render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={5}
        hasSparkled={false}
      />
    );

    const button = container.querySelector('button');
    expect(button).not.toHaveClass('border-terminal-accent');
  });

  it('increments count optimistically when clicking to sparkle', async () => {
    render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={5}
        hasSparkled={false}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Count should optimistically update
    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  it('decrements count optimistically when clicking to unsparkle', async () => {
    render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={5}
        hasSparkled={true}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });

  it('calls sparkleVibe API when sparkling', async () => {
    render(
      <VibeButton
        vibeId="test-vibe-123"
        sparkleCount={5}
        hasSparkled={false}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.sparkleVibe).toHaveBeenCalledWith('test-vibe-123');
    });
  });

  it('calls unsparkleVibe API when unsparkling', async () => {
    render(
      <VibeButton
        vibeId="test-vibe-123"
        sparkleCount={5}
        hasSparkled={true}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.unsparkleVibe).toHaveBeenCalledWith('test-vibe-123');
    });
  });

  it('reverts to original count on API error', async () => {
    // Make API call fail after a delay
    vi.mocked(api.sparkleVibe).mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('API Error')), 100))
    );

    render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={5}
        hasSparkled={false}
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // After API error, should revert to original count
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    }, { timeout: 1000 });

    // Verify the API was called
    expect(api.sparkleVibe).toHaveBeenCalledWith('test-vibe');
  });

  it('applies custom className', () => {
    const { container } = render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={5}
        hasSparkled={false}
        className="custom-class"
      />
    );

    const button = container.querySelector('button');
    expect(button).toHaveClass('custom-class');
  });

  it('is accessible with proper button role', () => {
    render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={5}
        hasSparkled={false}
      />
    );

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('handles rapid clicks correctly', async () => {
    render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={5}
        hasSparkled={false}
      />
    );

    const button = screen.getByRole('button');

    // Click multiple times rapidly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);

    // Should handle state correctly (each click toggles)
    await waitFor(() => {
      // After 3 clicks (sparkle, unsparkle, sparkle), should be sparkled
      expect(api.sparkleVibe).toHaveBeenCalled();
    });
  });

  it('handles count going from 0 to 1 and back', async () => {
    render(
      <VibeButton
        vibeId="test-vibe"
        sparkleCount={0}
        hasSparkled={false}
      />
    );

    const button = screen.getByRole('button');

    // Click to sparkle
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Click to unsparkle
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.queryByText('1')).not.toBeInTheDocument();
      expect(screen.queryByText('0')).not.toBeInTheDocument();
    });
  });
});
