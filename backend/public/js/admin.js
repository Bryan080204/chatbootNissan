/* ============================================================
   Chatbot Nissan - Capa de interfaz (demo interactivo)
   Datos de ejemplo + interactividad de todas las pantallas.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- Helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

  const pad = (n) => String(n).padStart(2, '0');
  const fmtFecha = (d) => `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
  const fmtFechaCorta = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const fmtDiaCorto = (d) => `${DIAS[d.getDay()]} ${d.getDate()}`;
  const daysAgo = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
  const nowHHMM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- Toast / Modal ---------------- */
  function toast(msg, type = 'info') {
    let stack = $('.toast-stack');
    if (!stack) { stack = document.createElement('div'); stack.className = 'toast-stack'; document.body.appendChild(stack); }
    const icons = { info: 'fa-circle-info', ok: 'fa-circle-check', warn: 'fa-triangle-exclamation' };
    const el = document.createElement('div');
    el.className = 'toast' + (type === 'info' ? '' : ' ' + type);
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span></span>`;
    el.querySelector('span').textContent = msg;
    stack.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 3200);
  }
  const openModal = (id) => { const m = document.getElementById(id); if (m) m.classList.add('open'); };
  const closeModal = (id) => { const m = document.getElementById(id); if (m) m.classList.remove('open'); };
  const closeAllModals = () => $$('.modal-overlay.open').forEach((m) => m.classList.remove('open'));
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) { e.target.classList.remove('open'); return; }
    const opener = e.target.closest('[data-open]');
    if (opener) { openModal(opener.dataset.open); return; }
    const closer = e.target.closest('[data-close]');
    if (closer) { closeModal(closer.dataset.close); return; }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });

  /* ---------------- Datos demo ---------------- */
  const conversations = [
    {
      id: 'c1', name: 'Juan Ramírez', phone: '951 234 5678', email: 'juan.ramirez@ejemplo.com',
      estado: 'pendiente', unread: 2, vehicle: 'Nissan Sentra 2020',
      messages: [
        { side: 'in', text: 'Hola, quisiera agendar cita para servicio en la Agencia Nissan Oaxaca', day: 'Hoy', time: '09:58' },
        { side: 'out', text: '¡Hola Juan! Claro que sí. ¿Qué tipo de servicio necesitas y qué fecha te conviene?', day: 'Hoy', time: '10:00' },
        { side: 'in', text: 'Servicio de mantenimiento general para mi Sentra 2020', day: 'Hoy', time: '10:28' },
        { side: 'out', text: 'Perfecto. Tenemos disponibilidad el 12 de octubre a las 9:00 AM. ¿Te agendo?', day: 'Hoy', time: '10:30' },
        { side: 'in', text: 'Sí, agéndame por favor', day: 'Hoy', time: '10:31' }
      ]
    },
    {
      id: 'c2', name: 'María Reyes', phone: '951 456 7890', email: 'maria.reyes@ejemplo.com',
      estado: 'confirmada', unread: 0, vehicle: 'Nissan Versa 2022',
      messages: [
        { side: 'in', text: 'Buenas tardes, necesito cotizar una refacción', day: 'Hoy', time: '09:10' },
        { side: 'out', text: '¡Hola María! Con gusto. ¿Me compartes el número de parte o el modelo de tu auto?', day: 'Hoy', time: '09:12' },
        { side: 'in', text: 'Es para un Versa 2022, espejo lateral derecho', day: 'Hoy', time: '09:15' }
      ]
    },
    {
      id: 'c3', name: 'Carlos López', phone: '951 678 9012', email: 'carlos.lopez@ejemplo.com',
      estado: 'cancelada', unread: 0, vehicle: 'Nissan X-Trail 2019',
      messages: [
        { side: 'in', text: 'Consulta sobre stock de llantas', day: 'Ayer', time: '17:40' },
        { side: 'out', text: 'Hola Carlos, actualmente contamos con llantas 215/60 R16 en existencia.', day: 'Ayer', time: '17:55' },
        { side: 'in', text: 'Gracias, luego lo reviso', day: 'Ayer', time: '18:02' }
      ]
    },
    {
      id: 'c4', name: 'Ana Gutiérrez', phone: '951 111 2233', email: 'ana.gutierrez@ejemplo.com',
      estado: 'confirmada', unread: 1, vehicle: 'Nissan March 2021',
      messages: [
        { side: 'in', text: 'Hola, ¿a qué hora abren mañana?', day: 'Hoy', time: '08:05' },
        { side: 'out', text: '¡Buenos días Ana! Abrimos de 9:00 AM a 7:00 PM de lunes a sábado.', day: 'Hoy', time: '08:07' }
      ]
    }
  ];

  const citas = [
    { id: 'C-001', cliente: 'Juan Ramírez', tel: '951 234 5678', servicio: 'Mantenimiento General', fecha: daysAgo(-2), hora: '09:00', estado: 'pendiente' },
    { id: 'C-002', cliente: 'María Reyes', tel: '951 456 7890', servicio: 'Cotización Refacción', fecha: daysAgo(-1), hora: '11:00', estado: 'confirmada' },
    { id: 'C-003', cliente: 'Carlos López', tel: '951 678 9012', servicio: 'Revisión de Frenos', fecha: daysAgo(1), hora: '15:00', estado: 'cancelada' },
    { id: 'C-004', cliente: 'Ana Gutiérrez', tel: '951 111 2233', servicio: 'Cambio de Aceite', fecha: daysAgo(-4), hora: '10:30', estado: 'confirmada' },
    { id: 'C-005', cliente: 'Luis Hernández', tel: '951 222 3344', servicio: 'Alineación y Balanceo', fecha: daysAgo(-3), hora: '12:00', estado: 'pendiente' },
    { id: 'C-006', cliente: 'Sofía Martínez', tel: '951 333 4455', servicio: 'Diagnóstico Eléctrico', fecha: daysAgo(-6), hora: '16:30', estado: 'confirmada' },
    { id: 'C-007', cliente: 'Pedro Sánchez', tel: '951 444 5566', servicio: 'Cambio de Balatas', fecha: daysAgo(-5), hora: '08:30', estado: 'pendiente' },
    { id: 'C-008', cliente: 'Laura Díaz', tel: '951 555 6677', servicio: 'Servicio 10,000 km', fecha: daysAgo(3), hora: '13:00', estado: 'cancelada' }
  ];

  const admins = [
    { nombre: 'Administrador Principal', usuario: 'admin', correo: 'admin@nissan.com', rol: 'Administrador', estado: 'activo' },
    { nombre: 'Asesor Nissan', usuario: 'asesor', correo: 'asesor@nissan.com', rol: 'Administrador', estado: 'inactivo' }
  ];

  const activity = [
    { tipo: 'cita', icon: 'fa-calendar-check', color: '#1e3a8a', bg: 'rgba(30,58,138,.10)', titulo: 'Nueva cita agendada', detalle: 'Juan Ramírez solicitó Mantenimiento General', tel: '951 234 5678', date: daysAgo(0), time: '10:31' },
    { tipo: 'mensaje', icon: 'fa-comment', color: '#c3002f', bg: 'rgba(195,0,47,.10)', titulo: 'Mensaje entrante', detalle: '“Consulta sobre stock de llantas”', tel: '951 678 9012', date: daysAgo(0), time: '08:50' },
    { tipo: 'cita', icon: 'fa-circle-check', color: '#16a34a', bg: 'rgba(22,163,74,.12)', titulo: 'Cita confirmada', detalle: 'María Reyes • Cotización Refacción', tel: '951 456 7890', date: daysAgo(1), time: '17:20' },
    { tipo: 'mensaje', icon: 'fa-comment', color: '#c3002f', bg: 'rgba(195,0,47,.10)', titulo: 'Mensaje entrante', detalle: '“¿A qué hora abren mañana?”', tel: '951 111 2233', date: daysAgo(1), time: '08:05' },
    { tipo: 'cita', icon: 'fa-ban', color: '#c3002f', bg: 'rgba(195,0,47,.10)', titulo: 'Cita cancelada', detalle: 'Carlos López • Revisión de Frenos', tel: '951 678 9012', date: daysAgo(1), time: '15:05' },
    { tipo: 'sistema', icon: 'fa-robot', color: '#0f172a', bg: 'rgba(15,23,42,.08)', titulo: 'Respuesta automática', detalle: 'El chatbot respondió 12 conversaciones', tel: '', date: daysAgo(2), time: '19:45' },
    { tipo: 'mensaje', icon: 'fa-comment', color: '#c3002f', bg: 'rgba(195,0,47,.10)', titulo: 'Mensaje entrante', detalle: '“Necesito cotizar una refacción”', tel: '951 456 7890', date: daysAgo(3), time: '09:10' },
    { tipo: 'cita', icon: 'fa-calendar-plus', color: '#d97706', bg: 'rgba(217,119,6,.12)', titulo: 'Cita reagendada', detalle: 'Pedro Sánchez • Cambio de Balatas', tel: '951 444 5566', date: daysAgo(4), time: '11:30' }
  ];

  const volumen = (function () {
    const base = [12, 18, 9, 22, 30, 16, 25, 14, 28, 19, 11, 24, 33, 21];
    return base.map((v, i) => {
      const d = daysAgo(13 - i);
      return { date: d, mensajes: v + ((i * 3) % 5), citas: 1 + (i % 4) };
    });
  })();

  const botReplies = [
    '¡Gracias por tu mensaje! En breve un asesor te atenderá.',
    'Con gusto, ¿me confirmas el modelo y año de tu vehículo?',
    'Perfecto, ya registro tu solicitud en el sistema.',
    'Claro que sí, déjame verificar disponibilidad y te confirmo.'
  ];

  /* ---------------- Estado ---------------- */
  const state = {
    selected: conversations[0].id,
    chatFilter: 'todos',
    chatSearch: '',
    citasFilter: 'todos',
    citasSearch: '',
    adminsSearch: ''
  };

  /* ---------------- Sidebar / topbar ---------------- */
  function initChrome() {
    const clock = $('#liveClock');
    if (clock) {
      const tick = () => { const d = new Date(); clock.textContent = `${DIAS[d.getDay()]} ${pad(d.getDate())} ${MESES[d.getMonth()]} • ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
      tick();
      setInterval(tick, 30000);
    }
  }

  /* ---------------- Dashboard ---------------- */
  function initDashboard() {
    const mensajesHoy = volumen[volumen.length - 1].mensajes;
    const activas = conversations.length;
    const pendientes = citas.filter((c) => c.estado === 'pendiente').length;
    const confirmadas = citas.filter((c) => c.estado === 'confirmada').length;

    setText('#statMensajes', mensajesHoy);
    setText('#statCitas', citas.length);
    setText('#statPendientes', pendientes);
    setText('#statClientes', activas);
    setText('#statConfirmadas', confirmadas);

    renderCharts();
    renderTopDays();
    renderActivity();
    renderUpcoming();
  }

  function setText(sel, val) { const el = $(sel); if (el) el.textContent = val; }

  function renderCharts() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
    Chart.defaults.color = '#64748b';

    const labels = volumen.map((v) => fmtDiaCorto(v.date));
    const canMensajes = document.getElementById('chartMensajes');
    if (canMensajes) {
      const ctx = canMensajes.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, 260);
      g.addColorStop(0, 'rgba(195,0,47,.28)');
      g.addColorStop(1, 'rgba(195,0,47,0)');
      new Chart(canMensajes, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Mensajes',
            data: volumen.map((v) => v.mensajes),
            borderColor: '#c3002f',
            backgroundColor: g,
            borderWidth: 2.5,
            fill: true,
            tension: .38,
            pointRadius: 0,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#c3002f'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', padding: 10, displayColors: false } },
          scales: {
            x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 7 } },
            y: { beginAtZero: true, grid: { color: '#eef2f7' }, ticks: { precision: 0 } }
          }
        }
      });
    }

    const canCitas = document.getElementById('chartCitas');
    if (canCitas) {
      new Chart(canCitas, {
        type: 'doughnut',
        data: {
          labels: ['Pendientes', 'Confirmadas', 'Canceladas'],
          datasets: [{
            data: [
              citas.filter((c) => c.estado === 'pendiente').length,
              citas.filter((c) => c.estado === 'confirmada').length,
              citas.filter((c) => c.estado === 'cancelada').length
            ],
            backgroundColor: ['#d97706', '#16a34a', '#c3002f'],
            borderWidth: 0,
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '66%',
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, padding: 14, font: { size: 12, weight: '600' } } },
            tooltip: { backgroundColor: '#0f172a', padding: 10 }
          }
        }
      });
    }
  }

  function renderTopDays() {
    const body = $('#topDaysBody');
    if (!body) return;
    const top = [...volumen].sort((a, b) => b.mensajes - a.mensajes).slice(0, 5);
    const max = top[0].mensajes;
    body.innerHTML = top.map((v, i) => `
      <tr>
        <td><span class="id-chip">${i + 1}</span></td>
        <td><b>${fmtFecha(v.date)}</b><br><span class="ui-card-sub">${DIAS[v.date.getDay()]}</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:10px; min-width:170px;">
            <div class="barra" style="flex:1;"><span style="width:${Math.round((v.mensajes / max) * 100)}%"></span></div>
            <b class="mono">${v.mensajes}</b>
          </div>
        </td>
        <td class="mono">${v.citas}</td>
      </tr>`).join('');
  }

  function renderActivity() {
    const list = $('#activityList');
    if (!list) return;
    list.innerHTML = activity.map((a) => `
      <div class="activity-item">
        <div class="activity-icon" style="background:${a.bg}; color:${a.color};"><i class="fa-solid ${a.icon}"></i></div>
        <div class="activity-body">
          <div class="activity-title">${esc(a.titulo)}</div>
          <div class="activity-detalle">${esc(a.detalle)}</div>
          <div class="activity-meta">
            ${a.tel ? `<i class="fa-solid fa-phone"></i> ${esc(a.tel)} •` : ''} ${fmtFecha(a.date)}
          </div>
        </div>
        <div class="activity-time">${a.time}</div>
      </div>`).join('');
  }

  function renderUpcoming() {
    const body = $('#upcomingBody');
    if (!body) return;
    const upcoming = citas
      .filter((c) => c.fecha >= daysAgo(0) && c.estado !== 'cancelada')
      .sort((a, b) => a.fecha - b.fecha)
      .slice(0, 5);
    if (!upcoming.length) {
      body.innerHTML = '<tr><td colspan="4"><div class="empty-row"><i class="fa-regular fa-calendar"></i>Sin citas próximas</div></td></tr>';
      return;
    }
    body.innerHTML = upcoming.map((c) => `
      <tr>
        <td><span class="id-chip">#${esc(c.id)}</span></td>
        <td>${esc(c.cliente)}</td>
        <td>${fmtFecha(c.fecha)} • ${esc(c.hora)}</td>
        <td><span class="pill ${c.estado}">${labelEstado(c.estado)}</span></td>
      </tr>`).join('');
  }

  function labelEstado(e) {
    return { pendiente: 'Pendiente', confirmada: 'Confirmada', cancelada: 'Cancelada', activo: 'Activo', inactivo: 'Inactivo' }[e] || e;
  }
  function estadoIcon(e) {
    return { pendiente: 'fa-clock', confirmada: 'fa-circle-check', cancelada: 'fa-ban', activo: 'fa-circle-check', inactivo: 'fa-clock' }[e] || 'fa-circle';
  }

  /* ---------------- Chats ---------------- */
  function initials(name) {
    return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  }

  function initChats() {
    state.selected = conversations[0].id;
    renderChatList();
    renderConversation();

    const search = $('#chatSearch');
    if (search) search.addEventListener('input', () => { state.chatSearch = search.value.toLowerCase(); renderChatList(); });

    $$('#chatFilters .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        $$('#chatFilters .chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.chatFilter = chip.dataset.filter;
        renderChatList();
      });
    });

    const list = $('#chatList');
    if (list) list.addEventListener('click', (e) => {
      const item = e.target.closest('.chat-item');
      if (!item) return;
      state.selected = item.dataset.id;
      const conv = conversations.find((c) => c.id === state.selected);
      conv.unread = 0;
      renderChatList();
      renderConversation();
    });

    const input = $('#replyInput');
    const sendBtn = $('#btnSend');
    const doSend = () => sendMessage();
    if (sendBtn) sendBtn.addEventListener('click', doSend);
    if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSend(); } });
  }

  function renderChatList() {
    const list = $('#chatList');
    if (!list) return;
    const q = state.chatSearch;
    const items = conversations.filter((c) => {
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.phone.includes(q) ||
        c.messages.some((m) => m.text.toLowerCase().includes(q));
      const matchF = state.chatFilter === 'todos' || c.estado === state.chatFilter;
      return matchQ && matchF;
    });
    setText('#chatCount', `${items.length} chat${items.length === 1 ? '' : 's'}`);
    if (!items.length) {
      list.innerHTML = '<div class="chat-empty" style="padding:40px 20px;">No se encontraron conversaciones.</div>';
      return;
    }
    list.innerHTML = items.map((c) => {
      const last = c.messages[c.messages.length - 1];
      return `
        <div class="chat-item ${c.id === state.selected ? 'active' : ''}" data-id="${c.id}">
          <div class="chat-avatar">${initials(c.name)}</div>
          <div class="chat-info">
            <div class="chat-top">
              <div class="chat-name">${esc(c.name)}</div>
              <div class="chat-time">${esc(c.messages[c.messages.length - 1].time)}</div>
            </div>
            <div class="chat-preview">${last.side === 'out' ? '<i class="fa-solid fa-check-double"></i> ' : ''}${esc(last.text)}</div>
          </div>
          ${c.unread ? `<span class="chat-badge">${c.unread}</span>` : ''}
        </div>`;
    }).join('');
  }

  function renderConversation() {
    const conv = conversations.find((c) => c.id === state.selected);
    if (!conv) return;

    setText('#convName', conv.name);
    setText('#convStatus', conv.estado === 'cancelada' ? 'Conversación cerrada' : 'En línea');
    const av = $('#convAvatar'); if (av) av.textContent = initials(conv.name);

    const area = $('#messagesArea');
    if (area) {
      let html = '';
      let currentDay = null;
      conv.messages.forEach((m) => {
        if (m.day !== currentDay) { currentDay = m.day; html += `<div class="message-date-divider">${esc(m.day)}</div>`; }
        html += `
          <div class="message-row ${m.side === 'out' ? 'outgoing' : 'incoming'}">
            <div class="message-bubble">${esc(m.text)}</div>
            <div class="message-time">${esc(m.time)}${m.side === 'out' ? ' <i class="fa-solid fa-check-double"></i>' : ''}</div>
          </div>`;
      });
      area.innerHTML = html;
      area.scrollTop = area.scrollHeight;
    }

    const info = $('#clientInfoBody');
    if (info) {
      const citasCliente = citas.filter((c) => c.cliente === conv.name);
      info.innerHTML = `
        <div class="client-card">
          <div class="client-avatar-lg">${initials(conv.name)}</div>
          <div class="client-info-text">
            <h5>${esc(conv.name)}</h5>
            <p><i class="fa-solid fa-phone"></i> ${esc(conv.phone)}</p>
            <p><i class="fa-solid fa-envelope"></i> ${esc(conv.email)}</p>
          </div>
        </div>
        <div class="detail-row"><span class="detail-label">Vehículo</span><span class="detail-value">${esc(conv.vehicle)}</span></div>
        <div class="detail-row"><span class="detail-label">Estado</span><span class="pill ${conv.estado}">${labelEstado(conv.estado)}</span></div>
        <div class="detail-row"><span class="detail-label">Mensajes</span><span class="detail-value mono">${conv.messages.length}</span></div>
        <div class="info-header" style="margin-top:6px;"><h4>Citas (${citasCliente.length})</h4></div>
        ${citasCliente.length ? citasCliente.map((c) => `
          <div class="detail-row"><span class="detail-label">#${esc(c.id)} • ${fmtFecha(c.fecha)}</span><span class="pill ${c.estado}">${labelEstado(c.estado)}</span></div>
        `).join('') : '<div class="ui-card-sub">Sin citas registradas.</div>'}`;
    }
  }

  function sendMessage() {
    const input = $('#replyInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { toast('Escribe un mensaje antes de enviar', 'warn'); return; }
    const conv = conversations.find((c) => c.id === state.selected);
    conv.messages.push({ side: 'out', text, day: 'Hoy', time: nowHHMM() });
    input.value = '';
    renderConversation();
    renderChatList();
    toast('Mensaje enviado a ' + conv.name, 'ok');

    setTimeout(() => {
      if (state.selected !== conv.id) return;
      const reply = botReplies[Math.floor(Math.random() * botReplies.length)];
      conv.messages.push({ side: 'in', text: reply, day: 'Hoy', time: nowHHMM() });
      if (state.selected !== conv.id) conv.unread++;
      renderConversation();
      renderChatList();
    }, 1400);
  }

  /* ---------------- Citas ---------------- */
  function initCitas() {
    renderCitas();

    const search = $('#citasSearch');
    if (search) search.addEventListener('input', () => { state.citasSearch = search.value.toLowerCase(); renderCitas(); });

    $$('#citasFilters .chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        $$('#citasFilters .chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        state.citasFilter = chip.dataset.filter;
        renderCitas();
      });
    });

    const body = $('#citasBody');
    if (body) body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      const cita = citas.find((c) => c.id === id);
      if (!cita) return;
      if (action === 'confirmar') { cita.estado = 'confirmada'; toast(`Cita #${id} confirmada`, 'ok'); }
      else if (action === 'cancelar') { cita.estado = 'cancelada'; toast(`Cita #${id} cancelada`, 'warn'); }
      else if (action === 'reactivar') { cita.estado = 'pendiente'; toast(`Cita #${id} reactivada`, 'ok'); }
      else if (action === 'ver') { showCitaDetalle(cita); return; }
      renderCitas();
    });

    // Modal nueva cita
    const form = $('#formNuevaCita');
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const cliente = (f.get('cliente') || '').trim();
      const tel = (f.get('tel') || '').trim();
      const servicio = (f.get('servicio') || '').trim();
      const fecha = f.get('fecha');
      const hora = f.get('hora');
      if (!cliente || !tel || !servicio || !fecha || !hora) { toast('Completa todos los campos', 'warn'); return; }
      const nextId = 'C-' + String(citas.length + 1).padStart(3, '0');
      citas.unshift({ id: nextId, cliente, tel, servicio, fecha: new Date(fecha + 'T00:00:00'), hora, estado: 'pendiente' });
      form.reset();
      closeModal('modalNuevaCita');
      renderCitas();
      toast(`Cita ${nextId} registrada para ${cliente}`, 'ok');
    });
  }

  function filteredCitas() {
    const q = state.citasSearch;
    return citas.filter((c) => {
      const matchF = state.citasFilter === 'todos' || c.estado === state.citasFilter;
      const matchQ = !q || c.cliente.toLowerCase().includes(q) || c.tel.includes(q) || c.servicio.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
      return matchF && matchQ;
    });
  }

  function renderCitas() {
    const body = $('#citasBody');
    if (!body) return;
    const rows = filteredCitas();
    setText('#citasCount', `${rows.length} registro${rows.length === 1 ? '' : 's'}`);
    setText('#statAll', citas.length);
    setText('#statPend', citas.filter((c) => c.estado === 'pendiente').length);
    setText('#statConf', citas.filter((c) => c.estado === 'confirmada').length);
    setText('#statCanc', citas.filter((c) => c.estado === 'cancelada').length);

    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="8"><div class="empty-row"><i class="fa-regular fa-calendar-xmark"></i>No hay citas con este filtro</div></td></tr>`;
      return;
    }
    body.innerHTML = rows.map((c) => `
      <tr>
        <td><span class="id-chip">#${esc(c.id)}</span></td>
        <td>
          <div class="cell-user">
            <div class="avatar-sm">${initials(c.cliente)}</div>
            <div><b>${esc(c.cliente)}</b><span>${esc(c.servicio)}</span></div>
          </div>
        </td>
        <td class="mono">${esc(c.tel)}</td>
        <td>${fmtFecha(c.fecha)}</td>
        <td class="mono">${esc(c.hora)}</td>
        <td><span class="pill ${c.estado}">${labelEstado(c.estado)}</span></td>
        <td>
          <div class="row-actions">
            <button class="act-btn" data-action="ver" data-id="${c.id}" title="Ver detalle"><i class="fa-solid fa-eye"></i></button>
            ${c.estado === 'pendiente' ? `<button class="act-btn ok" data-action="confirmar" data-id="${c.id}" title="Confirmar"><i class="fa-solid fa-circle-check"></i></button>` : ''}
            ${c.estado !== 'cancelada' ? `<button class="act-btn no" data-action="cancelar" data-id="${c.id}" title="Cancelar"><i class="fa-solid fa-ban"></i></button>` : `<button class="act-btn warn" data-action="reactivar" data-id="${c.id}" title="Reactivar"><i class="fa-solid fa-rotate-left"></i></button>`}
          </div>
        </td>
      </tr>`).join('');
  }

  function showCitaDetalle(c) {
    const el = $('#detalleCitaBody');
    if (!el) return;
    el.innerHTML = `
      <div class="detail-row"><span class="detail-label">Folio</span><span class="detail-value">#${esc(c.id)}</span></div>
      <div class="detail-row"><span class="detail-label">Cliente</span><span class="detail-value">${esc(c.cliente)}</span></div>
      <div class="detail-row"><span class="detail-label">Teléfono</span><span class="detail-value mono">${esc(c.tel)}</span></div>
      <div class="detail-row"><span class="detail-label">Servicio</span><span class="detail-value">${esc(c.servicio)}</span></div>
      <div class="detail-row"><span class="detail-label">Fecha</span><span class="detail-value">${fmtFecha(c.fecha)}</span></div>
      <div class="detail-row"><span class="detail-label">Hora</span><span class="detail-value mono">${esc(c.hora)}</span></div>
      <div class="detail-row"><span class="detail-label">Estado</span><span class="pill ${c.estado}">${labelEstado(c.estado)}</span></div>`;
    openModal('modalDetalleCita');
  }

  /* ---------------- Usuarios ---------------- */
  function initUsuarios() {
    renderAdmins();

    const form = $('#formAdmin');
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const nombre = (f.get('nombre') || '').trim();
      const usuario = (f.get('usuario') || '').trim();
      const correo = (f.get('correo') || '').trim();
      const pass = (f.get('password') || '').trim();
      if (!nombre || !usuario || !correo || !pass) { toast('Completa todos los campos', 'warn'); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) { toast('Correo electrónico inválido', 'warn'); return; }
      if (pass.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'warn'); return; }
      if (admins.some((a) => a.usuario.toLowerCase() === usuario.toLowerCase())) { toast('Ese usuario ya existe', 'warn'); return; }
      admins.unshift({ nombre, usuario, correo, rol: 'Administrador', estado: 'activo' });
      form.reset();
      renderAdmins();
      toast(`Administrador ${nombre} agregado`, 'ok');
    });

    const search = $('#adminsSearch');
    if (search) search.addEventListener('input', () => { state.adminsSearch = search.value.toLowerCase(); renderAdmins(); });

    const body = $('#adminsBody');
    if (body) body.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, usuario } = btn.dataset;
      const adm = admins.find((a) => a.usuario === usuario);
      if (!adm) return;
      if (action === 'toggle') {
        adm.estado = adm.estado === 'activo' ? 'inactivo' : 'activo';
        toast(`${adm.nombre} ahora está ${adm.estado}`, 'ok');
      } else if (action === 'eliminar') {
        if (adm.usuario === 'admin') { toast('No puedes eliminar al administrador principal', 'warn'); return; }
        const i = admins.indexOf(adm);
        admins.splice(i, 1);
        toast(`${adm.nombre} eliminado`, 'warn');
      }
      renderAdmins();
    });
  }

  function renderAdmins() {
    const body = $('#adminsBody');
    if (!body) return;
    const q = state.adminsSearch;
    const rows = admins.filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.usuario.toLowerCase().includes(q) || a.correo.toLowerCase().includes(q));
    setText('#adminsCount', `${admins.length} administrador${admins.length === 1 ? '' : 'es'}`);
    if (!rows.length) {
      body.innerHTML = `<tr><td colspan="5"><div class="empty-row"><i class="fa-regular fa-user"></i>No hay administradores</div></td></tr>`;
      return;
    }
    body.innerHTML = rows.map((a) => `
      <tr>
        <td>
          <div class="cell-user">
            <div class="avatar-sm">${initials(a.nombre)}</div>
            <div><b>${esc(a.nombre)}</b><span>${esc(a.usuario)}</span></div>
          </div>
        </td>
        <td>${esc(a.correo)}</td>
        <td>${esc(a.rol)}</td>
        <td><span class="pill ${a.estado}">${labelEstado(a.estado)}</span></td>
        <td>
          <div class="row-actions">
            <button class="act-btn ${a.estado === 'activo' ? 'warn' : 'ok'}" data-action="toggle" data-usuario="${esc(a.usuario)}" title="${a.estado === 'activo' ? 'Desactivar' : 'Activar'}">
              <i class="fa-solid ${a.estado === 'activo' ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
            </button>
            <button class="act-btn no" data-action="eliminar" data-usuario="${esc(a.usuario)}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');
  }

  /* ---------------- Config ---------------- */
  function initConfig() {
    const form = $('#formPassword');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const actual = (f.get('actual') || '').trim();
      const nueva = (f.get('nueva') || '').trim();
      const confirm = (f.get('confirm') || '').trim();
      if (!actual) { toast('Ingresa tu contraseña actual', 'warn'); return; }
      if (nueva.length < 8) { toast('La nueva contraseña debe tener al menos 8 caracteres', 'warn'); return; }
      if (nueva !== confirm) { toast('Las contraseñas no coinciden', 'warn'); return; }
      form.reset();
      toast('Contraseña actualizada correctamente', 'ok');
    });
  }

  /* ---------------- Router ---------------- */
  function boot() {
    initChrome();
    const page = document.body.dataset.page;
    if (page === 'dashboard') initDashboard();
    else if (page === 'chats') initChats();
    else if (page === 'citas') initCitas();
    else if (page === 'usuarios') initUsuarios();
    else if (page === 'config') initConfig();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.NissanApp = { toast, openModal, closeModal };
})();
