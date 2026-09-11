// Regression test for the dental-pack removal: this modal used to have
// tooth/surface inputs and send them on every add-item call. Both are gone —
// lock that in so it can't quietly come back. (Exported from
// TreatmentPlanPage.tsx solely so this test can render it in isolation.)
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddItemModal } from './TreatmentPlanPage';

vi.mock('../../lib/services/treatmentPlans', () => ({
  treatmentPlansService: {
    addItem: vi.fn().mockResolvedValue({ id: 'item_1' }),
  },
}));

vi.mock('../../lib/toast', () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

describe('AddItemModal', () => {
  it('renders no tooth/surface fields', () => {
    render(<AddItemModal planId="plan_1" onClose={vi.fn()} onAdded={vi.fn()} />);

    expect(screen.queryByLabelText(/tooth/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/surface/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
  });

  it('calls addItem with only description/price — no tooth/surface', async () => {
    const { treatmentPlansService } = await import('../../lib/services/treatmentPlans');
    const user = userEvent.setup();
    const onAdded = vi.fn();
    render(<AddItemModal planId="plan_1" onClose={vi.fn()} onAdded={onAdded} />);

    await user.type(screen.getByLabelText(/description/i), 'Consult');
    await user.type(screen.getByLabelText(/price/i), '100');
    await user.click(screen.getByRole('button', { name: /add item/i }));

    expect(treatmentPlansService.addItem).toHaveBeenCalledWith('plan_1', {
      description: 'Consult',
      price: 100,
    });
    expect(onAdded).toHaveBeenCalledTimes(1);
  });
});
