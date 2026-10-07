(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Saved items (localStorage, with safe fallback) ---------- */
  var KEY = 'stride-saved';
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { saved = []; }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) { /* ignore */ } }

  /* ---------- Mobile menu ---------- */
  var toggle = $('.menu-toggle');
  var nav = $('#site-nav');
  var desktop = window.matchMedia('(min-width: 900px)');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { setMenu(false); toggle.focus(); }
  });
  var onViewport = function () { if (desktop.matches) setMenu(false); };
  if (desktop.addEventListener) desktop.addEventListener('change', onViewport); else desktop.addListener(onViewport);

  /* ---------- Collection: search, filter, sort ---------- */
  var grid = $('#grid');
  var cards = $$('.card', grid);
  var search = $('#search');
  var sort = $('#sort');
  var count = $('#result-count');
  var empty = $('#empty');
  var chips = $$('.chip');
  var state = { filter: 'all', query: '', sort: 'featured' };

  function render() {
    var q = state.query.trim().toLowerCase();
    var shown = cards.filter(function (c) {
      var d = c.dataset;
      var byCat = state.filter === 'all' ||
        (state.filter === 'saved' ? saved.indexOf(d.id) > -1 : d.category === state.filter);
      var hay = (d.name + ' ' + d.category + ' ' + d.details).toLowerCase();
      return byCat && (!q || hay.indexOf(q) > -1);
    });
    var by = {
      'featured': function (a, b) { return a.dataset.order - b.dataset.order; },
      'price-asc': function (a, b) { return a.dataset.price - b.dataset.price; },
      'price-desc': function (a, b) { return b.dataset.price - a.dataset.price; },
      'name': function (a, b) { return a.dataset.name.localeCompare(b.dataset.name); }
    }[state.sort];
    shown.sort(by);
    cards.forEach(function (c) { c.hidden = shown.indexOf(c) === -1; });
    shown.forEach(function (c) { grid.appendChild(c); });
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.filter === state.filter)); });
    count.textContent = 'Showing ' + shown.length + ' of ' + cards.length + ' styles';
    empty.hidden = shown.length > 0;
    if (!shown.length && state.filter === 'saved' && !q) {
      empty.querySelector('strong').textContent = 'You have not saved any shoes yet.';
      empty.querySelector('p:nth-of-type(2)').textContent = 'Use the heart on a product to save it here.';
    } else {
      empty.querySelector('strong').textContent = 'No shoes match your search.';
      empty.querySelector('p:nth-of-type(2)').textContent = 'Try a different word or clear the filters.';
    }
  }

  function setFilter(f) { state.filter = f; render(); }

  chips.forEach(function (c) { c.addEventListener('click', function () { setFilter(c.dataset.filter); }); });
  $$('a[data-filter]').forEach(function (a) {
    a.addEventListener('click', function () { setFilter(a.dataset.filter); });
  });
  search.addEventListener('input', function () { state.query = search.value; render(); });
  sort.addEventListener('change', function () { state.sort = sort.value; render(); });
  $('#reset').addEventListener('click', function () {
    state = { filter: 'all', query: '', sort: 'featured' };
    search.value = ''; sort.value = 'featured'; render(); search.focus();
  });

  /* ---------- Saving ---------- */
  var savedLink = $('.saved-link');
  var savedCount = $('.saved-count');
  function syncSaved() {
    savedCount.textContent = saved.length;
    savedCount.dataset.zero = String(saved.length === 0);
    savedLink.setAttribute('aria-label', 'Saved items: ' + saved.length);
    cards.forEach(function (c) {
      var on = saved.indexOf(c.dataset.id) > -1;
      var b = $('.save', c);
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', (on ? 'Remove ' : 'Save ') + c.dataset.name + (on ? ' from saved' : ''));
    });
  }
  function toggleSaved(id) {
    var i = saved.indexOf(id);
    if (i > -1) saved.splice(i, 1); else saved.push(id);
    persist(); syncSaved();
    if (state.filter === 'saved') render();
  }
  grid.addEventListener('click', function (e) {
    var s = e.target.closest('.save');
    if (s) toggleSaved(s.closest('.card').dataset.id);
  });

  /* ---------- Details dialog ---------- */
  var dlg = $('#details');
  var current = null;
  var opener = null;
  function openDetails(card, btn) {
    var d = card.dataset;
    current = d.id; opener = btn;
    $('#d-img').src = d.img; $('#d-img').alt = d.alt;
    $('#d-cat').textContent = d.category;
    $('#d-title').textContent = d.name;
    $('#d-price').textContent = '$' + d.price + ' (demo price)';
    $('#d-text').textContent = d.details;
    syncDialogSave();
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function syncDialogSave() {
    var on = saved.indexOf(current) > -1;
    var b = $('.d-save');
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Saved' : 'Save for later';
  }
  grid.addEventListener('click', function (e) {
    var b = e.target.closest('.details-btn');
    if (b) openDetails(b.closest('.card'), b);
  });
  $('.d-save').addEventListener('click', function () { toggleSaved(current); syncDialogSave(); });
  $('.d-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { if (opener) opener.focus(); });

  /* ---------- Featured gallery ---------- */
  var stage = $('#featured-img');
  $$('.thumb').forEach(function (t) {
    t.addEventListener('click', function () {
      stage.src = t.dataset.src; stage.alt = t.dataset.alt;
      $$('.thumb').forEach(function (o) { o.setAttribute('aria-pressed', String(o === t)); });
    });
  });

  /* ---------- Newsletter (demo, client-side validation only) ---------- */
  var form = $('#news-form');
  var email = $('#email');
  var msg = $('#news-msg');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = email.value.trim();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    email.setAttribute('aria-invalid', String(!ok));
    msg.className = 'form-msg ' + (ok ? 'is-ok' : 'is-error');
    msg.textContent = ok
      ? 'Thanks. This is a demo, so nothing was stored or sent.'
      : 'Please enter a valid email address, for example you@example.com.';
    if (ok) form.reset(); else email.focus();
  });

  syncSaved();
  render();
})();
