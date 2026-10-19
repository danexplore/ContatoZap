// DOM mínimo para exercitar os módulos reais sem navegador ou dependências.
export function montarDom(html) {
  const ouvintes = new Map();
  let document;
  const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  function combina(el, seletor) {
    return seletor.split(',').some((parte) => {
      parte = parte.trim();
      const espaco = parte.lastIndexOf(' ');
      if (espaco >= 0) return combina(el, parte.slice(espaco + 1)) && Boolean(el.parentElement?.closest(parte.slice(0, espaco)));
      const negativos = [...parte.matchAll(/:not\(([^)]+)\)/g)];
      parte = parte.replace(/:not\([^)]+\)/g, '');
      if (negativos.some((m) => combina(el, m[1]))) return false;
      const tag = parte.match(/^[a-z]+/i)?.[0];
      if (tag && el.tagName !== tag.toUpperCase()) return false;
      for (const m of parte.matchAll(/#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:="([^"\]]*)")?\]/g)) {
        if (m[1] && el.id !== m[1]) return false;
        if (m[2] && !el.classList.contains(m[2])) return false;
        if (m[3]) {
          const valor = m[3].startsWith('data-') ? el.dataset[camel(m[3].slice(5))] : el.getAttribute(m[3]);
          if (valor == null || (m[4] !== undefined && valor !== m[4])) return false;
        }
      }
      return true;
    });
  }
  function elemento(tag) {
    const eventos = new Map();
    const classes = new Set();
    const atributos = new Map();
    const el = {
      tagName: tag.toUpperCase(), children: [], dataset: {}, style: { setProperty(k, v) { this[k] = v; } },
      parentElement: null, value: '', hidden: false, disabled: false, textContent: '', scrollTop: 0, scrollLeft: 0,
      offsetLeft: 0, offsetWidth: 20, clientWidth: 1000,
      get className() { return [...classes].join(' '); },
      set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
      classList: { add: (...cs) => cs.forEach((c) => classes.add(c)), remove: (c) => classes.delete(c), contains: (c) => classes.has(c), toggle(c, force = !classes.has(c)) { if (force) classes.add(c); else classes.delete(c); } },
      setAttribute(k, v) { atributos.set(k, String(v)); if (k === 'id') el.id = v; if (k === 'class') el.className = v; if (k.startsWith('data-')) el.dataset[camel(k.slice(5))] = String(v); },
      getAttribute(k) { if (k === 'disabled') return el.disabled ? '' : null; if (k === 'tabindex') return el.tabIndex == null ? null : String(el.tabIndex); return atributos.get(k) ?? el[k] ?? null; },
      removeAttribute(k) { atributos.delete(k); },
      get childElementCount() { return el.children.length; },
      get isConnected() { return document.body.contains(el); },
      appendChild(child) { if (typeof child === 'string') return child; if (child.tagName === 'FRAGMENT') { el.append(...child.children); return child; } child.remove(); child.parentElement = el; el.children.push(child); return child; },
      append(...cs) { cs.forEach((c) => el.appendChild(c)); },
      replaceChildren(...cs) { for (const c of el.children) c.parentElement = null; el.children = []; el.append(...cs); },
      remove() { if (el.parentElement) el.parentElement.children = el.parentElement.children.filter((c) => c !== el); el.parentElement = null; },
      contains(child) { return child === el || el.children.some((c) => c.contains(child)); },
      closest(s) { return combina(el, s) ? el : el.parentElement?.closest(s) || null; },
      querySelectorAll(s) { return el.children.flatMap((c) => [...(combina(c, s) ? [c] : []), ...c.querySelectorAll(s)]); },
      querySelector(s) { return el.querySelectorAll(s)[0] || null; },
      addEventListener(tipo, fn) { if (!eventos.has(tipo)) eventos.set(tipo, new Set()); eventos.get(tipo).add(fn); },
      removeEventListener(tipo, fn) { eventos.get(tipo)?.delete(fn); },
      disparar(tipo, props = {}) {
        const evento = { target: el, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.parou = true; }, ...props };
        el.emitir(tipo, evento);
        return evento;
      },
      emitir(tipo, evento) { for (const fn of eventos.get(tipo) || []) fn(evento); if (!evento.parou) { if (el.parentElement) el.parentElement.emitir(tipo, evento); else document.emitir(tipo, evento); } },
      focus() { document.activeElement = el; },
      scrollIntoView() { el.rolou = true; },
    };
    if (tag === 'template') el.content = { firstElementChild: elemento('svg') };
    return el;
  }
  document = {
    createElement: elemento, createElementNS: (_, tag) => elemento(tag), createDocumentFragment: () => elemento('fragment'),
    hidden: false,
    getElementById(id) { return document.body.querySelector('#' + id); },
    querySelector: (s) => document.body.querySelector(s), querySelectorAll: (s) => document.body.querySelectorAll(s),
    contains: (el) => document.body.contains(el),
    addEventListener(tipo, fn) { if (!ouvintes.has(tipo)) ouvintes.set(tipo, new Set()); ouvintes.get(tipo).add(fn); },
    removeEventListener(tipo, fn) { ouvintes.get(tipo)?.delete(fn); },
    emitir(tipo, e) { for (const fn of ouvintes.get(tipo) || []) fn(e); },
  };
  document.body = elemento('body');
  document.documentElement = elemento('html');
  document.activeElement = document.body;
  // Só elementos com id e controles de modo são necessários no shell estático.
  for (const m of html.matchAll(/<([a-z][\w-]*)\b([^>]*?)>/gi)) {
    if (!/\bid="|data-modo=|data-tamanho-grade=|class="app-header/.test(m[2])) continue;
    const el = elemento(m[1]);
    for (const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g)) el.setAttribute(a[1], a[2]);
    el.hidden = /\bhidden\b/.test(m[2]);
    document.body.appendChild(el);
  }
  return document;
}
