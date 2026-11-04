/* Hide the Union link in the nav until the visitor is signed in.
   Cosmetic only: the Union page itself sends signed-out visitors to sign-in,
   and its data is protected by the database, not by this script. */
(function () {
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (/^sb-.+-auth-token$/.test(k) && localStorage.getItem(k)) return;
    }
  } catch (e) { return; }
  var st = document.createElement('style');
  st.textContent = 'nav a[href="/union"]{display:none!important}';
  document.head.appendChild(st);
})();
