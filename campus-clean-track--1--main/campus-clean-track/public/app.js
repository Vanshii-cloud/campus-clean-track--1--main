/* Campus Clean Track — single-page frontend */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const app = $('#app');
  const state = { user: null, token: localStorage.getItem('cct_token'), meta: null, feedFilter: 'all' };

  // ---------- icons ----------
  const ic = (d, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const I = {
    leaf: ic('<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>'),
    pin: ic('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>', 15),
    clock: ic('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', 15),
    alert: ic('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>', 14),
    up: ic('<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>', 13),
    arrow: ic('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', 17),
    back: ic('<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>', 17),
    shield: ic('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
    people: ic('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    spark: ic('<path d="M9.94 14.06 3 12l6.94-2.06L12 3l2.06 6.94L21 12l-6.94 2.06L12 21z"/>'),
    award: ic('<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>', 16),
    tree: ic('<path d="M12 22v-7"/><path d="M12 15a6 6 0 0 0 6-6c0-3-3-6-6-8-3 2-6 5-6 8a6 6 0 0 0 6 6Z"/>', 16),
    broom: ic('<path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/>', 16),
    sprout: ic('<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>', 16),
    cal: ic('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', 14),
    check: ic('<path d="M20 6 9 17l-5-5"/>', 15),
    flag: ic('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>', 16),
  };
  const badgeIcon = n => n === 'Eco Champion' ? I.award : n === 'Tree Guardian' ? I.tree : n === 'Campus Cleaner' ? I.broom : I.sprout;

  // ---------- helpers ----------
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function ago(iso) {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `about ${m} minute${m > 1 ? 's' : ''} ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `about ${h} hour${h > 1 ? 's' : ''} ago`;
    const d = Math.round(h / 24);
    return `about ${d} day${d > 1 ? 's' : ''} ago`;
  }
  const statusLabel = { pending: 'Pending', in_progress: 'In Progress', resolved: 'Resolved' };
  function fmtDate(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(',', '');
  }
  let toastTimer;
  function toast(msg, bad) {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = 'toast', 3200);
  }
  async function api(path, opts = {}) {
    const res = await fetch('/api' + path, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(state.token ? { Authorization: 'Bearer ' + state.token } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && state.token) { logout(true); }
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }
  function setSession(token, user) {
    state.token = token; state.user = user; localStorage.setItem('cct_token', token); renderNav();
  }
  function logout(silent) {
    state.token = null; state.user = null; localStorage.removeItem('cct_token'); renderNav();
    if (!silent) { toast('Signed out.'); }
    route();
  }
  function requireAuth() {
    if (state.user) return true;
    toast('Please sign in to continue.', true);
    sessionStorage.setItem('cct_next', location.hash || '#/');
    location.hash = '#/login';
    return false;
  }

  // ---------- nav ----------
  function renderNav() {
    const r = $('#navRight');
    if (state.user) {
      const u = state.user;
      r.innerHTML = `<div class="userchip">
        <span class="avatar">${esc(u.name[0])}</span>
        <span class="nm"><b>${esc(u.name)}</b>${u.role === 'officer' ? ' <span class="badge" style="padding:2px 8px;font-size:11px">Officer</span>' : ''}</span>
        <span class="badge" style="padding:3px 10px;font-size:12px">${badgeIcon(u.badge)} ${esc(u.badge)}</span><span class="pts">${u.points} pts</span>
        <button class="linkbtn" id="logoutBtn">Sign out</button></div>`;
      $('#logoutBtn').onclick = () => logout();
    } else {
      r.innerHTML = `<a class="btn btn-primary" href="#/login">Sign in</a>`;
    }
  }
  function markActive(name) {
    document.querySelectorAll('#links a').forEach(a => a.classList.toggle('active', a.dataset.route === name));
  }

  // ---------- components ----------
  function reportCard(r) {
    const officerCtl = state.user?.role === 'officer' ? `<div class="officer">
      <button class="btn btn-outline" style="padding:5px 10px;font-size:12.5px" data-verify="${r.id}">${r.verified ? 'Unverify' : 'Verify'}</button>
      <button class="btn btn-outline" style="padding:5px 10px;font-size:12.5px;color:#b91c1c" data-del="${r.id}">Delete</button>
      <select data-status="${r.id}" aria-label="Change status">${Object.entries(statusLabel).map(([k, v]) => `<option value="${k}" ${k === r.status ? 'selected' : ''}>${v}</option>`).join('')}</select></div>` : '';
    return `<article class="card rcard">
      ${r.photo ? `<img class="rphoto" src="${r.photo}" alt="Photo of the reported issue" loading="lazy">` : ''}
      <div class="rtop"><span style="display:flex;gap:6px;align-items:center"><span class="chip ${r.status}">${statusLabel[r.status]}</span>${r.verified ? `<span class="chip vfy" title="Verified by a campus officer">${I.shield.replace('width="18" height="18"','width="12" height="12"')} Verified</span>` : ''}</span><span style="display:flex;gap:6px;align-items:center">${I.clock} ${ago(r.createdAt)}</span></div>
      <h3>${esc(r.title)}</h3>
      <p>${esc(r.description)}</p>
      <div class="tags"><span class="tag2">${esc(r.category)}</span><span class="tag2">${I.pin} ${esc(r.location)}</span></div>
      ${r.severity !== 'low' ? `<div class="tags"><span class="tag2 sev-${r.severity}">${I.alert} ${r.severity[0].toUpperCase() + r.severity.slice(1)} severity</span></div>` : ''}
      ${officerCtl}
      <div class="rfoot"><span>by <b>${esc(r.author)}</b></span>
        <button class="vote ${r.upvoted ? 'on' : ''}" data-vote="${r.id}" title="Upvote">${I.up} ${r.upvotes}</button></div>
    </article>`;
  }
  function wireReportActions(root, reload) {
    root.querySelectorAll('[data-vote]').forEach(b => b.onclick = async () => {
      if (!requireAuth()) return;
      try { await api(`/reports/${b.dataset.vote}/upvote`, { method: 'POST' }); reload(); } catch (e) { toast(e.message, true); }
    });
    root.querySelectorAll('[data-verify]').forEach(b => b.onclick = async () => {
      try { await api(`/reports/${b.dataset.verify}/verify`, { method: 'PATCH' }); toast('Verification updated.'); reload(); } catch (e) { toast(e.message, true); }
    });
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (!confirm('Delete this report?')) return;
      try { await api(`/reports/${b.dataset.del}`, { method: 'DELETE' }); toast('Report deleted.'); reload(); } catch (e) { toast(e.message, true); }
    });
    root.querySelectorAll('[data-status]').forEach(s => s.onchange = async () => {
      try { await api(`/reports/${s.dataset.status}/status`, { method: 'PATCH', body: { status: s.value } }); toast('Status updated.'); reload(); }
      catch (e) { toast(e.message, true); }
    });
  }

  function openReportModal() {
    if (!requireAuth()) return;
    const m = state.meta;
    const root = $('#modalRoot');
    root.innerHTML = `<div class="overlay" id="ov"><form class="modal" id="rform" novalidate>
      <h2>Report an issue</h2><p class="sub">Earn +${m.points.report} green points for every verified report.</p>
      <div class="fld"><label for="rt">Title</label><input id="rt" maxlength="120" placeholder="e.g. Overflowing bin behind the canteen" required></div>
      <div class="fld"><label for="rd">Description</label><textarea id="rd" maxlength="800" placeholder="What did you see? How long has it been there?"></textarea></div>
      <div class="fgrid">
        <div class="fld"><label for="rc">Category</label><select class="field" id="rc">${m.categories.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
        <div class="fld"><label for="rs">Severity</label><select class="field" id="rs"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select></div>
        <div class="fld full"><label for="rl">Location</label><input id="rl" maxlength="80" placeholder="e.g. Academic Block C" required></div>
        <div class="fld full"><label for="rp">Photo (optional)</label><input type="file" id="rp" accept="image/*"><img id="rprev" class="rphoto" style="display:none;margin-top:10px" alt="Preview"></div>
      </div>
      <div class="err" id="rerr"></div>
      <div class="modal-actions"><button type="button" class="btn btn-outline btn-lg" id="rcancel">Cancel</button><button class="btn btn-primary btn-lg" id="rsub">Submit report</button></div>
    </form></div>`;
    const close = () => root.innerHTML = '';
    $('#rcancel').onclick = close;
    $('#ov').onclick = e => { if (e.target.id === 'ov') close(); };
    let photo = null;
    $('#rp').onchange = e => {
      const f = e.target.files[0]; if (!f) { photo = null; $('#rprev').style.display = 'none'; return; }
      const img = new Image(); const url = URL.createObjectURL(f);
      img.onload = () => {
        const k = Math.min(1, 800 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        photo = c.toDataURL('image/jpeg', 0.7); URL.revokeObjectURL(url);
        $('#rprev').src = photo; $('#rprev').style.display = 'block';
      };
      img.onerror = () => { toast('Could not read that image.', true); };
      img.src = url;
    };
    $('#rform').onsubmit = async e => {
      e.preventDefault();
      const btn = $('#rsub'); btn.disabled = true;
      try {
        const out = await api('/reports', { method: 'POST', body: {
          title: $('#rt').value, description: $('#rd').value, category: $('#rc').value,
          severity: $('#rs').value, location: $('#rl').value, photo } });
        state.user = out.user; renderNav(); close();
        toast(`Report submitted! +${out.pointsEarned} green points`);
        if (location.hash === '#/feed' || location.hash === '#/' || location.hash === '') route(); else location.hash = '#/feed';
      } catch (err) { $('#rerr').textContent = err.message; btn.disabled = false; }
    };
    setTimeout(() => $('#rt').focus(), 30);
  }

  // ---------- pages ----------
  async function homePage() {
    markActive('home');
    const [stats, feed] = await Promise.all([api('/stats'), api('/reports?limit=3')]);
    const all = await api('/reports');
    const lb = await api('/leaderboard');
    app.innerHTML = `
      <section class="hero"><div class="hero-inner">
        <div>
          <span class="tag">${I.leaf} Swachh Bharat Mission · Campus Chapter</span>
          <h1>A cleaner campus,<br><em>one report at a time.</em></h1>
          <p class="lead">Spot a mess, report it in seconds, and watch campus officers resolve it in the open. Every report earns green points — and the leaderboard keeps the movement honest.</p>
          <div class="hero-cta"><button class="btn btn-primary btn-lg" id="heroReport">${I.spark} Report an issue</button>
            <a class="btn btn-ghost" href="#/leaderboard">View the leaderboard ${I.arrow}</a></div>
        </div>
        <div class="pulse">
          <div class="pulse-head"><h3>Live campus pulse</h3><span class="live"><i></i>LIVE</span></div>
          ${feed.reports.map(r => `<div class="pulse-item"><div class="row"><b>${esc(r.title)}</b><span class="chip ${r.status}">${statusLabel[r.status]}</span></div>
            <div class="meta">${I.pin.replace('width="15" height="15"', 'width="12" height="12"')} ${esc(r.location)} · ${ago(r.createdAt)} · ⇧ ${r.upvotes}</div></div>`).join('')}
          <div class="pulse-note">${I.shield.replace('width="18" height="18"', 'width="14" height="14"')} Reports are verified by campus officers before resolution</div>
          <a class="btn btn-ghost" href="#/feed">Open the live feed</a>
        </div>
      </div>
      <div class="hero-stats">
        <div><b>${stats.totalReports}</b><span>Reports filed</span></div>
        <div><b>${stats.resolved}</b><span>Resolved</span></div>
        <div><b>${stats.greenPoints.toLocaleString('en-IN')}</b><span>Green points</span></div>
        <div><b>${stats.volunteers}</b><span>Volunteers</span></div>
      </div></section>
      <section class="section"><div class="wrap">
        <div class="section-head"><div><div class="eyebrow">Live feed</div><h2>What needs fixing right now</h2></div>
          <a class="seeall" href="#/feed">Open live feed ${I.arrow}</a></div>
        <div id="homeFeed"></div>
      </div></section>
      <section class="section"><div class="wrap">
        <div class="eyebrow">Recognition</div><h2 style="font-size:clamp(30px,3.6vw,42px);margin:8px 0 26px">Top eco-warriors this semester</h2>
        <div class="lb-layout">
          <div>${lb.leaders.slice(0, 5).map(u => `<div class="lrow ${u.rank === 1 ? 'first' : ''}">
            <div class="rank r${u.rank}">${u.rank}</div>
            <div class="lname"><b>${esc(u.name)}</b><span>${esc(u.dept)} · ${u.reported} reported · ${u.resolved} resolved</span></div>
            <span class="badge">${badgeIcon(u.badge)} ${u.badge}</span>
            <span class="pts-pill">${I.leaf.replace('width="18" height="18"', 'width="16" height="16"')} ${u.points} pts</span></div>`).join('')}
            <a class="seeall" href="#/leaderboard">Full leaderboard ${I.arrow}</a></div>
          <aside class="side-dark"><h4>HOW GREEN POINTS WORK</h4>
            <ul class="rules" style="color:#e9f8ee">
              <li>${I.leaf} +${state.meta.points.report} points for every issue you report</li>
              <li>${I.shield} +${state.meta.points.resolved} bonus when an officer resolves your report</li>
              <li>${I.people} +${state.meta.points.firstDrive} for joining your first awareness drive</li></ul></aside>
        </div></div></section>
      <section class="section" style="padding-top:0"><div class="wrap"><div class="pledge-home">
        <div>${I.shield.replace('width="18" height="18"','width="26" height="26"')}<p>“I pledge to keep my campus clean, report what I cannot fix, and hold our spaces accountable — one green point at a time.”</p></div>
        <div class="pledge-actions"><button class="btn btn-primary btn-lg" id="homePledge" ${state.user?.pledged ? 'disabled' : ''}>${state.user?.pledged ? 'Pledge taken ✓' : 'Take the pledge'}</button><span id="homeVol">${stats.volunteers} volunteers and counting</span></div></div></div></section>
      <footer>report · track · resolve · earn green points</footer>`;
    $('#homePledge').onclick = async () => {
      if (!requireAuth()) return;
      try { const p = await api('/pledge', { method: 'POST' }); state.user = p.user; renderNav(); $('#homePledge').disabled = true; $('#homePledge').textContent = 'Pledge taken ✓'; $('#homeVol').textContent = `${p.volunteers} volunteers and counting`; toast('Pledge recorded. Thank you! 🌱'); } catch (e) { toast(e.message, true); }
    };
    $('#heroReport').onclick = openReportModal;
    feedInto($('#homeFeed'), all, true);
  }

  function feedInto(host, data, withFilters) {
    const render = (list, total) => {
      host.innerHTML = `<div class="filters" id="flt">${['all', 'pending', 'in_progress', 'resolved'].map(k =>
        `<button data-f="${k}" class="${state.feedFilter === k ? 'active' : ''}">${k === 'all' ? 'All' : statusLabel[k]}</button>`).join('')}
        <span class="count">${total} report${total === 1 ? '' : 's'}</span></div>
        <div class="grid3">${list.length ? list.map(reportCard).join('') : '<div class="empty">No reports here yet — be the first to report one.</div>'}</div>`;
      host.querySelectorAll('[data-f]').forEach(b => b.onclick = async () => { state.feedFilter = b.dataset.f; await load(); });
      wireReportActions(host, load);
    };
    async function load() {
      const q = state.feedFilter === 'all' ? '' : `?status=${state.feedFilter}`;
      const d = await api('/reports' + q);
      render(d.reports, d.total);
    }
    const initial = state.feedFilter === 'all' ? data : null;
    if (initial) render(initial.reports, initial.total); else load();
  }

  async function feedPage() {
    markActive('feed');
    app.innerHTML = `<section class="section"><div class="wrap">
      <div class="section-head"><div><div class="eyebrow">Live feed</div><h2>What needs fixing right now</h2>
        <p class="section-sub">Every report is public. Upvote issues that matter to you — officers prioritise what the campus cares about.</p></div>
        <button class="btn btn-primary btn-lg" id="newReport">${I.spark} Report an issue</button></div>
      <div id="feedHost"></div></div></section>`;
    $('#newReport').onclick = openReportModal;
    feedInto($('#feedHost'), null, true);
  }

  async function leaderboardPage() {
    markActive('leaderboard');
    const d = await api('/leaderboard');
    app.innerHTML = `<section class="section" style="padding-top:60px"><div class="wrap">
      <div class="eyebrow">Recognition</div><h2 style="font-size:clamp(34px,4vw,46px);margin-top:10px">Campus leaderboard</h2>
      <p class="section-sub">Every report, resolution and drive earns green points. Badges stack as you climb — Eco Champion at 400, Tree Guardian at 250, Campus Cleaner at 100.</p>
      <div class="lb-layout" style="margin-top:40px">
        <div>${d.leaders.map(u => `<div class="lrow ${u.rank === 1 ? 'first' : ''}">
          <div class="rank r${u.rank}">${u.rank}</div>
          <div class="lname"><b>${esc(u.name)}</b><span>${esc(u.dept)} · ${u.reported} reported · ${u.resolved} resolved</span></div>
          <span class="badge">${badgeIcon(u.badge)} ${u.badge}</span>
          <span class="pts-pill">${I.leaf.replace('width="18" height="18"', 'width="16" height="16"')} ${u.points} pts</span></div>`).join('')}</div>
        <aside class="side-light"><h3>${I.leaf} How to earn points</h3>
          <ul class="rules">
            <li>${I.spark} +${state.meta.points.report} points for every issue you report</li>
            <li>${I.shield} +${state.meta.points.resolved} bonus when an officer resolves your report</li>
            <li>${I.people} +${state.meta.points.firstDrive} points the first time you join a drive</li></ul>
          <div class="badgebox">Badges: ${d.badges.slice().reverse().map(b => b.name).reverse().join(' · ')}</div></aside>
      </div></div></section>`;
  }

  async function drivesPage() {
    markActive('drives');
    const d = await api('/drives');
    app.innerHTML = `<section class="section" style="padding-top:36px"><div class="wrap">
      <div class="eyebrow">Get involved</div><h2 style="font-size:clamp(34px,4vw,46px);margin-top:10px">Awareness drives</h2>
      <p class="section-sub">Clean-up drives, plantation workshops and e-waste days run by the campus Green Council. Joining your first drive earns +${state.meta.points.firstDrive} green points.</p>
      ${state.user?.role === 'officer' ? `<button class="btn btn-primary btn-lg" id="addDrive" style="margin-top:16px">+ Add a drive</button>` : ''}
      <div class="grid3" style="margin-top:34px">${d.drives.map(x => `<article class="card dcard">
        <div class="dimg" style="${x.image ? `background-image:url('${esc(x.image)}')` : ''}"><span class="date">${I.cal} ${fmtDate(x.date)}</span></div>
        <div class="dbody"><h3>${esc(x.title)}</h3><p>${esc(x.description)}</p>
          <div class="dfoot"><span class="loc">${I.pin.replace('width="15" height="15"', 'width="12" height="12"')} ${esc(x.location)} · ${x.participants} joined</span>
            <button class="btn ${x.joined ? 'btn-outline' : 'btn-primary'}" data-join="${x.id}">${x.joined ? I.check + ' Joined' : 'Join drive'}</button></div></div></article>`).join('')}</div>
      </div></section>`;
    const ad = $('#addDrive');
    if (ad) ad.onclick = () => {
      const root = $('#modalRoot');
      root.innerHTML = `<div class="overlay" id="ov"><form class="modal" id="dform"><h2>Add an awareness drive</h2><p class="sub">Visible to everyone on the Drives page.</p>
        <div class="fld"><label>Title</label><input id="dt" maxlength="100" required></div>
        <div class="fgrid"><div class="fld"><label>Date</label><input id="dd" type="date" required></div><div class="fld"><label>Location</label><input id="dl" maxlength="80"></div></div>
        <div class="fld"><label>Description</label><textarea id="dx" maxlength="400"></textarea></div>
        <div class="err" id="derr"></div>
        <div class="modal-actions"><button type="button" class="btn btn-outline btn-lg" id="dc">Cancel</button><button class="btn btn-primary btn-lg">Publish drive</button></div></form></div>`;
      $('#dc').onclick = () => root.innerHTML = '';
      $('#dform').onsubmit = async e => { e.preventDefault();
        try { await api('/drives', { method: 'POST', body: { title: $('#dt').value, date: $('#dd').value, location: $('#dl').value, description: $('#dx').value } }); root.innerHTML = ''; toast('Drive published.'); drivesPage(); }
        catch (er) { $('#derr').textContent = er.message; } };
    };
    app.querySelectorAll('[data-join]').forEach(b => b.onclick = async () => {
      if (!requireAuth()) return;
      try {
        const out = await api(`/drives/${b.dataset.join}/join`, { method: 'POST' });
        state.user = out.user; renderNav();
        toast(out.pointsEarned ? `Joined! +${out.pointsEarned} green points for your first drive 🎉` : (out.drive.joined ? 'You joined this drive.' : 'You left this drive.'));
        drivesPage();
      } catch (e) { toast(e.message, true); }
    });
  }

  async function loginPage() {
    markActive('');
    if (state.user) { location.hash = '#/'; return; }
    const [s] = await Promise.all([api('/stats')]);
    app.innerHTML = `<section class="auth">
      <div class="auth-left">
        <div class="eyebrow">Swachh Bharat Mission · Campus Chapter</div>
        <h1>Welcome back to the movement.</h1>
        <p>Your campus is being cleaned in the open — check what moved while you were away.</p>
        <div class="stats3"><div class="stat"><b>${s.resolved}</b><span>Resolved</span></div>
          <div class="stat"><b>${s.greenPoints.toLocaleString('en-IN')}</b><span>Green pts</span></div>
          <div class="stat"><b id="volCount">${s.volunteers}</b><span>Volunteers</span></div></div>
        <div class="pledge"><span style="color:#6ee7a0">${I.shield}</span><div>
          <p>“I pledge to keep my campus clean, report what I cannot fix, and hold our spaces accountable — one green point at a time.”</p>
          <div class="pledge-actions"><button class="btn btn-primary" id="pledgeBtn">${I.shield.replace('width="18" height="18"', 'width="15" height="15"')} Take the pledge</button><span id="pledgeTxt">${s.volunteers} volunteers and counting</span></div></div></div>
        <div class="auth-tag">report · track · resolve · earn green points</div>
      </div>
      <div class="auth-right">
        <a class="back" href="#/">${I.back} Back to campus</a>
        <div class="authcard"><div class="in"><h2>Continue to Campus Clean Track</h2>
          <button class="gbtn" id="gBtn" type="button"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.5 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg> Continue with Google</button>
          <div class="or">or</div>
          <form id="lform" novalidate><label for="em">Email address</label>
            <input id="em" type="email" autocomplete="email" placeholder="Enter your email address">
            <div class="err" id="lerr"></div>
            <button class="btn btn-primary submit" id="lsub">Continue ▸</button>
            <div class="hint">Tip: sign in as <b>officer@campus.edu</b> to try the officer tools (update report status, add drives).</div></form>
        </div><div class="devmode">Development mode</div></div>
      </div></section>`;
    const done = async out => {
      setSession(out.token, out.user);
      toast(`Welcome, ${out.user.name}!`);
      if (sessionStorage.getItem('cct_pledge')) {
        sessionStorage.removeItem('cct_pledge');
        try { const p = await api('/pledge', { method: 'POST' }); state.user = p.user; renderNav(); toast('Pledge recorded. Thank you, volunteer! 🌱'); } catch {}
      }
      const next = sessionStorage.getItem('cct_next') || '#/'; sessionStorage.removeItem('cct_next');
      location.hash = next === '#/login' ? '#/' : next;
    };
    $('#lform').onsubmit = async e => {
      e.preventDefault(); const b = $('#lsub'); b.disabled = true; $('#lerr').textContent = '';
      try { done(await api('/auth/login', { method: 'POST', body: { email: $('#em').value } })); }
      catch (err) { $('#lerr').textContent = err.message; b.disabled = false; }
    };
    $('#gBtn').onclick = async () => { try { done(await api('/auth/google', { method: 'POST' })); } catch (e) { toast(e.message, true); } };
    $('#pledgeBtn').onclick = async () => {
      sessionStorage.setItem('cct_pledge', '1');
      toast('Almost there — sign in and your pledge will be recorded.');
      $('#em').focus();
    };
  }

  // ---------- router ----------
  const routes = { '': homePage, '/': homePage, '/feed': feedPage, '/leaderboard': leaderboardPage, '/drives': drivesPage, '/login': loginPage };
  async function route() {
    const path = location.hash.replace(/^#/, '');
    const fn = routes[path] || homePage;
    window.scrollTo(0, 0);
    try { await fn(); } catch (e) { app.innerHTML = `<div class="wrap section"><div class="empty">Could not load this page. ${esc(e.message)}</div></div>`; }
  }
  window.addEventListener('hashchange', route);
  setInterval(() => {   // keep "LIVE" pages fresh without disturbing forms
    if ($('#modalRoot').innerHTML || document.hidden) return;
    const h = location.hash;
    if (h === '#/feed' || h === '#/' || h === '' || h === '#/leaderboard') route();
  }, 30000);

  (async function init() {
    state.meta = await api('/meta');
    if (state.token) { try { state.user = (await api('/auth/me')).user; } catch { state.token = null; } }
    renderNav(); route();
  })();
})();
