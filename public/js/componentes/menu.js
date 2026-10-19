// Menu dropdown acessível: botão + lista de itens com navegação por teclado.
import { ICONES } from '../ui.js';

/**
 * @param {{ rotulo: string, principal?: boolean, itens: Array<{ rotulo: string, aoEscolher: () => void } | { elemento: HTMLElement }> }} props
 * @returns {HTMLElement}
 */
export function criarMenu({ rotulo, principal = false, itens }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'menu-dropdown';

  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = principal ? 'btn sm primary' : 'btn sm';
  botao.setAttribute('aria-haspopup', 'menu');
  botao.setAttribute('aria-expanded', 'false');
  botao.textContent = rotulo;
  // Seta indicadora
  const seta = document.createElement('span');
  seta.className = 'menu-seta';
  seta.setAttribute('aria-hidden', 'true');
  seta.innerHTML = ICONES.setaBaixo;
  botao.append(seta);

  const lista = document.createElement('ul');
  lista.className = 'menu-lista';
  lista.setAttribute('role', 'menu');
  lista.hidden = true;

  const itensClicaveis = () => [...lista.querySelectorAll('[role="menuitem"]:not([disabled])')];

  function fechar() {
    lista.hidden = true;
    botao.setAttribute('aria-expanded', 'false');
  }

  function abrir() {
    lista.hidden = false;
    botao.setAttribute('aria-expanded', 'true');
    const primeiro = itensClicaveis()[0];
    if (primeiro) primeiro.focus();
  }

  function alternar() {
    if (lista.hidden) abrir(); else fechar();
  }

  for (const item of itens) {
    const li = document.createElement('li');
    li.setAttribute('role', 'none');
    if ('elemento' in item) {
      // Elemento customizado (ex.: campo de input); inserido como está, não fecha o menu
      li.appendChild(item.elemento);
    } else {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'menuitem');
      btn.textContent = item.rotulo;
      btn.addEventListener('click', () => { fechar(); botao.focus(); item.aoEscolher(); });
      li.appendChild(btn);
    }
    lista.appendChild(li);
  }

  // Navegação por teclado dentro da lista
  lista.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.key !== 'Escape') return;
    const focados = itensClicaveis();
    const idx = focados.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const proximo = idx < focados.length - 1 ? idx + 1 : 0;
      focados[proximo]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const anterior = idx > 0 ? idx - 1 : focados.length - 1;
      focados[anterior]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      fechar();
      botao.focus();
    }
  });

  // Botão: Enter/Espaço/↓ abrem
  botao.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      abrir();
    }
  });

  botao.addEventListener('click', alternar);

  // Clique fora fecha
  wrapper.addEventListener('focusout', (e) => {
    if (e.relatedTarget) {
      if (!wrapper.contains(e.relatedTarget)) fechar();
      return;
    }
    setTimeout(() => {
      if (!wrapper.contains(document.activeElement)) fechar();
    }, 0);
  });

  wrapper.append(botao, lista);
  return wrapper;
}
