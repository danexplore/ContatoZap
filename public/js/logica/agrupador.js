// Junta ids que chegam aos poucos e os envia de uma vez, em pedaços de até `maximo`.
// A janela começa no primeiro id pendente e não reinicia a cada novo, para a rolagem contínua não adiar o envio.
// Cada id vai uma vez só; `esquecer` libera o id para nova tentativa (ex.: depois de uma falha).

export function criarAgrupador({ esperaMs = 150, maximo = 50, enviar, agendar = setTimeout }) {
  const conhecidos = new Set();
  let pendentes = [];
  let agendado = false;

  function disparar() {
    agendado = false;
    const lote = pendentes;
    pendentes = [];
    for (let i = 0; i < lote.length; i += maximo) enviar(lote.slice(i, i + maximo));
  }

  function adicionar(id) {
    if (conhecidos.has(id)) return;
    conhecidos.add(id);
    pendentes.push(id);
    if (agendado) return;
    agendado = true;
    agendar(disparar, esperaMs);
  }

  function esquecer(id) {
    conhecidos.delete(id);
    pendentes = pendentes.filter((p) => p !== id);
  }

  return { adicionar, esquecer };
}
