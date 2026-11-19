/**
 * sidebar-nav.js
 * Ajustements DOM et fonctionnalités interactives pour le template AP-HP.
 * La navigation latérale est générée en Liquid (fragment-pagebegin.html).
 */
(function() {

  /* --- Page active + profondeur dynamique dans le sidebar --- */

  var sidebarList = document.getElementById('sidebar-list');
  if (sidebarList) {
    var items = sidebarList.querySelectorAll('li');
    for (var i = 0; i < items.length; i++) {
      var cls = items[i].className;
      var match = cls.match(/sidebar-depth-(\d+)/);
      if (match) {
        var depth = parseInt(match[1]);
        if (depth > 0) {
          var link = items[i].querySelector('a');
          if (link) {
            link.style.paddingLeft = (15 + depth * 14) + 'px';
            link.style.fontSize = depth === 1 ? '13px' : '12px';
            link.style.color = depth === 1 ? '#555' : '#777';
          }
        }
      }
    }

    // Trouver les groupes dont le parent est artifacts.html (trop de sous-pages)
    var artifactsGroups = {};
    var depth0Items = sidebarList.querySelectorAll('.sidebar-depth-0');
    for (var d = 0; d < depth0Items.length; d++) {
      var a = depth0Items[d].querySelector('a');
      if (a && a.getAttribute('href') === 'artifacts.html') {
        artifactsGroups[depth0Items[d].getAttribute('data-group')] = true;
      }
    }

    var currentPath = sidebarList.getAttribute('data-current-path');
    var links = sidebarList.querySelectorAll('a');
    for (var j = 0; j < links.length; j++) {
      if (links[j].getAttribute('href') === currentPath) {
        links[j].classList.add('active');
        links[j].setAttribute('aria-current', 'page');
        var group = links[j].parentElement.getAttribute('data-group');
        // Ne pas ouvrir les enfants du groupe Artifacts (trop nombreux)
        if (!artifactsGroups[group]) {
          var children = sidebarList.querySelectorAll('.sidebar-child[data-group="' + group + '"]');
          for (var k = 0; k < children.length; k++) {
            children[k].setAttribute('data-open', 'true');
          }
        }
        break;
      }
    }
  }

  /* --- Réorganisation DOM --- */

  var contentWrap = document.getElementById('content-wrapper');
  var innerWrap = contentWrap ? contentWrap.querySelector('.inner-wrapper') : null;
  var navTabs = innerWrap ? innerWrap.querySelector('.nav-tabs') : null;
  if (navTabs && innerWrap && contentWrap) {
    innerWrap.parentNode.insertBefore(navTabs, innerWrap);
    innerWrap.classList.add('has-tabs');
  }

  var publishBox = document.querySelector('#publish-box, .publish-box');
  var segmentContent = document.getElementById('segment-content');
  if (publishBox && segmentContent) {
    segmentContent.parentNode.insertBefore(publishBox, segmentContent);
    publishBox.style.opacity = '1';
  }

  if (contentWrap) {
    var tables = contentWrap.querySelectorAll('table:not(.colsi):not(.colsd)');
    for (var t = 0; t < tables.length; t++) {
      if (tables[t].parentNode) {
        var w = document.createElement('div');
        w.className = 'table-scroll-wrapper';
        tables[t].parentNode.insertBefore(w, tables[t]);
        w.appendChild(tables[t]);
      }
    }
  }

  var cells = document.querySelectorAll('td.hierarchy');
  for (var i = 0; i < cells.length; i++) {
    if (cells[i].textContent.trim() === '0 Table of Contents') {
      cells[i].parentElement.style.display = 'none';
    }
  }


  /* --- Drawer mobile --- */

  var navToggle = document.getElementById('nav-toggle');
  var sidebarWrapper = document.getElementById('sidebar-wrapper');
  var overlay = document.getElementById('mobile-overlay');

  function getFocusable() {
    return sidebarWrapper.querySelectorAll('a[href], button:not([disabled])');
  }

  function trapFocus(e) {
    if (e.key !== 'Tab') return;
    var f = getFocusable();
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      last.focus(); e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      first.focus(); e.preventDefault();
    }
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closeDrawer();
    else trapFocus(e);
  }

  function openDrawer() {
    sidebarWrapper.classList.add('open');
    sidebarWrapper.setAttribute('role', 'dialog');
    sidebarWrapper.setAttribute('aria-modal', 'true');
    overlay.classList.add('visible');
    overlay.setAttribute('aria-hidden', 'false');
    navToggle.classList.add('open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);
    var f = getFocusable();
    if (f.length) f[0].focus();
  }

  function closeDrawer() {
    sidebarWrapper.classList.remove('open');
    sidebarWrapper.removeAttribute('role');
    sidebarWrapper.removeAttribute('aria-modal');
    overlay.classList.remove('visible');
    overlay.setAttribute('aria-hidden', 'true');
    navToggle.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKeydown);
    navToggle.focus();
  }

  if (navToggle) {
    navToggle.addEventListener('click', function() {
      sidebarWrapper.classList.contains('open') ? closeDrawer() : openDrawer();
    });
  }

  if (overlay) {
    overlay.addEventListener('click', closeDrawer);
  }

  // Fermer le drawer au click sur un lien de navigation (sinon il reste ouvert
  // pendant le chargement de la page suivante ou le scroll vers une ancre).
  // Listener délégué : couvre aussi les liens de la TOC, ajoutée plus tard.
  if (sidebarWrapper) {
    sidebarWrapper.addEventListener('click', function(e) {
      if (e.target.closest('a[href]') && sidebarWrapper.classList.contains('open')) closeDrawer();
    });

    // Si l'utilisateur élargit la fenêtre au-dessus du breakpoint mobile alors
    // que le drawer est ouvert, on remet l'état desktop propre (sinon body reste
    // figé par overflow:hidden et le focus trap reste actif).
    window.addEventListener('resize', function() {
      if (window.innerWidth >= 992 && sidebarWrapper.classList.contains('open')) {
        closeDrawer();
      }
    });
  }


  /* --- Table des matières (TOC) --- */

  // La TOC reflète les titres VISIBLES de la page. Elle est reconstruite à
  // chaque changement d'onglet (onglets jQuery UI des pages profil, onglets
  // Bootstrap), sinon elle pointerait vers des titres d'un onglet caché (#6).
  // Chaque lien garde une référence directe à son titre : le publisher peut
  // générer plusieurs titres avec le même id, et '#id' viserait alors le
  // premier du document, éventuellement caché.

  var sidebarNav = document.getElementById('sidebar-nav');
  var innerContent = document.querySelector('#content-wrapper > .inner-wrapper');
  var tocSection = null;
  var headingObserver = null;
  var tocEntries = [];        // [{ link, heading }]
  var clickLockUntil = 0;
  var pendingSpyHeading = null;
  var lockTimer = null;

  function isVisible(el) {
    return el.offsetParent !== null || el.getClientRects().length > 0;
  }

  // Texte d'un titre pour la TOC. textContent colle les morceaux : sur les
  // CapabilityStatement, '<span style="float:right">Resource Conformance:
  // SHALL</span>Appointment' donnerait 'SHALLAppointment'. On sépare donc
  // les éléments flottants ou de type bloc par une espace ; les éléments en
  // ligne (code, em, a…) restent collés comme dans le rendu.
  function headingText(node) {
    var out = '';
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { out += c.nodeValue; continue; }
      if (c.nodeType !== 1) continue;
      var cs = getComputedStyle(c);
      var separate = cs.cssFloat !== 'none' || !/^inline/.test(cs.display);
      var inner = headingText(c);
      out += separate ? ' ' + inner + ' ' : inner;
    }
    return out;
  }

  function collectHeadings() {
    var all = innerContent.querySelectorAll('h2[id], h3[id], h4[id]');
    var result = [];
    var seenIds = {};
    for (var j = 0; j < all.length; j++) {
      var h = all[j];
      var tabPane = h.closest('.tab-pane');
      if (tabPane && !tabPane.classList.contains('active')) continue;
      if (!isVisible(h)) continue;
      if (seenIds[h.id]) continue;   // un même id visible deux fois : on garde le premier
      seenIds[h.id] = true;
      result.push(h);
    }
    return result;
  }

  function setActiveTocLink(link) {
    for (var i = 0; i < tocEntries.length; i++) {
      tocEntries[i].link.classList.remove('toc-active');
      tocEntries[i].link.removeAttribute('aria-current');
    }
    if (link) {
      link.classList.add('toc-active');
      link.setAttribute('aria-current', 'location');
    }
  }

  function linkForHeading(heading) {
    for (var i = 0; i < tocEntries.length; i++) {
      if (tocEntries[i].heading === heading) return tocEntries[i].link;
    }
    return null;
  }

  // Click sur un lien TOC : l'état actif est fixé immédiatement et l'observer
  // est suspendu pendant le scroll smooth. Une intersection survenue pendant
  // le verrou est mémorisée et appliquée à son expiration.
  function lockSpy() {
    clickLockUntil = Date.now() + 800;
    pendingSpyHeading = null;
    clearTimeout(lockTimer);
    lockTimer = setTimeout(function() {
      if (pendingSpyHeading) setActiveTocLink(linkForHeading(pendingSpyHeading));
      pendingSpyHeading = null;
    }, 800);
  }

  function buildToc() {
    if (headingObserver) { headingObserver.disconnect(); headingObserver = null; }
    if (tocSection && tocSection.parentNode) tocSection.parentNode.removeChild(tocSection);
    tocSection = null;
    tocEntries = [];

    var headings = collectHeadings();
    var tocUl = document.createElement('ul');
    var skippedFirstH2 = false;
    for (var m = 0; m < headings.length; m++) {
      var heading = headings[m];
      var tag = heading.tagName.toLowerCase();
      if (tag === 'h2' && !skippedFirstH2) { skippedFirstH2 = true; continue; }
      var text = headingText(heading).replace(/\s+/g, ' ').replace(/^\s*[\d.]+\s*/, '').trim();
      if (!text) continue;

      var li = document.createElement('li');
      if (tag === 'h3') li.style.paddingLeft = '12px';
      if (tag === 'h4') li.style.paddingLeft = '24px';

      var tocLink = document.createElement('a');
      tocLink.href = '#' + heading.id;
      tocLink.textContent = text;
      li.appendChild(tocLink);
      tocUl.appendChild(li);
      tocEntries.push({ link: tocLink, heading: heading });
    }
    if (tocEntries.length === 0) return;

    tocSection = document.createElement('div');
    tocSection.className = 'sidebar-toc-section';
    var tocWrap = document.createElement('div');
    tocWrap.className = 'sidebar-toc-wrapper';
    var tocTitle = document.createElement('div');
    tocTitle.className = 'sidebar-toc-title';
    tocTitle.textContent = 'Sur cette page';
    tocWrap.appendChild(tocTitle);
    var tocNav = document.createElement('nav');
    tocNav.className = 'sidebar-page-toc';
    tocNav.setAttribute('aria-label', 'Sur cette page');
    tocNav.appendChild(tocUl);
    tocWrap.appendChild(tocNav);
    tocSection.appendChild(tocWrap);
    sidebarNav.appendChild(tocSection);

    tocEntries.forEach(function(entry) {
      entry.link.addEventListener('click', function(e) {
        // Scroll vers l'élément lui-même (et non le premier '#id' du document).
        e.preventDefault();
        setActiveTocLink(entry.link);
        lockSpy();
        entry.heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', '#' + entry.heading.id);
      });
    });

    // Scroll spy : quand un titre entre dans la zone de lecture
    if ('IntersectionObserver' in window) {
      headingObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          if (Date.now() < clickLockUntil) { pendingSpyHeading = entry.target; return; }
          setActiveTocLink(linkForHeading(entry.target));
        });
      }, { rootMargin: '-10% 0px -80% 0px', threshold: 0 });
      tocEntries.forEach(function(entry) { headingObserver.observe(entry.heading); });
    }
  }

  if (sidebarNav && innerContent) {
    var origToc = document.querySelector('.markdown-toc');
    if (origToc) origToc.style.display = 'none';

    buildToc();

    // Reconstruction après changement d'onglet (jQuery UI et Bootstrap).
    if (window.jQuery) {
      window.jQuery(document).on('tabsactivate shown.bs.tab', function() { buildToc(); });
    }
  }
})();
