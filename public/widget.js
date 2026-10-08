/**
 * Widget de Chat Web - Secrétaire Médicale IA
 * ---------------------------------------------
 * Composant autonome à intégrer sur le site d'un cabinet médical.
 *
 * Utilisation (à coller avant </body> sur le site du cabinet) :
 *
 * <script
 *   src="https://votre-domaine.com/widget.js"
 *   data-server-url="https://votre-api.com"
 *   data-cabinet-name="Cabinet Dr. Alaoui"
 * ></script>
 *
 * Le widget génère et conserve automatiquement un identifiant de
 * conversation par visiteur (localStorage), pas de configuration
 * supplémentaire nécessaire côté site du cabinet.
 */
(function () {
  'use strict';

  // ---------- 1. Configuration lue depuis la balise <script> ----------
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();

  var SERVER_URL = currentScript.getAttribute('data-server-url') || 'http://localhost:3000';
  var CABINET_NAME = currentScript.getAttribute('data-cabinet-name') || 'Assistant du cabinet';

  // ---------- 2. Identifiant de conversation persistant par visiteur ----------
  var STORAGE_KEY = 'cw_conversation_id';
  var conversationId = localStorage.getItem(STORAGE_KEY);
  if (!conversationId) {
    conversationId =
      'conv-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(STORAGE_KEY, conversationId);
  }
  var senderId = conversationId; // le patient est identifié par sa conversation

  // ---------- 3. Styles injectés (préfixés "cw-" pour ne rien casser sur le site hôte) ----------
  var css = [
    '.cw-bubble{position:fixed;bottom:24px;right:24px;width:60px;height:60px;',
    'border-radius:50%;background:#0f6e6a;box-shadow:0 4px 16px rgba(15,110,106,.35);',
    'display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:999998;',
    'transition:transform .15s ease;border:none;}',
    '.cw-bubble:hover{transform:scale(1.06);}',
    '.cw-bubble svg{width:26px;height:26px;fill:#fff;}',
    '.cw-badge{position:absolute;top:-2px;right:-2px;background:#e2673a;color:#fff;',
    'font-size:11px;font-family:system-ui,sans-serif;font-weight:600;min-width:18px;height:18px;',
    'border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 4px;}',
    '.cw-panel{position:fixed;bottom:96px;right:24px;width:340px;max-width:calc(100vw - 32px);',
    'height:460px;max-height:calc(100vh - 140px);background:#fff;border-radius:14px;',
    'box-shadow:0 12px 40px rgba(15,25,35,.22);display:flex;flex-direction:column;overflow:hidden;',
    'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;z-index:999999;opacity:0;',
    'pointer-events:none;transform:translateY(12px);transition:opacity .18s ease,transform .18s ease;}',
    '.cw-panel.cw-open{opacity:1;pointer-events:auto;transform:translateY(0);}',
    '.cw-header{background:#0f6e6a;color:#fff;padding:14px 16px;display:flex;',
    'align-items:center;justify-content:space-between;}',
    '.cw-header-title{font-size:14px;font-weight:600;}',
    '.cw-header-sub{font-size:11px;opacity:.8;margin-top:2px;}',
    '.cw-close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;',
    'line-height:1;padding:4px;opacity:.85;}',
    '.cw-close:hover{opacity:1;}',
    '.cw-messages{flex:1;overflow-y:auto;padding:12px;background:#f4f7f7;',
    'display:flex;flex-direction:column;gap:8px;}',
    '.cw-msg{max-width:78%;padding:8px 11px;border-radius:12px;font-size:13.5px;',
    'line-height:1.4;word-wrap:break-word;}',
    '.cw-msg-patient{align-self:flex-end;background:#0f6e6a;color:#fff;',
    'border-bottom-right-radius:3px;}',
    '.cw-msg-other{align-self:flex-start;background:#fff;color:#1c2b2a;',
    'border:1px solid #e2e8e7;border-bottom-left-radius:3px;}',
    '.cw-msg-time{display:block;font-size:10px;opacity:.65;margin-top:3px;}',
    '.cw-empty{margin:auto;text-align:center;color:#7c8c8b;font-size:13px;padding:24px;}',
    '.cw-input-row{display:flex;gap:8px;padding:10px;border-top:1px solid #e9edec;background:#fff;}',
    '.cw-input{flex:1;border:1px solid #dbe3e2;border-radius:20px;padding:9px 14px;',
    'font-size:13.5px;outline:none;font-family:inherit;}',
    '.cw-input:focus{border-color:#0f6e6a;}',
    '.cw-send{background:#0f6e6a;border:none;border-radius:50%;width:36px;height:36px;',
    'flex-shrink:0;cursor:pointer;display:flex;align-items:center;justify-content:center;}',
    '.cw-send:hover{background:#0c5b57;}',
    '.cw-send svg{width:16px;height:16px;fill:#fff;}',
    '.cw-status{font-size:10.5px;color:#7c8c8b;padding:2px 12px 8px;}',
  ].join('');

  var styleTag = document.createElement('style');
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // ---------- 4. Structure HTML du widget ----------
  var bubble = document.createElement('button');
  bubble.className = 'cw-bubble';
  bubble.setAttribute('aria-label', 'Ouvrir le chat');
  bubble.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M4 4h16v12H7l-3 3V4z"/></svg>' +
    '<span class="cw-badge" style="display:none;">1</span>';

  var panel = document.createElement('div');
  panel.className = 'cw-panel';
  panel.innerHTML =
    '<div class="cw-header">' +
    '<div><div class="cw-header-title">' + escapeHtml(CABINET_NAME) + '</div>' +
    '<div class="cw-header-sub">Nous répondons généralement rapidement</div></div>' +
    '<button class="cw-close" aria-label="Fermer">&times;</button>' +
    '</div>' +
    '<div class="cw-messages"><div class="cw-empty">Posez votre question, un membre du cabinet ou notre assistant vous répondra ici.</div></div>' +
    '<div class="cw-status">Connexion...</div>' +
    '<div class="cw-input-row">' +
    '<input class="cw-input" type="text" placeholder="Votre message..." />' +
    '<button class="cw-send" aria-label="Envoyer"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button>' +
    '</div>';

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  var messagesEl = panel.querySelector('.cw-messages');
  var statusEl = panel.querySelector('.cw-status');
  var inputEl = panel.querySelector('.cw-input');
  var sendBtn = panel.querySelector('.cw-send');
  var closeBtn = panel.querySelector('.cw-close');
  var badgeEl = bubble.querySelector('.cw-badge');

  var isOpen = false;
  var unread = 0;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function setUnread(n) {
    unread = n;
    if (unread > 0) {
      badgeEl.style.display = 'flex';
      badgeEl.textContent = unread > 9 ? '9+' : String(unread);
    } else {
      badgeEl.style.display = 'none';
    }
  }

  function togglePanel(open) {
    isOpen = open !== undefined ? open : !isOpen;
    panel.classList.toggle('cw-open', isOpen);
    if (isOpen) {
      setUnread(0);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  bubble.addEventListener('click', function () {
    togglePanel();
  });
  closeBtn.addEventListener('click', function () {
    togglePanel(false);
  });

  function renderMessage(msg) {
    var empty = messagesEl.querySelector('.cw-empty');
    if (empty) empty.remove();

    var isPatient = msg.senderType === 'patient';
    var bubbleEl = document.createElement('div');
    bubbleEl.className = 'cw-msg ' + (isPatient ? 'cw-msg-patient' : 'cw-msg-other');

    var time = '';
    try {
      time = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      time = '';
    }

    bubbleEl.innerHTML =
      escapeHtml(msg.message) + (time ? '<span class="cw-msg-time">' + time + '</span>' : '');
    messagesEl.appendChild(bubbleEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ---------- 5. Connexion Socket.io (chargée depuis un CDN si absente) ----------
  function loadSocketIoThenConnect() {
    if (window.io) {
      connect();
      return;
    }
    var script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.5/socket.io.min.js';
    script.onload = connect;
    script.onerror = function () {
      statusEl.textContent = 'Chat momentanément indisponible.';
    };
    document.head.appendChild(script);
  }

  function connect() {
    var socket = window.io(SERVER_URL);

    socket.on('connect', function () {
      statusEl.textContent = '';
      socket.emit('joinConversation', { conversationId: conversationId });
    });

    socket.on('disconnect', function () {
      statusEl.textContent = 'Connexion perdue, nouvelle tentative...';
    });

    socket.on('conversationHistory', function (history) {
      messagesEl.innerHTML = '';
      (history || []).forEach(renderMessage);
      if (!history || history.length === 0) {
        messagesEl.innerHTML =
          '<div class="cw-empty">Posez votre question, un membre du cabinet ou notre assistant vous répondra ici.</div>';
      }
    });

    socket.on('newMessage', function (msg) {
      renderMessage(msg);
      // On ne compte comme "non lu" que les messages qui ne viennent pas du patient lui-même
      if (msg.senderType !== 'patient' && !isOpen) {
        setUnread(unread + 1);
      }
    });

    function send() {
      var text = inputEl.value.trim();
      if (!text) return;
      socket.emit('sendMessage', {
        conversationId: conversationId,
        senderId: senderId,
        senderType: 'patient',
        message: text,
      });
      inputEl.value = '';
    }

    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') send();
    });
  }

  loadSocketIoThenConnect();
})();
