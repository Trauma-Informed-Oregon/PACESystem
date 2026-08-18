(() => {
  'use strict';

  const CATEGORIES = ['Presence', 'Attune', 'Connect', 'Energy'];
  const STARTER_NAMES = {
    Presence: ['Environmental Scan', 'Feet on Floor', 'Workspace Check'],
    Attune: ['Meeting Pace', 'One Word Check', 'Permission Statement'],
    Connect: ['Rhythm Together', 'Three Movements', 'Count Together'],
    Energy: ['Fist to Five', 'One Thing Less', 'Stop Signal']
  };
  const DEFAULT_SEQUENCE = {
    Presence: 'Environmental Scan',
    Attune: 'Meeting Pace',
    Connect: 'Rhythm Together',
    Energy: 'Fist to Five'
  };
  const CATEGORY_COPY = {
    Presence: 'External orientation to the immediate environment.',
    Attune: 'Acknowledge capacity without requiring explanation.',
    Connect: 'Shared rhythm, attention, or movement without personal content.',
    Energy: 'Make pace, limits, and workload visible enough to work with.'
  };
  const CATEGORY_WHY = {
    Presence: 'Looking outward gives the brain current information about the environment. P.A.C.E. starts here before the group is asked to do anything together.',
    Attune: 'People arrive with different amounts of capacity. Attune makes room for that difference without asking anyone to explain why.',
    Connect: 'Simple coordinated action asks the group to notice one another without requiring personal disclosure.',
    Energy: 'A team can work better with limits it can see. Energy closes the sequence by naming pace, stopping points, or what can be reduced.'
  };

  // Soft gate for a static GitHub Pages build. This is not a security boundary.
  // Current access code: TIO-PACE-4827
  // Change both the code and hash before wider distribution if desired.
  const ACCESS_CODE = 'TIO-PACE-4827';

  let cards = [];
  let currentView = 'home';
  let builderStep = 0;
  let builderMode = 'starter';
  let selected = { Presence: null, Attune: null, Connect: null, Energy: null };
  let runSequence = [];
  let runIndex = 0;
  let timerRemaining = 0;
  let timerId = null;
  let timerRunning = false;
  let tooltip = null;

  const memoryStorage = new Map();
  const storage = {
    get(key) { try { return window.localStorage.getItem(key); } catch { return memoryStorage.has(key) ? memoryStorage.get(key) : null; } },
    set(key, value) { try { window.localStorage.setItem(key, value); } catch { memoryStorage.set(key, value); } },
    remove(key) { try { window.localStorage.removeItem(key); } catch { memoryStorage.delete(key); } }
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    try {
      const response = await fetch('assets/cards.json');
      if (!response.ok) throw new Error('Card data could not be loaded.');
      cards = await response.json();
    } catch (error) {
      const embedded = document.getElementById('embedded-cards');
      if (embedded) cards = JSON.parse(embedded.textContent);
      else console.error(error);
    }

    bindNavigation();
    bindHome();
    bindBuilder();
    bindReview();
    bindRun();
    bindOrganizations();
    bindLibrary();
    bindInfoButtons();
    updateAccessUI();
    renderSavedSequences();
    showView('home', false);

    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  }

  function bindNavigation() {
    $$('[data-view]').forEach(el => el.addEventListener('click', () => {
      const view = el.dataset.view;
      if (view === 'builder') renderBuilder();
      showView(view);
    }));

    const menuButton = $('.menu-button');
    const nav = $('#site-nav');
    menuButton?.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
    });

    nav?.addEventListener('click', () => {
      menuButton?.setAttribute('aria-expanded', 'false');
      nav.classList.remove('open');
    });
  }

  function showView(name, focus = true) {
    if (name === 'library' && !hasFullAccess()) name = 'organizations';
    currentView = name;
    document.body.classList.toggle('run-active', name === 'run');
    $$('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
    $$('.site-nav [data-view]').forEach(btn => {
      if (btn.dataset.view === name || (name === 'builder' && btn.dataset.view === 'home') || (name === 'review' && btn.dataset.view === 'home') || (name === 'run' && btn.dataset.view === 'home') || (name === 'complete' && btn.dataset.view === 'home')) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    if (focus) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => $('#main')?.focus({ preventScroll: true }));
    }
  }

  function bindHome() {
    $('#build-starter')?.addEventListener('click', () => startBuilder('starter'));
    $('#run-starter')?.addEventListener('click', () => {
      selected = {};
      CATEGORIES.forEach(cat => selected[cat] = findCard(cat, DEFAULT_SEQUENCE[cat]));
      prepareReview();
    });
  }

  function bindInfoButtons() {
    $$('.info-button').forEach(button => {
      button.addEventListener('click', () => toggleHomeInfo(button));
      button.addEventListener('mouseenter', () => showTooltip(button, CATEGORY_WHY[capitalize(button.dataset.info)]));
      button.addEventListener('mouseleave', hideTooltip);
      button.addEventListener('focus', () => showTooltip(button, CATEGORY_WHY[capitalize(button.dataset.info)]));
      button.addEventListener('blur', hideTooltip);
    });
  }

  function toggleHomeInfo(button) {
    const cat = capitalize(button.dataset.info);
    const panel = $('#home-info');
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    $$('.info-button').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    if (isOpen) {
      panel.hidden = true;
      panel.textContent = '';
      return;
    }
    button.setAttribute('aria-expanded', 'true');
    panel.innerHTML = `<p><strong>${cat}:</strong> ${escapeHtml(CATEGORY_WHY[cat])}</p>`;
    panel.hidden = false;
  }

  function showTooltip(button, text) {
    if (!matchMedia('(hover: hover)').matches) return;
    hideTooltip();
    tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    const rect = button.getBoundingClientRect();
    const top = Math.min(window.innerHeight - tooltip.offsetHeight - 10, rect.bottom + 8);
    const left = Math.max(8, Math.min(window.innerWidth - tooltip.offsetWidth - 8, rect.right - tooltip.offsetWidth));
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }
  function hideTooltip() { tooltip?.remove(); tooltip = null; }

  function bindBuilder() {
    $('#category-info-button')?.addEventListener('click', () => {
      const button = $('#category-info-button');
      const panel = $('#category-info');
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
      if (!open) panel.innerHTML = `<p>${escapeHtml(CATEGORY_WHY[CATEGORIES[builderStep]])}</p>`;
    });

    $('#builder-back')?.addEventListener('click', () => {
      if (builderStep === 0) showView('home');
      else { builderStep -= 1; renderBuilder(); window.scrollTo(0, 0); }
    });
    $('#builder-next')?.addEventListener('click', () => {
      if (!selected[CATEGORIES[builderStep]]) return;
      if (builderStep < 3) { builderStep += 1; renderBuilder(); window.scrollTo(0, 0); }
      else prepareReview();
    });
    $('#more-activities')?.addEventListener('click', () => {
      if (!hasFullAccess()) { showView('organizations'); return; }
      builderMode = 'full';
      renderBuilder();
    });
    $('#library-search')?.addEventListener('input', renderActivityChoices);
    $('#time-filter')?.addEventListener('change', renderActivityChoices);
  }

  function startBuilder(mode = 'starter') {
    builderMode = mode === 'full' && hasFullAccess() ? 'full' : 'starter';
    builderStep = 0;
    selected = { Presence: null, Attune: null, Connect: null, Energy: null };
    $('#library-search').value = '';
    $('#time-filter').value = 'all';
    renderBuilder();
    showView('builder');
  }

  function renderBuilder() {
    const cat = CATEGORIES[builderStep];
    $('#builder-step-label').textContent = `Step ${builderStep + 1} of 4`;
    $('#builder-title').textContent = `Choose a ${cat} activity`;
    $('#builder-category-copy').textContent = CATEGORY_COPY[cat];
    $('#category-info-button').setAttribute('aria-expanded', 'false');
    $('#category-info').hidden = true;
    $('#category-info').textContent = '';
    $('#full-library-tools').hidden = builderMode !== 'full';
    $('#access-status').hidden = builderMode !== 'full';
    $('#more-activities').hidden = builderMode === 'full' || !hasFullAccess();
    if (hasFullAccess() && builderMode === 'starter') $('#more-activities').hidden = false;

    $$('.progress-step').forEach((step, index) => {
      step.classList.toggle('current', index === builderStep);
      step.classList.toggle('done', index < builderStep || !!selected[CATEGORIES[index]] && index !== builderStep);
    });

    renderActivityChoices();
    updateBuilderSummary();
    $('#builder-back').textContent = builderStep === 0 ? 'Back to Starter Pack' : `Back to ${CATEGORIES[builderStep - 1]}`;
    $('#builder-next').textContent = builderStep === 3 ? 'Review sequence' : `Continue to ${CATEGORIES[builderStep + 1]}`;
    $('#builder-next').disabled = !selected[cat];
  }

  function renderActivityChoices() {
    const cat = CATEGORIES[builderStep];
    const list = $('#activity-list');
    const search = ($('#library-search')?.value || '').trim().toLowerCase();
    const max = $('#time-filter')?.value || 'all';
    let choices = cards.filter(c => c.Category === cat);

    if (builderMode === 'starter') {
      choices = STARTER_NAMES[cat].map(name => findCard(cat, name)).filter(Boolean);
    } else {
      choices = choices.filter(card => card.Section !== 'Starter').filter(card => {
        const haystack = `${card['Card Name']} ${card.Subtitle} ${card.How} ${card.Why}`.toLowerCase();
        const matchesSearch = !search || haystack.includes(search);
        const matchesTime = max === 'all' || Number(card.Seconds) <= Number(max);
        return matchesSearch && matchesTime;
      });
    }

    list.innerHTML = '';
    if (!choices.length) {
      list.innerHTML = '<p class="plain-note">No activities match those filters.</p>';
      return;
    }

    choices.forEach(card => {
      const selectedCard = selected[cat];
      const isSelected = selectedCard && selectedCard.Key === card.Key;
      const row = document.createElement('div');
      row.className = `activity-option ${cat.toLowerCase()}${isSelected ? ' selected' : ''}`;
      const main = document.createElement('button');
      main.type = 'button';
      main.className = 'activity-main-button';
      main.setAttribute('aria-pressed', String(!!isSelected));
      main.innerHTML = `<strong><span class="activity-check" aria-hidden="true"></span>${escapeHtml(card['Card Name'])}</strong><span class="instruction-preview">${escapeHtml(firstSentence(card.How))}</span>`;
      main.addEventListener('click', () => selectCard(card));
      const time = document.createElement('span');
      time.className = 'activity-time';
      time.textContent = card['Time Text'];
      const whyButton = document.createElement('button');
      whyButton.type = 'button';
      whyButton.className = 'activity-why-button';
      whyButton.textContent = 'Why?';
      whyButton.setAttribute('aria-expanded', 'false');
      const why = document.createElement('div');
      why.className = 'activity-why';
      why.hidden = true;
      why.innerHTML = `<p>${escapeHtml(card.Why)}</p>`;
      whyButton.addEventListener('click', () => {
        const open = whyButton.getAttribute('aria-expanded') === 'true';
        whyButton.setAttribute('aria-expanded', String(!open));
        why.hidden = open;
      });
      whyButton.addEventListener('mouseenter', () => showTooltip(whyButton, card.Why));
      whyButton.addEventListener('mouseleave', hideTooltip);
      whyButton.addEventListener('focus', () => showTooltip(whyButton, card.Why));
      whyButton.addEventListener('blur', hideTooltip);
      row.append(main, time, whyButton, why);
      list.appendChild(row);
    });
  }

  function selectCard(card) {
    selected[card.Category] = card;
    renderActivityChoices();
    updateBuilderSummary();
    $('#builder-next').disabled = false;
  }

  function updateBuilderSummary() {
    const count = CATEGORIES.filter(cat => selected[cat]).length;
    const seconds = CATEGORIES.reduce((sum, cat) => sum + (selected[cat]?.Seconds || 0), 0);
    $('#builder-selected-count').textContent = `${count} of 4 selected`;
    $('#builder-total').textContent = formatDuration(seconds);
  }

  function bindReview() {
    $('#start-run')?.addEventListener('click', () => startRun());
    $('#save-sequence')?.addEventListener('click', saveCurrentSequence);
    $('#share-sequence')?.addEventListener('click', shareCurrentSequence);
  }

  function prepareReview() {
    if (!CATEGORIES.every(cat => selected[cat])) return;
    const list = $('#review-list');
    list.innerHTML = '';
    let total = 0;
    CATEGORIES.forEach(cat => {
      const card = selected[cat];
      total += Number(card.Seconds || 0);
      const row = document.createElement('div');
      row.className = `review-row ${cat.toLowerCase()}`;
      row.innerHTML = `<div class="review-letter" aria-hidden="true">${cat[0]}</div><div><h2>${escapeHtml(card['Card Name'])}</h2><p>${escapeHtml(firstSentence(card.How))}</p></div><time>${escapeHtml(card['Time Text'])}</time>`;
      list.appendChild(row);
    });
    $('#review-total').textContent = `About ${formatDuration(total)} total.`;
    showView('review');
  }

  function saveCurrentSequence() {
    const name = prompt('Name this sequence');
    if (!name) return;
    const items = CATEGORIES.map(cat => ({ category: cat, key: selected[cat].Key }));
    const saved = getSavedSequences();
    saved.unshift({ id: Date.now(), name: name.trim().slice(0, 80), items, created: new Date().toISOString() });
    storage.set('paceSavedSequences', JSON.stringify(saved.slice(0, 30)));
    $('#save-sequence').textContent = 'Saved';
    setTimeout(() => $('#save-sequence').textContent = 'Save on this device', 1800);
    renderSavedSequences();
  }

  async function shareCurrentSequence() {
    const text = sequenceText();
    try {
      if (navigator.share) await navigator.share({ title: 'Today’s P.A.C.E.', text });
      else { await navigator.clipboard.writeText(text); $('#share-sequence').textContent = 'Copied'; setTimeout(() => $('#share-sequence').textContent = 'Share sequence', 1800); }
    } catch (_) {}
  }

  function sequenceText() {
    return ['Today’s P.A.C.E.', ...CATEGORIES.map(cat => `${cat}: ${selected[cat]['Card Name']} (${selected[cat]['Time Text']})`)].join('\n');
  }

  function bindRun() {
    $('#exit-run')?.addEventListener('click', () => { stopTimer(); prepareReview(); });
    $('#run-info-button')?.addEventListener('click', () => {
      const button = $('#run-info-button');
      const panel = $('#run-why');
      const open = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!open));
      panel.hidden = open;
    });
    $('#timer-toggle')?.addEventListener('click', toggleTimer);
    $('#run-next')?.addEventListener('click', nextRunItem);
    $('#run-skip')?.addEventListener('click', nextRunItem);
    $('#run-again')?.addEventListener('click', startRun);
    $('#new-sequence')?.addEventListener('click', () => startBuilder(hasFullAccess() ? builderMode : 'starter'));
  }

  function startRun() {
    stopTimer();
    runSequence = CATEGORIES.map(cat => selected[cat]);
    runIndex = 0;
    renderRun();
    showView('run');
  }

  function renderRun() {
    stopTimer();
    const card = runSequence[runIndex];
    if (!card) return;
    timerRemaining = Number(card.Seconds || 0);
    $('#run-progress-text').textContent = `${runIndex + 1} of 4`;
    $('#run-progress-fill').style.width = `${(runIndex + 1) * 25}%`;
    $('#run-category').textContent = card.Category;
    $('#run-title').textContent = card['Card Name'];
    $('#run-subtitle').textContent = card.Subtitle || '';
    $('#run-instructions').textContent = card.How;
    $('#run-why').textContent = card.Why;
    $('#run-why').hidden = true;
    $('#run-info-button').setAttribute('aria-expanded', 'false');
    $('#timer-label').textContent = card['Time Text'];
    $('#timer-toggle').textContent = 'Start timer';
    $('#run-next').textContent = runIndex === 3 ? 'Finish' : 'Next activity';
    updateTimerDisplay();
  }

  function toggleTimer() {
    if (timerRunning) { pauseTimer(); return; }
    if (timerRemaining <= 0) timerRemaining = Number(runSequence[runIndex].Seconds || 0);
    timerRunning = true;
    $('#timer-toggle').textContent = 'Pause timer';
    timerId = setInterval(() => {
      timerRemaining -= 1;
      updateTimerDisplay();
      if (timerRemaining <= 0) {
        stopTimer(false);
        $('#timer-toggle').textContent = 'Restart timer';
        $('#timer-announcer').textContent = `${runSequence[runIndex]['Card Name']} timer finished. The group stays on this activity until the facilitator chooses Next.`;
      }
    }, 1000);
  }
  function pauseTimer() { clearInterval(timerId); timerId = null; timerRunning = false; $('#timer-toggle').textContent = 'Resume timer'; }
  function stopTimer(resetLabel = true) { clearInterval(timerId); timerId = null; timerRunning = false; if (resetLabel && $('#timer-toggle')) $('#timer-toggle').textContent = 'Start timer'; }
  function updateTimerDisplay() { $('#timer-display').textContent = clock(timerRemaining); }
  function nextRunItem() {
    stopTimer();
    if (runIndex < 3) { runIndex += 1; renderRun(); window.scrollTo(0, 0); }
    else showView('complete');
  }

  function bindOrganizations() {
    $('#unlock-button')?.addEventListener('click', unlockAccess);
    $('#access-code')?.addEventListener('keydown', event => { if (event.key === 'Enter') unlockAccess(); });
    $('#build-full')?.addEventListener('click', () => startBuilder('full'));
    $('#browse-full')?.addEventListener('click', () => { renderLibrary(); showView('library'); });
    $('#lock-full')?.addEventListener('click', () => {
      storage.remove('paceFullAccess');
      updateAccessUI();
      builderMode = 'starter';
    });
  }

  async function unlockAccess() {
    const input = $('#access-code');
    const message = $('#access-message');
    const value = input.value.trim();
    if (!value) { message.textContent = 'Enter your organization access code.'; return; }
    if (value.toUpperCase() === ACCESS_CODE) {
      storage.set('paceFullAccess', 'true');
      input.value = '';
      message.textContent = '';
      updateAccessUI();
    } else {
      message.textContent = 'That code did not match. Check the code and try again.';
    }
  }

  function hasFullAccess() { return storage.get('paceFullAccess') === 'true'; }
  function updateAccessUI() {
    const open = hasFullAccess();
    $('#locked-access').hidden = open;
    $('#unlocked-access').hidden = !open;
    $('#saved-sequences-section').hidden = !open || !getSavedSequences().length;
  }

  function renderSavedSequences() {
    const target = $('#saved-sequences');
    if (!target) return;
    const saved = getSavedSequences();
    target.innerHTML = '';
    saved.forEach(seq => {
      const row = document.createElement('div');
      row.className = 'saved-item';
      const names = seq.items.map(item => findCardByKey(item.key)?.['Card Name']).filter(Boolean).join(' · ');
      row.innerHTML = `<div><strong>${escapeHtml(seq.name)}</strong><small>${escapeHtml(names)}</small></div>`;
      const actions = document.createElement('div'); actions.className = 'saved-actions';
      const open = document.createElement('button'); open.type = 'button'; open.textContent = 'Open'; open.addEventListener('click', () => loadSaved(seq));
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Delete'; remove.addEventListener('click', () => deleteSaved(seq.id));
      actions.append(open, remove); row.append(actions); target.appendChild(row);
    });
    $('#saved-sequences-section').hidden = !hasFullAccess() || !saved.length;
  }
  function getSavedSequences() { try { return JSON.parse(storage.get('paceSavedSequences') || '[]'); } catch { return []; } }
  function loadSaved(seq) {
    selected = { Presence: null, Attune: null, Connect: null, Energy: null };
    seq.items.forEach(item => { const card = findCardByKey(item.key); if (card) selected[item.category] = card; });
    if (CATEGORIES.every(cat => selected[cat])) prepareReview();
  }
  function deleteSaved(id) {
    storage.set('paceSavedSequences', JSON.stringify(getSavedSequences().filter(s => s.id !== id)));
    renderSavedSequences();
  }

  function bindLibrary() {
    $('#all-search')?.addEventListener('input', renderLibrary);
    $('#all-category')?.addEventListener('change', renderLibrary);
    $('#all-time')?.addEventListener('change', renderLibrary);
    $('#library-build')?.addEventListener('click', () => startBuilder('full'));
  }

  function renderLibrary() {
    if (!hasFullAccess()) return;
    const search = ($('#all-search')?.value || '').trim().toLowerCase();
    const category = $('#all-category')?.value || 'all';
    const max = $('#all-time')?.value || 'all';
    const filtered = cards.filter(card => card.Section !== 'Starter').filter(card => {
      const hay = `${card['Card Name']} ${card.Subtitle} ${card.How} ${card.Why}`.toLowerCase();
      return (!search || hay.includes(search)) && (category === 'all' || card.Category === category) && (max === 'all' || Number(card.Seconds) <= Number(max));
    });
    $('#library-count').textContent = `${filtered.length} activities shown`;
    const list = $('#library-list'); list.innerHTML = '';
    filtered.forEach(card => {
      const row = document.createElement('article');
      row.className = `library-item ${card.Category.toLowerCase()}`;
      row.innerHTML = `<div class="library-item-category">${escapeHtml(card.Category)}</div><div><h2>${escapeHtml(card['Card Name'])}</h2><p>${escapeHtml(card.How)}</p><details><summary>Why this activity?</summary><p>${escapeHtml(card.Why)}</p></details></div><time>${escapeHtml(card['Time Text'])}</time>`;
      list.appendChild(row);
    });
  }

  function findCard(category, name) { return cards.find(card => card.Category === category && card['Card Name'] === name); }
  function findCardByKey(key) { return cards.find(card => card.Key === key); }
  function firstSentence(text) {
    if (!text) return '';
    const clean = String(text).replace(/\s+/g, ' ').trim();
    const match = clean.match(/^(.{1,170}?[.!?])(?:\s|$)/);
    return match ? match[1] : clean.slice(0, 170) + (clean.length > 170 ? '…' : '');
  }
  function formatDuration(seconds) {
    const min = Math.floor(seconds / 60), sec = seconds % 60;
    if (!min) return `${sec} seconds`;
    if (!sec) return `${min} minute${min === 1 ? '' : 's'}`;
    return `${min} min ${sec} sec`;
  }
  function clock(seconds) { const s = Math.max(0, seconds); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
  function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c])); }
})();
