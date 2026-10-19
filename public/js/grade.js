// Grade de participantes e esqueletos de carregamento.
import { criarCardParticipante } from './componentes/card-participante.js';

const TAMANHOS = { P: 120, M: 160, G: 220 };

/**
 * @param {HTMLElement} conteiner
 * @param {Array} participantes
 * @param {{ tamanho: 'P'|'M'|'G', aoAbrir: (id: string) => void, fichaAberta?: string|null }} opts
 */
export function renderizarGrade(conteiner, participantes, { tamanho, aoAbrir, fichaAberta }) {
  const grid = document.createElement('div');
  grid.className = 'grade-participantes';
  grid.dataset.tamanho = tamanho;
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Participantes');

  if (participantes.length === 0) {
    const vazio = document.createElement('p');
    vazio.className = 'lista-vazia';
    vazio.textContent = 'Nenhum participante com esse filtro.';
    grid.appendChild(vazio);
  } else {
    const fragment = document.createDocumentFragment();
    for (const p of participantes) {
      const card = criarCardParticipante({
        participante: p,
        selecionado: p.id === fichaAberta,
        aoAbrir,
      });
      fragment.appendChild(card);
    }
    grid.appendChild(fragment);
  }

  conteiner.replaceChildren(grid);
}

/**
 * Esqueleto de carregamento: cabeçalho + cards ou linhas cinza com pulso.
 * @param {HTMLElement} conteiner
 * @param {'lista'|'grade'} modo
 * @param {{ total?: number }} [opts]
 */
export function renderizarEsqueleto(conteiner, modo, { total } = {}) {
  const fragment = document.createDocumentFragment();

  // Aviso de grupo grande (>500 membros)
  if (total && total > 500) {
    const aviso = document.createElement('div');
    aviso.className = 'aviso-grupo-grande esqueleto-pulso';
    aviso.textContent = 'Grupos com mais de 500 membros podem levar alguns segundos.';
    fragment.appendChild(aviso);
  }

  // Esqueleto do cabeçalho
  const cabecalho = document.createElement('div');
  cabecalho.className = 'esqueleto-cabecalho';
  for (const cls of ['longa', 'media', 'curta']) {
    const linha = document.createElement('div');
    linha.className = `esqueleto-linha ${cls} esqueleto-pulso`;
    cabecalho.appendChild(linha);
  }
  fragment.appendChild(cabecalho);

  if (modo === 'grade') {
    const grade = document.createElement('div');
    grade.className = 'esqueleto-grade';
    for (let i = 0; i < 12; i++) {
      const card = document.createElement('div');
      card.className = 'esqueleto-card esqueleto-pulso';
      grade.appendChild(card);
    }
    fragment.appendChild(grade);
  } else {
    const lista = document.createElement('div');
    lista.className = 'esqueleto-lista';
    for (let i = 0; i < 10; i++) {
      const linha = document.createElement('div');
      linha.className = 'esqueleto-linha-tabela esqueleto-pulso';
      lista.appendChild(linha);
    }
    fragment.appendChild(lista);
  }

  conteiner.replaceChildren(fragment);
}

export { TAMANHOS };
