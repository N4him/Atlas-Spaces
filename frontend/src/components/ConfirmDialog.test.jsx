import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  test('no renderiza nada cuando open es false', () => {
    render(<ConfirmDialog open={false} title="¿Cancelar reserva?" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('se expone como un dialog modal correctamente etiquetado', () => {
    render(
      <ConfirmDialog
        open
        title="¿Cancelar reserva?"
        description="Esta acción no se puede deshacer."
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('¿Cancelar reserva?');
    expect(dialog).toHaveAccessibleDescription('Esta acción no se puede deshacer.');
  });

  test('mueve el foco al botón "Cancelar" al abrirse (acción no destructiva por defecto)', () => {
    render(<ConfirmDialog open title="¿Cancelar reserva?" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus();
  });

  test('Escape invoca a onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="¿Cancelar reserva?" onConfirm={() => {}} onCancel={onCancel} />);

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('clic en "Confirmar" invoca a onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="¿Cancelar reserva?" onConfirm={onConfirm} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('mientras loading es true, los botones quedan deshabilitados y se anuncia "Procesando…"', () => {
    render(<ConfirmDialog open title="¿Cancelar reserva?" onConfirm={() => {}} onCancel={() => {}} loading />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Procesando…' })).toBeDisabled();
  });
});
