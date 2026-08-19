/* =====================================================================
   LAKOU PHARMACIE — menu global
   Chaque page doit avoir :
     <div id="lakou-header"></div>   juste après <body>
     <script src="supabase-client.js"></script>   AVANT ce script
     <script src="nav.js"></script>
   Toute modification du menu (liens, ordre, dropdowns) se fait dans
   partials/header.html — jamais dans les pages elles-mêmes.
===================================================================== */
(function () {
  var placeholder = document.getElementById('lakou-header');
  if (!placeholder) return;

  fetch('partials/header.html')
    .then(function (r) { return r.text(); })
    .then(function (html) {
      placeholder.outerHTML = html;
      initNav();
    })
    .catch(function (err) {
      console.error('Impossible de charger le menu :', err);
    });

  async function initNav() {
    // burger mobile
    var menuToggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.nav');
    if (menuToggle && nav) {
      menuToggle.addEventListener('click', function () {
        var open = menuToggle.getAttribute('aria-expanded') === 'true';
        menuToggle.setAttribute('aria-expanded', String(!open));
        nav.classList.toggle('open', !open);
      });
      nav.querySelectorAll('a:not(.dropdown-menu a)').forEach(function (a) {
        a.addEventListener('click', function () {
          nav.classList.remove('open');
          menuToggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    // listes déroulantes (Ateliers, Réseau)
    document.querySelectorAll('.nav-dropdown').forEach(function (dropdown) {
      var toggle = dropdown.querySelector('.dropdown-toggle');
      toggle.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = toggle.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll('.nav-dropdown').forEach(function (d) {
          d.classList.remove('open');
          d.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
        });
        toggle.setAttribute('aria-expanded', String(!open));
        dropdown.classList.toggle('open', !open);
      });
    });
    document.addEventListener('click', function (e) {
      document.querySelectorAll('.nav-dropdown.open').forEach(function (d) {
        if (!d.contains(e.target)) {
          d.classList.remove('open');
          d.querySelector('.dropdown-toggle').setAttribute('aria-expanded', 'false');
        }
      });
    });

    // état connecté / déconnecté
    var btnConnexion = document.getElementById('btn-connexion');
    var lienDashboard = document.getElementById('lien-dashboard');
    var lienDossiers = document.getElementById('lien-mes-dossiers');

    try {
      var res = await window.supabaseClient.auth.getSession();
      var session = res.data.session;
      if (session) {
        if (lienDashboard) lienDashboard.style.display = '';
        if (lienDossiers) lienDossiers.style.display = '';
        if (btnConnexion) {
          btnConnexion.textContent = 'Déconnexion';
          btnConnexion.setAttribute('href', '#');
          btnConnexion.addEventListener('click', async function (e) {
            e.preventDefault();
            await window.supabaseClient.auth.signOut();
            window.location.reload();
          });
        }
      }
    } catch (err) {
      console.error('Session non vérifiable :', err);
    }
  }
})();
