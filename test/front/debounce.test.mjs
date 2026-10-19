import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { debounce } from '../../public/js/logica/debounce.js';

describe('debounce', () => {
  it('adia a execução até o intervalo passar sem novas chamadas', async () => {
    const fn = mock.fn();
    const { chamar } = debounce(fn, 50);
    chamar('a');
    chamar('b');
    chamar('c');
    assert.equal(fn.mock.callCount(), 0);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(fn.mock.callCount(), 1);
    assert.deepEqual(fn.mock.calls[0].arguments, ['c']);
  });

  it('cancelar impede a execução pendente', async () => {
    const fn = mock.fn();
    const { chamar, cancelar } = debounce(fn, 50);
    chamar('x');
    cancelar();
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(fn.mock.callCount(), 0);
  });

  it('permite nova chamada após o intervalo', async () => {
    const fn = mock.fn();
    const { chamar } = debounce(fn, 30);
    chamar('1');
    await new Promise((r) => setTimeout(r, 50));
    chamar('2');
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(fn.mock.callCount(), 2);
  });
});