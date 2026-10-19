// Conversa com o servidor: eventos SSE (com reconexão e fallback por polling) e chamadas HTTP.

let fonteEventos = null;
let tentativaReconexao = null;

const EVENTOS = ['state', 'batch_start', 'batch_progress', 'batch_item_done', 'batch_complete', 'batch_cancelled'];

async function buscarEstadoAtual(handlers) {
  try { handlers.state(await buscarEstado()); } catch (_) {}
}

export function conectarEventos(handlers) {
  if (fonteEventos) { try { fonteEventos.close(); } catch (_) {} }
  try {
    fonteEventos = new EventSource('/api/events');
    for (const nome of EVENTOS) {
      if (!handlers[nome]) continue;
      fonteEventos.addEventListener(nome, (e) => {
        try { handlers[nome](JSON.parse(e.data)); } catch (err) { console.error(`Erro ${nome}:`, err); }
      });
    }
    fonteEventos.onerror = () => {
      try { fonteEventos.close(); } catch (_) {}
      fonteEventos = null;
      buscarEstadoAtual(handlers);
      clearTimeout(tentativaReconexao);
      tentativaReconexao = setTimeout(() => conectarEventos(handlers), 4000);
    };
  } catch (err) {
    buscarEstadoAtual(handlers);
    setInterval(() => buscarEstadoAtual(handlers), 3000);
  }
}

export async function buscarEstado() {
  const res = await fetch('/api/state');
  if (!res.ok) throw new Error(`Falha ao ler o estado (${res.status})`);
  return res.json();
}

export async function buscarGrupo(id, { atualizar = false, fotos = false } = {}) {
  const url = `/api/group?id=${encodeURIComponent(id)}${atualizar ? '&refresh=1' : ''}${fotos ? '&photos=1' : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao carregar grupo.');
  return data;
}

export async function iniciarLote(ids, fotos) {
  const res = await fetch('/api/batch-extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, photos: fotos }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Não foi possível iniciar o lote.');
  return data;
}

export function cancelarLote() {
  return fetch('/api/batch-cancel', { method: 'POST' });
}

export function recarregarGrupos() {
  return fetch('/api/retry-groups', { method: 'POST' });
}

export function reiniciarConexao() {
  return fetch('/api/restart', { method: 'POST' });
}
