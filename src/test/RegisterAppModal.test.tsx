/**
 * RegisterAppModal component tests
 *
 * ⚠️  Tests against Kaylee's expected output for the CIMD UI changes.
 *
 * NOTE on interaction strategy:
 *   Chakra UI v3's RadioGroup (Ark UI / Zag.js state machine) does not interact
 *   reliably in jsdom via DOM events. We mock the radio-group primitives with
 *   native elements wired through React Context so that fireEvent.change on the
 *   hidden input reliably calls onValueChange in the component under test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent, { PointerEventsCheckLevel } from '@testing-library/user-event';
import { Provider } from '../components/ui/provider';
import { RegisterAppModal } from '../components/RegisterAppModal';

vi.mock('../utils/csrf', () => ({
  csrfHeaders: () => ({ 'x-csrf-token': 'test-token' }),
  getCsrfToken: () => 'test-token',
}));

// Mock Chakra's radio-group primitives with native elements wired through context.
// This lets us test authMethod state changes without fighting Zag.js / jsdom.
vi.mock('../components/ui/radio-group', async () => {
  const React = await import('react');
  const RadioCtx = React.createContext<((v: { value: string }) => void) | null>(null);
  return {
    RadioGroupRoot: ({ value: _value, onValueChange, children }: any) => (
      <RadioCtx.Provider value={onValueChange}>
        <div role="radiogroup">{children}</div>
      </RadioCtx.Provider>
    ),
    RadioGroupItem: ({ value, children }: any) => {
      const onValueChange = React.useContext(RadioCtx);
      return (
        <label>
          <input
            type="radio"
            name="authMethod"
            value={value}
            onChange={() => onValueChange?.({ value })}
          />
          {children}
        </label>
      );
    },
    RadioGroupItemControl: () => null,
    RadioGroupItemText: ({ children }: any) => <span>{children}</span>,
    RadioGroupLabel: ({ children }: any) => <span>{children}</span>,
  };
});

function renderModal(onSuccess = vi.fn()) {
  return render(
    <Provider>
      <RegisterAppModal onSuccess={onSuccess} />
    </Provider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RegisterAppModal', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let ue: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    ue = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
  });

  /** Click the native radio input with the given value (mocked RadioGroup). */
  async function selectRadio(value: string) {
    const input = document.querySelector(`input[type="radio"][value="${value}"]`) as HTMLInputElement;
    if (!input) throw new Error(`Radio input[value="${value}"] not found`);
    // userEvent.click fires the full event chain (focus → pointerdown → click → change)
    // which is what React needs to trigger onChange on a radio input.
    await ue.click(input);
  }

  it('renders the trigger button', () => {
    renderModal();
    expect(screen.getByRole('button', { name: /register new app/i })).toBeInTheDocument();
  });

  it('opens the modal and shows App Name and Domain inputs', async () => {
    renderModal();
    await ue.click(screen.getByRole('button', { name: /register new app/i }));
    expect(await screen.findByPlaceholderText(/my app/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/myapp\.example\.com/i)).toBeInTheDocument();
  });

  it('App Name input accepts typed text', async () => {
    renderModal();
    await ue.click(screen.getByRole('button', { name: /register new app/i }));
    const nameInput = await screen.findByPlaceholderText(/my app/i);
    await ue.type(nameInput, 'My Awesome App');
    expect(nameInput).toHaveValue('My Awesome App');
  });

  it('Domain input accepts typed text', async () => {
    renderModal();
    await ue.click(screen.getByRole('button', { name: /register new app/i }));
    const domainInput = await screen.findByPlaceholderText(/myapp\.example\.com/i);
    await ue.type(domainInput, 'test.example.com');
    expect(domainInput).toHaveValue('test.example.com');
  });

  it('Auth Method radio group renders all options', async () => {
    renderModal();
    await ue.click(screen.getByRole('button', { name: /register new app/i }));
    await screen.findByPlaceholderText(/my app/i);
    expect(screen.getByText('API Key')).toBeInTheDocument();
    expect(screen.getByText('HTTP Signature (CIMD)')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
  });

  it('selecting HTTP Signature reveals a CIMD URL field', async () => {
    renderModal();
    await ue.click(screen.getByRole('button', { name: /register new app/i }));
    await screen.findByPlaceholderText(/my app/i);

    await selectRadio('http_signature');

    await waitFor(() => {
      expect(screen.getByText(/cimd url/i)).toBeInTheDocument();
    });
  });

  it('selecting API Key hides the CIMD URL field', async () => {
    renderModal();
    await ue.click(screen.getByRole('button', { name: /register new app/i }));
    await screen.findByPlaceholderText(/my app/i);

    await selectRadio('http_signature');
    await waitFor(() => screen.getByText(/cimd url/i));

    await selectRadio('api_key');
    await waitFor(() => {
      expect(screen.queryByText(/cimd url/i)).not.toBeInTheDocument();
    });
  });

  it('submits with correct body shape: { name, domain, authMethod }', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        app: {
          app_id: 'app-001',
          name: 'My Awesome App',
          domain: 'test.example.com',
          api_key: 'key-abc-123',
          auth_method: 'api_key',
        },
      }),
    } as Response);

    renderModal();
    await ue.click(screen.getByRole('button', { name: /register new app/i }));
    await screen.findByPlaceholderText(/my app/i);

    await ue.type(screen.getByPlaceholderText(/my app/i), 'My Awesome App');
    await ue.type(screen.getByPlaceholderText(/myapp\.example\.com/i), 'test.example.com');

    await ue.click(screen.getByRole('button', { name: /^register app$/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/apps/register'),
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: expect.stringContaining('My Awesome App'),
        })
      );
    });

    const callBody = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string
    );
    expect(callBody).toMatchObject({
      name: 'My Awesome App',
      domain: 'test.example.com',
      authMethod: 'api_key',
    });
  });
});
