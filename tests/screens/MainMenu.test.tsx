import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MainMenu } from '../../components/screens/MainMenu';
import { MarketPosition } from '../../types';

describe('MainMenu', () => {
  it('should render the price correctly', () => {
    render(
      <MainMenu
        price={50000}
        onStart={() => {}}
        onOpenSettings={() => {}}
        selectedPair="BTC"
        onPairChange={() => {}}
      />
    );
    expect(screen.getByText(/\$50,000/)).toBeDefined();
  });

  it('should show connecting if price is 0', () => {
    render(
      <MainMenu
        price={0}
        onStart={() => {}}
        onOpenSettings={() => {}}
        selectedPair="BTC"
        onPairChange={() => {}}
      />
    );
    expect(screen.getByText(/CONNECTING/i)).toBeDefined();
  });

  it('should call onStart with LONG and default leverage when Long button is clicked', () => {
    const onStart = vi.fn();
    render(
      <MainMenu
        price={50000}
        onStart={onStart}
        onOpenSettings={() => {}}
        selectedPair="BTC"
        onPairChange={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/Long/i));
    expect(onStart).toHaveBeenCalledWith(MarketPosition.LONG, 10); // Default leverage is 10
  });

  it('should call onStart with SHORT and default leverage when Short button is clicked', () => {
    const onStart = vi.fn();
    render(
      <MainMenu
        price={50000}
        onStart={onStart}
        onOpenSettings={() => {}}
        selectedPair="BTC"
        onPairChange={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/Short/i));
    expect(onStart).toHaveBeenCalledWith(MarketPosition.SHORT, 10); // Default leverage is 10
  });

  it('should call onOpenSettings when Settings button is clicked', () => {
    const onOpenSettings = vi.fn();
    render(
      <MainMenu
        price={50000}
        onStart={() => {}}
        onOpenSettings={onOpenSettings}
        selectedPair="BTC"
        onPairChange={() => {}}
      />
    );

    fireEvent.click(screen.getByText(/Settings/i));
    expect(onOpenSettings).toHaveBeenCalled();
  });

  it('should call onPairChange when a new pair is selected', () => {
    const onPairChange = vi.fn();
    render(
      <MainMenu
        price={50000}
        onStart={() => {}}
        onOpenSettings={() => {}}
        selectedPair="BTC"
        onPairChange={onPairChange}
      />
    );

    // Assuming CryptoSelector renders buttons/icons with text "BTC", "ETH", "SOL"
    // And we are on BTC, let's click ETH.
    // Assuming the selector is visible.
    const ethButton = screen.getByText('ETH');
    fireEvent.click(ethButton);
    expect(onPairChange).toHaveBeenCalledWith('ETH');
  });
});
