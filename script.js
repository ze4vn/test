(function () {
    'use strict';


    let sanityEnabled = true;
    let selectedDevice = null;
    let gameStarted = false;


    const menu = document.getElementById('menu');
    const creditsIntro = document.getElementById('credits');
    const mainMenuAfter = document.getElementById('main-menu-after');

    const selectionOverlay = document.getElementById('selection-overlay');
    const creditsOverlay = document.getElementById('credits-overlay');
    const logsOverlay = document.getElementById('logs-overlay');

    const gameContainer = document.getElementById('gameContainer');
    const threeContainer = document.getElementById('threeContainer');

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

    function checkElement(element, name) {
        if (!element) {
            console.error(`[MENU] Missing element: #${name}`);
            return false;
        }

        return true;
    }

    checkElement(menu, 'menu');
    checkElement(creditsIntro, 'credits');
    checkElement(mainMenuAfter, 'main-menu-after');
    checkElement(selectionOverlay, 'selection-overlay');
    checkElement(creditsOverlay, 'credits-overlay');
    checkElement(logsOverlay, 'logs-overlay');
    checkElement(gameContainer, 'gameContainer');
    checkElement(threeContainer, 'threeContainer');


    function enterFullscreen() {
        try {
            if (
                !document.fullscreenElement &&
                document.documentElement.requestFullscreen
            ) {
                const result = document.documentElement.requestFullscreen();

                if (result && typeof result.catch === 'function') {
                    result.catch(() => {
                        console.log('[MENU] Fullscreen permission denied.');
                    });
                }
            }
        } catch (error) {
            console.warn('[MENU] Fullscreen unavailable:', error);
        }
    }


    function lockLandscape() {
        try {
            if (
                screen.orientation &&
                typeof screen.orientation.lock === 'function'
            ) {
                screen.orientation.lock('landscape').catch(() => {
                    console.log('[MENU] Landscape lock unavailable.');
                });
            }
        } catch (error) {
            console.warn('[MENU] Orientation lock unavailable:', error);
        }
    }


    function selectDevice(device) {
        selectedDevice = device;

        console.log(`[MENU] Device selected: ${device}`);

        enterFullscreen();

        if (device === 'Mobile') {
            lockLandscape();
        }

        if (!menu) return;

        menu.classList.add('hide');

        setTimeout(() => {
            menu.style.display = 'none';

            showCreditsIntro();
        }, 450);
    }


    function showCreditsIntro() {
        if (!creditsIntro) return;

        creditsIntro.style.display = 'flex';

        void creditsIntro.offsetWidth;

        creditsIntro.classList.add('show');

        const madeby = document.getElementById('madeby');
        const devs = document.getElementById('fortyfourdevs');
        const underline = document.getElementById('underline-path');

        if (madeby) {
            setTimeout(() => {
                madeby.classList.add('show');
            }, 300);
        }

        if (devs) {
            setTimeout(() => {
                devs.classList.add('show');
            }, 800);
        }

        if (underline) {
            setTimeout(() => {
                underline.classList.add('animate');
            }, 1100);
        }

        setTimeout(() => {
            creditsIntro.classList.add('hide');

            setTimeout(() => {
                creditsIntro.style.display = 'none';

                if (mainMenuAfter) {
                    mainMenuAfter.style.display = 'block';

                    void mainMenuAfter.offsetWidth;

                    mainMenuAfter.classList.add('show');
                }
            }, 1000);
        }, 2400);
    }


    function openSelection() {
        if (!selectionOverlay) return;

        selectionOverlay.classList.add('active');
    }


    function closeSelection() {
        if (!selectionOverlay) return;

        selectionOverlay.classList.remove('active');
    }


    function openCredits() {
        if (!creditsOverlay) return;

        creditsOverlay.classList.add('active');
    }


    function closeCredits() {
        if (!creditsOverlay) return;

        creditsOverlay.classList.remove('active');
    }


    function openLogs() {
        if (!logsOverlay) return;

        logsOverlay.classList.add('show');
    }

    function closeLogs() {
        if (!logsOverlay) return;

        logsOverlay.classList.remove('show');
    }


    function toggleSanity() {
        if (!sanityToggle) return;

        sanityToggle.classList.toggle('on');

        sanityEnabled = sanityToggle.classList.contains('on');

        if (sanityStatus) {
            sanityStatus.textContent = sanityEnabled ? 'ON' : 'OFF';
            sanityStatus.classList.toggle('on', sanityEnabled);
        }

        console.log(
            `[MENU] Sanity Mode: ${sanityEnabled ? 'ON' : 'OFF'}`
        );
    }


    function exitGame() {
        const confirmed = window.confirm(
            'Are you sure you want to exit?'
        );

        if (!confirmed) return;

        window.close();

        setTimeout(() => {
            console.log(
                '[MENU] Browser prevented automatic tab closing.'
            );
        }, 100);
    }


    function waitForGameContainer() {
        return new Promise((resolve) => {
            let attempts = 0;
            const maxAttempts = 120;

            function check() {
                attempts++;

                if (!gameContainer || !threeContainer) {
                    resolve(false);
                    return;
                }

                const width = threeContainer.clientWidth;
                const height = threeContainer.clientHeight;

                if (width > 0 && height > 0) {
                    console.log(
                        `[MENU] Game container ready: ${width}x${height}`
                    );

                    resolve(true);
                    return;
                }

                if (attempts >= maxAttempts) {
                    console.warn(
                        '[MENU] Game container did not obtain a valid size.'
                    );

                    resolve(false);
                    return;
                }

                requestAnimationFrame(check);
            }

            requestAnimationFrame(check);
        });
    }

    async function launchGame() {
        if (gameStarted) {
            console.log('[MENU] Game already started.');
            return;
        }

        console.log('[MENU] Launching game...');

        closeSelection();

        if (mainMenuAfter) {
            mainMenuAfter.classList.remove('show');
        }

        if (gameContainer) {
            gameContainer.style.display = 'block';
            gameContainer.classList.add('active');

            gameContainer.style.width = '100vw';
            gameContainer.style.height = '100vh';
        }

        if (threeContainer) {
            threeContainer.style.width = '100%';
            threeContainer.style.height = '100%';
        }

        await new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });

        const ready = await waitForGameContainer();

        if (!ready) {
            console.error(
                '[MENU] Cannot start game: renderer container has zero size.'
            );

            alert(
                'The game could not start because the game screen has no size.'
            );

            return;
        }

        try {
            console.log('[MENU] Loading game.js...');

            const module = await import('./game.js');

            if (!module) {
                throw new Error('game.js loaded but returned no module.');
            }

            if (typeof module.startGame !== 'function') {
                throw new Error(
                    'game.js does not export startGame().'
                );
            }

            gameStarted = true;

            console.log(
                `[MENU] Starting game. Sanity Mode: ${
                    sanityEnabled ? 'ON' : 'OFF'
                }`
            );

            module.startGame(
                sanityEnabled,
                selectedDevice
            );

        } catch (error) {
            gameStarted = false;

            console.error(
                '[MENU] Failed to load game:',
                error
            );

            console.error(
                '[MENU] Error message:',
                error.message
            );

            console.error(
                '[MENU] Error stack:',
                error.stack
            );

            if (gameContainer) {
                gameContainer.classList.remove('active');
                gameContainer.style.display = 'none';
            }

            alert(
                'Game failed to load.\n\n' +
                error.message
            );
        }
    }


    if (btnMobile) {
        btnMobile.addEventListener('click', () => {
            selectDevice('Mobile');
        });
    }

    if (btnComputer) {
        btnComputer.addEventListener('click', () => {
            selectDevice('Computer');
        });
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            openSelection();
        });
    }

    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            openSelection();
        });
    }

    if (creditsBtn) {
        creditsBtn.addEventListener('click', () => {
            openCredits();
        });
    }

    if (exitBtn) {
        exitBtn.addEventListener('click', () => {
            exitGame();
        });
    }

    if (selExit) {
        selExit.addEventListener('click', () => {
            closeSelection();
        });
    }

    if (selPlay) {
        selPlay.addEventListener('click', () => {
            launchGame();
        });
    }

    if (sanityToggle) {
        sanityToggle.addEventListener('click', () => {
            toggleSanity();
        });
    }

    if (creditsExit) {
        creditsExit.addEventListener('click', () => {
            closeCredits();
        });
    }

    if (logsBtn) {
        logsBtn.addEventListener('click', () => {
            openLogs();
        });
    }

    if (logsExit) {
        logsExit.addEventListener('click', () => {
            closeLogs();
        });
    }

    if (logsOverlay) {
        logsOverlay.addEventListener('click', (event) => {
            if (event.target === logsOverlay) {
                closeLogs();
            }
        });
    }

    if (creditsOverlay) {
        creditsOverlay.addEventListener('click', (event) => {
            if (event.target === creditsOverlay) {
                closeCredits();
            }
        });
    }

    if (selectionOverlay) {
        selectionOverlay.addEventListener('click', (event) => {
            if (event.target === selectionOverlay) {
                closeSelection();
            }
        });
    }


    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        if (
            creditsOverlay &&
            creditsOverlay.classList.contains('active')
        ) {
            closeCredits();
            return;
        }

        if (
            selectionOverlay &&
            selectionOverlay.classList.contains('active')
        ) {
            closeSelection();
            return;
        }

        if (
            logsOverlay &&
            logsOverlay.classList.contains('show')
        ) {
            closeLogs();
        }
    });


    let lastTouchEnd = 0;

    document.addEventListener(
        'touchend',
        (event) => {
            const now = Date.now();

            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }

            lastTouchEnd = now;
        },
        { passive: false }
    );


    window.addEventListener('resize', () => {
        if (!gameContainer) return;

        if (
            gameContainer.classList.contains('active') &&
            threeContainer
        ) {
            console.log(
                `[MENU] Resize: ${
                    threeContainer.clientWidth
                }x${
                    threeContainer.clientHeight
                }`
            );
        }
    });


    window.launchGame = launchGame;


    if (gameContainer) {
        gameContainer.classList.remove('active');
        gameContainer.style.display = 'none';
    }

    if (mainMenuAfter) {
        mainMenuAfter.classList.remove('show');
    }

    if (creditsIntro) {
        creditsIntro.classList.remove('show');
        creditsIntro.classList.remove('hide');
    }

    if (sanityToggle) {
        sanityToggle.classList.add('on');
    }

    if (sanityStatus) {
        sanityStatus.textContent = 'ON';
        sanityStatus.classList.add('on');
    }

    console.log('[MENU] The Maze V menu initialized.');
})();
