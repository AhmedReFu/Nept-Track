// Nept Track website — small progressive enhancements. The page works without JS.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Nav: glass background after scrolling
  var nav = document.getElementById('nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 10); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Reveal sections as they scroll into view, staggered like the app's FadeInView
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var siblings = el.parentElement ? el.parentElement.querySelectorAll(':scope > .reveal') : [];
        var index = Array.prototype.indexOf.call(siblings, el);
        el.style.transitionDelay = Math.max(0, index) * 80 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Count-up numbers in the hero, like the app's AnimatedNumber
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion || target === 0) { el.textContent = String(target); return; }
    var start = null;
    var step = function (t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / 1100);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  // Hero phone: gentle tilt toward the pointer (desktop only)
  var tilt = document.querySelector('.tilt');
  if (tilt && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    var hero = document.querySelector('.hero');
    hero.addEventListener('mousemove', function (e) {
      var r = tilt.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / r.width;
      var y = (e.clientY - (r.top + r.height / 2)) / r.height;
      tilt.style.transform = 'perspective(900px) rotateY(' + (x * 10).toFixed(2) + 'deg) rotateX(' + (-y * 8).toFixed(2) + 'deg)';
    });
    hero.addEventListener('mouseleave', function () { tilt.style.transform = ''; });
  }

  // Hero promo: the poster shows at once; the 16 MB video starts loading only after the
  // page itself has finished, so it never slows the first paint.
  //
  // It plays with sound. Browsers refuse sound before the visitor has touched the page,
  // so when that happens it plays muted and the sound comes on at the first tap, click or
  // key press anywhere. The button lets people turn it off.
  var promo = document.getElementById('promo');
  var soundBtn = document.getElementById('soundBtn');
  var userMuted = false;
  if (promo) {
    var showSound = function () {
      if (!soundBtn) return;
      soundBtn.hidden = false;
      // Muted only because the browser blocked sound: say so loudly, so people tap.
      var blocked = promo.muted && !userMuted;
      soundBtn.classList.toggle('ask', blocked);
      soundBtn.textContent = blocked ? '🔊 Tap for sound' : promo.muted ? '🔇' : '🔊';
      soundBtn.setAttribute('aria-label', promo.muted ? 'Turn sound on' : 'Turn sound off');
    };
    var playWithSound = function () {
      promo.muted = false;
      var p = promo.play();
      if (p && p.then) {
        p.then(showSound).catch(function () {
          // Sound refused: play muted now, unmute on the first interaction.
          promo.muted = true;
          var q = promo.play();
          if (q && q.catch) q.catch(function () {});
          showSound();
        });
      } else {
        showSound();
      }
    };
    var startPromo = function () {
      promo.src = promo.getAttribute('data-src');
      promo.preload = 'auto';
      promo.removeAttribute('muted');
      playWithSound();
    };
    if (document.readyState === 'complete') startPromo();
    else window.addEventListener('load', startPromo);

    var unmuteOnFirstTouch = function (e) {
      if (soundBtn && e && soundBtn.contains(e.target)) return; // the button handles itself
      if (userMuted || !promo.src || !promo.muted) return;
      promo.muted = false;
      var p = promo.play();
      if (p && p.catch) p.catch(function () {});
      showSound();
      ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) {
        window.removeEventListener(t, unmuteOnFirstTouch, true);
      });
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) {
      window.addEventListener(t, unmuteOnFirstTouch, true);
    });

    if (soundBtn) {
      soundBtn.addEventListener('click', function () {
        promo.muted = !promo.muted;
        userMuted = promo.muted;
        if (!promo.muted) {
          var p = promo.play();
          if (p && p.catch) p.catch(function () {});
        }
        showSound();
      });
    }

    // Pause while scrolled away, so the sound does not play over the rest of the page.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!promo.src) return;
          if (entry.isIntersecting) {
            var p = promo.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            promo.pause();
          }
        });
      }, { threshold: 0.25 }).observe(promo);
    }
  }

  // Scroll tour: the step nearest the middle of the screen picks the phone's screen.
  var tourSteps = Array.prototype.slice.call(document.querySelectorAll('.tour-step'));
  var tourShots = Array.prototype.slice.call(document.querySelectorAll('.tour-shot'));
  var tourDots = Array.prototype.slice.call(document.querySelectorAll('.tour-dots span'));
  if (tourSteps.length && tourShots.length) {
    var activeStep = -1;
    var setStep = function (i) {
      if (i === activeStep) return;
      activeStep = i;
      tourSteps.forEach(function (el, k) { el.classList.toggle('active', k === i); });
      tourShots.forEach(function (el, k) { el.classList.toggle('active', k === i); });
      tourDots.forEach(function (el, k) { el.classList.toggle('active', k === i); });
    };
    // The step whose middle is closest to the middle of the screen, read once per frame.
    var ticking = false;
    var pickStep = function () {
      ticking = false;
      var mid = window.innerHeight / 2;
      var best = 0, bestDist = Infinity;
      tourSteps.forEach(function (el, k) {
        var r = el.getBoundingClientRect();
        var d = Math.abs(r.top + r.height / 2 - mid);
        if (d < bestDist) { bestDist = d; best = k; }
      });
      setStep(best);
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(pickStep); }
    }, { passive: true });
    window.addEventListener('resize', pickStep);
    pickStep();
  }

  // Gallery arrows
  var gallery = document.getElementById('gallery');
  if (gallery) {
    var scrollBy = function (dir) {
      gallery.scrollBy({ left: dir * (gallery.clientWidth * 0.8), behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    var prev = document.querySelector('.g-prev');
    var next = document.querySelector('.g-next');
    if (prev) prev.addEventListener('click', function () { scrollBy(-1); });
    if (next) next.addEventListener('click', function () { scrollBy(1); });
  }

  // Lightbox for screenshots
  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var figures = gallery ? Array.prototype.slice.call(gallery.querySelectorAll('figure')) : [];
  var current = 0;

  function show(i) {
    current = (i + figures.length) % figures.length;
    var img = figures[current].querySelector('img');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = figures[current].querySelector('figcaption').textContent;
  }
  function open(i) { show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; }
  function close() { lb.hidden = true; document.body.style.overflow = ''; }

  if (lb && figures.length) {
    figures.forEach(function (fig, i) { fig.addEventListener('click', function () { open(i); }); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); show(current - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });

    // Swipe on touch screens
    var touchX = null;
    lb.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  }
})();
