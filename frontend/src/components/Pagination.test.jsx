import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination from './Pagination';

describe('Pagination', () => {
  test('deshabilita "Anterior" en la primera página y "Siguiente" en la última', () => {
    render(<Pagination page={1} totalPages={1} total={5} limit={20} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });

  test('llama a onChange con page + 1 al hacer clic en "Siguiente"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} total={100} limit={20} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  test('llama a onChange con page - 1 al hacer clic en "Anterior"', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Pagination page={2} totalPages={5} total={100} limit={20} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  test('muestra "Sin resultados" cuando el total es cero', () => {
    render(<Pagination page={1} totalPages={1} total={0} limit={20} onChange={() => {}} />);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
  });
});
