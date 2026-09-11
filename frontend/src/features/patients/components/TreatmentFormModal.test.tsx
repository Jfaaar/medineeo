// Regression test for the dental-pack removal: this modal used to branch on
// `useClinicSpecialty().profile.primaryChart === 'dentalChart'` to swap a
// tooth/surface input in for a generic body-region selector, and always sent
// `tooth`/`surface` on the submitted payload. Both the branch and the fields
// are gone now — lock that in so it can't quietly come back.
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreatmentFormModal } from './TreatmentFormModal';

vi.mock('../../../lib/api', () => ({
  api: {
    inventory: {
      list: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('TreatmentFormModal', () => {
  it('renders no tooth/surface/body-region fields, regardless of specialty', () => {
    render(<TreatmentFormModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/tooth/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/surface/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/body region/i)).not.toBeInTheDocument();

    // The fields that should still be there.
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  it('submits a treatment with no tooth/surface keys on the payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TreatmentFormModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/description/i), 'Physical therapy session');
    await user.type(screen.getByLabelText(/price/i), '150');
    await user.click(screen.getByRole('button', { name: /save treatment/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).not.toHaveProperty('tooth');
    expect(payload).not.toHaveProperty('surface');
    expect(payload).toMatchObject({
      description: 'Physical therapy session',
      price: 150,
      status: 'completed',
    });
  });
});
