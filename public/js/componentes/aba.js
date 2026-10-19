// Aba de grupo recente: avatar + nome (o botão com role="tab") e o × ao lado.
// O × fica fora do botão da aba (controle dentro de controle não é acessível); pelo teclado, Delete fecha.
import { ICONES } from '../ui.js';
import { criarAvatar } from './avatar.js';

const TAMANHO_AVATAR = 20;
const BOTAO_DO_MEIO = 1;

export function criarAba({ id, nome, foto = null, ativa = false, aoAtivar, aoFechar }) {
  const aba = document.createElement('div');
  aba.className = `aba${ativa ? ' aba--ativa' : ''}`;
  aba.dataset.aba = id;

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = 'aba-botao';
  botao.setAttribute('role', 'tab');
  botao.setAttribute('aria-selected', ativa ? 'true' : 'false');
  botao.setAttribute('aria-keyshortcuts', 'Delete');
  botao.tabIndex = ativa ? 0 : -1;
  botao.title = nome;
  botao.dataset.aba = id;
  const rotulo = document.createElement('span');
  rotulo.className = 'aba-nome';
  rotulo.textContent = nome;
  botao.append(criarAvatar({ id, nome, foto, tamanho: TAMANHO_AVATAR }), rotulo);
  botao.addEventListener('click', () => aoAtivar());
  botao.addEventListener('keydown', (e) => {
    if (e.key !== 'Delete') return;
    e.preventDefault();
    aoFechar();
  });

  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'aba-fechar';
  fechar.tabIndex = -1;
  fechar.setAttribute('aria-label', `Fechar ${nome}`);
  fechar.title = `Fechar ${nome}`;
  fechar.innerHTML = ICONES.x;
  fechar.addEventListener('click', (e) => {
    e.stopPropagation();
    aoFechar();
  });

  // Clique do meio fecha; o mousedown do meio é barrado para o navegador não ligar a rolagem automática
  aba.addEventListener('mousedown', (e) => { if (e.button === BOTAO_DO_MEIO) e.preventDefault(); });
  aba.addEventListener('auxclick', (e) => {
    if (e.button !== BOTAO_DO_MEIO) return;
    e.preventDefault();
    aoFechar();
  });

  aba.append(botao, fechar);
  return aba;
}
