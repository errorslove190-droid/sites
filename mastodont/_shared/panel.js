/* Version panel shared by every direction.
   Two-line labels, an ALL 5 link and keys 1-5, as in the donor's rebuilt
   collection. Once a direction has been iterated, its sub-versions appear
   in the same header right after it, the way V3A / V3B / V3C do in the
   donor's collection at 15:43. The panel hides itself inside embeds. */
(function () {
  var V = [
    { id: 'v1', n: 'V1', name: 'Paper Collage' },
    { id: 'v2', n: 'V2', name: 'Acid Poster' },
    { id: 'v3', n: 'V3', name: 'Dark Stage' },
    { id: 'v4', n: 'V4', name: 'Metal & Electric' },
    { id: 'v5', n: 'V5', name: 'Scarlet Accent' }
  ];

  /* sub-versions, keyed by the direction they belong to */
  var SUBS = {
    v2: [
      { id: 'v2a', n: 'V2A', name: 'Acid Columns' },
      { id: 'v2b', n: 'V2B', name: 'Acid Ledger' },
      { id: 'v2c', n: 'V2C', name: 'Acid Frames' }
    ]
  };

  /* The finished build is a destination, not a fourth variant. Kept in the
     right-hand cluster so it is reachable from every page: inside the family
     only, it disappeared the moment you clicked another direction. */
  var FINAL = { id: 'final', n: 'Final', name: 'Final build' };

  /* a sub-version whose folder name is not <family><letter> needs the family
     stated outright, otherwise there is no way back to it from the panel */
  var FAMILY_OF = { final: 'v2' };

  var here = (document.currentScript && document.currentScript.dataset.v) || 'v1';
  var family = FAMILY_OF[here] || here.replace(/[a-z]$/, '');   /* v2b -> v2 */

  if (location.search.indexOf('embed') > -1) {
    document.documentElement.classList.add('embed');
  }

  var nav = document.createElement('nav');
  nav.className = 'versions';
  nav.setAttribute('aria-label', 'Design directions');

  function tab(v, sub) {
    return '<a href="../' + v.id + '/index.html"' +
           (sub ? ' class="vsub' + (v.done ? ' vdone' : '') + '"' : '') +
           (v.id === here ? ' aria-current="page"' : '') +
           '><span>' + v.n + '</span><b>' + v.name + '</b></a>';
  }

  /* the way out: every page can get back to the catalogue of everything built */
  var html = '<a class="vback" href="../../ОТКРОЙ МЕНЯ.html">← Index</a>' +
             '<a class="vhome" href="../all.html">Mastodont<b>5 directions</b></a>';
  V.forEach(function (v) {
    html += tab(v, false);
    if (v.id === family && SUBS[v.id]) {
      SUBS[v.id].forEach(function (s) { html += tab(s, true); });
    }
  });
  html += '<span class="vspacer"></span>' +
          '<a class="vall vfinal" href="../' + FINAL.id + '/index.html"' +
          (here === FINAL.id ? ' aria-current="page"' : '') + '>' + FINAL.n + '</a>' +
          '<a class="vall" href="../all.html">All 5</a>' +
          '<span class="vkeys">Keys 1-5 &middot; F</span>';
  nav.innerHTML = html;

  document.body.insertBefore(nav, document.body.firstChild);

  /* ?hero=N drops a generated candidate into the reserved slot. The slot was
     sized for it at step 7, so nothing else on the page moves. */
  var hero  = (location.search.match(/[?&]hero=(\d+)/)  || [])[1];
  var grade = (location.search.match(/[?&]grade=(\d+)/) || [])[1];
  var pick  = grade ? 'grade-' + grade : (hero ? 'hero-' + hero : null);
  if (pick) {
    /* this script runs at the top of <body>, so the slot is not parsed yet */
    var applyHero = function () {
      var slot = document.querySelector('.slot');
      if (!slot) return;
      slot.style.backgroundImage = 'url("../assets/hero/' + pick + '.png")';
      slot.style.backgroundSize = 'cover';
      slot.style.backgroundPosition = 'center';
      var note = slot.querySelector('.slot-note');
      if (note) note.remove();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyHero);
    } else {
      applyHero();
    }
  }


  /* 1-5 jump between directions; a-c between the sub-versions of this one */
  window.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;

    var i = parseInt(e.key, 10);
    if (i >= 1 && i <= 5) {
      e.preventDefault();
      location.href = '../' + V[i - 1].id + '/index.html';
      return;
    }
    if ((e.key || '').toLowerCase() === 'f') {
      e.preventDefault();
      location.href = '../' + FINAL.id + '/index.html';
      return;
    }
    var subs = SUBS[family];
    if (subs) {
      var j = 'abc'.indexOf((e.key || '').toLowerCase());
      if (j > -1 && subs[j]) {
        e.preventDefault();
        location.href = '../' + subs[j].id + '/index.html';
      }
    }
  });
})();
