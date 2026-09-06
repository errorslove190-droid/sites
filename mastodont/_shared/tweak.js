/* TWEAK PANEL · step 13.
   Every design decision on the final page is exposed as a --tw-* custom
   property. The panel writes those properties on :root, which is why it
   repaints instantly: nothing is rebuilt, the browser just re-resolves the
   variables. Copy CSS emits only the properties actually moved. */
(function () {
  'use strict';

  var FONTS = [
    ['Anton', "'Anton', system-ui, sans-serif"],
    ['Archivo 800', "'Archivo', system-ui, sans-serif"],
    ['Oswald', "'Oswald', system-ui, sans-serif"],
    ['Saira Condensed', "'Saira Condensed', system-ui, sans-serif"],
    ['Bodoni Moda', "'Bodoni Moda', Georgia, serif"],
    ['Courier Prime', "'Courier Prime', ui-monospace, monospace"],
    ['Jost', "'Jost', system-ui, sans-serif"]
  ];
  var BODY_FONTS = [
    ['Archivo', "'Archivo', system-ui, sans-serif"],
    ['Jost', "'Jost', system-ui, sans-serif"],
    ['Courier Prime', "'Courier Prime', ui-monospace, monospace"],
    ['Bodoni Moda', "'Bodoni Moda', Georgia, serif"]
  ];

  /* id, label, kind, default, min, max, step, unit, options */
  var SECTIONS = [
    ['Type', [
      ['h1-font',    'Heading face',    'select', FONTS[0][1], FONTS],
      ['h1-italic',  'Heading italic',  'toggle', 'normal', 'italic'],
      ['h1-size',    'H1 size',         'range',  6.0, 2.4, 9.0, 0.1, 'rem'],
      ['h1-weight',  'H1 weight',       'range',  400, 200, 900, 50, ''],
      ['h1-track',   'H1 tracking',     'range',  -1.5, -6, 4, 0.1, 'em/100'],
      ['h1-leading', 'H1 leading',      'range',  0.86, 0.72, 1.3, 0.01, ''],
      ['h2-size',    'H2 size',         'range',  2.6, 1.1, 4.5, 0.1, 'rem'],
      ['h2-weight',  'H2 weight',       'range',  400, 200, 900, 50, ''],
      ['body-font',  'Body face',       'select', BODY_FONTS[0][1], BODY_FONTS],
      ['body-size',  'Body size',       'range',  1.06, 0.85, 1.5, 0.01, 'rem'],
      ['body-lead',  'Body leading',    'range',  1.6, 1.2, 2.2, 0.02, '']
    ]],
    ['Hero', [
      ['hero-y',     'Image position Y', 'range', 50, 0, 100, 1, '%'],
      ['hero-fade',  'Fade height',      'range', 68, 30, 100, 1, '%'],
      ['hero-ratio', 'Slot ratio',       'range', 0.75, 0.5, 1.4, 0.01, ''],
      ['head-max',   'Headline width',   'range', 11, 6, 20, 0.5, 'ch'],
      ['grade-sat',  'Grade saturation', 'range', 100, 0, 200, 1, '%'],
      ['grade-con',  'Grade contrast',   'range', 100, 50, 180, 1, '%'],
      ['grade-bri',  'Grade brightness', 'range', 100, 50, 150, 1, '%'],
      ['grade-warm', 'Grade warmth',     'range', 0, -60, 60, 1, 'deg']
    ]],
    ['Assets', [
      ['grain',      'Page grain',       'range', 0.42, 0, 1, 0.01, ''],
      ['rule',       'Hairline strength','range', 1, 0, 3, 0.1, 'px'],
      ['plate-op',   'Number plates',    'range', 1, 0, 1, 0.05, ''],
      ['ast-size',   'Asterisk size',    'range', 5.5, 0, 9, 0.1, 'rem']
    ]],
    ['Motion', [
      ['motion',     'Motion',           'toggle', 'on', 'off'],
      ['mo-dur',     'Reveal duration',  'range', 0.72, 0.2, 1.8, 0.02, 's'],
      ['mo-dist',    'Reveal distance',  'range', 16, 0, 60, 1, 'px'],
      ['mo-stagger', 'Stagger step',     'range', 0.14, 0.02, 0.4, 0.01, 's']
    ]],
    ['Palette', [
      ['c-acid',   'Acid',        'color', '#e8e83c'],
      ['c-ink',    'Ink ground',  'color', '#0a0a08'],
      ['c-page',   'Page block',  'color', '#131310'],
      ['c-fg',     'Paper',       'color', '#efefe6'],
      ['c-rule',   'Rule',        'color', '#2a2a24']
    ]]
  ];

  var root = document.documentElement;
  var moved = {};          /* only what the operator actually changed */

  function cssValue(c, raw) {
    var kind = c[2];
    if (kind === 'range') {
      var unit = c[7] || '';
      if (unit === 'em/100') return (raw / 100) + 'em';
      if (unit === 'rem' || unit === 's' || unit === 'px' ||
          unit === '%'   || unit === 'ch' || unit === 'deg') return raw + (unit === 'deg' ? 'deg' : unit);
      return String(raw);
    }
    return String(raw);
  }

  function apply(id, c, raw) {
    var v = cssValue(c, raw);
    root.style.setProperty('--tw-' + id, v);
    moved['--tw-' + id] = v;
  }

  /* ---------- build ---------- */
  var open = document.createElement('button');
  open.id = 'tweak-open';
  open.type = 'button';
  open.textContent = 'Tweak';

  var p = document.createElement('aside');
  p.id = 'tweak';
  p.setAttribute('aria-label', 'Design tweaks');

  var html = '<header><b>Tweaks</b>' +
             '<button type="button" data-act="close">Close</button></header><div class="body">';

  SECTIONS.forEach(function (sec, si) {
    html += '<details' + (si === 0 ? ' open' : '') + '><summary>' + sec[0] + '</summary><div>';
    sec[1].forEach(function (c) {
      var id = c[0], label = c[1], kind = c[2];
      if (kind === 'select') {
        html += '<div class="ctl"><label for="tw-' + id + '">' + label + '</label>' +
                '<select id="tw-' + id + '" data-id="' + id + '">' +
                c[4].map(function (o) {
                  return '<option value="' + o[1].replace(/"/g, '&quot;') + '">' + o[0] + '</option>';
                }).join('') + '</select></div>';
      } else if (kind === 'toggle') {
        html += '<div class="ctl"><div class="swap">' +
                '<input type="checkbox" id="tw-' + id + '" data-id="' + id + '"' +
                (c[3] === 'on' ? ' checked' : '') + '>' +
                '<span>' + label + '</span></div></div>';
      } else if (kind === 'color') {
        html += '<div class="ctl"><label for="tw-' + id + '">' + label +
                '<output id="out-' + id + '">' + c[3] + '</output></label>' +
                '<input type="color" id="tw-' + id + '" data-id="' + id + '" value="' + c[3] + '"></div>';
      } else {
        html += '<div class="ctl"><label for="tw-' + id + '">' + label +
                '<output id="out-' + id + '">' + c[3] + (c[7] && c[7] !== 'em/100' ? c[7] : '') + '</output></label>' +
                '<input type="range" id="tw-' + id + '" data-id="' + id + '" min="' + c[4] +
                '" max="' + c[5] + '" step="' + c[6] + '" value="' + c[3] + '"></div>';
      }
    });
    html += '</div></details>';
  });

  html += '</div><footer>' +
          '<button type="button" data-act="copy">Copy CSS</button>' +
          '<button type="button" class="ghost" data-act="reset">Reset</button>' +
          '<span class="said" id="tw-said"></span></footer>';
  p.innerHTML = html;

  document.body.appendChild(open);
  document.body.appendChild(p);

  var byId = {};
  SECTIONS.forEach(function (s) { s[1].forEach(function (c) { byId[c[0]] = c; }); });

  /* ---------- wire ---------- */
  p.addEventListener('input', function (e) {
    var el = e.target, id = el.dataset.id;
    if (!id) return;
    var c = byId[id];
    if (c[2] === 'toggle') {
      apply(id, c, el.checked ? c[3] : c[4]);
    } else {
      apply(id, c, el.value);
      var out = document.getElementById('out-' + id);
      if (out) out.textContent = el.value + (c[2] === 'range' && c[7] && c[7] !== 'em/100' ? c[7] : '');
    }
  });

  var said = p.querySelector('#tw-said');
  function say(t) { said.textContent = t; setTimeout(function () { said.textContent = ''; }, 2600); }

  p.addEventListener('click', function (e) {
    var act = e.target.dataset.act;
    if (!act) return;
    if (act === 'close') { p.classList.remove('on'); open.focus(); }
    if (act === 'reset') {
      Object.keys(moved).forEach(function (k) { root.style.removeProperty(k); });
      moved = {};
      SECTIONS.forEach(function (s) {
        s[1].forEach(function (c) {
          var el = document.getElementById('tw-' + c[0]);
          if (!el) return;
          if (c[2] === 'toggle') el.checked = (c[3] === 'on');
          else el.value = c[3];
          var out = document.getElementById('out-' + c[0]);
          if (out) out.textContent = c[3] + (c[2] === 'range' && c[7] && c[7] !== 'em/100' ? c[7] : '');
        });
      });
      say('Reset');
    }
    if (act === 'copy') {
      var keys = Object.keys(moved);
      if (!keys.length) { say('Nothing changed yet'); return; }
      var css = ':root{\n' + keys.map(function (k) {
        return '  ' + k + ': ' + moved[k] + ';';
      }).join('\n') + '\n}';
      var done = function () { say('CSS copied, ' + keys.length + ' props'); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(css).then(done, function () { fallback(css, done); });
      } else {
        fallback(css, done);
      }
    }
  });

  /* clipboard is blocked in a background tab and on plain http, so there is
     always a manual path rather than a silent failure */
  function fallback(css, done) {
    /* a second Copy must replace the first sheet, not stack on top of it */
    var stale = document.getElementById('tw-fallback');
    if (stale) stale.remove();
    var ta = document.createElement('textarea');
    ta.id = 'tw-fallback';
    ta.value = css;
    ta.style.cssText = 'position:fixed;top:10%;left:50%;transform:translateX(-50%);z-index:10000;width:min(560px,90vw);height:40vh;font:12px ui-monospace,monospace;';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    if (ok) { ta.remove(); done(); }
    else { say('Select and copy manually'); ta.addEventListener('blur', function () { ta.remove(); }); }
  }

  /* ?tweak=open brings the panel up on load, for screenshots and for
     handing someone a link that already shows it */
  if (location.search.indexOf('tweak=open') > -1) p.classList.add('on');

  open.addEventListener('click', function () {
    p.classList.add('on');
    var first = p.querySelector('select, input');
    if (first) first.focus();
  });

  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && p.classList.contains('on')) p.classList.remove('on');
    if ((e.key === 't' || e.key === 'T') && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
      p.classList.toggle('on');
    }
  });
})();
