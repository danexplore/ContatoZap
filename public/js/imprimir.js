// Snapshot da grade para impressão: não altera a aba, os filtros ou o modo da tela.
import { renderizarGrade } from './grade.js';
import { filtrarParticipantes, ordenarParticipantes } from './logica/filtros.js';

let trabalhoAtual = null;

async function aguardarFotos(pagina) {
  const fotos = [...pagina.querySelectorAll('img')];
  let limite;
  try {
    await Promise.race([
      Promise.all(fotos.map((foto) => foto.decode().catch(() => {}))),
      new Promise((resolve) => { limite = setTimeout(resolve, 5000); }),
    ]);
  } finally {
    clearTimeout(limite);
  }
  // Foto indisponível ou muito lenta: mantém as iniciais em vez do ícone quebrado.
  for (const foto of fotos) {
    if (!foto.complete || !foto.naturalWidth) {
      foto.parentElement?.classList.remove('avatar--com-foto');
      foto.remove();
    }
  }
}

export async function imprimirGrade({ grupo, filtro = 'todos', busca = '', ordenacao = {}, tamanho = 'M' }) {
  if (trabalhoAtual) return;
  const participantes = ordenarParticipantes(
    filtrarParticipantes(grupo.participants || [], { filtro, busca }),
    ordenacao.coluna, ordenacao.asc,
  );
  const pagina = document.createElement('section');
  pagina.id = 'impressaoGrade';
  pagina.inert = true;

  const cabecalho = document.createElement('header');
  const titulo = document.createElement('h1');
  titulo.textContent = grupo.name || 'Participantes do grupo';
  const resumo = document.createElement('p');
  resumo.textContent = `${participantes.length} de ${(grupo.participants || []).length} participantes`;
  cabecalho.append(titulo, resumo);

  const conteudo = document.createElement('div');
  renderizarGrade(conteudo, participantes, { tamanho, aoAbrir: () => {} });
  for (const foto of conteudo.querySelectorAll('img')) foto.loading = 'eager';
  pagina.append(cabecalho, conteudo);
  document.body.appendChild(pagina);

  const tituloAnterior = document.title;
  const finalizar = () => {
    pagina.remove();
    document.title = tituloAnterior;
    window.removeEventListener('afterprint', finalizar);
    trabalhoAtual = null;
  };
  trabalhoAtual = finalizar;
  window.addEventListener('afterprint', finalizar, { once: true });
  try {
    await aguardarFotos(pagina);
    document.title = `${grupo.name || 'Grupo'} — Participantes`;
    window.print();
  } catch (erro) {
    finalizar();
    throw erro;
  }
}
