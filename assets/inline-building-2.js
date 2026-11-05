  (function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const desktop = window.matchMedia('(min-width: 1024px)');

    // Moving band: built-today loops, speeds up with scroll
    const track = document.getElementById('marquee-track');
    const words = ['Find the spot', 'Turn up', 'Film the make', 'Play S.K.A.T.E.', 'Earn points', 'Climb the board'];
    const chunk = words.map(w => '<span>' + w + '</span><span class="opacity-40">//</span>').join('');
    track.innerHTML = chunk + chunk + chunk + chunk;

    // Split section headings into words for a masked rise
    document.querySelectorAll('main section h2').forEach(h => {
      let i = 0;
      const walk = node => {
        [...node.childNodes].forEach(c => {
          if (c.nodeType === 3) {
            const frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(t => {
              if (!t) return;
              if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
              const w = document.createElement('span'); w.className = 'w';
              const inner = document.createElement('span'); inner.textContent = t; inner.style.setProperty('--d', (i++ * 70) + 'ms');
              w.appendChild(inner); frag.appendChild(w);
            });
            c.replaceWith(frag);
          } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
        });
      };
      walk(h);
    });

    // Reveal targets: section intros, cards, tiers, log weeks (staggered per row)
    const targets = new Set();
    document.querySelectorAll('main section:not(#hero)').forEach(sec => {
      sec.querySelectorAll(':scope > div > div:not(.grid), :scope > div > p').forEach(el => targets.add(el));
      sec.querySelectorAll('.grid > *, #timeline .rounded-2xl').forEach(el => {
        if (!el.closest('.stage-steps') && !el.closest('#engine .lg\\:col-span-5')) targets.add(el);
      });
    });
    document.querySelectorAll('#engine .grid, #engine .grid > *').forEach(el => targets.delete(el));
    const parentCount = new Map();
    targets.forEach(el => {
      el.classList.add('rv');
      const k = parentCount.get(el.parentNode) || 0; parentCount.set(el.parentNode, k + 1);
      el.style.setProperty('--d', Math.min(k, 5) * 90 + 'ms');
    });

    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    targets.forEach(el => io.observe(el));
    document.querySelectorAll('main section h2, .tier-fill').forEach(el => io.observe(el));

    // Cursor spotlight on cards
    document.querySelectorAll('main .grid > div, .stage-steps button').forEach(c => {
      c.classList.add('spot');
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    if (reduce) { document.querySelectorAll('.rv, h2').forEach(el => el.classList.add('in')); }

    // Desktop: the stage nearest mid-screen drives the phone
    const steps = [1, 2, 3, 4].map(i => document.getElementById('tab-btn-' + i));
    const bar = document.getElementById('scroll-progress');
    const heroInner = document.getElementById('hero-inner');
    const logLine = document.querySelector('.log-line');
    const devlog = null;
    let lastY = window.scrollY, x = 0, speed = 1, ticking = false;
    let currentDeckActive = -2;
    let popoutTimer = null;
    let railIdleTimer = null;
    let isScrubbing = false;

    const deckRail = document.getElementById('deck-rail');
    function wakeRail(duration = 1500) {
      if (!deckRail) return;
      deckRail.classList.add('is-awake');
      if (railIdleTimer) clearTimeout(railIdleTimer);
      if (!desktop.matches && !isScrubbing) {
        railIdleTimer = setTimeout(() => {
          if (!isScrubbing) deckRail.classList.remove('is-awake');
        }, duration);
      }
    }

    function frame() {
      const y = window.scrollY, vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
      wakeRail(1500);

      if (heroInner && y < vh * 1.2) {
        heroInner.style.transform = 'translateY(' + (y * 0.35) + 'px) scale(' + (1 - Math.min(y / vh, 1) * 0.08) + ')';
        heroInner.style.opacity = String(Math.max(0, 1 - y / (vh * 0.75)));
      }
      if (desktop.matches) {
        let best = currentScreen, bestD = Infinity;
        steps.forEach((s, i) => { const r = s.getBoundingClientRect(); const d = Math.abs(r.top + r.height / 2 - vh / 2); if (d < bestD) { bestD = d; best = i + 1; } });
        if (best !== currentScreen) setScreen(best);
      }
      if (logLine && devlog) {
        const r = devlog.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (vh * 0.7 - r.top) / (r.height * 0.85)));
        logLine.style.transform = 'scaleY(' + p + ')';
      }

      // Pitch Deck Section Progress Rail ScrollSpy & Liquid Continuous Spine
      const sectionIds = ['mission', 'engine', 'careers', 'susu', 'economy', 'timeline'];
      const railNodes = document.querySelectorAll('.deck-node');
      const railProgress = document.getElementById('deck-rail-progress');
      if (deckRail && railNodes.length) {
        if (desktop.matches) {
          const hero = document.getElementById('hero');
          if (hero) {
            const heroBottom = hero.getBoundingClientRect().bottom;
            deckRail.style.opacity = heroBottom > vh * 0.5 ? '0.75' : '1';
          }
        } else {
          deckRail.style.opacity = '';
        }

        // Tap/click listeners for instant mobile navigation & popout
        railNodes.forEach((node, idx) => {
          if (!node._hasDeckTap) {
            node._hasDeckTap = true;
            node.addEventListener('click', (e) => {
              e.preventDefault();
              const targetId = node.getAttribute('data-section');
              const targetEl = document.getElementById(targetId);
              if (targetEl) {
                targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                currentDeckActive = idx;
                if (popoutTimer) clearTimeout(popoutTimer);
                document.querySelectorAll('.deck-popout').forEach(p => p.classList.remove('popout-visible'));
                const popout = node.querySelector('.deck-popout');
                if (popout) {
                  popout.classList.add('popout-visible');
                  popoutTimer = setTimeout(() => {
                    popout.classList.remove('popout-visible');
                    popoutTimer = null;
                  }, 3000);
                }
              }
            });
          }
        });

        const secEls = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
        const N = secEls.length;
        if (N === sectionIds.length && !isScrubbing) {
          const viewportFocus = vh * 0.38;
          const firstTop = secEls[0].getBoundingClientRect().top;
          let progressPct = 0;
          let activeIdx = -1;

          if (viewportFocus < firstTop) {
            progressPct = 0;
            activeIdx = -1;
          } else {
            for (let i = 0; i < N - 1; i++) {
              const curTop = secEls[i].getBoundingClientRect().top;
              const nextTop = secEls[i + 1].getBoundingClientRect().top;
              if (viewportFocus >= curTop && viewportFocus < nextTop) {
                activeIdx = i;
                const segFraction = (nextTop > curTop) ? (viewportFocus - curTop) / (nextTop - curTop) : 0;
                progressPct = ((i + segFraction) / (N - 1)) * 100;
                break;
              }
            }
            if (activeIdx === -1 && viewportFocus >= secEls[N - 1].getBoundingClientRect().top) {
              activeIdx = N - 1;
              progressPct = 100;
            }
          }

          progressPct = Math.min(100, Math.max(0, progressPct));
          if (railProgress) {
            railProgress.style.height = progressPct.toFixed(2) + '%';
          }

          railNodes.forEach((node, idx) => {
            if (idx === activeIdx) {
              node.classList.add('is-active');
              node.classList.remove('is-visited', 'is-future');
            } else if (idx < activeIdx) {
              node.classList.add('is-visited');
              node.classList.remove('is-active', 'is-future');
            } else {
              node.classList.add('is-future');
              node.classList.remove('is-active', 'is-visited');
            }
          });

          // Trigger dynamic chapter popout indicator on section change
          if (activeIdx !== currentDeckActive) {
            currentDeckActive = activeIdx;
            if (popoutTimer) {
              clearTimeout(popoutTimer);
              popoutTimer = null;
            }
            document.querySelectorAll('.deck-popout').forEach(p => p.classList.remove('popout-visible'));
            if (activeIdx >= 0 && activeIdx < railNodes.length) {
              const popout = railNodes[activeIdx].querySelector('.deck-popout');
              if (popout) {
                popout.classList.add('popout-visible');
                popoutTimer = setTimeout(() => {
                  popout.classList.remove('popout-visible');
                  popoutTimer = null;
                }, 2200);
              }
            }
          }
        }
      }
      speed += (Math.min(Math.abs(y - lastY), 60) / 6 - speed + 1) * 0.1;
      lastY = y; ticking = false;
    }

    // Touch & Drag Scrubber along Pitch Deck Rail
    if (deckRail) {
      const sectionIds = ['mission', 'engine', 'careers', 'susu', 'economy', 'timeline'];
      const secEls = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
      const railNodes = document.querySelectorAll('.deck-node');
      const railProgress = document.getElementById('deck-rail-progress');
      const N = secEls.length;

      function handleScrub(touchY) {
        const rect = deckRail.getBoundingClientRect();
        const trackTop = rect.top + 14;
        const trackHeight = Math.max(1, rect.height - 28);
        const relY = Math.max(0, Math.min(1, (touchY - trackTop) / trackHeight));
        const targetFraction = relY;
        const targetIdx = Math.min(N - 1, Math.max(0, Math.round(targetFraction * (N - 1))));

        const sec = secEls[targetIdx];
        if (sec) {
          window.scrollTo({ top: sec.offsetTop - window.innerHeight * 0.15, behavior: 'instant' });
        }

        if (railProgress) {
          railProgress.style.height = (targetFraction * 100).toFixed(2) + '%';
        }

        railNodes.forEach((node, idx) => {
          if (idx === targetIdx) {
            node.classList.add('is-active');
            node.classList.remove('is-visited', 'is-future');
          } else if (idx < targetIdx) {
            node.classList.add('is-visited');
            node.classList.remove('is-active', 'is-future');
          } else {
            node.classList.add('is-future');
            node.classList.remove('is-active', 'is-visited');
          }
        });

        if (targetIdx !== currentDeckActive) {
          currentDeckActive = targetIdx;
          document.querySelectorAll('.deck-popout').forEach(p => p.classList.remove('popout-visible'));
          const popout = railNodes[targetIdx] && railNodes[targetIdx].querySelector('.deck-popout');
          if (popout) popout.classList.add('popout-visible');
        }
      }

      deckRail.addEventListener('touchstart', (e) => {
        isScrubbing = true;
        deckRail.classList.add('is-awake');
        if (railIdleTimer) clearTimeout(railIdleTimer);
        if (e.touches && e.touches.length) {
          handleScrub(e.touches[0].clientY);
        }
      }, { passive: false });

      deckRail.addEventListener('touchmove', (e) => {
        if (!isScrubbing) return;
        e.preventDefault();
        if (e.touches && e.touches.length) {
          handleScrub(e.touches[0].clientY);
        }
      }, { passive: false });

      const endScrub = () => {
        if (!isScrubbing) return;
        isScrubbing = false;
        if (popoutTimer) clearTimeout(popoutTimer);
        popoutTimer = setTimeout(() => {
          document.querySelectorAll('.deck-popout').forEach(p => p.classList.remove('popout-visible'));
          popoutTimer = null;
        }, 1800);
        wakeRail(1500);
      };

      deckRail.addEventListener('touchend', endScrub, { passive: true });
      deckRail.addEventListener('touchcancel', endScrub, { passive: true });
    }

    // Phones and tablets: the phone sits above the stages, so it plays through them on its own while on screen
    const phone = document.getElementById('screen-1').closest('.phone-shadow');
    let cycle = null;
    new IntersectionObserver(es => es.forEach(e => {
      clearInterval(cycle); cycle = null;
      if (e.isIntersecting && !desktop.matches) cycle = setInterval(() => setScreen(currentScreen % 4 + 1), 2800);
    }), { threshold: 0.5 }).observe(phone);
    steps.forEach(s => s.addEventListener('click', () => { if (cycle) { clearInterval(cycle); cycle = null; } }));

    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    window.addEventListener('touchmove', () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    window.addEventListener('resize', () => { requestAnimationFrame(frame); }, { passive: true });
    frame();
    wakeRail(2500);

    (function loop() {
      if (reduce || !desktop.matches) return;
      x -= speed; const half = track.scrollWidth / 2;
      if (-x >= half) x += half;
      track.style.transform = 'translateX(' + x + 'px)';
      requestAnimationFrame(loop);
    })();
  })();
  
