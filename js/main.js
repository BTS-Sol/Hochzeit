/* ═══════════════════════════════════════════════════════════════
   Hochzeit Isabelle & Yannis
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ╔═══════════════════════════════════════════════════════════╗
     ║                                                           ║
     ║   E U E R   H O C H Z E I T S - S E T U P                 ║
     ║                                                           ║
     ║   Das Einzige, was ihr normalerweise ändern müsst.        ║
     ║   Alles darunter läuft von allein.                        ║
     ║                                                           ║
     ╚═══════════════════════════════════════════════════════════╝ */

  var SETUP = {

    // ── Datum & Uhrzeit ──────────────────────────────────────
    // Format: 'JJJJ-MM-TTTHH:MM'   (das T in der Mitte gehört dazu)
    // Steht hier null, schreibt die Seite überall „Das Datum folgt“
    // und blendet den Countdown aus.
    beginn: '2027-07-01T14:00',
    ende:   '2027-07-02T02:00',   // ungefähres Ende, nur für den Kalendereintrag

    // ── Zusagen ──────────────────────────────────────────────
    // Rückmeldefrist. Format wie oben, nur ohne Uhrzeit: 'JJJJ-MM-TT'
    // Bleibt sie null, steht im Text „rechtzeitig“ statt eines Datums.
    rsvpFrist: null,  // z. B. '2026-05-31'

    // ── Ort ──────────────────────────────────────────────────
    ortName:    'Lavenda am See',
    ortAdresse: 'Neue Kreisstraße 50, 14109 Berlin',

    // ── Texte ────────────────────────────────────────────────
    titel: 'Hochzeit von Isabelle & Yannis'
  };

  /* ═══════════ Ab hier muss nichts mehr angepasst werden ═══════════ */


  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  var beginn = SETUP.beginn ? new Date(SETUP.beginn) : null;
  if (beginn && isNaN(beginn.getTime())) {
    console.warn('Hochzeits-Setup: "beginn" ist kein gültiges Datum:', SETUP.beginn);
    beginn = null;
  }

  var ende = SETUP.ende ? new Date(SETUP.ende) : null;
  if (!ende && beginn) {
    // Kein Ende angegeben? Dann 10 Stunden ab Beginn annehmen.
    ende = new Date(beginn.getTime() + 10 * 60 * 60 * 1000);
  }


  /* ─────────────── Datum in die Seite schreiben ─────────────── */

  function datumLang(d) {
    var tag = d.toLocaleDateString('de-DE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    var uhr = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    // Geschuetzte Leerzeichen: "ab 14:00 Uhr" soll auf dem Handy
    // nicht mitten in der Uhrzeit umbrechen.
    return tag + ' · ab ' + uhr + ' Uhr';
  }

  function setzeDatum() {
    if (!beginn) return;
    var text = datumLang(beginn);
    $$('.js-datum-lang').forEach(function (el) {
      el.textContent = text;
    });
  }


  /* ─────────────── Deckblatt ─────────────── */

  var gate = $('#gate');
  var main = $('#main');

  function oeffne(sofort) {
    if (!gate || !main || main.dataset.offen === '1') return;
    main.dataset.offen = '1';

    main.hidden = false;
    document.body.style.overflow = '';

    if (sofort) {
      gate.style.display = 'none';
      main.classList.add('is-visible');
      pruefeReveal();
      return;
    }

    // Inhalt einblenden, waehrend das Deckblatt darueber wegblendet
    window.scrollTo({ top: 0, behavior: 'auto' });
    gate.style.pointerEvents = 'none';
    gate.setAttribute('aria-hidden', 'true');

    window.requestAnimationFrame(function () {
      main.classList.add('is-visible');
      pruefeReveal();
      gate.style.opacity = '0';
    });

    window.setTimeout(function () {
      gate.style.display = 'none';
      main.focus({ preventScroll: true });
    }, 850);
  }

  if (gate && main) {
    document.body.style.overflow = 'hidden';

    var btn = $('#gate-open');
    if (btn) btn.addEventListener('click', oeffne);

    // Klick irgendwo auf das Deckblatt öffnet ebenfalls
    gate.addEventListener('click', function (e) {
      if (e.target !== btn) oeffne();
    });

    // Enter/Leertaste, wenn der Fokus nicht auf dem Button liegt
    document.addEventListener('keydown', function (e) {
      if (main.dataset.offen === '1') return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        oeffne();
      }
    });
  }

  // Direktlink auf einen Abschnitt (z. B. .../#zusagen):
  // Deckblatt überspringen. Wird ganz unten aufgerufen, wenn alles steht.
  function pruefeDirektlink() {
    if (!gate || !main) return;
    var hash = window.location.hash;
    if (!hash || hash.length < 2) return;

    var ziel;
    try { ziel = document.querySelector(hash); } catch (e) { return; }
    if (!ziel) return;

    oeffne(true);

    // Wer direkt auf einen Abschnitt kommt, soll ihn sofort sehen
    // und nicht auf Einblend-Animationen warten.
    if (reveals) reveals.forEach(zeige);

    // Weiches Scrollen kurz abschalten, sonst springt die Seite erst
    // nach einer Animation an die richtige Stelle.
    var wurzel = document.documentElement;
    var vorher = wurzel.style.scrollBehavior;
    wurzel.style.scrollBehavior = 'auto';
    ziel.scrollIntoView({ block: 'start' });
    wurzel.style.scrollBehavior = vorher;
  }


  /* ─────────────── Countdown ─────────────── */

  var cdSection = $('#countdown');
  var cdNote    = $('.js-countdown-note');
  var cdTimer   = null;
  var btnIcs    = $('#btn-ics');

  function zweistellig(n) { return n < 10 ? '0' + n : String(n); }

  function tickeCountdown() {
    var rest = beginn.getTime() - Date.now();

    if (rest <= 0) {
      if (cdTimer) { window.clearInterval(cdTimer); cdTimer = null; }

      var vorbei = ende && Date.now() > ende.getTime();
      $$('.cd-unit').forEach(function (el) { el.hidden = true; });

      var titel = cdSection && cdSection.querySelector('h2');
      if (titel) titel.textContent = vorbei ? 'Danke' : 'Heute ist es so weit';
      if (cdNote) {
        cdNote.textContent = vorbei
          ? 'Danke, dass ihr diesen Tag mit uns gefeiert habt.'
          : 'Wir freuen uns auf euch!';
      }
      if (vorbei && btnIcs) btnIcs.hidden = true;
      return;
    }

    var sek  = Math.floor(rest / 1000);
    var tage = Math.floor(sek / 86400);
    var std  = Math.floor((sek % 86400) / 3600);
    var min  = Math.floor((sek % 3600) / 60);
    var s    = sek % 60;

    var werte = { tage: tage, stunden: zweistellig(std), minuten: zweistellig(min), sekunden: zweistellig(s) };

    $$('[data-cd]').forEach(function (el) {
      var neu = String(werte[el.getAttribute('data-cd')]);
      if (el.textContent !== neu) el.textContent = neu;
    });
  }

  function starteCountdown() {
    if (!beginn || !cdSection) return;
    cdSection.hidden = false;
    if (cdNote) cdNote.textContent = datumLang(beginn);
    tickeCountdown();
    cdTimer = window.setInterval(tickeCountdown, 1000);
  }


  /* ─────────────── Kalendereintrag (.ics) ─────────────── */

  function icsZeit(d) {
    return d.getFullYear() +
           zweistellig(d.getMonth() + 1) +
           zweistellig(d.getDate()) + 'T' +
           zweistellig(d.getHours()) +
           zweistellig(d.getMinutes()) + '00';
  }

  function icsEscape(text) {
    return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function baueIcs() {
    var jetzt = new Date();
    var stamp = jetzt.getUTCFullYear() +
                zweistellig(jetzt.getUTCMonth() + 1) +
                zweistellig(jetzt.getUTCDate()) + 'T' +
                zweistellig(jetzt.getUTCHours()) +
                zweistellig(jetzt.getUTCMinutes()) +
                zweistellig(jetzt.getUTCSeconds()) + 'Z';

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Isabelle und Yannis//Hochzeit//DE',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE',
      'TZID:Europe/Berlin',
      'BEGIN:DAYLIGHT',
      'TZOFFSETFROM:+0100',
      'TZOFFSETTO:+0200',
      'TZNAME:CEST',
      'DTSTART:19700329T020000',
      'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
      'END:DAYLIGHT',
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0200',
      'TZOFFSETTO:+0100',
      'TZNAME:CET',
      'DTSTART:19701025T030000',
      'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:hochzeit-isabelle-yannis@' + (window.location.hostname || 'lokal'),
      'DTSTAMP:' + stamp,
      'DTSTART;TZID=Europe/Berlin:' + icsZeit(beginn),
      'DTEND;TZID=Europe/Berlin:' + icsZeit(ende),
      'SUMMARY:' + icsEscape(SETUP.titel),
      'LOCATION:' + icsEscape(SETUP.ortName + ', ' + SETUP.ortAdresse),
      'DESCRIPTION:' + icsEscape('Wir freuen uns auf euch! Alle Infos: ' + window.location.href),
      'URL:' + window.location.href,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + icsEscape(SETUP.titel + ' — morgen!'),
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  if (btnIcs) {
    if (!beginn) {
      btnIcs.hidden = true;
    } else {
      btnIcs.addEventListener('click', function () {
        var blob = new Blob([baueIcs()], { type: 'text/calendar;charset=utf-8' });
        var url  = URL.createObjectURL(blob);
        var a    = document.createElement('a');
        a.href = url;
        a.download = 'Hochzeit-Isabelle-und-Yannis.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      });
    }
  }


  /* ─────────────── Teilen ─────────────── */

  var btnShare = $('#btn-share');
  if (btnShare) {
    btnShare.addEventListener('click', function () {
      var daten = {
        title: SETUP.titel,
        text: 'Isabelle & Yannis heiraten — hier sind alle Infos:',
        url: window.location.href
      };

      if (navigator.share) {
        navigator.share(daten).catch(function () { /* abgebrochen – egal */ });
        return;
      }

      var zurueck = btnShare.textContent;
      var fertig = function (ok) {
        btnShare.textContent = ok ? 'Link kopiert' : 'Link: ' + window.location.href;
        window.setTimeout(function () { btnShare.textContent = zurueck; }, 2200);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(window.location.href).then(
          function () { fertig(true); },
          function () { fertig(false); }
        );
      } else {
        fertig(false);
      }
    });
  }


  /* ─────────────── Zusagen ─────────────── */

  function setzeRsvp() {
    var frist = $('.js-rsvp-frist');
    if (!frist) return;

    if (SETUP.rsvpFrist) {
      var d = new Date(SETUP.rsvpFrist + 'T12:00');
      if (!isNaN(d.getTime())) {
        frist.textContent = d.toLocaleDateString('de-DE', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
        return;
      }
    }

    // Keine Frist gesetzt: Satz ohne Datum formulieren
    var lead = frist.closest('p');
    if (lead) {
      lead.textContent = 'Damit wir gut planen können, sagt uns bitte rechtzeitig Bescheid, ob ihr dabei seid.';
    }
  }


  /* ─────────────── Einblenden beim Scrollen ─────────────── */

  var reveals = $$('.reveal');

  function zeige(el) { el.classList.add('is-in'); }

  function pruefeReveal() {
    if (!reveals) return;
    // Hinter dem Deckblatt hat nichts Maße – dann noch nichts freigeben,
    // sonst waere die Einblend-Animation spaeter schon verbraucht.
    if (main && main.hidden) return;
    reveals.forEach(function (el) {
      if (el.classList.contains('is-in')) return;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) zeige(el);
    });
  }

  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (e.isIntersecting) { zeige(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });

    reveals.forEach(function (el) { obs.observe(el); });
  } else {
    reveals.forEach(zeige);
  }


  /* ─────────────── Aktiver Navigationspunkt ─────────────── */

  var navLinks = $$('.nav a');
  var abschnitte = navLinks
    .map(function (a) { return $(a.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && abschnitte.length) {
    var navObs = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-25% 0px -65% 0px', threshold: 0 });

    abschnitte.forEach(function (s) { navObs.observe(s); });
  }


  /* ─────────────── Nach oben ─────────────── */

  var toTop = $('#to-top');
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = window.setTimeout(function () {
        scrollTimer = null;
        toTop.hidden = window.scrollY < 700;
      }, 150);
    }, { passive: true });
  }


  /* ─────────────── Start ─────────────── */

  setzeDatum();
  starteCountdown();
  setzeRsvp();
  pruefeReveal();
  pruefeDirektlink();

})();
