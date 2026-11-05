    // Professional Typewriter Effect
    document.addEventListener('DOMContentLoaded', () => {
      const line1 = "Claim the Spots.";
      const line2 = "Own the Streets.";
      const el1 = document.getElementById('hero-line1');
      const el2 = document.getElementById('hero-line2');
      
      let i = 0;
      let j = 0;
      
      function typeLine2() {
        if (j < line2.length) {
          el2.innerHTML += line2.charAt(j);
          j++;
          setTimeout(typeLine2, 50);
        } else {
          el2.classList.add('typewriter-cursor');
        }
      }
      
      function typeLine1() {
        if (i < line1.length) {
          el1.innerHTML += line1.charAt(i);
          i++;
          setTimeout(typeLine1, 50);
        } else {
          el1.classList.remove('typewriter-cursor');
          setTimeout(typeLine2, 150);
        }
      }
      
      el1.classList.add('typewriter-cursor');
      setTimeout(typeLine1, 200);

      // Status strip: live counts from the app database. site_stats() returns
      // only totals (no rows), so the publishable key can call it. If it fails
      // the strip stays on its OFFLINE placeholders.
      async function updateDashboard() {
        try {
          const res = await fetch('https://hbwycwbmkarztmodssyc.supabase.co/rest/v1/rpc/site_stats', {
            method: 'POST',
            headers: {
              'apikey': 'sb_publishable_l_vkhikI4yoBWubK0MGL9Q_5wxWDEIg', // gitleaks:allow — Supabase publishable key, safe for client code
              'Content-Type': 'application/json',
            },
            body: '{}',
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          const pad = (n, w) => String(n).padStart(w, '0');
          const set = (id, text) => {
            const el = document.getElementById(id);
            el.textContent = text;
            el.classList.replace('text-gray-500', 'text-white');
          };
          set('stat-clips', pad(data.clips, 2));
          set('stat-spots', pad(data.spots, 3));
          set('stat-users', pad(data.users, 3));
          set('stat-battles', pad(data.battles, 2));
          set('stat-status', 'BETA ONLINE');
          document.getElementById('stat-status').classList.replace('text-white', 'text-matrix');
        } catch (e) { console.error('Status strip unavailable:', e); }
      }
      setInterval(updateDashboard, 60000);
      updateDashboard();

      // Top scroll progress bar
      const bar = document.getElementById('scroll-progress');
      if (bar) {
        window.addEventListener('scroll', () => {
          const y = window.scrollY, vh = window.innerHeight;
          const max = document.documentElement.scrollHeight - vh;
          bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
        }, { passive: true });
      }

      // Cursor spotlight on interactive cards
      document.querySelectorAll('.spot').forEach(c => {
        c.addEventListener('pointermove', e => {
          const r = c.getBoundingClientRect();
          c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
          c.style.setProperty('--my', (e.clientY - r.top) + 'px');
        });
      });
    });
  
