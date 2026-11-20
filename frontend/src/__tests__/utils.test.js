import { describe, it, expect, vi } from 'vitest';
import { rupees, fullName, errorMessage } from '../utils/api';
import { reportError } from '../utils/reportError';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

describe('formatting helpers', () => {
  it('formats prices in rupees with Indian grouping', () => {
    expect(rupees(250)).toBe('₹250');
    expect(rupees(1500000)).toBe('₹15,00,000');
    expect(rupees(undefined)).toBe('₹0');
  });

  it('joins first and last name, skipping blanks', () => {
    expect(fullName({ firstName: 'Asha', lastName: 'Rao' })).toBe('Asha Rao');
    expect(fullName({ firstName: 'Asha', lastName: '' })).toBe('Asha');
    expect(fullName(null)).toBe('Unknown');
  });
});

describe('errorMessage', () => {
  it('prefers the server message', () => {
    expect(errorMessage({ response: { data: { message: 'Nope' } } })).toBe('Nope');
  });
  it('explains network failures', () => {
    expect(errorMessage({ request: {} })).toMatch(/network/i);
  });
  it('falls back to the supplied text', () => {
    expect(errorMessage({}, 'Oops')).toBe('Oops');
  });
});

describe('reportError', () => {
  it('sends users with an incomplete profile to the profile page', () => {
    const navigate = vi.fn();
    reportError({ response: { data: { message: 'x', code: 'PROFILE_INCOMPLETE' } } }, navigate, 'fallback');
    expect(navigate).toHaveBeenCalledWith('/profile');
  });
  it('does not redirect for other errors', () => {
    const navigate = vi.fn();
    reportError({ response: { data: { message: 'Item gone' } } }, navigate, 'fallback');
    expect(navigate).not.toHaveBeenCalled();
  });
});
