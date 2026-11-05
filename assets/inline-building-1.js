    let currentScreen = 1;
    function setScreen(num) {
      currentScreen = num;
      const n = document.getElementById('stage-num'), bar = document.getElementById('stage-bar');
      if (n) n.textContent = '0' + num;
      if (bar) bar.style.transform = 'scaleY(' + (num / 4) + ')';
      for (let i = 1; i <= 4; i++) {
        const screen = document.getElementById('screen-' + i);
        const tab = document.getElementById('tab-btn-' + i);
        if (screen) screen.classList.remove('is-on');
        if (tab) {
          tab.classList.remove('tab-active');
          tab.classList.add('text-gray-300');
        }
      }
      const activeScreen = document.getElementById('screen-' + num);
      const activeTab = document.getElementById('tab-btn-' + num);
      if (activeScreen) activeScreen.classList.add('is-on');
      if (activeTab) {
        activeTab.classList.add('tab-active');
        activeTab.classList.remove('text-gray-300');
      }
    }
  
