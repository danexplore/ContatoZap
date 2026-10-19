// Lista completa de participantes sem paginação, com cabeçalho fixo e fotos lazy.
import { formatarTelefone } from '../logica/texto.js';
import { criarAvatar } from './avatar.js';

const COLUNAS = [
  { chave: 'indice', rotulo: '#', classe: 'col-indice' },
  { chave: 'foto', rotulo: 'Foto', classe: 'col-foto' },
  { chave: 'nome_whatsapp', rotulo: 'Nome WhatsApp', classe: 'col-nome-wa' },
  { chave: 'nome_agenda', rotulo: 'Nome Agenda', classe: 'col-nome-ag' },
  { chave: 'telefone', rotulo: 'Telefone', classe: 'col-tel' },
  { chave: 'admin', rotulo: 'Admin', classe: 'col-admin' },
  { chave: 'status', rotulo: 'Status', classe: 'col-status' },
];

function valorCelula(participante, indice, coluna) {
  if (coluna === 'indice') return String(indice + 1);
  if (coluna === 'foto') return null; // renderizado separadamente
  if (coluna === 'nome_whatsapp') return participante.pushname || participante.name || '';
  if (coluna === 'nome_agenda') return participante.savedName || '';
  if (coluna === 'telefone') return participante.phone ? formatarTelefone(participante.phone) : '';
  if (coluna === 'admin') return participante.admin ? 'Sim' : '';
  if (coluna === 'status') return participante.hidden ? 'Privado' : '';
  return '';
}

/**
 * @param {{ participantes: Array, ordenacao: { coluna: string|null, asc: boolean }, aoOrdenar: (coluna: string) => void, aoAbrir: (id: string) => void, fichaAberta: string|null }} props
 * @returns {HTMLElement}
 */
export function criarListaParticipantes({ participantes, ordenacao, aoOrdenar, aoAbrir, fichaAberta }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'lista-participantes-wrapper';

  const tabela = document.createElement('table');
  tabela.className = 'lista-participantes';

  // Cabeçalho fixo
  const thead = document.createElement('thead');
  const trHead = document.createElement('tr');
  for (const col of COLUNAS) {
    const th = document.createElement('th');
    th.className = col.classe;
    th.textContent = col.rotulo;
    if (col.chave !== 'foto' && col.chave !== 'indice') {
      th.setAttribute('role', 'columnheader');
      th.setAttribute('aria-sort', ordenacao.coluna === col.chave ? (ordenacao.asc ? 'ascending' : 'descending') : 'none');
      th.tabIndex = 0;
      th.addEventListener('click', () => aoOrdenar(col.chave));
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aoOrdenar(col.chave); }
      });
      // Indicador visual de ordenação
      if (ordenacao.coluna === col.chave) {
        const seta = document.createElement('span');
        seta.className = 'sort-indicator';
        seta.setAttribute('aria-hidden', 'true');
        seta.textContent = ordenacao.asc ? ' ↑' : ' ↓';
        th.appendChild(seta);
      }
    }
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  tabela.appendChild(thead);

  // Corpo
  const tbody = document.createElement('tbody');
  const fragment = document.createDocumentFragment();

  if (participantes.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = COLUNAS.length;
    td.className = 'lista-vazia';
    td.textContent = 'Nenhum participante com esse filtro.';
    tr.appendChild(td);
    fragment.appendChild(tr);
  } else {
    for (let i = 0; i < participantes.length; i++) {
      const p = participantes[i];
      const tr = document.createElement('tr');
      tr.dataset.id = p.id;
      tr.tabIndex = 0;
      tr.setAttribute('role', 'row');
      if (p.id === fichaAberta) tr.classList.add('linha-ativa');

      tr.addEventListener('click', () => aoAbrir(p.id));
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); aoAbrir(p.id); }
      });

      for (const col of COLUNAS) {
        const td = document.createElement('td');
        td.className = col.classe;
        if (col.chave === 'foto') {
          td.appendChild(criarAvatar({
            id: p.id,
            nome: p.pushname || p.name || '',
            foto: p.photoUrl || null,
            tamanho: 36,
          }));
        } else {
          td.textContent = valorCelula(p, i, col.chave);
        }
        tr.appendChild(td);
      }
      fragment.appendChild(tr);
    }
  }

  tbody.appendChild(fragment);
  tabela.appendChild(tbody);
  wrapper.appendChild(tabela);
  return wrapper;
}