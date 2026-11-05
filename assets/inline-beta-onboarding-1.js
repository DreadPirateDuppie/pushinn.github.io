    (function () {
      var params = new URLSearchParams(window.location.search);
      var hasInvite = params.has('invite') || params.has('ref') || params.has('token');
      var lockedState = document.getElementById('locked-state');
      var unlockedState = document.getElementById('unlocked-state');

      if (hasInvite) {
        if (lockedState) lockedState.classList.add('hidden');
        if (unlockedState) unlockedState.classList.remove('hidden');
      } else {
        if (lockedState) lockedState.classList.remove('hidden');
        if (unlockedState) unlockedState.classList.add('hidden');
        return;
      }

      // Supabase — publishable key, safe to expose; the beta_signups table is INSERT-only via RLS
      var SUPABASE_URL = 'https://hbwycwbmkarztmodssyc.supabase.co';
      var SUPABASE_KEY = 'sb_publishable_l_vkhikI4yoBWubK0MGL9Q_5wxWDEIg'; // gitleaks:allow — Supabase publishable key, safe for client code; beta_signups is INSERT-only via RLS

      var form = document.getElementById('beta-form');
      var btn = document.getElementById('beta-submit');
      var errBox = document.getElementById('beta-error');

      if (!form) return;

      function showError(msg) {
        errBox.textContent = msg;
        errBox.classList.remove('hidden');
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        errBox.classList.add('hidden');

        // Honeypot tripped — silently pretend it worked
        if (form.elements['company'] && form.elements['company'].value) {
          window.location.href = '/thank-you';
          return;
        }

        // Age gate — hard stop, no submission for under-18s
        if (!form.elements['age_confirmed'].checked) {
          showError('You must be 18 or over to join the Pushinn beta.');
          return;
        }

        // People keep typing their phone number here. A model always has letters.
        var model = (form.elements['device_model'].value || '').trim();
        if (!/[a-z]/i.test(model)) {
          showError('That looks like a phone number. Put your device model instead, e.g. iPhone 13.');
          form.elements['device_model'].focus();
          return;
        }

        var inviteVal = (params.get('invite') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
        var refVal = (params.get('ref') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
        var sourceTag = 'beta-onboarding';
        if (inviteVal) {
          sourceTag += ':invite-' + inviteVal;
        }
        if (refVal) {
          sourceTag += ':ref-' + refVal;
        }

        var payload = {
          source:          sourceTag,
          email:           (form.elements['email'].value || '').trim(),
          platform:         form.elements['platform'].value || null,
          device_model:     model,
          instagram:        (form.elements['instagram'].value || '').trim() || null,
          age_confirmed:    form.elements['age_confirmed'].checked,
          email_consent:    form.elements['email_consent'].checked,
          feedback_commit:  form.elements['feedback_commit'].checked
        };

        btn.disabled = true;
        var originalText = btn.textContent;
        btn.textContent = 'SENDING…';

        fetch(SUPABASE_URL + '/rest/v1/beta_signups', {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(payload)
        }).then(function (res) {
          if (res.ok) {
            window.location.href = '/thank-you';
            return;
          }
          if (res.status === 409) {
            // Duplicate email — already on the list, that's fine
            window.location.href = '/thank-you';
            return;
          }
          return res.text().then(function (t) {
            throw new Error(t || ('HTTP ' + res.status));
          });
        }).catch(function (err) {
          console.error('Beta signup failed:', err);
          btn.disabled = false;
          btn.textContent = originalText;
          showError('Something went wrong sending that. Try again, or email admin@pushinn.app.');
        });
      });
    })();
  
