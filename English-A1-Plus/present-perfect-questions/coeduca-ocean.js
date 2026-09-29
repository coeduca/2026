/* Océano compartido por las actividades exportadas. */
(function (global) {
  'use strict';

  const URL = 'https://pxoxmcyyhjpjggbseqcr.supabase.co';
  const KEY = 'sb_publishable_uBmOVK8akx2H73wpKDxT-w_vtTTcPr9';
  // Todos los paquetes comparten el mismo océano. activityId se conserva en
  // las RPC por compatibilidad con paquetes ya publicados.
  const GLOBAL_ACTIVITY_ID = 'coeduca-global-ocean-v1';
  const MAX_FISH = 20;
  const MAX_BOTTLES = 20;
  // Mismo icono de ayuda (bombilla) que aparece junto al título de los juegos.
  const INFO_ICON = '<svg aria-hidden="true" focusable="false" viewBox="0 -960 960 960" fill="currentColor"><path d="M423.5-103.5Q400-127 400-160h160q0 33-23.5 56.5T480-80q-33 0-56.5-23.5ZM320-200v-80h320v80H320Zm10-120q-69-41-109.5-110T180-580q0-125 87.5-212.5T480-880q125 0 212.5 87.5T780-580q0 81-40.5 150T630-320H330Zm24-80h252q45-32 69.5-79T700-580q0-92-64-156t-156-64q-92 0-156 64t-64 156q0 54 24.5 101t69.5 79Zm126 0Z"/></svg>';
  let active = null;

  function styles() {
    if (document.getElementById('cocean-style')) return;
    const style = document.createElement('style');
    style.id = 'cocean-style';
    style.textContent = `
      @font-face{font-family:CoeducaCaveat;src:url('mailbox-caveat.ttf') format('truetype');font-style:normal;font-weight:400 700;font-display:swap}
      .cocean-shortcuts{position:fixed;top:14px;left:14px;z-index:101;display:flex;flex-direction:column;gap:6px;width:108px}
      .cocean-fab,.cocean-quick{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;box-sizing:border-box;text-align:center;border:2px solid #18364a;border-radius:99px;color:#fff;padding:6px 8px;font:800 13px system-ui,sans-serif;box-shadow:2px 3px 0 #18364a;cursor:pointer;text-decoration:none;white-space:nowrap}
      .cocean-shortcut-icon,.cocean-bonus-icon{display:block;flex:none;width:19px;height:19px;object-fit:contain;filter:brightness(0) invert(1)}.cocean-label{display:block;overflow:hidden;white-space:nowrap}
      .cocean-fab{background:#0788bd}.cocean-inbox{background:#7543c5}.cocean-games{background:#cf476c}.cocean-avatar-open{background:#309c59}
      .cocean-extra-badge{display:flex;align-items:center;justify-content:center;gap:6px;width:108px!important;box-sizing:border-box;text-align:center;white-space:nowrap;animation:none!important;transition:width .2s ease!important;background:#e7b43c!important;color:#3f2b08!important;text-shadow:none!important;border-color:#78550e!important}.cocean-bonus-icon{width:18px;height:18px;filter:brightness(0)}.cocean-shortcuts :focus-visible,.cocean button:focus-visible{outline:3px solid #ffce51;outline-offset:3px}
      .cocean-backdrop{position:fixed;inset:0;z-index:10000;background:#071d32b8;display:grid;place-items:center;padding:12px;box-sizing:border-box}
      .cocean-lock-card{width:min(360px,100%);padding:25px 22px;border:2px solid #b9e8fa;border-radius:22px;background:linear-gradient(145deg,#effbff,#cceef9);box-shadow:0 18px 45px #061c3b80;color:#17384a;text-align:center;font:16px/1.45 system-ui,sans-serif}.cocean-lock-icon{font-size:48px;line-height:1}.cocean-lock-card h2{margin:8px 0;font-size:22px}.cocean-lock-card p{margin:0 0 18px}.cocean-lock-card button{border:2px solid #164b6d;border-radius:12px;padding:9px 25px;background:#ffdb69;color:#17384a;font:800 15px system-ui,sans-serif;cursor:pointer}
      .cocean{width:min(900px,100%);height:min(730px,94dvh);background:#e9fbff;border:3px solid #143b52;border-radius:20px;box-shadow:0 18px 50px #061c3b80;display:flex;flex-direction:column;overflow:hidden;color:#17384a;font:16px system-ui,sans-serif}
      .cocean *{box-sizing:border-box}.cocean header{display:flex;align-items:center;gap:10px;padding:10px 15px;background:#d4f5ff;flex:none}.cocean h2{display:flex;align-items:center;gap:8px;font-size:22px;margin:0;flex:1}.cocean-header-icon{display:block;width:25px;height:25px;object-fit:contain}.cocean button{font:700 14px system-ui,sans-serif;cursor:pointer}.cocean-close{border:0;background:transparent;font-size:27px!important;line-height:1;color:#163f52}
      .cocean-scene{position:relative;flex:1;min-height:210px;overflow:hidden;background:radial-gradient(ellipse at 49% 28%,#d9fbff80,transparent 36%),radial-gradient(ellipse at 14% 52%,#57d5ed55,transparent 48%),linear-gradient(#9ce4f5 0%,#c9f5fa 25%,#1da9d4 28%,#0789bc 48%,#086a9f 73%,#064978 100%)}
      .cocean-scene::before{content:"";position:absolute;z-index:1;inset:27% 0 8%;pointer-events:none;background:linear-gradient(107deg,transparent 10%,#c9fbff30 15%,transparent 24%,transparent 35%,#c9fbff24 42%,transparent 51%,transparent 72%,#c9fbff20 78%,transparent 86%);opacity:.75}
      .cocean-scene::after{content:"";position:absolute;z-index:1;inset:27% 0 8%;pointer-events:none;background:radial-gradient(circle at 8% 74%,#d8f9ff9e 0 2px,transparent 3px),radial-gradient(circle at 11% 66%,#d8f9ff6e 0 1px,transparent 2px),radial-gradient(circle at 25% 39%,#d8f9ff91 0 2px,transparent 3px),radial-gradient(circle at 36% 61%,#d8f9ff80 0 1px,transparent 2px),radial-gradient(circle at 58% 34%,#d8f9ff91 0 2px,transparent 3px),radial-gradient(circle at 69% 73%,#d8f9ff85 0 2px,transparent 3px),radial-gradient(circle at 83% 51%,#d8f9ff88 0 1px,transparent 2px),radial-gradient(circle at 91% 80%,#d8f9ff80 0 2px,transparent 3px)}
      .cocean-sun{position:absolute;top:6%;right:10%;width:62px;height:62px;border-radius:50%;background:#ffe48b;box-shadow:0 0 35px #fff2ad}
      .cocean-wave-track{position:absolute;top:24%;left:0;display:flex;width:200%;height:35px;pointer-events:none;animation:cocean-wave-slide 8s linear infinite}
      .cocean-wave-track svg{display:block;flex:0 0 50%;width:50%;height:100%}.cocean-wave-track.back{top:25.5%;opacity:.47;animation-duration:12s;animation-direction:reverse}
      @keyframes cocean-wave-slide{to{transform:translate3d(-50%,0,0)}}.cocean-seabed{position:absolute;z-index:1;bottom:0;left:0;width:100%;height:100px;pointer-events:none}
      .cocean-fish,.cocean-bottle{position:absolute;z-index:2;border:0;background:transparent;padding:0;display:flex;align-items:center;flex-direction:column;white-space:nowrap;filter:drop-shadow(1px 3px 2px #07345688)}
      .cocean-fish{width:86px;height:58px;animation:cocean-swim var(--dur,38s) linear infinite;animation-delay:var(--delay,0s);will-change:transform}
      .cocean-fish-art{display:block;width:68px;height:53px;animation:cocean-turn var(--dur,38s) steps(1,end) infinite;animation-delay:var(--delay,0s)}
      .cocean-fish-art img{display:block;width:100%;height:100%;object-fit:contain;transform-origin:70% 50%;animation:cocean-undulate var(--wiggle-dur,1.4s) ease-in-out infinite alternate;animation-delay:var(--wiggle-delay,0s)}
      @keyframes cocean-swim{0%{transform:translate3d(-110px,0,0)}49%,51%{transform:translate3d(calc(var(--scene-width) + 24px),-16px,0)}99%,100%{transform:translate3d(-110px,0,0)}}
      @keyframes cocean-turn{0%,49%{transform:scaleX(1)}50%,99%{transform:scaleX(-1)}100%{transform:scaleX(1)}}
      @keyframes cocean-undulate{0%{transform:translateY(2px) rotate(-2deg) skewY(-3deg) scaleX(.97)}100%{transform:translateY(-2px) rotate(2deg) skewY(3deg) scaleX(1.03)}}.cocean-bottle{width:46px;height:52px;animation:cocean-float var(--dur,6s) ease-in-out infinite alternate;animation-delay:var(--delay,0s)}.cocean-bottle img{display:block;width:44px;height:49px;object-fit:contain}.cocean-bottle.is-mine{filter:none}.cocean-bottle.is-mine img{filter:drop-shadow(0 0 2px #fff5a0) drop-shadow(0 0 5px #ffe15c) drop-shadow(0 0 8px #ffc83d)}
      @keyframes cocean-float{to{transform:translate(18px,-12px) rotate(12deg)}}.cocean-actions{display:flex;justify-content:center;flex-wrap:wrap;gap:8px;padding:12px;background:#d4f5ff}.cocean-actions .cocean-action{display:inline-flex;align-items:center;justify-content:center;gap:7px}.cocean-actions .cocean-action img{display:block;width:20px;height:20px;object-fit:contain}
      .cocean-action,.cocean-primary{border:2px solid #164b6d;border-radius:12px;padding:9px 14px;background:#fff;color:#164b6d}.cocean-primary{background:#ffdb69;color:#17384a}.cocean-status{min-height:22px;margin:0;padding:3px 12px 9px;text-align:center;font-size:12px;background:#d4f5ff}.cocean-status:empty{min-height:0;padding:0}
      .cocean-loading{position:absolute;z-index:4;top:50%;left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;gap:10px;width:min(300px,calc(100% - 28px));padding:16px 19px;border:1.5px solid #e9ffffd9;border-radius:20px;background:linear-gradient(135deg,#e4fbffce,#a6eaffab);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 12px 28px #004d7980,inset 0 1px 0 #fff;color:#07537a;text-align:center;font:italic 800 23px/1.2 'Trebuchet MS','Segoe UI',system-ui,sans-serif;letter-spacing:.025em;text-shadow:0 1px 0 #fff9}
      .cocean-loading[hidden]{display:none}.cocean-loading-icon{display:block;flex:none;width:27px;height:27px;object-fit:contain;animation:cocean-loading-sway 1.8s ease-in-out infinite alternate}@keyframes cocean-loading-sway{to{transform:rotate(12deg) translateY(-3px)}}
      .cocean-panel{position:absolute;inset:5% 5%;z-index:5;display:flex;flex-direction:column;gap:8px;overflow:auto;padding:14px;background:rgba(235,250,255,.44);-webkit-backdrop-filter:blur(16px) saturate(1.2);backdrop-filter:blur(16px) saturate(1.2);border:1.5px solid rgba(255,255,255,.8);border-radius:18px;box-shadow:0 10px 32px #07324d66,inset 0 1px 0 #fff9}
      .cocean-panel[data-mode="fish-author"],.cocean-panel[data-mode="read"]{inset:auto;top:50%;left:50%;width:min(400px,calc(100% - 30px));max-height:calc(100% - 30px);transform:translate(-50%,-50%);padding:12px}.cocean-panel[data-mode="fish-author"]{width:min(340px,calc(100% - 30px))}.cocean-panel[data-mode="fish-author"] h3{font-size:16px;text-align:center}.cocean-fish-preview{display:grid;place-items:center;flex:none;height:92px;overflow:visible}.cocean-fish-preview img{display:block;width:min(170px,100%);height:82px;object-fit:contain;transform-origin:70% 50%;animation:cocean-undulate 1.5s ease-in-out infinite alternate}.cocean-panel[data-mode="read"] h3{text-align:center}.cocean-bottle-preview{display:grid;place-items:center;flex:none;height:88px}.cocean-bottle-preview img{display:block;width:82px;height:84px;object-fit:contain;filter:drop-shadow(0 5px 5px #07345655)}.cocean-panel[data-mode="read"] .cocean-panel-actions{margin-top:2px}
      .cocean-panel[hidden]{display:none}.cocean-panel h3{margin:0;font-size:18px}.cocean-panel p{margin:0}.cocean-panel textarea{width:100%;min-height:110px;resize:vertical;border:2px solid #427a97;border-radius:10px;padding:9px;font:16px system-ui,sans-serif}
      .cocean-fish-author{display:flex;flex:1;min-width:0;align-items:center;gap:12px;padding:5px;border:1px solid #ffffffb8;border-radius:14px;background:rgba(255,255,255,.27);font-weight:800}.cocean-author-name{min-width:0;overflow-wrap:anywhere}.cocean-avatar{display:grid;place-items:center;flex:none;width:50px;height:50px;border:2px solid #164b6d;border-radius:50%;overflow:hidden;background:#eaf7ff;font-size:24px}.cocean-avatar img{display:block;width:100%;height:100%;object-fit:contain}.cocean-avatar img.cocean-avatar-placeholder,.cocean-avatar img.cg-leaderboard-placeholder{width:86%;height:86%;transform:translateY(10%)}.cocean-avatar[data-kind="photo"] img{object-fit:cover}
      .cocean-message{padding:12px;border-radius:16px 16px 16px 4px;background:#f3fdffdd;border:1px solid #fff;box-shadow:0 3px 10px #07324d25;white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px;line-height:1.45;text-align:center}.cocean-message-meta,.cocean-fish-meta{display:flex;align-items:stretch;justify-content:center;gap:8px;font-size:13px;font-weight:800}.cocean-message-meta .cocean-avatar{width:40px;height:40px;font-size:20px}.cocean-views{display:flex;flex:none;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:72px;padding:5px 7px;border:1px solid #ffffffb8;border-radius:14px;background:rgba(255,255,255,.27);font-size:11px;white-space:nowrap}.cocean-views img{display:block;width:21px;height:21px;object-fit:contain}.cocean-danger{border:2px solid #9e2739;border-radius:12px;padding:9px 12px;background:#fff4f4;color:#912139}.cocean-delete-check{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap;padding:8px;border-radius:12px;background:#fff6f4d9;font-size:12px}.cocean-delete-check[hidden]{display:none}
      .cocean-mailbox-backdrop{z-index:10001}.cocean-mailbox{width:min(700px,100%);max-height:min(760px,94dvh);overflow:hidden;background:#fbf7ff;border:3px solid #4a287d;border-radius:20px;box-shadow:0 18px 50px #21133d80;color:#302244;font:16px system-ui,sans-serif;display:flex;flex-direction:column}.cocean-mailbox *{box-sizing:border-box}.cocean-mailbox header{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#eadcff;border-bottom:1px solid #c9afea}.cocean-mailbox h2{display:flex;align-items:center;gap:8px;flex:1;margin:0;font-size:22px}.cocean-mailbox-header-icon{display:block;width:28px;height:28px;object-fit:contain}.cocean-mailbox-close{border:0;background:transparent;color:#4a287d;font-size:28px!important;line-height:1}.cocean-mailbox-body,.cocean-mailbox-view{display:flex;flex-direction:column;gap:12px;min-height:0}.cocean-mailbox-body{overflow:auto;padding:16px}.cocean-mailbox-tabs{display:flex;gap:8px;flex-wrap:wrap}.cocean-mailbox-tab{border:2px solid #7650ad;border-radius:12px;padding:8px 13px;background:#fff;color:#503184}.cocean-mailbox-tab[aria-selected="true"]{background:#7650ad;color:#fff}.cocean-mailbox-card{display:flex;flex-direction:column;gap:12px;padding:16px;border:2px solid #d7c4f0;border-radius:16px;background:#fff;box-shadow:0 4px 12px #4a287d18}.cocean-mailbox-card h3{margin:0;color:#4a287d;font-size:18px}.cocean-mailbox-message{padding:14px;border-radius:14px;background:#f7f1ff;border:1px solid #e3d4f7;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;min-height:84px}.cocean-mailbox-meta{color:#66557b;font-size:13px}.cocean-mailbox-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.cocean-mailbox-button{border:2px solid #5c368f;border-radius:12px;padding:9px 14px;background:#fff;color:#4a287d;font-weight:800;cursor:pointer}.cocean-mailbox-primary{background:#7650ad;color:#fff}.cocean-mailbox-danger{border-color:#a53053;background:#fff4f6;color:#942546}.cocean-mailbox-compose{display:flex;flex-direction:column;gap:10px;padding:14px;border:2px solid #d7c4f0;border-radius:16px;background:#fff}.cocean-mailbox-compose label{font-weight:800;color:#4a287d}.cocean-mailbox-compose input,.cocean-mailbox-compose textarea{width:100%;border:2px solid #b99cda;border-radius:10px;padding:9px;background:#fff;font:16px system-ui,sans-serif;color:#302244}.cocean-mailbox-compose textarea{min-height:125px;resize:vertical}.cocean-mailbox-results{display:flex;flex-direction:column;gap:6px;max-height:185px;overflow:auto}.cocean-mailbox-result{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;border:1px solid #cfb9e8;border-radius:10px;padding:8px 10px;background:#fbf8ff;color:#3d285d;text-align:left}.cocean-mailbox-result small{display:block;color:#806c98}.cocean-mailbox-result[aria-pressed="true"]{outline:3px solid #c19be9;background:#f0e4ff}.cocean-mailbox-status{min-height:21px;margin:0;color:#644b83;text-align:center;font-size:13px}.cocean-mailbox-status:empty{min-height:0}.cocean-mailbox-empty{padding:18px;text-align:center;color:#715f86}.cocean-mailbox-counter{color:#806c98;font-size:13px}
      .cocean-mailbox-tabs{justify-content:center}.cocean-mailbox-tab{min-width:118px;text-align:center}.cocean-mailbox-card{position:relative;min-height:230px;gap:14px;padding:28px 30px 32px 60px;border:1px solid #d7c9ab;border-radius:3px;background:linear-gradient(90deg,transparent 0 41px,#edb8bb 42px 43px,transparent 44px),repeating-linear-gradient(to bottom,#fffdf7 0 31px,#dce8ee 32px);box-shadow:0 2px 0 #e7ddca,0 12px 24px #4b38602b;color:#3d3441}.cocean-mailbox-card h3{font:700 20px/1.5 'Trebuchet MS',system-ui,sans-serif;color:#503d67}.cocean-mailbox-message{min-height:106px;padding:0;border:0;border-radius:0;background:transparent;font:17px/2 'Trebuchet MS',system-ui,sans-serif;text-align:left}.cocean-mailbox-meta{line-height:1.5}.cocean-mailbox-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.cocean-mailbox-compose-trigger{margin-left:auto}.cocean-mailbox-button:focus-visible,.cocean-mailbox input:focus-visible,.cocean-mailbox textarea:focus-visible{outline:3px solid #c29deb;outline-offset:2px}
      .cocean-mailbox-message{font:500 29px/32px CoeducaCaveat,'Segoe Print',cursive}.cocean-mailbox-results{padding:5px 7px 7px;overflow-x:hidden}.cocean-mailbox-result{flex:0 0 auto;min-width:0;box-shadow:0 1px 3px #4a287d18}.cocean-mailbox-result[aria-pressed="true"]{outline-offset:0}.cocean-mailbox-compose{padding:0;border:0;background:transparent}.cocean-mailbox-search-area{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border:1px solid #d7c4f0;border-radius:12px;background:#fff}.cocean-mailbox-search-area[hidden],.cocean-mailbox-selected[hidden]{display:none}.cocean-mailbox-selected{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border:1px solid #d7c4f0;border-radius:12px;background:#f3eaff;color:#4a287d}.cocean-mailbox-selected-name{font-weight:800;overflow-wrap:anywhere}.cocean-mailbox-selected .cocean-mailbox-button{flex:none;padding:5px 9px}.cocean-mailbox-note-page{position:relative;display:flex;flex-direction:column;gap:12px;min-height:260px;padding:22px 28px 18px 60px;border:1px solid #d7c9ab;border-radius:3px;background:linear-gradient(90deg,transparent 0 41px,#edb8bb 42px 43px,transparent 44px),repeating-linear-gradient(to bottom,#fffdf7 0 31px,#dce8ee 32px);box-shadow:0 2px 0 #e7ddca,0 12px 24px #4b38602b}.cocean-mailbox-note-page label{font:700 20px/1.5 'Trebuchet MS',system-ui,sans-serif}.cocean-mailbox-compose .cocean-mailbox-note-page textarea{flex:1;min-height:170px;padding:0;border:0;border-radius:0;background:transparent;color:#3d3441;font:500 29px/32px CoeducaCaveat,'Segoe Print',cursive;resize:vertical}.cocean-mailbox-note-page textarea:focus-visible{outline:2px solid #c29deb;outline-offset:4px}.cocean-mailbox-counter{align-self:flex-end}
      .cocean-mailbox-title-row{display:flex;align-items:center;gap:8px;flex:1;min-width:0}.cocean-mailbox-title-row h2{flex:none}.cocean-mailbox-info{display:inline-grid;place-items:center;flex:none;width:30px;height:30px;margin-left:1px;padding:3px;border:2px solid currentColor;border-radius:8px;background:#fff;color:#4a287d;cursor:pointer}.cocean-mailbox-info svg{display:block;width:20px;height:20px}.cocean-mailbox-info:focus-visible,.cocean-mailbox-help button:focus-visible{outline:3px solid #b679ea;outline-offset:2px}.cocean-mailbox-help-backdrop{z-index:10002}.cocean-mailbox-help{width:min(440px,100%);max-height:90dvh;overflow:auto;padding:22px;border:3px solid #4a287d;border-radius:18px;background:#fffaf0;color:#3e2a59;box-shadow:4px 4px 0 #4a287d;font:15px/1.55 system-ui,sans-serif}.cocean-mailbox-help h2{margin:0 0 12px;font-size:21px}.cocean-mailbox-help p{margin:0 0 12px}.cocean-mailbox-help button{display:block;min-height:42px;margin:16px 0 0 auto;padding:8px 18px;border:2px solid #4a287d;border-radius:10px;background:#eadcff;color:#4a287d;font:800 14px system-ui,sans-serif;cursor:pointer}
      .cocean-mailbox-card h3{font-size:14px;line-height:20px;letter-spacing:.01em}.cocean-mailbox-card{background:linear-gradient(90deg,transparent 0 41px,#edb8bb 42px 43px,transparent 44px),#fffdf7}.cocean-mailbox-message{background:repeating-linear-gradient(to bottom,transparent 0 31px,#dce8ee 31px 32px);line-height:32px;background-attachment:local}.cocean-mailbox-note-page{background:linear-gradient(90deg,transparent 0 41px,#edb8bb 42px 43px,transparent 44px),#fffdf7}.cocean-mailbox-compose .cocean-mailbox-note-page textarea{background:repeating-linear-gradient(to bottom,transparent 0 31px,#dce8ee 31px 32px);line-height:32px;background-attachment:local}
      .cocean-reactions{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;padding:5px 0}.cocean-reaction{display:flex;align-items:center;justify-content:center;gap:4px;min-width:51px;border:1.5px solid #ffffffba;border-radius:99px;padding:5px 7px;background:#effaffb8;color:#17384a;box-shadow:0 2px 7px #08375123;font-size:14px!important}.cocean-reaction[aria-pressed="true"]{background:#ffdc74e8;border-color:#f4ab27;box-shadow:0 0 0 2px #fff8}.cocean-reaction:disabled{opacity:.65;cursor:wait}.cocean-reaction-count{font-size:12px;font-weight:800}
      .cocean-draw{width:min(100%,440px);height:220px;touch-action:none;background:linear-gradient(45deg,#e8f4f7 25%,transparent 25%),linear-gradient(-45deg,#e8f4f7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e8f4f7 75%),linear-gradient(-45deg,transparent 75%,#e8f4f7 75%);background-size:20px 20px;background-color:#fff;border:2px solid #427a97;border-radius:10px;align-self:center}
      .cocean-colors{display:flex;width:100%;gap:5px;justify-content:center;flex-wrap:nowrap}.cocean-color{flex:1 1 0;max-width:28px;min-width:20px;aspect-ratio:1;border:2px solid #164b6d;border-radius:50%;padding:0}.cocean-color[aria-pressed=true]{outline:3px solid #ffbd39;outline-offset:2px}.cocean-draw-tools{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap}.cocean-eraser,.cocean-paint-bucket{display:grid;place-items:center;width:38px;height:38px;padding:6px}.cocean-eraser img,.cocean-paint-bucket img,.cocean-clear img{display:block;width:19px;height:19px;object-fit:contain}.cocean-clear{display:inline-flex;align-items:center;justify-content:center;gap:6px}.cocean-eraser[aria-pressed=true],.cocean-paint-bucket[aria-pressed=true]{background:#ffdb69;box-shadow:0 0 0 2px #e7a926}.cocean-draw[data-tool=fill]{cursor:crosshair}.cocean-row{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}.cocean-panel-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-top:auto}.cocean-read{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}
      @media(min-width:701px) and (min-height:600px){.cocean{width:min(1050px,96vw);height:min(840px,96dvh)}.cocean-panel{inset:4% auto;width:min(680px,calc(100% - 48px));left:50%;transform:translateX(-50%);overflow:visible;padding:20px;gap:12px}.cocean-panel[data-mode="fish-author"],.cocean-panel[data-mode="read"]{inset:auto;top:50%;left:50%;transform:translate(-50%,-50%);max-height:calc(100% - 40px);padding:20px;gap:12px}.cocean-panel[data-mode="fish-author"]{width:min(480px,calc(100% - 48px))}.cocean-panel[data-mode="read"]{width:min(560px,calc(100% - 48px))}.cocean-panel[data-mode="fish-author"] h3,.cocean-panel[data-mode="read"] h3{font-size:20px}.cocean-fish-preview{height:122px}.cocean-fish-preview img{width:min(210px,100%);height:112px}.cocean-bottle-preview{height:116px}.cocean-bottle-preview img{width:108px;height:112px}.cocean-draw{height:260px}.cocean-panel textarea{min-height:170px}}
      @media(min-width:701px) and (max-height:699px){.cocean-draw{height:190px}.cocean-panel textarea{min-height:130px}}
      @media(max-width:600px){.cocean-shortcuts{top:8px;left:8px;width:36px;gap:4px;transition:width .2s ease}.cocean-shortcuts.is-expanded{width:96px}.cocean-fab,.cocean-quick{height:36px;min-height:36px;padding:4px;font-size:11px;gap:5px}.cocean-shortcuts:not(.is-expanded) .cocean-fab,.cocean-shortcuts:not(.is-expanded) .cocean-quick{gap:0;padding:0}.cocean-shortcuts:not(.is-expanded) .cocean-label{display:none}.cocean-shortcut-icon{width:19px;height:19px}.cocean-extra-badge{width:36px!important;min-height:36px;padding:0!important;gap:0;font-size:11px!important;cursor:pointer}.cocean-extra-badge:not(.is-expanded) .cocean-bonus-number{display:none}.cocean-extra-badge.is-expanded{width:96px!important;gap:5px;font-size:12px!important}.cocean-bonus-icon{width:19px;height:19px}.cocean-backdrop{padding:4px}.cocean{height:98dvh;border-radius:13px}.cocean header{padding:8px}.cocean h2{font-size:19px}.cocean-scene{min-height:180px}.cocean-panel{inset:3%;padding:10px}.cocean-panel[data-mode="fish-author"],.cocean-panel[data-mode="read"]{inset:auto;top:50%;left:50%}.cocean-loading{font-size:20px}}
      @media(max-width:600px){.cocean-mailbox-body{padding:12px}.cocean-mailbox-card{min-height:200px;padding:23px 16px 26px 44px;background:linear-gradient(90deg,transparent 0 29px,#edb8bb 30px 31px,transparent 32px),#fffdf7}.cocean-mailbox-footer .cocean-mailbox-button{flex:1 1 auto}.cocean-mailbox-compose-trigger{margin-left:0}}
      @media(max-width:600px){.cocean-mailbox-search-area{padding:10px}.cocean-mailbox-note-page{min-height:235px;padding:20px 15px 15px 44px;background:linear-gradient(90deg,transparent 0 29px,#edb8bb 30px 31px,transparent 32px),#fffdf7}.cocean-mailbox-message,.cocean-mailbox-compose .cocean-mailbox-note-page textarea{font-size:26px}}
      @media(prefers-reduced-motion:reduce){.cocean-fish,.cocean-fish-art,.cocean-fish-art img,.cocean-fish-preview img,.cocean-bottle,.cocean-wave-track,.cocean-loading-icon{animation:none}.cocean-fish{left:4%!important}}
    `;
    document.head.appendChild(style);
  }

  function updateViews(panel, count) {
    const total = Number(count) || 0;
    panel.querySelector('.cocean-views-count').textContent = total + (total === 1 ? ' vista' : ' vistas');
  }

  function displayStudentName(name) {
    return name === 'José Eliseo Martínez' ? 'Eliseo' : name || 'Estudiante';
  }

  function sameStudent(row, studentId, studentName) {
    return row.student_id ? row.student_id === studentId :
      row.student_name === studentName ||
      (studentName === 'Eliseo' && row.student_name === 'José Eliseo Martínez');
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }

  async function studentHash(nie, prefix) {
    const source = new TextEncoder().encode((prefix || 'coeduca-ranking-v1') + '|' + String(nie || ''));
    const bytes = await global.crypto.subtle.digest('SHA-256', source);
    return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  }

  async function rpc(name, body) {
    const response = await fetch(URL + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: {'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const error = new Error(response.status === 404 ? 'El océano compartido aún no está activado.' : 'No se pudo guardar el aporte en el océano compartido.');
      error.status = response.status;
      throw error;
    }
    const content = await response.text();
    return content ? JSON.parse(content) : null;
  }

  function localKey(id) { return 'coeduca_ocean_' + id; }
  function localRead(id) {
    try { const rows = JSON.parse(localStorage.getItem(localKey(id)) || '[]'); return Array.isArray(rows) ? rows : []; } catch (_) { return []; }
  }
  function localAdd(id, item) {
    const items = localRead(id).filter(row => row.kind !== item.kind ||
      !sameStudent(row, item.student_id, item.student_name));
    items.unshift(item);
    try { localStorage.setItem(localKey(id), JSON.stringify(items.slice(0, 80))); } catch (_) {}
  }
  function localRemove(id, studentId, studentName, kind) {
    const items = localRead(id).filter(row => row.kind !== kind ||
      !sameStudent(row, studentId, studentName));
    try { localStorage.setItem(localKey(id), JSON.stringify(items)); } catch (_) {}
  }

  function mount(options) {
    if (active) active.destroy();
    active = null;
    if (!options || !options.student || !options.student.nie) return;
    styles();
    const activityId = GLOBAL_ACTIVITY_ID;
    const student = options.student;
    const hasRequiredGrade = () => {
      const nie = String(student.nie);
      if (nie === '1999' || nie === '12379') return true;
      const grade = typeof options.getGrade === 'function' ? Number(options.getGrade()) : NaN;
      return Number.isFinite(grade) && grade >= 7;
    };
    const badge = document.getElementById(options.badgeId);
    const badgeTop = badge ? badge.style.top : '';
    const badgeLeft = badge ? badge.style.left : '';
    const shortcuts = document.createElement('nav');
    shortcuts.className = 'cocean-shortcuts';
    shortcuts.setAttribute('aria-label', 'Accesos de la actividad');
    const fab = document.createElement('button');
    fab.className = 'cocean-fab';
    fab.type = 'button';
    fab.innerHTML = '<img class="cocean-shortcut-icon" src="shortcut-ocean.svg" alt=""><span class="cocean-label">Océano</span>';
    fab.setAttribute('aria-label', 'Abrir océano');
    const inbox = document.createElement('button');
    inbox.className = 'cocean-quick cocean-inbox';
    inbox.type = 'button';
    inbox.innerHTML = '<img class="cocean-shortcut-icon" src="mailbox-svgrepo-com.svg" alt=""><span class="cocean-label">Buzón</span>';
    inbox.setAttribute('aria-label', 'Abrir Buzón');
    const games = document.createElement('a');
    games.className = 'cocean-quick cocean-games';
    games.href = 'juegos.html';
    games.target = '_blank';
    games.rel = 'noopener';
    games.innerHTML = '<img class="cocean-shortcut-icon" src="shortcut-games.svg" alt=""><span class="cocean-label">Juegos</span>';
    games.setAttribute('aria-label', 'Ir al centro de juegos');
    let dismissNotice = null;
    function showGradeNotice(destination) {
      if (dismissNotice) return;
      const notice = document.createElement('div');
      notice.className = 'cocean-backdrop cocean-lock-backdrop';
      notice.innerHTML = '<div class="cocean-lock-card" role="dialog" aria-modal="true" aria-labelledby="cocean-lock-title" aria-describedby="cocean-lock-description"><div class="cocean-lock-icon" aria-hidden="true">🔒</div><h2 id="cocean-lock-title">Sigue aprendiendo</h2><p id="cocean-lock-description">Consigue al menos 7.0 de nota en esta actividad para poder explorar el ' + destination + '.</p><button type="button">Entendido</button></div>';
      document.body.appendChild(notice);
      const dismiss = () => { notice.remove(); document.removeEventListener('keydown', onNoticeKey); dismissNotice = null; };
      dismissNotice = dismiss;
      const onNoticeKey = event => { if (event.key === 'Escape') { event.stopImmediatePropagation(); dismiss(); } };
      notice.querySelector('button').addEventListener('click', dismiss);
      notice.addEventListener('click', event => { if (event.target === notice) dismiss(); });
      document.addEventListener('keydown', onNoticeKey);
      notice.querySelector('button').focus();
    }
    let mailboxOverlay = null, mailboxHelpOverlay = null;
    function closeMailboxHelp() {
      if (!mailboxHelpOverlay) return;
      mailboxHelpOverlay.remove();
      mailboxHelpOverlay = null;
      const info = mailboxOverlay && mailboxOverlay.querySelector('.cocean-mailbox-info');
      if (info) info.focus();
    }
    function closeMailbox() {
      if (!mailboxOverlay) return;
      closeMailboxHelp();
      mailboxOverlay.remove();
      mailboxOverlay = null;
      inbox.focus();
    }
    function openMailbox() {
      if (!hasRequiredGrade()) { showGradeNotice('Buzón'); return; }
      if (mailboxOverlay) return;
      const isRigo = String(student.nie) === '12379';
      mailboxOverlay = document.createElement('div');
      mailboxOverlay.className = 'cocean-backdrop cocean-mailbox-backdrop';
      mailboxOverlay.innerHTML = '<section class="cocean-mailbox" role="dialog" aria-modal="true" aria-labelledby="cocean-mailbox-title"><header><div class="cocean-mailbox-title-row"><h2 id="cocean-mailbox-title"><img class="cocean-mailbox-header-icon" src="mailbox-svgrepo-com.svg" alt="">' + (isRigo ? 'Buzón de Rigo' : 'Buzón') + '</h2><button class="cocean-mailbox-info" type="button" aria-label="Cómo funciona el Buzón" aria-haspopup="dialog" title="Cómo funciona el Buzón">' + INFO_ICON + '</button></div><button class="cocean-mailbox-close" type="button" aria-label="Cerrar buzón">×</button></header><div class="cocean-mailbox-body"><div class="cocean-mailbox-tabs" role="tablist"></div><div class="cocean-mailbox-view"></div><p class="cocean-mailbox-status" role="status"></p></div></section>';
      document.body.appendChild(mailboxOverlay);
      mailboxOverlay.querySelector('.cocean-mailbox-info').addEventListener('click', () => {
        if (mailboxHelpOverlay) return;
        mailboxHelpOverlay = document.createElement('div');
        mailboxHelpOverlay.className = 'cocean-backdrop cocean-mailbox-help-backdrop';
        mailboxHelpOverlay.innerHTML = '<section class="cocean-mailbox-help" role="dialog" aria-modal="true" aria-labelledby="cocean-mailbox-help-title"><h2 id="cocean-mailbox-help-title">Cómo funciona el Buzón</h2><p>Envía y recibe cartas de tus compañeros de manera anónima. Quien recibe una carta no ve quién la escribió.</p><p>Las cartas se muestran una por una. Al pulsar «Ver siguiente», la carta desaparece de tus Recibidos y de los Enviados pendientes de quien la mandó.</p><button type="button">Entendido</button></section>';
        document.body.appendChild(mailboxHelpOverlay);
        mailboxHelpOverlay.querySelector('button').addEventListener('click', closeMailboxHelp);
        mailboxHelpOverlay.addEventListener('click', event => { if (event.target === mailboxHelpOverlay) closeMailboxHelp(); });
        mailboxHelpOverlay.querySelector('button').focus();
      });
      const tabs = mailboxOverlay.querySelector('.cocean-mailbox-tabs');
      const view = mailboxOverlay.querySelector('.cocean-mailbox-view');
      const statusEl = mailboxOverlay.querySelector('.cocean-mailbox-status');
      const sessionToken = () => global.COEDUCA_FIXED_AUTH && global.COEDUCA_FIXED_AUTH.tokenFor(student.nie) || null;
      let studentId = null, rows = [], bucket = isRigo ? 'rigo' : 'received', index = 0, mailboxBusy = false;
      const setStatus = message => { statusEl.textContent = message || ''; };
      const button = (label, className, handler) => { const el = document.createElement('button'); el.type = 'button'; el.className = 'cocean-mailbox-button' + (className ? ' ' + className : ''); el.textContent = label; el.addEventListener('click', handler); return el; };
      const listForBucket = () => rows.filter(row => row.bucket === bucket);
      function renderTabs() {
        tabs.innerHTML = '';
        if (isRigo) return;
        [['received', 'Recibidos'], ['sent', 'Enviados']].forEach(([key, label]) => {
          const tab = button(label, '', () => { bucket = key; index = 0; render(); });
          tab.className += ' cocean-mailbox-tab'; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-selected', String(bucket === key)); tabs.appendChild(tab);
        });
      }
      function render() {
        renderTabs();
        view.innerHTML = '';
        const list = listForBucket();
        const actions = document.createElement('div'); actions.className = 'cocean-mailbox-actions cocean-mailbox-footer';
        if (!list.length) {
          const empty = document.createElement('div'); empty.className = 'cocean-mailbox-empty';
          empty.textContent = isRigo ? 'No hay mensajes en la bandeja.' : (bucket === 'received' ? 'No tienes mensajes pendientes.' : 'No tienes mensajes enviados sin leer.');
          view.appendChild(empty);
        } else {
          if (index >= list.length) index = list.length - 1;
          const item = list[index];
          const card = document.createElement('article'); card.className = 'cocean-mailbox-card';
          const title = document.createElement('h3'); title.textContent = isRigo ? 'Mensaje ' + (index + 1) + ' de ' + list.length : (bucket === 'received' ? 'Mensaje anónimo' : 'Mensaje enviado'); card.appendChild(title);
          if (isRigo) {
            const meta = document.createElement('div'); meta.className = 'cocean-mailbox-meta'; meta.textContent = 'De: ' + (item.sender_name || 'Estudiante') + ' · Para: ' + (item.recipient_name || 'Estudiante'); card.appendChild(meta);
          } else if (bucket === 'sent') {
            const meta = document.createElement('div'); meta.className = 'cocean-mailbox-meta'; meta.textContent = 'Para: ' + (item.recipient_name || 'Estudiante') + ' · Aún no leído'; card.appendChild(meta);
          }
          const message = document.createElement('div'); message.className = 'cocean-mailbox-message'; message.textContent = item.message || ''; card.appendChild(message);
          if (isRigo) {
            actions.appendChild(button('Ver siguiente', 'cocean-mailbox-primary', async () => {
              await advance(item, true);
            }));
            actions.appendChild(button('Eliminar para Rigo', 'cocean-mailbox-danger', async () => {
              if (mailboxBusy) return;
              mailboxBusy = true;
              setStatus('Eliminando de la bandeja de Rigo…');
              try { await rpc('coeduca_mailbox_delete_for_rigo', {p_student_id:studentId, p_message_id:item.id, p_session_token:sessionToken()}); await load(); }
              catch (_) { setStatus('No se pudo eliminar el mensaje.'); }
              finally { mailboxBusy = false; }
            }));
          } else if (bucket === 'received') {
            actions.appendChild(button('Ver siguiente', 'cocean-mailbox-primary', async () => { await advance(item, false); }));
          } else if (list.length > 1) {
            actions.appendChild(button('Ver siguiente', 'cocean-mailbox-primary', () => { index = (index + 1) % list.length; render(); }));
          }
          view.appendChild(card);
        }
        if (!isRigo) {
          actions.appendChild(button('✎ Redactar nota', 'cocean-mailbox-primary cocean-mailbox-compose-trigger', showCompose));
        }
        if (actions.childElementCount) view.appendChild(actions);
      }
      async function advance(item, rigo) {
        if (mailboxBusy) return;
        mailboxBusy = true;
        setStatus('Abriendo siguiente mensaje…');
        try {
          const changed = await rpc('coeduca_mailbox_read_next', {p_student_id:studentId, p_message_id:item.id, p_session_token:sessionToken()});
          if (!changed) throw new Error('read');
          index = rigo ? (index + 1) % Math.max(1, listForBucket().length) : 0;
          await load();
        }
        catch (_) { setStatus('No se pudo registrar la lectura. Inténtalo otra vez.'); }
        finally { mailboxBusy = false; }
      }
      let searchVersion = 0;
      async function searchStudents(input, results, onSelect) {
        const version = ++searchVersion;
        const query = input.value.trim();
        results.innerHTML = '';
        if (query.length < 2) { results.textContent = 'Escribe al menos dos letras para buscar.'; return; }
        results.textContent = 'Buscando…';
        try {
          const found = await rpc('coeduca_mailbox_students', {p_query:query, p_student_id:studentId});
          if (version !== searchVersion || !results.isConnected) return;
          results.innerHTML = '';
          if (!found || !found.length) { results.textContent = 'No se encontraron estudiantes.'; return; }
          found.forEach(person => {
            const item = document.createElement('button'); item.type = 'button'; item.className = 'cocean-mailbox-result';
            const name = document.createElement('span'); name.textContent = person.student_name || 'Estudiante';
            const grade = document.createElement('small'); grade.textContent = person.grade || ''; name.appendChild(grade);
            item.appendChild(name); item.addEventListener('click', () => onSelect(person));
            results.appendChild(item);
          });
        } catch (_) { if (version === searchVersion && results.isConnected) results.textContent = 'No se pudo buscar estudiantes. Inténtalo otra vez.'; }
      }
      function showCompose() {
        view.innerHTML = '<div class="cocean-mailbox-compose"><div class="cocean-mailbox-search-area"><label for="cocean-mailbox-search">Buscar estudiante</label><input id="cocean-mailbox-search" type="search" autocomplete="off" placeholder="Escribe un nombre"><div class="cocean-mailbox-results" aria-live="polite">Escribe al menos dos letras para buscar.</div></div><div class="cocean-mailbox-selected" hidden><span class="cocean-mailbox-selected-name"></span><button type="button" class="cocean-mailbox-button cocean-mailbox-change">Cambiar</button></div><div class="cocean-mailbox-note-page"><label for="cocean-mailbox-text">Nota anónima</label><textarea id="cocean-mailbox-text" maxlength="500" placeholder="Escribe tu mensaje…"></textarea><div class="cocean-mailbox-counter">0/500</div></div><div class="cocean-mailbox-actions"><button type="button" class="cocean-mailbox-button cocean-mailbox-cancel">Cancelar</button><button type="button" class="cocean-mailbox-button cocean-mailbox-primary cocean-mailbox-send">Enviar nota</button></div></div>';
        const input = view.querySelector('#cocean-mailbox-search'), results = view.querySelector('.cocean-mailbox-results'), text = view.querySelector('#cocean-mailbox-text'), counter = view.querySelector('.cocean-mailbox-counter');
        const searchArea = view.querySelector('.cocean-mailbox-search-area'), selectedBox = view.querySelector('.cocean-mailbox-selected'), selectedName = view.querySelector('.cocean-mailbox-selected-name');
        const selected = {value:''}; let timer = null;
        const chooseStudent = person => {
          searchVersion++;
          selected.value = JSON.stringify(person);
          selectedName.textContent = 'Para: ' + (person.student_name || 'Estudiante');
          searchArea.hidden = true;
          selectedBox.hidden = false;
          text.focus();
        };
        input.addEventListener('input', () => { searchVersion++; selected.value = ''; if (timer) clearTimeout(timer); timer = setTimeout(() => searchStudents(input, results, chooseStudent), 280); });
        view.querySelector('.cocean-mailbox-change').addEventListener('click', () => {
          selected.value = '';
          selectedBox.hidden = true;
          searchArea.hidden = false;
          input.value = '';
          results.textContent = 'Escribe al menos dos letras para buscar.';
          input.focus();
        });
        text.addEventListener('input', () => { counter.textContent = text.value.length + '/500'; });
        view.querySelector('.cocean-mailbox-cancel').addEventListener('click', render);
        view.querySelector('.cocean-mailbox-send').addEventListener('click', async () => {
          if (mailboxBusy) return;
          let recipient; try { recipient = JSON.parse(selected.value); } catch (_) { recipient = null; }
          const message = text.value.trim();
          if (!recipient) { setStatus('Selecciona a quién enviar la nota.'); return; }
          if (!message) { setStatus('Escribe un mensaje antes de enviarlo.'); return; }
          mailboxBusy = true;
          setStatus('Enviando nota anónima…');
          try {
            const sent = await rpc('coeduca_mailbox_send', {p_sender_id:studentId, p_sender_name:String(student.name || 'Estudiante'), p_recipient_id:recipient.student_id, p_recipient_name:recipient.student_name, p_message:message, p_session_token:sessionToken()});
            if (!sent) throw new Error('send');
            bucket = 'sent'; index = 0; await load();
            setStatus('Nota enviada. Permanecerá en Enviados hasta que la lean.');
          } catch (_) { setStatus('No se pudo enviar la nota. Inténtalo otra vez.'); }
          finally { mailboxBusy = false; }
        });
        input.focus();
      }
      async function load() {
        if (!studentId) return;
        setStatus('Cargando buzón…');
        try { rows = await rpc('coeduca_mailbox_list', {p_student_id:studentId, p_session_token:sessionToken()}) || []; setStatus(''); render(); }
        catch (_) { setStatus('No se pudo conectar con el buzón.'); render(); }
      }
      mailboxOverlay.querySelector('.cocean-mailbox-close').addEventListener('click', closeMailbox);
      mailboxOverlay.addEventListener('click', event => { if (event.target === mailboxOverlay) closeMailbox(); });
      mailboxOverlay.querySelector('.cocean-mailbox-close').focus();
      hashPromise.then(id => { studentId = id; if (mailboxOverlay) load(); });
    }
    inbox.addEventListener('click', openMailbox);
    games.addEventListener('click', event => {
      if (hasRequiredGrade()) return;
      event.preventDefault();
      showGradeNotice('Centro de Juegos');
    });
    const avatarAccess = document.createElement('button');
    avatarAccess.className = 'cocean-quick cocean-avatar-open';
    avatarAccess.type = 'button';
    avatarAccess.innerHTML = '<img class="cocean-shortcut-icon" src="shortcut-avatar.svg" alt=""><span class="cocean-label">Avatar</span>';
    avatarAccess.setAttribute('aria-label', 'Configurar avatar');
    avatarAccess.addEventListener('click', () => {
      if (global.COEDUCA_LEADERBOARD && global.COEDUCA_LEADERBOARD.openAvatar) {
        global.COEDUCA_LEADERBOARD.openAvatar(student);
      }
    });
    shortcuts.append(fab, inbox, games, avatarAccess);
    document.body.insertBefore(shortcuts, document.body.firstChild);
    if (badge) badge.classList.add('cocean-extra-badge');
    const mobileView = global.matchMedia('(max-width: 600px)');
    let lastScrollY = global.scrollY, expandTimer = null;
    function setExpanded(expanded) {
      if (expandTimer) clearTimeout(expandTimer);
      expandTimer = expanded ? setTimeout(() => setExpanded(false), 3000) : null;
      shortcuts.classList.toggle('is-expanded', expanded);
      if (badge) badge.classList.toggle('is-expanded', expanded);
    }
    function onScroll() {
      if (!mobileView.matches) return;
      const currentY = global.scrollY;
      const difference = currentY - lastScrollY;
      if (Math.abs(difference) >= 5) {
        setExpanded(difference < 0);
        lastScrollY = currentY;
      }
    }
    function onCompactTap(event) {
      if (!mobileView.matches || shortcuts.classList.contains('is-expanded')) return;
      event.preventDefault();
      event.stopPropagation();
      setExpanded(true);
    }
    shortcuts.addEventListener('click', onCompactTap, true);
    if (badge) badge.addEventListener('click', onCompactTap);
    global.addEventListener('scroll', onScroll, {passive:true});
    const position = () => {
      if (!badge) return;
      const rect = shortcuts.getBoundingClientRect();
      const top = Math.round(rect.bottom + (mobileView.matches ? 4 : 6)) + 'px';
      const left = Math.round(rect.left) + 'px';
      if (badge.style.top !== top) badge.style.top = top;
      if (badge.style.left !== left) badge.style.left = left;
    };
    position();
    const observer = badge ? new MutationObserver(position) : null;
    if (observer) observer.observe(badge, {attributes:true, attributeFilter:['style']});
    global.addEventListener('resize', position);
    let overlay = null, refreshTimer = null, fishPool = [], bottlePool = [], currentMode = '', busy = false;
    let fishSignature = '', bottleSignature = '', hasRemoteData = false, loadVersion = 0;
    let sceneObserver = null;
    const hashPromise = studentHash(student.nie);
    const legacyHashPromise = studentHash(student.nie, 'coeduca-ocean-v1');
    let upgraded = false;

    function status(message) { const el = overlay && overlay.querySelector('.cocean-status'); if (el) el.textContent = message; }
    function close() {
      if (refreshTimer) clearInterval(refreshTimer);
      refreshTimer = null;
      if (overlay) overlay.remove();
      overlay = null;
      fishSignature = '';
      bottleSignature = '';
      loadVersion++;
      if (sceneObserver) sceneObserver.disconnect();
      sceneObserver = null;
      fab.focus();
    }
    function showPanel(html, mode) {
      currentMode = mode;
      const panel = overlay.querySelector('.cocean-panel');
      panel.innerHTML = html;
      panel.dataset.mode = mode;
      panel.hidden = false;
      panel.querySelector('.cocean-cancel').addEventListener('click', () => { panel.hidden = true; currentMode = ''; });
      const first = panel.querySelector('textarea,canvas,button');
      if (first) first.focus();
      return panel;
    }
    function addReactions(panel, entry) {
      const labels = [
        ['heart', '❤️', 'Corazón'], ['laugh', '😂', 'Risa'],
        ['sad', '😢', 'Tristeza'], ['wow', '😮', 'Wow'],
        ['disgust', '🤢', 'Asco']
      ];
      const area = panel.querySelector('.cocean-reactions');
      let selected = entry.my_reaction || null;
      let counts = entry.reaction_counts || {};
      const buttons = labels.map(([key, emoji, name]) => {
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'cocean-reaction';
        button.dataset.reaction = key;
        button.setAttribute('aria-label', name);
        button.innerHTML = '<span aria-hidden="true">' + emoji + '</span><span class="cocean-reaction-count"></span>';
        area.appendChild(button);
        button.addEventListener('click', async () => {
          if (!entry.id || buttons.some(item => item.disabled)) return;
          buttons.forEach(item => { item.disabled = true; });
          try {
            const result = await rpc('coeduca_ocean_react', {
              p_activity_id:activityId, p_student_id:await hashPromise,
              p_entry_id:entry.id, p_reaction:key
            });
            selected = result.my_reaction || null;
            counts = result.reaction_counts || {};
            entry.my_reaction = selected;
            entry.reaction_counts = counts;
            render();
          } catch (_) { if (overlay) status('No se pudo guardar la reacción. Inténtalo otra vez.'); }
          finally { buttons.forEach(item => { item.disabled = false; }); }
        });
        return button;
      });
      function render() {
        buttons.forEach(button => {
          const key = button.dataset.reaction;
          button.setAttribute('aria-pressed', String(selected === key));
          button.querySelector('.cocean-reaction-count').textContent = String(Number(counts[key]) || 0);
        });
      }
      render();
    }
    function fishView(fish, index) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'cocean-fish';
      button.setAttribute('aria-label', 'Ver quién dibujó este pez');
      button.style.top = (34 + (index * 37 % 51)) + '%';
      button.style.left = '0';
      button.style.setProperty('--dur', (28 + index * 7 % 26) + 's');
      button.style.setProperty('--delay', -(index * 13 % 39) + 's');
      button.style.setProperty('--wiggle-dur', (1.1 + index % 5 * .13) + 's');
      button.style.setProperty('--wiggle-delay', -(index % 7 * .19) + 's');
      const img = document.createElement('img'); img.alt = ''; img.src = fish.image_data;
      const art = document.createElement('span'); art.className = 'cocean-fish-art';
      art.appendChild(img); button.appendChild(art);
      button.addEventListener('click', async () => {
        const panel = showPanel('<h3>Quién dibujó este pez</h3><div class="cocean-fish-preview"><img alt="Vista previa del pez"></div><div class="cocean-fish-meta"><div class="cocean-fish-author"><span class="cocean-avatar"></span><span class="cocean-author-name"></span></div><div class="cocean-views"><img src="ocean-views.svg" alt=""><span class="cocean-views-count"></span></div></div><div class="cocean-reactions" aria-label="Reacciones al pez"></div><div class="cocean-panel-actions"><button class="cocean-action cocean-cancel" type="button">Cerrar</button></div>', 'fish-author');
        panel.querySelector('.cocean-fish-preview img').src = fish.image_data;
        panel.querySelector('.cocean-author-name').textContent = displayStudentName(fish.student_name);
        updateViews(panel, fish.view_count);
        const avatar = panel.querySelector('.cocean-avatar');
        if (global.COEDUCA_LEADERBOARD && global.COEDUCA_LEADERBOARD.fillAvatar) {
          global.COEDUCA_LEADERBOARD.fillAvatar(avatar, fish.avatar_profile, fish.student_name);
        } else avatar.innerHTML = '<img class="cocean-avatar-placeholder" src="avatar-placeholder.svg" alt="">';
        addReactions(panel, fish);
        if (!fish.id) return;
        try {
          const total = await rpc('coeduca_ocean_open_fish', {
            p_activity_id:activityId, p_student_id:await hashPromise, p_entry_id:fish.id
          });
          fish.view_count = Number(total) || 0;
          if (overlay && !panel.hidden && panel.dataset.mode === 'fish-author') {
            updateViews(panel, fish.view_count);
          }
        } catch (_) { if (overlay) status('No se pudo registrar la vista del pez.'); }
      });
      return button;
    }
    function updateBottleView(button, bottle, index) {
      button.coceanEntry = bottle;
      button.dataset.entryKey = String(bottle.id || bottle.student_id || bottle.student_name);
      button.classList.toggle('is-mine', !!bottle.is_mine);
      const image = button.querySelector('img');
      const source = bottle.is_viewed ? 'botella-vacia.webp' : 'botella.webp';
      if (image.getAttribute('src') !== source) image.src = source;
      button.setAttribute('aria-label', bottle.is_mine ? 'Mi botella' : 'Leer mensaje de ' + displayStudentName(bottle.student_name));
      button.style.top = (24 + Math.floor(index / 8) * 6) + '%';
      button.style.left = (4 + (index % 8) * 10.5 + (Math.floor(index / 8) % 2 ? 4 : 0)) + '%';
    }
    function bottleView(bottle, index) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'cocean-bottle';
      const image = document.createElement('img'); image.alt = '';
      button.appendChild(image);
      updateBottleView(button, bottle, index);
      button.style.setProperty('--dur', (4 + index % 5) + 's');
      button.style.setProperty('--delay', -(index % 6) + 's');
      button.addEventListener('click', async () => {
        const bottle = button.coceanEntry;
        button.disabled = true;
        const panel = showPanel('<h3>Mensaje en una botella</h3><div class="cocean-bottle-preview"><img alt="Botella con mensaje"></div><p class="cocean-message"></p><div class="cocean-message-meta"><div class="cocean-fish-author"><span class="cocean-avatar"></span><span class="cocean-author-name"></span></div><div class="cocean-views"><img src="ocean-views.svg" alt=""><span class="cocean-views-count"></span></div></div><div class="cocean-reactions" aria-label="Reacciones al mensaje"></div><div class="cocean-panel-actions"><button class="cocean-action cocean-cancel" type="button">Cerrar</button></div>', 'read');
        panel.querySelector('.cocean-bottle-preview img').src = image.src;
        panel.querySelector('.cocean-message').textContent = bottle.message;
        panel.querySelector('.cocean-author-name').textContent = displayStudentName(bottle.student_name);
        updateViews(panel, bottle.view_count);
        const avatar = panel.querySelector('.cocean-avatar');
        if (global.COEDUCA_LEADERBOARD && global.COEDUCA_LEADERBOARD.fillAvatar) {
          global.COEDUCA_LEADERBOARD.fillAvatar(avatar, bottle.avatar_profile, bottle.student_name);
        } else avatar.innerHTML = '<img class="cocean-avatar-placeholder" src="avatar-placeholder.svg" alt="">';
        addReactions(panel, bottle);
        try {
          const total = await rpc('coeduca_ocean_open_message', {
            p_activity_id:activityId, p_student_id:await hashPromise, p_entry_id:bottle.id
          });
          if (!overlay) return;
          bottle.is_viewed = true;
          image.src = 'botella-vacia.webp';
          if (panel.dataset.mode === 'read' && !panel.hidden) {
            updateViews(panel, total);
            panel.querySelector('.cocean-bottle-preview img').src = 'botella-vacia.webp';
          }
          await load();
        } catch (_) {
          if (overlay) status('No se pudo registrar la vista. Vuelve a intentar más tarde.');
        } finally { button.disabled = false; }
      });
      return button;
    }
    function paint() {
      if (!overlay) return;
      const scene = overlay.querySelector('.cocean-scene');
      const nextFishSignature = fishPool.map(row => [row.id || row.image_data, row.created_at,
        row.avatar_profile?.avatar_kind, row.avatar_profile?.avatar_emoji,
        row.avatar_profile?.avatar_bg, row.avatar_profile?.photo_version,
        row.view_count, row.my_reaction, JSON.stringify(row.reaction_counts)].join('~')).join('|');
      const nextBottleSignature = bottlePool.map(row => [row.id || row.message, row.created_at,
        row.view_count, row.is_visible, row.is_viewed, row.my_reaction,
        JSON.stringify(row.reaction_counts), row.avatar_profile?.photo_version].join('~')).join('|');
      const sample = (items, limit) => {
        const copy = items.slice();
        for (let i = copy.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy.slice(0, limit);
      };
      if (fishSignature !== nextFishSignature) {
        fishSignature = nextFishSignature;
        scene.querySelectorAll('.cocean-fish').forEach(el => el.remove());
        sample(fishPool, MAX_FISH).forEach((fish, i) => scene.appendChild(fishView(fish, i)));
      }
      if (bottleSignature !== nextBottleSignature) {
        bottleSignature = nextBottleSignature;
        const existing = new Map(Array.from(scene.querySelectorAll('.cocean-bottle'),
          button => [button.dataset.entryKey, button]));
        bottlePool.filter(row => row.is_visible !== false).slice(0, MAX_BOTTLES)
          .forEach((bottle, i) => {
            const key = String(bottle.id || bottle.student_id || bottle.student_name);
            const button = existing.get(key);
            if (button) {
              existing.delete(key);
              updateBottleView(button, bottle, i);
              scene.appendChild(button);
            } else scene.appendChild(bottleView(bottle, i));
          });
        existing.forEach(button => button.remove());
      }
    }
    function updateActions() {
      if (!overlay) return;
      overlay.querySelector('.cocean-add-fish span').textContent = fishPool.some(row => row.is_mine) ? 'Editar pez' : 'Lanzar pez';
      overlay.querySelector('.cocean-add-message span').textContent = bottlePool.some(row => row.is_mine) ? 'Editar mensaje' : 'Lanzar mensaje';
    }
    async function load() {
      const version = ++loadVersion;
      try {
        if (!upgraded) {
          try {
            await rpc('coeduca_ocean_upgrade_identity', {
              p_activity_id:activityId,
              p_legacy_id:await legacyHashPromise,
              p_student_id:await hashPromise
            });
            upgraded = true;
          } catch (_) { /* El océano sigue disponible si falta la migración. */ }
        }
        const rows = await rpc('coeduca_ocean_list_v5', {p_activity_id:activityId, p_student_id:await hashPromise});
        const ownId = await hashPromise;
        if (!overlay || version !== loadVersion) return;
        fishPool = rows.filter(row => row.kind === 'fish').map(row => ({...row, is_mine:sameStudent(row, ownId, student.name)}));
        bottlePool = rows.filter(row => row.kind === 'message').map(row => ({...row, is_mine:sameStudent(row, ownId, student.name)}));
        hasRemoteData = true;
        status('Océano compartido con tus compañeros.');
      } catch (_) {
        if (!overlay || version !== loadVersion) return;
        if (hasRemoteData) {
          status('Conexión inestable. Se muestran los últimos aportes cargados.');
        } else {
          const rows = localRead(activityId);
          fishPool = rows.filter(row => row.kind === 'fish');
          bottlePool = rows.filter(row => row.kind === 'message');
          status('Océano local: los aportes se ven solo en este dispositivo hasta activar Supabase.');
        }
      }
      paint();
      updateActions();
      const loading = overlay && overlay.querySelector('.cocean-loading');
      if (loading) loading.hidden = true;
    }
    async function publish(kind, value) {
      if (busy) return;
      busy = true;
      status('Lanzando al océano…');
      const item = {kind, student_id:null, student_name:String(student.name || 'Estudiante').trim().slice(0, 80), image_data:kind === 'fish' ? value : null, message:kind === 'message' ? value : null, created_at:new Date().toISOString(), is_mine:true};
      try {
        item.student_id = await hashPromise;
        await rpc('coeduca_ocean_publish', {p_activity_id:activityId, p_student_id:item.student_id, p_student_name:item.student_name, p_kind:kind, p_content:value});
      } catch (error) {
        if (error.status && error.status !== 404) {
          status(error.message);
          busy = false;
          return;
        }
        localAdd(activityId, item);
      }
      await load();
      if (!overlay) { busy = false; return; }
      overlay.querySelector('.cocean-panel').hidden = true;
      currentMode = '';
      busy = false;
    }
    async function deleteEntry(kind) {
      if (busy) return;
      busy = true;
      status('Eliminando del océano…');
      try {
        await rpc('coeduca_ocean_delete', {
          p_activity_id:activityId, p_student_id:await hashPromise, p_kind:kind
        });
      } catch (error) {
        if (error.status && error.status !== 404) {
          status('No se pudo eliminar. Inténtalo otra vez.');
          busy = false;
          return;
        }
        localRemove(activityId, await hashPromise, student.name, kind);
      }
      await load();
      if (overlay) {
        overlay.querySelector('.cocean-panel').hidden = true;
        currentMode = '';
      }
      busy = false;
    }
    function addDeleteOption(panel, kind) {
      const action = document.createElement('button');
      action.type = 'button'; action.className = 'cocean-danger';
      action.textContent = kind === 'fish' ? 'Eliminar pez' : 'Eliminar mensaje';
      const actions = panel.querySelector('.cocean-panel-actions');
      actions.prepend(action);
      const check = document.createElement('div');
      check.className = 'cocean-delete-check'; check.hidden = true;
      const prompt = document.createElement('span'); prompt.textContent = kind === 'fish' ? '¿Eliminar tu pez del océano?' : '¿Eliminar tu mensaje del océano?';
      const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'cocean-action'; cancel.textContent = 'No';
      const confirm = document.createElement('button'); confirm.type = 'button'; confirm.className = 'cocean-danger'; confirm.textContent = 'Sí, eliminar';
      check.append(prompt, cancel, confirm);
      actions.before(check);
      action.addEventListener('click', () => { check.hidden = false; confirm.focus(); });
      cancel.addEventListener('click', () => { check.hidden = true; action.focus(); });
      confirm.addEventListener('click', () => deleteEntry(kind));
    }
    function fillClosedRegion(imageData, width, height, x, y, hexColor) {
      x = Math.floor(x); y = Math.floor(y);
      if (x < 0 || y < 0 || x >= width || y >= height) return false;
      const pixels = imageData.data;
      const start = y * width + x;
      // Los trazos opacos actúan como barrera; los bordes suavizados del pincel
      // también se respetan para que el relleno no se escape por ellos.
      if (pixels[start * 4 + 3] >= 64) return false;
      const seen = new Uint8Array(width * height);
      const queue = new Int32Array(width * height);
      let head = 0, tail = 1;
      queue[0] = start; seen[start] = 1;
      function enqueue(index) {
        if (!seen[index] && pixels[index * 4 + 3] < 64) {
          seen[index] = 1;
          queue[tail++] = index;
        }
      }
      while (head < tail) {
        const index = queue[head++];
        const column = index % width;
        const row = (index / width) | 0;
        if (column === 0 || row === 0 || column === width - 1 || row === height - 1) return false;
        enqueue(index - 1);
        enqueue(index + 1);
        enqueue(index - width);
        enqueue(index + width);
      }
      const red = parseInt(hexColor.slice(1, 3), 16);
      const green = parseInt(hexColor.slice(3, 5), 16);
      const blue = parseInt(hexColor.slice(5, 7), 16);
      for (let i = 0; i < tail; i++) {
        const offset = queue[i] * 4;
        pixels[offset] = red;
        pixels[offset + 1] = green;
        pixels[offset + 2] = blue;
        pixels[offset + 3] = 255;
      }
      return true;
    }
    function drawPanel() {
      const ownFish = fishPool.find(row => row.is_mine);
      const panel = showPanel('<h3>' + (ownFish ? 'Edita tu pez' : 'Dibuja tu pez') + '</h3><p>Dibuja el pez con el dedo o el mouse. El bote rellena solo trazos cerrados.</p><canvas class="cocean-draw" width="440" height="220" tabindex="0" aria-label="Lienzo para dibujar un pez"></canvas><div class="cocean-colors"></div><div class="cocean-draw-tools"><button type="button" class="cocean-action cocean-eraser" aria-label="Borrador" title="Borrador" aria-pressed="false"><img src="ocean-eraser.svg" alt=""></button><button type="button" class="cocean-action cocean-paint-bucket" aria-label="Bote de pintura" title="Bote de pintura" aria-pressed="false"><img src="ocean-paint-bucket.svg" alt=""></button><button type="button" class="cocean-action cocean-clear"><img src="ocean-fish-delete.svg" alt="">Borrar todo</button></div><div class="cocean-panel-actions"><button type="button" class="cocean-action cocean-cancel">Cancelar</button><button type="button" class="cocean-primary cocean-send">' + (ownFish ? 'Guardar pez' : 'Lanzar pez') + '</button></div>', 'fish');
      if (ownFish) addDeleteOption(panel, 'fish');
      const canvas = panel.querySelector('canvas'), ctx = canvas.getContext('2d');
      const colors = ['#183b52','#ff5d73','#ffad36','#ffe066','#32b974','#2a92da','#9a6cdd','#808080','#ffffff'];
      let color = colors[0], tool = 'brush', drawing = false, touched = false, originalUnchanged = true;
      const eraser = panel.querySelector('.cocean-eraser');
      const bucket = panel.querySelector('.cocean-paint-bucket');
      function setTool(next) {
        tool = next;
        canvas.dataset.tool = tool;
        eraser.setAttribute('aria-pressed', String(tool === 'eraser'));
        bucket.setAttribute('aria-pressed', String(tool === 'fill'));
      }
      if (ownFish && ownFish.image_data) {
        const previous = new Image();
        previous.onload = () => { if (originalUnchanged && panel.isConnected) { ctx.drawImage(previous, 0, 0, canvas.width, canvas.height); touched = true; } };
        previous.src = ownFish.image_data;
      }
      colors.forEach((c,i) => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'cocean-color'; btn.style.background = c;
        btn.title = 'Color ' + (i+1); btn.setAttribute('aria-label', btn.title); btn.setAttribute('aria-pressed', String(i === 0));
        btn.addEventListener('click', () => { color = c; if (tool === 'eraser') setTool('brush'); panel.querySelectorAll('.cocean-color').forEach(x => x.setAttribute('aria-pressed', String(x === btn))); });
        panel.querySelector('.cocean-colors').appendChild(btn);
      });
      eraser.addEventListener('click', () => setTool(tool === 'eraser' ? 'brush' : 'eraser'));
      bucket.addEventListener('click', () => setTool(tool === 'fill' ? 'brush' : 'fill'));
      function point(e) { const r = canvas.getBoundingClientRect(); return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}; }
      canvas.addEventListener('pointerdown', e => {
        e.preventDefault();
        const p = point(e);
        if (tool === 'fill') {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          if (fillClosedRegion(imageData, canvas.width, canvas.height, p.x, p.y, color)) {
            ctx.putImageData(imageData, 0, 0);
            originalUnchanged = false;
            touched = true;
          } else status('Toca dentro de un trazo cerrado para rellenarlo.');
          return;
        }
        originalUnchanged = false;
        canvas.setPointerCapture(e.pointerId);
        ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+.1,p.y+.1);
        ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = tool === 'eraser' ? '#000' : color;
        ctx.lineWidth = tool === 'eraser' ? 18 : 7;
        ctx.lineCap = 'round';ctx.lineJoin = 'round';ctx.stroke();
        drawing = true;touched = true;
      });
      canvas.addEventListener('pointermove', e => { if (!drawing) return; e.preventDefault();const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke(); });
      ['pointerup','pointercancel'].forEach(type => canvas.addEventListener(type, () => { drawing=false; }));
      panel.querySelector('.cocean-clear').addEventListener('click', () => { originalUnchanged=false; ctx.clearRect(0,0,canvas.width,canvas.height); touched=false; });
      panel.querySelector('.cocean-send').addEventListener('click', async () => {
        if (!touched || !ctx.getImageData(0,0,canvas.width,canvas.height).data.some((value,index) => index % 4 === 3 && value > 0)) { status('Dibuja un pez antes de lanzarlo.'); return; }
        const image = canvas.toDataURL('image/webp', .8);
        if (image.length > 80000) { status('El dibujo es demasiado grande; usa menos trazos.'); return; }
        await publish('fish', image);
      });
    }
    function messagePanel() {
      const ownMessage = bottlePool.find(row => row.is_mine);
      const panel = showPanel('<h3>' + (ownMessage ? 'Edita tu mensaje' : 'Mensaje en una botella') + '</h3><p>Escribe una nota y lanzala al océano.</p><textarea maxlength="200" placeholder="¿Qué quieres compartir con tus compañeros?"></textarea><div class="cocean-row"><span class="cocean-count">0/200</span></div><div class="cocean-panel-actions"><button type="button" class="cocean-action cocean-cancel">Cancelar</button><button type="button" class="cocean-primary cocean-send">' + (ownMessage ? 'Guardar mensaje' : 'Lanzar mensaje') + '</button></div>', 'message');
      if (ownMessage) addDeleteOption(panel, 'message');
      const input = panel.querySelector('textarea');
      if (ownMessage) { input.value = ownMessage.message || ''; panel.querySelector('.cocean-count').textContent = input.value.length + '/200'; }
      input.addEventListener('input', () => { panel.querySelector('.cocean-count').textContent = input.value.length + '/200'; });
      panel.querySelector('.cocean-send').addEventListener('click', () => { const value=input.value.trim(); if (!value) { status('Escribe un mensaje antes de lanzarlo.'); return; } publish('message',value); });
    }
    function open() {
      if (!hasRequiredGrade()) { showGradeNotice('Océano'); return; }
      if (overlay) return;
      overlay = document.createElement('div'); overlay.className = 'cocean-backdrop';
      const waveLine = 'M0 20 C75 5 150 5 225 20 S375 35 450 20 S600 5 675 20 S825 35 900 20';
      const wave = '<svg viewBox="0 0 900 42" preserveAspectRatio="none" aria-hidden="true"><path d="' + waveLine + ' V42 H0Z" fill="#20ace2"/><path d="' + waveLine + '" fill="none" stroke="#d6faff" stroke-width="3"/></svg>';
      const seabed = '<svg class="cocean-seabed" viewBox="0 0 900 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 75 C105 58 190 78 300 67 S485 61 575 74 S760 58 900 69 V100 H0Z" fill="#075c85" opacity=".38"/><path d="M0 87 C120 73 212 91 322 79 S503 91 622 79 S790 83 900 72 V100 H0Z" fill="#e1d09e"/><path d="M0 87 C120 73 212 91 322 79 S503 91 622 79 S790 83 900 72" fill="none" stroke="#f6e8bb" stroke-width="3" opacity=".8"/><g fill="none" stroke="#0c7b83" stroke-linecap="round" stroke-width="5"><path d="M75 87 Q57 64 68 44 M75 87 Q91 67 83 54 M178 85 Q164 67 170 52 M178 85 Q193 61 186 45 M716 84 Q698 66 705 45 M716 84 Q733 66 726 55 M838 78 Q821 58 829 43"/></g><g fill="#cfb681" opacity=".78"><ellipse cx="245" cy="91" rx="12" ry="4"/><ellipse cx="270" cy="90" rx="6" ry="3"/><ellipse cx="588" cy="92" rx="11" ry="4"/><ellipse cx="611" cy="91" rx="5" ry="2"/></g></svg>';
      overlay.innerHTML = '<div class="cocean" role="dialog" aria-modal="true" aria-label="Océano de la actividad"><header><h2><img class="cocean-header-icon" src="shortcut-ocean.svg" alt="">Océano</h2><button class="cocean-close" type="button" aria-label="Cerrar océano">×</button></header><div class="cocean-scene"><div class="cocean-sun"></div><div class="cocean-wave-track back">' + wave + wave + '</div><div class="cocean-wave-track">' + wave + wave + '</div>' + seabed + '<div class="cocean-loading" role="status"><img class="cocean-loading-icon" src="shortcut-ocean.svg" alt=""><span>Cargando océano…</span></div><div class="cocean-panel" hidden></div></div><div class="cocean-actions"><button class="cocean-action cocean-add-fish" type="button"><img src="ocean-fish-delete.svg" alt=""><span>Lanzar pez</span></button><button class="cocean-action cocean-add-message" type="button"><img src="ocean-message-bottle.svg" alt=""><span>Lanzar mensaje</span></button></div><p class="cocean-status" role="status"></p></div>';
      document.body.appendChild(overlay);
      const scene = overlay.querySelector('.cocean-scene');
      const updateSceneWidth = () => scene.style.setProperty('--scene-width', scene.clientWidth + 'px');
      updateSceneWidth();
      if (global.ResizeObserver) { sceneObserver = new ResizeObserver(updateSceneWidth); sceneObserver.observe(scene); }
      overlay.querySelector('.cocean-close').addEventListener('click', close);
      overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
      overlay.querySelector('.cocean-add-fish').addEventListener('click', drawPanel);
      overlay.querySelector('.cocean-add-message').addEventListener('click', messagePanel);
      overlay.querySelector('.cocean-close').focus();
      load();
      refreshTimer = setInterval(() => { if (!currentMode) load(); }, 30000);
    }
    fab.addEventListener('click', open);
    const keydown = e => {
      if (e.key !== 'Escape') return;
      if (mailboxHelpOverlay) { closeMailboxHelp(); return; }
      if (mailboxOverlay) { closeMailbox(); return; }
      if (overlay) { const panel=overlay.querySelector('.cocean-panel'); if (!panel.hidden) { panel.hidden=true; currentMode=''; } else close(); }
    };
    document.addEventListener('keydown', keydown);
    active = {destroy() {
      if (dismissNotice) dismissNotice();
      closeMailbox(); close(); shortcuts.remove();
      if (expandTimer) clearTimeout(expandTimer);
      global.removeEventListener('scroll', onScroll);
      if (badge) badge.removeEventListener('click', onCompactTap);
      if (observer) observer.disconnect();
      global.removeEventListener('resize', position);
      if (badge) { badge.classList.remove('cocean-extra-badge', 'is-expanded'); badge.style.top = badgeTop; badge.style.left = badgeLeft; }
      document.removeEventListener('keydown', keydown);
    }};
  }

  global.COEDUCA_OCEAN = {mount};
})(window);
