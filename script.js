// ─── DOM REFS ──────────────────────────────────────────────
const menu = document.getElementById('menu');
const btnMobile = document.getElementById('btnMobile');
const btnComputer = document.getElementById('btnComputer');
const mainMenuAfter = document.getElementById('main-menu-after');
const playBtn = document.getElementById('playBtn');
const settingsBtn = document.getElementById('settingsBtn');
const creditsBtn = document.getElementById('creditsBtn');
const exitBtn = document.getElementById('exitBtn');
const logsBtn = document.getElementById('logs-btn');
const selectionOverlay = document.getElementById('selection-overlay');
const selExit = document.getElementById('selExit');
const selPlay = document.getElementById('selPlay');
const sanityToggle = document.getElementById('sanityToggle');
const sanityStatus = document.getElementById('sanityStatus');
const creditsOverlay = document.getElementById('credits-overlay');
const creditsExit = document.getElementById('credits-exit');
const logsOverlay = document.getElementById('logs-overlay');
const logsExit = document.getElementById('logs-exit');

let selectedMode = 'desktop'; // 'mobile' or 'desktop'
let sanityOn = true;

// ─── DEVICE SELECTION ──────────────────────────────────────
btnMobile.addEventListener('click', () => {
    selectedMode = 'mobile';
    menu.classList.add('hide');
    setTimeout(() => {
        menu.style.display = 'none';
        mainMenuAfter.classList.add('show');
    }, 400);
});

btnComputer.addEventListener('click', () => {
    selectedMode = 'desktop';
    menu.classList.add('hide');
    setTimeout(() => {
        menu.style.display = 'none';
        mainMenuAfter.classList.add('show');
    }, 400);
});

// ─── MAIN MENU BUTTONS ────────────────────────────────────
playBtn.addEventListener('click', () => {
    // Launch game with current settings
    window.location.href = `game.html?mode=${selectedMode}&sanity=${sanityOn ? 'on' : 'off'}`;
});

settingsBtn.addEventListener('click', () => {
    selectionOverlay.classList.add('active');
});

creditsBtn.addEventListener('click', () => {
    creditsOverlay.classList.add('active');
    const path = document.getElementById('underline-path');
    setTimeout(() => path.classList.add('animate'), 200);
    const madeby = document.getElementById('madeby');
    const fortyfour = document.getElementById('fortyfourdevs');
    setTimeout(() => madeby.classList.add('show'), 300);
    setTimeout(() => fortyfour.classList.add('show'), 500);
});

exitBtn.addEventListener('click', () => {
    if (confirm('Exit the game?')) {
        document.body.innerHTML = '<p style="color:#888;text-align:center;margin-top:40vh;">You exited. See you next time.</p>';
    }
});

logsBtn.addEventListener('click', () => {
    logsOverlay.classList.add('show');
});

// ─── SETTINGS OVERLAY ──────────────────────────────────────
selExit.addEventListener('click', () => {
    selectionOverlay.classList.remove('active');
});

selPlay.addEventListener('click', () => {
    selectionOverlay.classList.remove('active');
    window.location.href = `game.html?mode=${selectedMode}&sanity=${sanityOn ? 'on' : 'off'}`;
});

sanityToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    sanityToggle.classList.toggle('on');
    sanityOn = sanityToggle.classList.contains('on');
    sanityStatus.textContent = sanityOn ? 'ON' : 'OFF';
    sanityStatus.classList.toggle('on', sanityOn);
});

// ─── CREDITS OVERLAY ──────────────────────────────────────
creditsExit.addEventListener('click', () => {
    creditsOverlay.classList.remove('active');
    document.getElementById('underline-path').classList.remove('animate');
    document.getElementById('madeby').classList.remove('show');
    document.getElementById('fortyfourdevs').classList.remove('show');
});

// ─── LOGS OVERLAY ──────────────────────────────────────────
logsExit.addEventListener('click', () => {
    logsOverlay.classList.remove('show');
});

// Click outside to close logs
logsOverlay.addEventListener('click', (e) => {
    if (e.target === logsOverlay) {
        logsOverlay.classList.remove('show');
    }
});
