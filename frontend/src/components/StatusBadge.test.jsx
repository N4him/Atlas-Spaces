import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  test.each([
    ['pending', 'Pendiente'],
    ['confirmed', 'Confirmado'],
    ['cancelled', 'Cancelado'],
    ['completed', 'Completado'],
  ])('muestra la etiqueta en español para el estado "%s"', (status, expectedLabel) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(expectedLabel)).toBeInTheDocument();
  });

  test('cae de forma segura a mostrar el valor crudo si el estado es desconocido', () => {
    render(<StatusBadge status="algo_no_mapeado" />);
    expect(screen.getByText('algo_no_mapeado')).toBeInTheDocument();
  });
});
