import { baixarArquivo } from './ui.js';

export async function baixarGradePdf({ grupo, filtro = 'todos', busca = '', ordenacao = {}, tamanho = 'M', fotos = false }) {
  const resposta = await fetch('/api/group-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: grupo.id, filtro, busca, ordenacao, tamanho, fotos }),
  });
  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => ({}));
    throw new Error(erro.error || 'Não foi possível gerar o PDF. Tente novamente.');
  }
  const nome = (grupo.name || 'grupo').replace(/[\\/:*?"<>|\x00-\x1f]+/g, '').trim().replace(/\s+/g, '_') || 'grupo';
  baixarArquivo(await resposta.blob(), `grade_${nome}.pdf`);
}
