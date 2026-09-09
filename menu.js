(function() {
    let sanityEnabled = true;

    const menu = document.getElementById('menu');
    const creditsIntro = document.getElementById('credits');
    const mainMenuAfter = document.getElementById('main-menu-after');
    const selectionOverlay = document.getElementById('selection-overlay');
    const creditsOverlay = document.getElementById('credits-overlay');
    const logsOverlay = document.getElementById('logs-overlay');
    const gameContainer = document.getElementById('gameContainer');

    const btnMobile = document.getElementById('btnMobile');
    const btnComputer = document.getElementById('btnComputer');
    const playBtn = document.getElementById('playBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const creditsBtn = document.getElementById('creditsBtn');
    const exitBtn = document.getElementById('exitBtn');
    const selExit = document.getElementById('selExit');
    const selPlay = document.getElementById('selPlay');
    const sanityToggle = document.getElementById('sanityToggle');
    const sanityStatus = document.getElementById('sanityStatus');
    const creditsExit = document.getElementById('credits-exit');
    const logsBtn = document.getElementById('logs-btn');
    const logsExit = document.getElementById('logs-exit');

    function selectDevice(device) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
        if (device === 'Mobile') {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        }
        menu.classList.add('hide');
        setTimeout(() => {
            menu.style.display = 'none';
            showCreditsIntro();
        }, 450);
    }

    btnMobile.addEventListener('click', () => selectDevice('Mobile'));
    btnComputer.addEventListener('click', () => selectDevice('Computer'));

    function showCreditsIntro() {
        creditsIntro.classList.add('show');
        const madeby = document.getElementById('madeby');
        const devs = document.getElementById('fortyfourdevs');
        const underline = document.getElementById('underline-path');

        setTimeout(() => madeby.classList.add('show'), 300);
        setTimeout(() => devs.classList.add('show'), 800);
        setTimeout(() => underline.classList.add('animate'), 1100);

        setTimeout(() => {
            creditsIntro.classList.add('hide');
            setTimeout(() => {
                creditsIntro.style.display = 'none';
                mainMenuAfter.classList.add('show');
            }, 1000);
        }, 2400);
    }

    playBtn.addEventListener('click', () => {
        selectionOverlay.classList.add('active');
    });

    settingsBtn.addEventListener('click', () => {
        selectionOverlay.classList.add('active');
    });

    creditsBtn.addEventListener('click', () => {
        creditsOverlay.classList.add('active');
    });

    exitBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to exit?')) {
            window.close();
        }
    });

    selExit.addEventListener('click', () => {
        selectionOverlay.classList.remove('active');
    });

    selPlay.addEventListener('click', () => {
        selectionOverlay.classList.remove('active');
        launchGame();
    });

    sanityToggle.addEventListener('click', function() {
        this.classList.toggle('on');
        const isOn = this.classList.contains('on');
        sanityStatus.textContent = isOn ? 'ON' : 'OFF';
        sanityStatus.classList.toggle('on', isOn);
        sanityEnabled = isOn;
    });

    creditsExit.addEventListener('click', () => {
        creditsOverlay.classList.remove('active');
    });

    logsBtn.addEventListener('click', () => {
        logsOverlay.classList.add('show');
    });
    logsExit.addEventListener('click', () => {
        logsOverlay.classList.remove('show');
    });
    logsOverlay.addEventListener('click', (e) => {
        if (e.target === logsOverlay) logsOverlay.classList.remove('show');
    });

    function launchGame() {

        gameContainer.classList.add('active');

        mainMenuAfter.classList.remove('show');

        import('./game.js')
            .then(module => {
                module.startGame(sanityEnabled);
            })
            .catch(err => {
                console.error('Failed to load game:', err);
                alert('Game failed to load. Please refresh.');
            });
    }

    window.launchGame = launchGame;
})();
