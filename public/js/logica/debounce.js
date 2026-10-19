// Debounce simples: adia a execução até que o intervalo passe sem novas chamadas.
// Retorna { chamar, cancelar } para permitir limpeza em teardowns.

export function debounce(fn, ms) {
  let timer = null;

  function chamar(...args) {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  }

  function cancelar() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { chamar, cancelar };
}