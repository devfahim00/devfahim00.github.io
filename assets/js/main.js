(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;

  /* footer year */
  var yr = $('#year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* nav state, scroll progress, back-to-top */
  var nav = $('#nav'), bar = $('#progress'), toTop = $('#toTop');
  function onScroll() {
    var y = window.scrollY;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle('scrolled', y > 20);
    bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    toTop.classList.toggle('show', y > 700);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  /* mobile menu */
  var menuBtn = $('#menuBtn'), links = $('#navLinks');
  menuBtn.addEventListener('click', function () {
    var open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('a', links).forEach(function (a) {
    a.addEventListener('click', function () {
      links.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  /* reveal on scroll */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });

    /* active nav link */
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          $$('.nav-links a').forEach(function (a) {
            a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

  /* typed role line */
  var typed = $('#typed');
  var words = ['Flutter apps', 'Kotlin apps', 'Cloudflare Workers APIs', 'admin panels', 'Telegram bots'];
  if (typed) {
    if (reduce) {
      typed.textContent = words[0];
    } else {
      var w = 0, c = 0, del = false;
      (function tick() {
        var word = words[w];
        c += del ? -1 : 1;
        typed.textContent = word.slice(0, c);
        var d = del ? 35 : 70;
        if (!del && c === word.length) { del = true; d = 1400; }
        else if (del && c === 0) { del = false; w = (w + 1) % words.length; d = 350; }
        setTimeout(tick, d);
      })();
    }
  }

  /* cursor glow */
  var glow = $('#glow');
  if (glow && fine && !reduce) {
    window.addEventListener('pointermove', function (e) {
      glow.classList.add('on');
      glow.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)';
    }, { passive: true });
  }

  /* project cards: spotlight + tilt */
  $$('.card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      if (fine && !reduce) {
        var rx = ((y / r.height) - 0.5) * -6;
        var ry = ((x / r.width) - 0.5) * 6;
        card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
      }
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  });

  /* project filters */
  var chips = $$('.filter'), cards = $$('.card');
  chips.forEach(function (btn) {
    btn.addEventListener('click', function () {
      chips.forEach(function (x) {
        x.classList.toggle('active', x === btn);
        x.setAttribute('aria-pressed', String(x === btn));
      });
      var f = btn.getAttribute('data-filter');
      cards.forEach(function (card) {
        var cats = (card.getAttribute('data-cat') || '').split(' ');
        card.hidden = !(f === 'all' || cats.indexOf(f) !== -1);
      });
    });
  });

  /* live GitHub star counts (silent fallback) */
  (function () {
    var KEY = 'ghstars:v1';
    function apply(data) {
      $$('.stars[data-repo]').forEach(function (el) {
        var n = data[el.getAttribute('data-repo')];
        if (typeof n === 'number') {
          el.querySelector('b').textContent = n;
          el.classList.add('ready');
        }
      });
    }
    try {
      var cached = sessionStorage.getItem(KEY);
      if (cached) { apply(JSON.parse(cached)); return; }
    } catch (e) { /* storage unavailable */ }

    fetch('https://api.github.com/users/devfahim00/repos?per_page=100')
      .then(function (res) { if (!res.ok) throw new Error(res.status); return res.json(); })
      .then(function (repos) {
        var data = {};
        repos.forEach(function (r) { data[r.name] = r.stargazers_count; });
        try { sessionStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
        apply(data);
      })
      .catch(function () { /* keep stars hidden */ });
  })();

  /* copy to clipboard */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var label = btn.querySelector('span');
      function done() {
        var old = label.textContent;
        label.textContent = 'Copied!';
        setTimeout(function () { label.textContent = old; }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var t = document.createElement('textarea');
        t.value = text; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(t); done();
      }
    });
  });
})();
