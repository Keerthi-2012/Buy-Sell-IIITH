import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SellerRating } from '../components/SellerRating';
import { CartItem } from '../components/CartItem';
import Admin from '../components/Admin';
import { CartSummary } from '../components/CartSummary';
import Orders from '../components/Orders';
import { api } from '../utils/api';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));
// Orders talks to the server through this client, so replace just the network calls.
vi.mock('../utils/api', async (importOriginal) => ({
  ...(await importOriginal()),
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

describe('SellerRating', () => {
  it('shows the average and a singular review count', () => {
    render(<SellerRating summary={{ average: 4.5, count: 1 }} />);
    expect(screen.getByText(/4\.5 \(1 review\)/)).toBeInTheDocument();
  });
  it('pluralises and handles no reviews', () => {
    const { rerender } = render(<SellerRating summary={{ average: 3, count: 2 }} />);
    expect(screen.getByText(/\(2 reviews\)/)).toBeInTheDocument();
    rerender(<SellerRating summary={{ average: null, count: 0 }} />);
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
  });
});

describe('CartSummary', () => {
  const items = [
    { item: { price: 100 }, quantity: 2 },
    { item: { price: 250 }, quantity: 1 },
    { item: null, quantity: 1 },
  ];

  it('multiplies by quantity and ignores broken entries', () => {
    render(<CartSummary items={items} onCheckout={() => {}} />);
    expect(screen.getByText('Items (3)')).toBeInTheDocument(); // 2 + 1 units
    expect(screen.getAllByText('₹450')).toHaveLength(2); // subtotal row and total row
  });

  it('disables checkout when there is nothing to buy', () => {
    render(<CartSummary items={[]} onCheckout={() => {}} />);
    expect(screen.getByRole('button', { name: /place order/i })).toBeDisabled();
  });
});

describe('CartItem', () => {
  const item = { _id: 'i1', name: 'Notebook', description: 'ruled', price: 40, quantity: 5 };

  const renderRow = (quantity, handlers = {}) =>
    render(
      <MemoryRouter>
        <CartItem item={item} quantity={quantity} onQuantityChange={() => {}} onRemove={() => {}} {...handlers} />
      </MemoryRouter>
    );

  it('shows the line total and the price each', () => {
    renderRow(3);
    expect(screen.getByText('₹120')).toBeInTheDocument();
    expect(screen.getByText('₹40 each')).toBeInTheDocument();
  });

  it('asks the page to change the quantity by one step', async () => {
    const onQuantityChange = vi.fn();
    renderRow(2, { onQuantityChange });
    await userEvent.click(screen.getByRole('button', { name: /increase/i }));
    await userEvent.click(screen.getByRole('button', { name: /decrease/i }));
    expect(onQuantityChange).toHaveBeenNthCalledWith(1, 'i1', 3);
    expect(onQuantityChange).toHaveBeenNthCalledWith(2, 'i1', 1);
  });

  it('stops at 1 and at the stock', () => {
    const { unmount } = renderRow(1);
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
    unmount();
    renderRow(5);
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled();
  });
});

describe('Admin page', () => {
  const orders = { orders: [{ _id: 'o1', itemName: 'Lamp', amount: 500, quantity: 2, status: 'pending', buyer: { firstName: 'Bea' }, seller: { firstName: 'Sam' }, createdAt: '2026-01-01T00:00:00Z' }], total: 1, pages: 1 };
  const items = { items: [{ _id: 'i1', name: 'Desk', price: 100, quantity: 4, status: 'available', category: 'furniture', seller: { firstName: 'Sam' } }], total: 1, pages: 1 };

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => Promise.resolve({ data: url === '/admin/orders' ? orders : items }));
  });

  it('switches between orders and listings without crashing', async () => {
    render(<Admin />);
    expect(await screen.findByText('Lamp')).toBeInTheDocument();
    expect(screen.getByText(/2 units/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'All Listings' }));
    expect(await screen.findByText('Desk')).toBeInTheDocument();
    expect(screen.getByText(/4 in stock/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'All Orders' }));
    expect(await screen.findByText('Lamp')).toBeInTheDocument();
  });
});

describe('Orders page', () => {
  const base = { amount: 500, seller: { firstName: 'Sam', lastName: 'Seller' }, itemName: 'Lamp' };

  const mockOrders = (placed, cancelled = []) => {
    api.get.mockImplementation((url) =>
      Promise.resolve({ data: url === '/order/placed' ? placed : cancelled })
    );
  };

  beforeEach(() => vi.clearAllMocks());

  it('shows the quantity and unit price for multi-unit orders', async () => {
    mockOrders([{ ...base, _id: '1', transactionId: 't1', status: 'pending', amount: 120, quantity: 3, otp: '111111' }]);
    render(<Orders />);
    expect(await screen.findByText(/₹120 \(3 × ₹40\)/)).toBeInTheDocument();
  });

  it('shows the OTP and the auto-release date on pending orders', async () => {
    mockOrders([
      { ...base, _id: '1', transactionId: 't1', status: 'pending', otp: '123456', expiresAt: '2030-01-15T00:00:00Z' },
    ]);
    render(<Orders />);
    expect(await screen.findByText(/Delivery OTP: 123456/)).toBeInTheDocument();
    expect(screen.getByText(/released automatically on/i)).toBeInTheDocument();
  });

  it('offers a rating form where the seller is not rated yet, and shows the rating where they are', async () => {
    mockOrders([
      { ...base, _id: '1', transactionId: 't1', status: 'completed', myReview: null },
      { ...base, _id: '2', transactionId: 't2', status: 'completed', myReview: { rating: 4, comment: '' } },
    ]);
    render(<Orders />);
    await userEvent.click(await screen.findByRole('button', { name: 'Orders Placed' }));
    expect(screen.getAllByRole('button', { name: /submit review/i })).toHaveLength(1);
    expect(screen.getByText(/you rated this seller/i)).toBeInTheDocument();
    expect(screen.getByText(/one rating per seller/i)).toBeInTheDocument();
  });

  it('lets the buyer change an existing rating (pre-filled), instead of adding another', async () => {
    mockOrders([
      { ...base, _id: '1', transactionId: 't1', status: 'completed', myReview: { rating: 2, comment: 'slow' } },
    ]);
    api.post.mockResolvedValue({ data: {} });
    render(<Orders />);
    await userEvent.click(await screen.findByRole('button', { name: 'Orders Placed' }));

    expect(screen.queryByRole('button', { name: /update review/i })).toBeNull(); // not editing yet
    await userEvent.click(screen.getByRole('button', { name: 'Change rating' }));

    expect(screen.getByRole('combobox')).toHaveValue('2');
    expect(screen.getByPlaceholderText(/comment/i)).toHaveValue('slow');
    await userEvent.selectOptions(screen.getByRole('combobox'), '5');
    await userEvent.click(screen.getByRole('button', { name: /update review/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/order/t1/review', { rating: 5, comment: 'slow' })
    );
  });

  it('submits a review for the right order', async () => {
    mockOrders([{ ...base, _id: '1', transactionId: 't1', status: 'completed', myReview: null }]);
    api.post.mockResolvedValue({ data: {} });
    render(<Orders />);
    await userEvent.click(await screen.findByRole('button', { name: 'Orders Placed' }));
    await userEvent.selectOptions(screen.getByRole('combobox'), '4');
    await userEvent.type(screen.getByPlaceholderText(/comment/i), 'Smooth handover');
    await userEvent.click(screen.getByRole('button', { name: /submit review/i }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/order/t1/review', { rating: 4, comment: 'Smooth handover' })
    );
  });

  it('explains expired and admin-removed cancellations', async () => {
    mockOrders(
      [],
      [
        { ...base, _id: '1', transactionId: 't1', status: 'cancelled', cancelReason: 'expired' },
        { ...base, _id: '2', transactionId: 't2', status: 'cancelled', cancelReason: 'removed' },
        {
          ...base,
          _id: '3',
          transactionId: 't3',
          status: 'cancelled',
          cancelReason: 'cancelled',
          cancelledBy: { firstName: 'Sam', lastName: 'Seller' },
        },
      ]
    );
    render(<Orders />);
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelled Orders' }));
    expect(screen.getByText(/expired: not completed in time/i)).toBeInTheDocument();
    expect(screen.getByText(/removed by an admin/i)).toBeInTheDocument();
    expect(screen.getByText('Cancelled by: Sam Seller')).toBeInTheDocument();
  });
});
