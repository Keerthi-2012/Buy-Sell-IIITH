import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordInput from '../components/shared/PasswordInput';

describe('PasswordInput', () => {
  it('hides the password by default', () => {
    render(<PasswordInput id="pw" placeholder="Your password" />);
    expect(screen.getByPlaceholderText('Your password')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows and hides it when the eye is clicked', async () => {
    render(<PasswordInput id="pw" placeholder="Your password" />);
    const input = screen.getByPlaceholderText('Your password');

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('keeps what was typed when toggling, and passes props through to the input', async () => {
    render(<PasswordInput id="pw" name="password" autoComplete="new-password" required />);
    const input = document.getElementById('pw');
    await userEvent.type(input, 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));

    expect(input).toHaveValue('secret123');
    expect(input).toHaveAttribute('name', 'password');
    expect(input).toHaveAttribute('autocomplete', 'new-password');
    expect(input).toBeRequired();
  });

  it('never submits the surrounding form when the eye is clicked', async () => {
    let submitted = false;
    render(
      <form onSubmit={(e) => { e.preventDefault(); submitted = true; }}>
        <PasswordInput id="pw" />
      </form>
    );
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(submitted).toBe(false);
  });
});
