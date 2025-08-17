// Controlador global del modal de calendario: apertura/cierre y z-index estable
(function setupGlobalCalendarModal(){
  function ensureModalTop() {
    const modal = document.getElementById('calendarModal');
    if (!modal) return;
    modal.style.zIndex = '5000';
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }
    // Assets de FullCalendar ahora se cargan en index.html
  }

  function waitForFullCalendar(maxTries, intervalMs, cb) {
    let tries = 0;
    const iv = setInterval(() => {
      tries++;
      if (window.FullCalendar) {
        clearInterval(iv);
        cb();
      } else if (tries >= maxTries) {
        clearInterval(iv);
        cb();
      }
    }, intervalMs);
  }

  // Fallback: si home.js no está cargado, proveer initCalendarWhenReady mínimo
  if (typeof window.initCalendarWhenReady !== 'function') {
    window.initCalendarWhenReady = function initCalendarWhenReadyFallback() {
      if (!window.FullCalendar) {
        setTimeout(initCalendarWhenReadyFallback, 100);
        return;
      }
      const el = document.getElementById('calendar');
      if (!el) return;
      try { if (window.__fcInst && typeof window.__fcInst.destroy === 'function') window.__fcInst.destroy(); } catch(_) {}
      window.__fcInst = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        height: 'auto',
        expandRows: true,
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
        locale: 'es'
      });
      window.__fcInst.render();
    };
  }

  window.openCalendar = function() {
    ensureModalTop();
    const modal = document.getElementById('calendarModal');
    if (!modal) return;
    try { document.querySelectorAll('.global-overlay, .quick-task-form, .quick-task-menu').forEach(el => el.remove()); } catch(_){}
    modal.classList.add('show');
    waitForFullCalendar(50, 80, () => {
      try {
        if (typeof initCalendarWhenReady === 'function') {
          initCalendarWhenReady();
        }
      } catch(_) {}
    });
  };

  document.addEventListener('click', (e) => {
    const closeBtn = e.target && e.target.id === 'btnCloseCalendar';
    if (closeBtn) {
      const modal = document.getElementById('calendarModal');
      if (modal) modal.classList.remove('show');
    }
  });
})();


