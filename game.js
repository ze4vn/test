// ─── READ URL PARAMETERS ────────────────────────────────
const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode') || 'desktop';
const sanityParam = urlParams.get('sanity') || 'on';
const isMobile = mode === 'mobile';
const sanityOn = sanityParam === 'on';

// ─── IMPORTS ──────────────────────────────────────────────
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ─── CONSTANTS ───────────────────────────────────────────────
const MAZE_SIZE = 16;
const wallHeight = 3.6;
const tileSize = 2.8;
const PLAYER_RADIUS = 0.30;
const WALL_MARGIN = 0.18;
const GRAVITY = -22;
const JUMP_SPEED = 6.0;
const BASE_MOVE_SPEED = 5.0;
const SPRINT_MOVE_SPEED = 9.0;
const FIGHT_FLIGHT_MOVE_SPEED = 6.8;
const FIGHT_FLIGHT_SPRINT_SPEED = 11.0;
const AIR_ACCEL = 8.0;
const MAX_SPEED = 25;
const LAND_SHAKE_AMOUNT = 0.12;
const MAX_STAMINA = 160;
const STAMINA_DRAIN = 18;
const STAMINA_REGEN = 15;
const STAMINA_REGEN_WALK = 22;

// ─── SANITY ──────────────────────────────────────────────────
const SANITY_DRAIN_FLASHLIGHT = 0.75;
const SANITY_DRAIN_DARKNESS = 0.18;
const SANITY_REGEN_NEAR_LIGHT = 6.5;
const LIGHT_DETECTION_RADIUS = 5.5;

let sanity = 100;

function getSanityLevel(value) {
    if (value > 83) return 'A';
    if (value > 66) return 'B';
    if (value > 50) return 'C';
    if (value > 33) return 'D';
    if (value > 16) return 'E';
    return 'F';
}

// ─── COUNTDOWN TIMER ─────────────────────────────────────────
const START_TIME = 300;
let gameTime = START_TIME;
let isDead = false;
let deathCause = 'sanity';

function formatTime(seconds) {
    const clamped = Math.max(0, seconds);
    const mins = Math.floor(clamped / 60);
    const secs = Math.floor(clamped % 60);
    const ms = Math.floor((clamped % 1) * 1000);
    return `${mins}:${secs}:${ms}`;
}

function updateTimerUI() {
    const el = document.getElementById('timerContainer');
    if (!el) return;
    el.textContent = formatTime(gameTime);
    el.classList.remove('low-time', 'critical-time');
    if (gameTime <= 0) el.classList.add('critical-time');
    else if (gameTime < 60) el.classList.add('low-time');
}

// ─── BODYCAM OVERLAY ────────────────────────────────────────
const bodycamCanvas = document.getElementById('bodycamCanvas');
const bodycamCtx = bodycamCanvas ? bodycamCanvas.getContext('2d') : null;
const bodycamOverlay = document.getElementById('bodycamOverlay');
let bodycamActive = false;
let bodycamTime = 0;

function resizeBodycam() {
    if (!bodycamCanvas) return;
    bodycamCanvas.width = window.innerWidth;
    bodycamCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeBodycam);
resizeBodycam();

function drawBodycam(time) {
    if (!bodycamCanvas || !bodycamCtx) return;
    const w = bodycamCanvas.width, h = bodycamCanvas.height;
    const ctx = bodycamCtx;
    ctx.clearRect(0, 0, w, h);

    // scanlines
    const scanlineCount = Math.floor(h / 1.6);
    for (let i = 0; i < scanlineCount; i++) {
        const y = (i / scanlineCount) * h + Math.sin(i * 0.7 + time * 0.0015) * 0.8;
        const alpha = 0.015 + 0.035 * (0.5 + 0.5 * Math.sin(i * 1.3 + time * 0.002));
        const thickness = 0.6 + 0.8 * (0.5 + 0.5 * Math.sin(i * 0.9 + time * 0.0018));
        ctx.fillStyle = `rgba(0,0,0,${alpha})`;
        ctx.fillRect(0, y, w, thickness);
    }
    // secondary scanlines
    for (let i = 0; i < Math.floor(h / 3.2); i++) {
        const y = (i / (Math.floor(h / 3.2))) * h + Math.cos(i * 0.5 + time * 0.001) * 1.2;
        const alpha = 0.008 + 0.02 * (0.5 + 0.5 * Math.sin(i * 2.1 + time * 0.0025));
        ctx.fillStyle = `rgba(10,0,0,${alpha})`;
        ctx.fillRect(0, y, w, 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(i * 1.7 + time * 0.0012)));
    }
    // vignette
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.15, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.4, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.08)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // red & blue borders
    const borderWidth = Math.max(w, h) * 0.035;
    const pulse = 0.85 + 0.15 * Math.sin(time * 0.0012);
    const gradRed = ctx.createLinearGradient(0, 0, borderWidth * 2, 0);
    gradRed.addColorStop(0, `rgba(255,20,20,${0.25 * pulse})`);
    gradRed.addColorStop(0.5, `rgba(255,0,0,${0.10 * pulse})`);
    gradRed.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = gradRed;
    ctx.fillRect(0, 0, borderWidth * 2, h);
    const gradRedTop = ctx.createLinearGradient(0, 0, 0, borderWidth * 2);
    gradRedTop.addColorStop(0, `rgba(255,20,20,${0.20 * pulse})`);
    gradRedTop.addColorStop(0.5, `rgba(255,0,0,${0.08 * pulse})`);
    gradRedTop.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = gradRedTop;
    ctx.fillRect(0, 0, w, borderWidth * 2);
    const gradBlue = ctx.createLinearGradient(w - borderWidth * 2, 0, w, 0);
    gradBlue.addColorStop(0, 'rgba(0,0,255,0)');
    gradBlue.addColorStop(0.5, `rgba(0,80,255,${0.10 * pulse})`);
    gradBlue.addColorStop(1, `rgba(30,120,255,${0.25 * pulse})`);
    ctx.fillStyle = gradBlue;
    ctx.fillRect(w - borderWidth * 2, 0, borderWidth * 2, h);
    const gradBlueBottom = ctx.createLinearGradient(0, h - borderWidth * 2, 0, h);
    gradBlueBottom.addColorStop(0, 'rgba(0,0,255,0)');
    gradBlueBottom.addColorStop(0.5, `rgba(0,80,255,${0.08 * pulse})`);
    gradBlueBottom.addColorStop(1, `rgba(30,120,255,${0.20 * pulse})`);
    ctx.fillStyle = gradBlueBottom;
    ctx.fillRect(0, h - borderWidth * 2, w, borderWidth * 2);

    // corner brackets
    const bracketSize = Math.min(w, h) * 0.055;
    const bracketThick = Math.max(2, Math.min(w, h) * 0.004);
    const bracketOffset = Math.min(w, h) * 0.025;
    const bracketAlpha = 0.25 + 0.15 * Math.sin(time * 0.0015 + 1.2);
    ctx.strokeStyle = `rgba(255,255,255,${bracketAlpha})`;
    ctx.lineWidth = bracketThick;
    ctx.shadowColor = 'rgba(255,255,255,0.1)';
    ctx.shadowBlur = 6;
    const corners = [
        [bracketOffset, bracketOffset, 1, 1],
        [w - bracketOffset, bracketOffset, -1, 1],
        [bracketOffset, h - bracketOffset, 1, -1],
        [w - bracketOffset, h - bracketOffset, -1, -1]
    ];
    for (const [cx, cy, sx, sy] of corners) {
        ctx.beginPath();
        ctx.moveTo(cx + sx * bracketSize, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * bracketSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + sx * bracketSize * 0.45, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * bracketSize * 0.45);
        ctx.strokeStyle = `rgba(200,200,255,${bracketAlpha * 0.4})`;
        ctx.lineWidth = bracketThick * 0.5;
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${bracketAlpha})`;
        ctx.lineWidth = bracketThick;
    }
    ctx.shadowBlur = 0;

    // light leaks
    for (let i = 0; i < 3; i++) {
        const fx = 0.1 + 0.8 * (0.5 + 0.5 * Math.sin(time * 0.0004 + i * 2.1));
        const fy = 0.1 + 0.8 * (0.5 + 0.5 * Math.cos(time * 0.0005 + i * 1.7));
        const fr = 0.02 + 0.03 * (0.5 + 0.5 * Math.sin(time * 0.0008 + i * 3.3));
        const spot = ctx.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, fr * Math.max(w, h));
        const col = i === 0 ? `rgba(255,80,40,${0.04 + 0.03 * Math.sin(time * 0.001 + i)})` :
            i === 1 ? `rgba(40,80,255,${0.03 + 0.02 * Math.sin(time * 0.0012 + i * 1.5)})` :
            `rgba(255,200,100,${0.025 + 0.02 * Math.sin(time * 0.0009 + i * 2.3)})`;
        spot.addColorStop(0, col);
        spot.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = spot;
        ctx.fillRect(0, 0, w, h);
    }

    // grain
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        const size = 0.5 + Math.random() * 1.5;
        const alpha = 0.02 + Math.random() * 0.06;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(x, y, size, size);
    }
    for (let i = 0; i < 40; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        const size = 0.5 + Math.random() * 1.2;
        const alpha = 0.01 + Math.random() * 0.04;
        ctx.fillStyle = `rgba(255,0,0,${alpha})`;
        ctx.fillRect(x, y, size, size);
    }
}

function startBodycam() {
    bodycamActive = true;
    if (bodycamOverlay) bodycamOverlay.classList.add('active');
}
function stopBodycam() {
    bodycamActive = false;
    if (bodycamOverlay) bodycamOverlay.classList.remove('active');
}

// ─── RED MODE ────────────────────────────────────────────────
let redModeActive = false;
let redModeActivated = false;
let redModeLights = [];

function activateRedMode() {
    if (redModeActivated) return;
    redModeActivated = true;
    redModeActive = true;

    const RED_COLOR = 0xff2200;
    const INTENSITY_MULT = 8.0;

    for (const src of lightSources) {
        if (src.light && src.light.isPointLight) {
            src.light.userData._origColor = src.light.color.getHex();
            src.light.color.setHex(RED_COLOR);
            src.light.userData._origIntensity = src.light.userData._origIntensity || src.light.intensity;
            src.light.intensity = src.light.userData._origIntensity * INTENSITY_MULT;
        }
    }
    for (const fl of flickerLights) {
        if (fl.light && fl.light.isPointLight) {
            fl.light.userData._origColor = fl.light.color.getHex();
            fl.light.color.setHex(RED_COLOR);
            fl.light.userData._origIntensity = fl.light.userData._origIntensity || fl.light.intensity;
            fl.light.intensity = fl.light.userData._origIntensity * INTENSITY_MULT;
        }
        if (fl.bulb && fl.bulb.material) {
            fl.bulb.material.color.setHex(RED_COLOR);
            fl.bulb.material.emissive.setHex(RED_COLOR);
            fl.bulb.material.emissiveIntensity = 4.0;
        }
    }

    const redDirLight = new THREE.DirectionalLight(0xff2200, 3.5);
    redDirLight.position.set(0, wallHeight + 2, 0);
    redDirLight.target.position.set(0, 0, 0);
    redDirLight.castShadow = false;
    redDirLight.name = 'redDirLight';
    scene.add(redDirLight);
    scene.add(redDirLight.target);
    redModeLights.push(redDirLight, redDirLight.target);

    const redHemisphere = new THREE.HemisphereLight(0xff2200, 0x330000, 1.5);
    redHemisphere.name = 'redHemisphere';
    scene.add(redHemisphere);
    redModeLights.push(redHemisphere);

    const redAmbient = new THREE.AmbientLight(0xff0000, 1.0);
    redAmbient.name = 'redAmbient';
    scene.add(redAmbient);
    redModeLights.push(redAmbient);

    scene.fog = null;
    bloomPass.strength = 1.4;

    if (realismPass.uniforms) {
        realismPass.uniforms.redTint.value = 0.85;
        realismPass.uniforms.sanityDarkness.value = 0.15;
        realismPass.uniforms.aberration.value = 0.12;
        realismPass.uniforms.distortion.value = 0.35;
        realismPass.uniforms.blurAmount.value = 0.035;
        realismPass.uniforms.vignetteStrength.value = 0.9;
    }

    flashlightOn = false;
    flashlight.intensity = 0;
    lensBounce.intensity = 0;

    startBodycam();

    const schizo = document.getElementById('schizoOverlay');
    if (schizo) schizo.classList.add('active');

    const hint = document.getElementById('flashlightHint');
    if (hint) {
        hint.textContent = '';
        hint.classList.remove('visible');
    }
    clearTimeout(window._redHintTimeout);
}

function deactivateRedMode() {
    if (!redModeActive) return;
    redModeActive = false;
    redModeActivated = false;

    stopBodycam();
    const schizo = document.getElementById('schizoOverlay');
    if (schizo) schizo.classList.remove('active');

    for (const src of lightSources) {
        if (src.light && src.light.isPointLight) {
            if (src.light.userData._origColor !== undefined) {
                src.light.color.setHex(src.light.userData._origColor);
            }
            if (src.light.userData._origIntensity !== undefined) {
                src.light.intensity = src.light.userData._origIntensity;
            }
        }
    }
    for (const fl of flickerLights) {
        if (fl.light && fl.light.isPointLight) {
            if (fl.light.userData._origColor !== undefined) {
                fl.light.color.setHex(fl.light.userData._origColor);
            }
            if (fl.light.userData._origIntensity !== undefined) {
                fl.light.intensity = fl.light.userData._origIntensity;
            }
        }
        if (fl.bulb && fl.bulb.material) {
            fl.bulb.material.color.setHex(0xffdd88);
            fl.bulb.material.emissive.setHex(0xffaa44);
            fl.bulb.material.emissiveIntensity = 0.8;
        }
    }

    for (const obj of redModeLights) {
        scene.remove(obj);
        if (obj.dispose) obj.dispose();
    }
    redModeLights = [];

    scene.fog = new THREE.FogExp2(0x040406, 0.012);
    bloomPass.strength = 0.25;

    if (realismPass.uniforms) {
        realismPass.uniforms.redTint.value = 0.0;
        realismPass.uniforms.sanityDarkness.value = 0.0;
        realismPass.uniforms.aberration.value = 0.025;
        realismPass.uniforms.distortion.value = 0.15;
        realismPass.uniforms.blurAmount.value = 0.015;
        realismPass.uniforms.vignetteStrength.value = 0.75;
    }

    const hint = document.getElementById('flashlightHint');
    if (hint) {
        hint.textContent = 'click to toggle flashlight';
        hint.classList.remove('visible');
    }
}

// ─── LEVEL TITLE ─────────────────────────────────────────────
function showLevelTitle(levelNum, title, subtitle) {
    const container = document.getElementById('levelTitleContainer');
    const mainEl = document.getElementById('levelTitleMain');
    const subEl = document.getElementById('levelTitleSub');
    if (!container || !mainEl || !subEl) return;

    mainEl.textContent = `Level ${levelNum}`;
    subEl.textContent = subtitle || '';

    container.classList.remove('visible');
    void container.offsetWidth;
    container.classList.add('visible');

    clearTimeout(window._levelTitleTimeout);
    window._levelTitleTimeout = setTimeout(() => {
        container.classList.remove('visible');
    }, 3500);
}

// ─── DEATH SEQUENCE ──────────────────────────────────────────
function triggerDeath(cause) {
    if (isDead) return;
    isDead = true;
    isLocked = false;
    if (document.pointerLockElement) document.exitPointerLock();

    deathCause = cause || 'sanity';
    const deathOverlay = document.getElementById('deathOverlay');
    const redOverlay = document.getElementById('deathRedOverlay');
    const whiteFlash = document.getElementById('deathWhiteFlash');
    const content = document.getElementById('deathContent');
    const titleEl = document.getElementById('deathTitle');
    const subEl = document.getElementById('deathSub');
    if (!deathOverlay) return;

    if (deathCause === 'time') {
        if (titleEl) titleEl.textContent = 'Time\'s Up.';
        if (subEl) subEl.textContent = 'You ran out of time.';
    } else {
        if (titleEl) titleEl.textContent = 'You Have Died.';
        if (subEl) subEl.textContent = 'Your sanity crumbled.';
    }

    deathOverlay.classList.add('active');
    if (redOverlay) {
        setTimeout(() => redOverlay.classList.add('show'), 50);
    }

    if (!redModeActive && whiteFlash) {
        setTimeout(() => {
            whiteFlash.classList.add('flash');
            setTimeout(() => whiteFlash.classList.remove('flash'), 150);
        }, 400);
    }

    if (content) {
        setTimeout(() => content.classList.add('show'), 800);
    }
}

function respawn() {
    if (!isDead) return;
    isDead = false;
    deathCause = 'sanity';
    const deathOverlay = document.getElementById('deathOverlay');
    const redOverlay = document.getElementById('deathRedOverlay');
    const content = document.getElementById('deathContent');
    if (deathOverlay) deathOverlay.classList.remove('active');
    if (redOverlay) redOverlay.classList.remove('show');
    if (content) content.classList.remove('show');

    deactivateRedMode();
    redModeActivated = false;
    redModeActive = false;

    sanity = 100;
    stamina = MAX_STAMINA;
    gameTime = START_TIME;
    updateTimerUI();
    const spawnH = getTerrainHeight(spawnX, spawnZ);
    cameraGroup.position.set(spawnX, spawnH + playerHeight, spawnZ);
    camera.position.set(0, 0, 0);
    velocity.set(0, 0, 0);
    onGround = true;
    landShake = 0;
    breathPhase = 0;
    isSchizo = false;
    schizoTimer = 0;
    isLocked = true;
}

function restartLevels() {
    gameTime = START_TIME;
    currentLevel = 0;
    deactivateRedMode();
    redModeActivated = false;
    redModeActive = false;
    generateLevel(0);
    respawn();
    isDead = false;
    deathCause = 'sanity';
    const deathOverlay = document.getElementById('deathOverlay');
    const redOverlay = document.getElementById('deathRedOverlay');
    const content = document.getElementById('deathContent');
    if (deathOverlay) deathOverlay.classList.remove('active');
    if (redOverlay) redOverlay.classList.remove('show');
    if (content) content.classList.remove('show');
    isLocked = true;
    updateTimerUI();
    const container = document.getElementById('levelTitleContainer');
    if (container) container.classList.remove('visible');
}

function mainMenu() {
    window.location.href = 'index.html';
}

// ─── MAZE GENERATOR ──────────────────────────────────────────
function generateTunnelMaze(size) {
    const grid = [];
    for (let y = 0; y < size; y++) {
        grid[y] = [];
        for (let x = 0; x < size; x++) {
            grid[y][x] = { x, y, top: true, right: true, bottom: true, left: true, visited: false };
        }
    }
    const dirs = [
        { dx: 0, dy: -1, wall: 'top', opp: 'bottom' },
        { dx: 0, dy: 1, wall: 'bottom', opp: 'top' },
        { dx: -1, dy: 0, wall: 'left', opp: 'right' },
        { dx: 1, dy: 0, wall: 'right', opp: 'left' }
    ];
    const sx = Math.floor(Math.random() * size);
    const sy = Math.floor(Math.random() * size);
    grid[sy][sx].visited = true;
    const stack = [{ x: sx, y: sy }];
    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const { x, y } = current;
        const neighbors = [];
        for (const d of dirs) {
            const nx = x + d.dx, ny = y + d.dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size && !grid[ny][nx].visited) {
                neighbors.push({ x: nx, y: ny, dir: d });
            }
        }
        if (neighbors.length === 0) { stack.pop(); continue; }
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        grid[y][x][next.dir.wall] = false;
        grid[next.y][next.x][next.dir.opp] = false;
        grid[next.y][next.x].visited = true;
        stack.push({ x: next.x, y: next.y });
        if (Math.random() < 0.7) {
            let steps = 2 + Math.floor(Math.random() * 6);
            let cx = next.x, cy = next.y;
            let lastDir = next.dir;
            for (let s = 0; s < steps; s++) {
                if (Math.random() < 0.3) {
                    const altDirs = dirs.filter(d => !(d.dx === -lastDir.dx && d.dy === -lastDir.dy));
                    lastDir = altDirs[Math.floor(Math.random() * altDirs.length)];
                }
                const tx = cx + lastDir.dx, ty = cy + lastDir.dy;
                if (tx < 0 || tx >= size || ty < 0 || ty >= size) break;
                if (grid[ty][tx].visited) break;
                grid[cy][cx][lastDir.wall] = false;
                grid[ty][tx][lastDir.opp] = false;
                grid[ty][tx].visited = true;
                stack.push({ x: tx, y: ty });
                cx = tx;
                cy = ty;
            }
        }
        if (Math.random() < 0.18 && stack.length > 1) {
            const branchDir = dirs[Math.floor(Math.random() * dirs.length)];
            const bx = x + branchDir.dx, by = y + branchDir.dy;
            if (bx >= 0 && bx < size && by >= 0 && by < size && !grid[by][bx].visited) {
                grid[y][x][branchDir.wall] = false;
                grid[by][bx][branchDir.opp] = false;
                grid[by][bx].visited = true;
                stack.push({ x: bx, y: by });
            }
        }
    }
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (!grid[y][x].visited) {
                for (const d of dirs) {
                    const nx = x + d.dx, ny = y + d.dy;
                    if (nx >= 0 && nx < size && ny >= 0 && ny < size && grid[ny][nx].visited) {
                        grid[y][x][d.opp] = false;
                        grid[ny][nx][d.wall] = false;
                        grid[y][x].visited = true;
                        break;
                    }
                }
                if (!grid[y][x].visited) {
                    grid[y][x].visited = true;
                    if (x > 0) { grid[y][x].left = false;
                        grid[y][x - 1].right = false; }
                }
            }
        }
    }
    for (let y = 1; y < size - 1; y++) {
        for (let x = 1; x < size - 1; x++) {
            if (Math.random() < 0.28 && grid[y][x].top) {
                grid[y][x].top = false;
                grid[y - 1][x].bottom = false;
            }
            if (Math.random() < 0.28 && grid[y][x].left) {
                grid[y][x].left = false;
                grid[y][x - 1].right = false;
            }
        }
    }
    return grid;
}

function bfs(grid, startX, startY, size) {
    const dist = Array.from({ length: size }, () => Array(size).fill(Infinity));
    dist[startY][startX] = 0;
    const queue = [{ x: startX, y: startY }];
    let qi = 0;
    while (qi < queue.length) {
        const { x, y } = queue[qi++];
        const cell = grid[y][x];
        const d0 = dist[y][x];
        const dirs = [];
        if (!cell.top && y > 0) dirs.push({ x, y: y - 1 });
        if (!cell.bottom && y < size - 1) dirs.push({ x, y: y + 1 });
        if (!cell.left && x > 0) dirs.push({ x: x - 1, y });
        if (!cell.right && x < size - 1) dirs.push({ x: x + 1, y });
        for (const d of dirs) {
            if (dist[d.y][d.x] > d0 + 1) {
                dist[d.y][d.x] = d0 + 1;
                queue.push(d);
            }
        }
    }
    return dist;
}

function findFurthestCell(grid, startX, startY, size) {
    const dist = bfs(grid, startX, startY, size);
    let maxDist = -1, bestX = startX, bestY = startY;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (dist[y][x] !== Infinity && dist[y][x] > maxDist) {
                maxDist = dist[y][x];
                bestX = x;
                bestY = y;
            }
        }
    }
    return { x: bestX, y: bestY };
}

function isWalkableDynamic(mazeData, size, half, worldX, worldZ) {
    const numPoints = 12;
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const px = worldX + Math.cos(angle) * PLAYER_RADIUS;
        const pz = worldZ + Math.sin(angle) * PLAYER_RADIUS;
        const gx = px / tileSize + half;
        const gz = pz / tileSize + half;
        const ix = Math.round(gx);
        const iz = Math.round(gz);
        if (ix < 0 || ix >= size || iz < 0 || iz >= size) return false;
        const cell = mazeData[iz][ix];
        const localX = gx - ix, localZ = gz - iz;
        if (localX < -0.5 + WALL_MARGIN && cell.left) return false;
        if (localX > 0.5 - WALL_MARGIN && cell.right) return false;
        if (localZ < -0.5 + WALL_MARGIN && cell.top) return false;
        if (localZ > 0.5 - WALL_MARGIN && cell.bottom) return false;
    }
    return true;
}

// ─── TEXTURE GENERATORS ──────────────────────────────────────
function createConcreteWallTexture(baseGray, mortarGray) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = mortarGray;
    ctx.fillRect(0, 0, 512, 512);
    const bw = 112, bh = 60;
    const rows = Math.ceil(512 / bh) + 1;
    const cols = Math.ceil(512 / bw) + 1;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const offset = (r % 2) * (bw / 2);
            const x = c * bw + offset - (bw / 2);
            const y = r * bh;
            const shift = (Math.random() - 0.5) * 22;
            const g = Math.max(0, Math.min(255, baseGray + shift));
            ctx.fillStyle = `rgb(${g},${g},${g})`;
            ctx.fillRect(x, y, bw - 3, bh - 3);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x, y, bw - 3, 2);
            ctx.fillRect(x, y + bh - 5, bw - 3, 2);
            ctx.fillRect(x, y, 2, bh - 3);
            ctx.fillRect(x + bw - 5, y, 2, bh - 3);
            for (let i = 0; i < 10; i++) {
                const nx = x + Math.random() * (bw - 8);
                const ny = y + Math.random() * (bh - 6);
                ctx.fillStyle = `rgba(0,0,0,${0.06 + Math.random() * 0.14})`;
                ctx.fillRect(nx, ny, 3 + Math.random() * 6, 2 + Math.random() * 4);
            }
            for (let i = 0; i < 6; i++) {
                const nx = x + Math.random() * (bw - 8);
                const ny = y + Math.random() * (bh - 6);
                ctx.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.06})`;
                ctx.fillRect(nx, ny, 2 + Math.random() * 5, 1 + Math.random() * 3);
            }
        }
    }
    for (let i = 0; i < 20; i++) {
        const sx = Math.random() * 512, sy = Math.random() * 512;
        const rad = 30 + Math.random() * 80;
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, rad);
        grad.addColorStop(0, `rgba(10,10,10,${0.12 + Math.random() * 0.2})`);
        grad.addColorStop(1, 'rgba(10,10,10,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx - rad, sy - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 8; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.2})`;
        ctx.lineWidth = 1 + Math.random() * 1.5;
        ctx.beginPath();
        let cx = Math.random() * 512, cy = Math.random() * 512;
        ctx.moveTo(cx, cy);
        for (let s = 0; s < 6 + Math.floor(Math.random() * 10); s++) {
            cx += (Math.random() - 0.5) * 30;
            cy += (Math.random() - 0.5) * 25;
            ctx.lineTo(cx, cy);
        }
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.4, 2.4);
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#28282a';
    ctx.fillRect(0, 0, 512, 512);
    const tile = 64;
    for (let y = 0; y < 512; y += tile) {
        for (let x = 0; x < 512; x += tile) {
            const shade = 35 + Math.random() * 25;
            ctx.fillStyle = `rgb(${shade},${shade},${shade+2})`;
            ctx.fillRect(x + 1, y + 1, tile - 2, tile - 2);
            ctx.strokeStyle = `rgba(0,0,0,${0.08 + Math.random() * 0.08})`;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, tile, tile);
        }
    }
    for (let i = 0; i < 80; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        ctx.beginPath();
        const sx = Math.random() * 512, sy = Math.random() * 512;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 80, sy + (Math.random() - 0.5) * 60);
        ctx.stroke();
    }
    for (let i = 0; i < 300; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        ctx.fillStyle = `rgba(60,60,60,${0.02 + Math.random() * 0.04})`;
        ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 4);
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createCeilTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#121214';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 512, y = Math.random() * 512;
        const s = 1 + Math.random() * 3;
        const sh = 12 + Math.random() * 12;
        ctx.fillStyle = `rgba(${sh},${sh},${sh},0.3)`;
        ctx.fillRect(x, y, s, s);
    }
    for (let i = 0; i < 6; i++) {
        const cx = Math.random() * 512, cy = Math.random() * 512;
        const r = 30 + Math.random() * 80;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(50,50,45,${0.08 + Math.random() * 0.06})`);
        grad.addColorStop(1, 'rgba(50,50,45,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createWoodWallTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#7a5d3f';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 120; i++) {
        const y = Math.random() * 512;
        const shade = 50 + Math.random() * 70;
        ctx.strokeStyle = `rgb(${shade},${shade-20},${shade-35})`;
        ctx.lineWidth = 1 + Math.random() * 3;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y + (Math.random() - 0.5) * 25);
        ctx.stroke();
    }
    for (let i = 0; i < 25; i++) {
        const cx = Math.random() * 512, cy = Math.random() * 512;
        const r = 6 + Math.random() * 22;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, '#4a3222');
        grad.addColorStop(1, 'rgba(122,93,63,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
    }
    for (let i = 0; i < 40; i++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.05 + Math.random() * 0.1})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        const sx = Math.random() * 512, sy = Math.random() * 512;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 70, sy + (Math.random() - 0.5) * 50);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createWoodFloorTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#5d3f2a';
    ctx.fillRect(0, 0, 512, 512);
    const plankH = 44;
    for (let y = 0; y < 512; y += plankH) {
        const shade = 70 + Math.random() * 35;
        ctx.fillStyle = `rgb(${shade},${shade-18},${shade-25})`;
        ctx.fillRect(0, y, 512, plankH - 2);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, y + plankH - 2, 512, 2);
        for (let i = 0; i < 12; i++) {
            const x = Math.random() * 512;
            const yy = y + Math.random() * (plankH - 4);
            ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, yy);
            ctx.lineTo(x + (Math.random() - 0.5) * 55, yy + (Math.random() - 0.5) * 18);
            ctx.stroke();
        }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.anisotropy = 16;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

function createWoodCeilTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4d3520';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 100; i++) {
        const y = Math.random() * 512;
        const shade = 40 + Math.random() * 50;
        ctx.strokeStyle = `rgb(${shade},${shade-15},${shade-25})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y + (Math.random() - 0.5) * 18);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    tex.anisotropy = 8;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

// ─── BUILD MAZE ──────────────────────────────────────────────
function buildMaze(size, level) {
    const half = (size - 1) / 2;
    const data = generateTunnelMaze(size);

    let start = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
    let exit = findFurthestCell(data, start.x, start.y, size);
    if (exit.x === start.x && exit.y === start.y) {
        start = { x: Math.floor(Math.random() * size), y: Math.floor(Math.random() * size) };
        exit = findFurthestCell(data, start.x, start.y, size);
    }
    const spawnPos = { x: (start.x - half) * tileSize, z: (start.y - half) * tileSize };
    const exitPos = { x: (exit.x - half) * tileSize, z: (exit.y - half) * tileSize };

    const dist = bfs(data, exit.x, exit.y, size);
    let maxDist = 0;
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (dist[y][x] !== Infinity && dist[y][x] > maxDist) maxDist = dist[y][x];
        }
    }
    if (maxDist === 0) maxDist = 1;

    let wallTexs, floorTex, ceilTex;
    if (level === 0) {
        wallTexs = [
            createConcreteWallTexture(74, 26),
            createConcreteWallTexture(64, 22),
            createConcreteWallTexture(80, 30)
        ];
        floorTex = createFloorTexture();
        ceilTex = createCeilTexture();
    } else {
        wallTexs = [createWoodWallTexture(), createWoodWallTexture(), createWoodWallTexture()];
        floorTex = createWoodFloorTexture();
        ceilTex = createWoodCeilTexture();
    }

    const group = new THREE.Group();
    scene.add(group);

    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.92, metalness: 0.02, side: THREE.DoubleSide });
    const totalSize = size * tileSize;
    const floorGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    floorMesh.castShadow = true;
    group.add(floorMesh);

    const ceilMat = new THREE.MeshStandardMaterial({ map: ceilTex, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide });
    const ceilGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    ceilGeo.rotateX(Math.PI / 2);
    const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
    ceilMesh.position.set(0, wallHeight, 0);
    ceilMesh.receiveShadow = true;
    group.add(ceilMesh);

    const wallMatCache = {};
    function getWallMat(variant, brightness) {
        const key = variant + '_' + brightness.toFixed(2);
        if (!wallMatCache[key]) {
            const mat = new THREE.MeshStandardMaterial({
                map: wallTexs[variant],
                roughness: 0.84 + Math.random() * 0.12,
                metalness: 0.02 + Math.random() * 0.03,
                color: new THREE.Color(brightness, brightness, brightness)
            });
            wallMatCache[key] = mat;
        }
        return wallMatCache[key];
    }

    const hWallGeo = new THREE.BoxGeometry(tileSize, wallHeight, 0.12);
    const vWallGeo = new THREE.BoxGeometry(0.12, wallHeight, tileSize);

    wallMeshes = [];
    originalWallPositions = [];

    for (let y = 0; y <= size; y++) {
        for (let x = 0; x < size; x++) {
            const hasWall = (y === 0 || y === size) ? true : data[y][x].top;
            if (hasWall) {
                let cellX, cellY;
                if (y === 0) { cellX = x; cellY = 0; } else if (y === size) { cellX = x; cellY = size - 1; } else { cellX = x; cellY = y - 1; }
                const d = dist[cellY]?.[cellX] ?? 0;
                const brightness = 0.2 + 0.8 * (1 - d / maxDist);
                const px = (x - half) * tileSize;
                const pz = (y - half - 0.5) * tileSize;
                const variant = Math.floor(Math.random() * 3);
                const wall = new THREE.Mesh(hWallGeo, getWallMat(variant, brightness));
                const pos = new THREE.Vector3(px, wallHeight / 2, pz);
                wall.position.copy(pos);
                wall.castShadow = true;
                wall.receiveShadow = true;
                wall.userData.origPos = pos.clone();
                wall.userData.shiftOffset = new THREE.Vector3(0, 0, 0);
                group.add(wall);
                wallMeshes.push(wall);
                originalWallPositions.push(pos.clone());
            }
        }
    }
    for (let y = 0; y < size; y++) {
        for (let x = 0; x <= size; x++) {
            const hasWall = (x === 0 || x === size) ? true : data[y][x].left;
            if (hasWall) {
                let cellX, cellY;
                if (x === 0) { cellX = 0; cellY = y; } else if (x === size) { cellX = size - 1; cellY = y; } else { cellX = x - 1; cellY = y; }
                const d = dist[cellY]?.[cellX] ?? 0;
                const brightness = 0.2 + 0.8 * (1 - d / maxDist);
                const px = (x - half - 0.5) * tileSize;
                const pz = (y - half) * tileSize;
                const variant = Math.floor(Math.random() * 3);
                const wall = new THREE.Mesh(vWallGeo, getWallMat(variant, brightness));
                const pos = new THREE.Vector3(px, wallHeight / 2, pz);
                wall.position.copy(pos);
                wall.castShadow = true;
                wall.receiveShadow = true;
                wall.userData.origPos = pos.clone();
                wall.userData.shiftOffset = new THREE.Vector3(0, 0, 0);
                group.add(wall);
                wallMeshes.push(wall);
                originalWallPositions.push(pos.clone());
            }
        }
    }

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.75, metalness: 0.05 });
    const baseGeo = new THREE.BoxGeometry(0.15, 0.12, 1);
    for (let y = 0; y <= size; y++) {
        for (let x = 0; x < size; x++) {
            if ((y === 0 || y === size) || data[y][x].top) {
                const px = (x - half) * tileSize;
                const pz = (y - half - 0.5) * tileSize;
                const bb = new THREE.Mesh(baseGeo, baseMat);
                bb.scale.set(1, 1, tileSize);
                bb.position.set(px, 0.06, pz);
                group.add(bb);
            }
        }
    }
    for (let y = 0; y < size; y++) {
        for (let x = 0; x <= size; x++) {
            if ((x === 0 || x === size) || data[y][x].left) {
                const px = (x - half - 0.5) * tileSize;
                const pz = (y - half) * tileSize;
                const bb = new THREE.Mesh(baseGeo, baseMat);
                bb.scale.set(tileSize, 1, 1);
                bb.rotation.y = Math.PI / 2;
                bb.position.set(px, 0.06, pz);
                group.add(bb);
            }
        }
    }

    const boxMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.85, metalness: 0.0 });
    const boxMat2 = new THREE.MeshStandardMaterial({ color: 0x3a4a3a, roughness: 0.9, metalness: 0.0 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.7, metalness: 0.15 });
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8, metalness: 0.0 });

    const objPositions = [];
    for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        const px = (x - half) * tileSize + (Math.random() - 0.5) * tileSize * 0.5;
        const pz = (y - half) * tileSize + (Math.random() - 0.5) * tileSize * 0.5;
        const dSpawn = Math.sqrt((px - spawnPos.x) ** 2 + (pz - spawnPos.z) ** 2);
        const dExit = Math.sqrt((px - exitPos.x) ** 2 + (pz - exitPos.z) ** 2);
        if (dSpawn < 2.5 || dExit < 2.5) continue;
        objPositions.push({ x: px, z: pz });
    }

    for (const pos of objPositions) {
        const type = Math.random();
        let obj;
        if (type < 0.3) {
            const w = 0.4 + Math.random() * 0.4;
            const h = 0.3 + Math.random() * 0.5;
            const d = 0.3 + Math.random() * 0.3;
            obj = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Math.random() > 0.5 ? boxMat : boxMat2);
            obj.position.set(pos.x, h / 2, pos.z);
            obj.rotation.y = Math.random() * Math.PI * 2;
        } else if (type < 0.55) {
            obj = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.6, 12), barrelMat);
            obj.position.set(pos.x, 0.3, pos.z);
            obj.rotation.y = Math.random() * Math.PI * 2;
        } else if (type < 0.75) {
            const chairGroup = new THREE.Group();
            const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), chairMat);
            seat.position.y = 0.35;
            chairGroup.add(seat);
            const legMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.3, roughness: 0.5 });
            for (let li = 0; li < 4; li++) {
                const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6), legMat);
                const lx = (li % 2 === 0 ? -0.12 : 0.12);
                const lz = (li < 2 ? -0.12 : 0.12);
                leg.position.set(lx, 0.175, lz);
                chairGroup.add(leg);
            }
            const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.025), chairMat);
            back.position.set(0, 0.48, -0.15);
            chairGroup.add(back);
            obj = chairGroup;
            obj.position.set(pos.x, 0, pos.z);
            obj.rotation.y = Math.random() * Math.PI * 2;
        } else {
            obj = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.4), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 0.9 }));
            obj.position.set(pos.x, 0.04, pos.z);
            obj.rotation.y = Math.random() * Math.PI * 2;
        }
        if (obj) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            group.add(obj);
        }
    }

    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffdd88, emissive: 0xffaa44, emissiveIntensity: 0.8 });
    lightSources = [];
    for (let i = 0; i < 14; i++) {
        const x = Math.floor(Math.random() * size);
        const y = Math.floor(Math.random() * size);
        const px = (x - half) * tileSize + (Math.random() - 0.5) * tileSize * 0.4;
        const pz = (y - half) * tileSize + (Math.random() - 0.5) * tileSize * 0.4;
        const dSpawn = Math.sqrt((px - spawnPos.x) ** 2 + (pz - spawnPos.z) ** 2);
        if (dSpawn < 3) continue;
        const lightBulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), lightMat.clone());
        lightBulb.position.set(px, wallHeight - 0.15, pz);
        group.add(lightBulb);
        const light = new THREE.PointLight(0xffaa44, 0.9 + Math.random() * 0.6, 5 + Math.random() * 2);
        light.position.set(px, wallHeight - 0.2, pz);
        light.castShadow = false;
        group.add(light);
        lightSources.push({ light, position: new THREE.Vector3(px, wallHeight - 0.2, pz) });
        flickerLights.push({
            light,
            bulb: lightBulb,
            phase: Math.random() * 100,
            speed: 0.5 + Math.random() * 1.5,
            baseIntensity: 0.5 + Math.random() * 0.8
        });
    }

    const exitLight = new THREE.PointLight(0xff6633, 3.0, 8, 1.5);
    exitLight.position.set(exitPos.x, 1.0, exitPos.z);
    exitLight.castShadow = false;
    group.add(exitLight);
    lightSources.push({ light: exitLight, position: new THREE.Vector3(exitPos.x, 1.0, exitPos.z) });

    return {
        group,
        data,
        spawnPos,
        exitPos,
        startCell: start,
        exitCell: exit,
        dist,
        maxDist
    };
}

// ─── THREE.JS SETUP ──────────────────────────────────────────
const container = document.getElementById('threeContainer');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040406);
scene.fog = new THREE.FogExp2(0x040406, 0.012);

const cameraGroup = new THREE.Object3D();
scene.add(cameraGroup);
const camera = new THREE.PerspectiveCamera(84, container.clientWidth / container.clientHeight, 0.08, 100);
camera.position.set(0, 0, 0);
camera.rotation.order = 'YXZ';
cameraGroup.add(camera);
cameraGroup.position.set(0, 1.55, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// ─── Mobile performance: lower pixel ratio ──
if (isMobile) {
    renderer.setPixelRatio(1);
} else {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
    resizeBodycam();
};
window.addEventListener('resize', resize);

// ─── LIGHTING ─────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0x1a1a2a, 0.45);
scene.add(ambient);

const hemi = new THREE.HemisphereLight(0x2a2a3a, 0x0a0a0e, 0.35);
scene.add(hemi);

const mainDir = new THREE.DirectionalLight(0x445566, 0.6);
mainDir.position.set(8, 12, 4);
mainDir.castShadow = true;
mainDir.shadow.mapSize.set(2048, 2048);
mainDir.shadow.camera.near = 0.5;
mainDir.shadow.camera.far = 40;
mainDir.shadow.camera.left = -25;
mainDir.shadow.camera.right = 25;
mainDir.shadow.camera.top = 25;
mainDir.shadow.camera.bottom = -25;
mainDir.shadow.bias = -0.001;
mainDir.shadow.normalBias = 0.02;
scene.add(mainDir);
scene.add(mainDir.target);

const rimLight = new THREE.DirectionalLight(0x8899bb, 0.2);
rimLight.position.set(-6, 4, -8);
scene.add(rimLight);

// ─── FLASHLIGHT ───────────────────────────────────────────────
function createFlashlightTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const cx = 256, cy = 256, r = 256;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0.0, 'rgba(255,255,245,1.0)');
    grad.addColorStop(0.15, 'rgba(255,250,235,1.0)');
    grad.addColorStop(0.4, 'rgba(255,240,215,1.0)');
    grad.addColorStop(0.7, 'rgba(255,220,180,1.0)');
    grad.addColorStop(0.9, 'rgba(255,200,155,0.6)');
    grad.addColorStop(1.0, 'rgba(255,190,140,0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 120; i++) {
        const x = 60 + Math.random() * 392, y = 60 + Math.random() * 392;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10 + Math.random() * 30);
        g.addColorStop(0, `rgba(255,255,255,${0.01 + Math.random() * 0.03})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 40, y - 40, 80, 80);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

let flashlightOn = true;
const flashlight = new THREE.SpotLight(0xfff2e0, 65, 28, Math.PI / 4.2, 0.65, 1.8);
flashlight.castShadow = true;
flashlight.shadow.mapSize.set(2048, 2048);
flashlight.shadow.camera.near = 0.1;
flashlight.shadow.camera.far = 30;
flashlight.shadow.bias = -0.0015;
flashlight.shadow.normalBias = 0.03;
flashlight.map = createFlashlightTexture();
flashlight.angle = Math.PI / 4.5;
flashlight.penumbra = 0.6;
flashlight.decay = 1.6;
scene.add(flashlight);
scene.add(flashlight.target);

const lensBounce = new THREE.PointLight(0xffdca8, 0.8, 3.0, 2);
scene.add(lensBounce);

const fillGlow = new THREE.PointLight(0x223355, 0.15, 3);
scene.add(fillGlow);

const flickerLights = [];
let lightSources = [];

const _flashDir = new THREE.Vector3();
const _flashTargetPos = new THREE.Vector3();
let smoothFlashPos = new THREE.Vector3();
let smoothFlashTarget = new THREE.Vector3();
let isFirstFlash = true;

let flickerTimer = 0;
let flickerInterval = 15 + Math.random() * 12;
let isFlickering = false;
let flickerPhase = 0;
const FLICKER_DURATION = 0.5;

function updateFlashlight() {
    if (redModeActive) {
        flashlight.intensity = 0;
        lensBounce.intensity = 0;
        return;
    }

    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const camQuat = new THREE.Quaternion();
    camera.getWorldQuaternion(camQuat);

    const offset = new THREE.Vector3(0.38, -0.18, -0.58);
    const flashWorldPos = camPos.clone().add(offset.clone().applyQuaternion(camQuat));

    _flashDir.set(0, 0, -1).applyQuaternion(camQuat).normalize();
    const flashTargetPos = flashWorldPos.clone().addScaledVector(_flashDir, 9);

    if (isFirstFlash) {
        smoothFlashPos.copy(flashWorldPos);
        smoothFlashTarget.copy(flashTargetPos);
        isFirstFlash = false;
    }

    const lerpFactor = 0.10;
    smoothFlashPos.lerp(flashWorldPos, lerpFactor);
    smoothFlashTarget.lerp(flashTargetPos, lerpFactor);

    flashlight.position.copy(smoothFlashPos);
    flashlight.target.position.copy(smoothFlashTarget);
    lensBounce.position.copy(smoothFlashPos).addScaledVector(_flashDir, 0.1);
    fillGlow.position.copy(smoothFlashPos).addScaledVector(_flashDir, 0.3);

    let targetIntensity = flashlightOn ? 65 : 0;
    if (isFlickering) {
        const flickerVal = Math.random() > 0.5 ? 0 : 65;
        targetIntensity = flashlightOn ? flickerVal : 0;
        flickerPhase += 0.05;
        if (flickerPhase > FLICKER_DURATION) {
            isFlickering = false;
            flickerPhase = 0;
            flickerInterval = 15 + Math.random() * 12;
            flickerTimer = 0;
        }
    }
    if (flashlightOn && !isFlickering && Math.random() < 0.002) {
        targetIntensity *= (0.7 + Math.random() * 0.3);
    }
    flashlight.intensity += (targetIntensity - flashlight.intensity) * 0.35;
    lensBounce.intensity += ((flashlightOn ? 0.8 : 0) - lensBounce.intensity) * 0.35;
}

// ─── POST PROCESSING ─────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const realismShader = {
    uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        movementX: { value: 0 },
        movementY: { value: 0 },
        distortion: { value: 0.15 },
        aberration: { value: 0.025 },
        vignetteStrength: { value: 0.75 },
        blurAmount: { value: 0.015 },
        fovScale: { value: 1.0 },
        staminaVignette: { value: 0.0 },
        lensDirt: { value: 0.0 },
        sanityGlitch: { value: 0.0 },
        sanityDarkness: { value: 0.0 },
        redTint: { value: 0.0 },
        motionBlurX: { value: 0.0 },
        motionBlurY: { value: 0.0 },
        mazeShift: { value: 0.0 },
        bodycamScanline: { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform float movementX;
        uniform float movementY;
        uniform float distortion;
        uniform float aberration;
        uniform float vignetteStrength;
        uniform float blurAmount;
        uniform float fovScale;
        uniform float staminaVignette;
        uniform float lensDirt;
        uniform float sanityGlitch;
        uniform float sanityDarkness;
        uniform float redTint;
        uniform float motionBlurX;
        uniform float motionBlurY;
        uniform float mazeShift;
        uniform float bodycamScanline;
        varying vec2 vUv;

        float random(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }

        vec4 blur(sampler2D tex, vec2 uv, vec2 dir, float radius) {
            vec4 sum = vec4(0.0);
            float total = 0.0;
            for (float i = -6.0; i <= 6.0; i += 1.0) {
                float w = exp(-(i * i) / 10.0);
                vec2 offset = dir * radius * (i / 5.0);
                sum += texture2D(tex, uv + offset) * w;
                total += w;
            }
            return sum / total;
        }

        void main() {
            vec2 uv = vUv;
            vec2 center = vec2(0.5, 0.5);

            float moveStrength = 0.04;
            vec2 offset = vec2(movementX * moveStrength, movementY * moveStrength);

            float motionAmount = length(vec2(motionBlurX, motionBlurY)) * 0.04;
            vec2 motionDir = normalize(vec2(motionBlurX, motionBlurY) + 0.001);
            float motionStrength = clamp(motionAmount, 0.0, 0.06);

            float glitchAmount = sanityGlitch * 0.06 + bodycamScanline * 0.04;
            vec2 glitchOffset = vec2(
                random(vec2(floor(time * 12.0), 0.0)) * glitchAmount * 2.0 - glitchAmount,
                random(vec2(0.0, floor(time * 12.0))) * glitchAmount * 2.0 - glitchAmount
            );
            vec2 shiftedUv = uv + offset + glitchOffset;

            float shiftAmount = mazeShift * 0.03;
            float shiftX = sin(time * 0.05 + shiftedUv.y * 3.0) * shiftAmount;
            float shiftY = cos(time * 0.04 + shiftedUv.x * 3.0) * shiftAmount;
            shiftedUv += vec2(shiftX, shiftY);

            vec2 fovDir = shiftedUv - center;
            shiftedUv = center + fovDir * fovScale;

            vec2 dir = shiftedUv - center;
            float dist = length(dir);
            float rFactor = 1.0 + (distortion + sanityGlitch * 0.2 + bodycamScanline * 0.15) * dist * dist;
            vec2 distortedUv = center + dir * rFactor;
            distortedUv = clamp(distortedUv, 0.0, 1.0);

            float edgeFactor = smoothstep(0.2, 0.92, dist);
            float abAmount = edgeFactor * (aberration + sanityGlitch * 0.04 + bodycamScanline * 0.06) * 3.5;

            vec2 rUv = distortedUv + dir * abAmount * 1.8;
            vec2 bUv = distortedUv - dir * abAmount * 1.6;
            vec2 gUv = distortedUv;
            rUv = clamp(rUv, 0.0, 1.0);
            bUv = clamp(bUv, 0.0, 1.0);
            gUv = clamp(gUv, 0.0, 1.0);

            float blurRadius = (blurAmount + sanityGlitch * 0.02 + bodycamScanline * 0.03) * edgeFactor * 0.9;
            vec4 rColor = blur(tDiffuse, rUv, dir, blurRadius);
            vec4 gColor = blur(tDiffuse, gUv, dir, blurRadius);
            vec4 bColor = blur(tDiffuse, bUv, dir, blurRadius);

            vec3 color = vec3(rColor.r, gColor.g, bColor.b);

            float red = clamp(redTint + bodycamScanline * 0.15, 0.0, 0.7);
            color.r += red * 0.35;
            color.g *= (1.0 - red * 0.3);
            color.b *= (1.0 - red * 0.4);
            color += vec3(red * 0.08, 0.0, 0.0);

            float vignetteRadius = 0.82 - sanityDarkness * 0.08 - bodycamScanline * 0.05;
            float vignette = smoothstep(0.05, vignetteRadius, dist);
            vignette = 1.0 - vignette * (vignetteStrength + sanityDarkness * 0.2 + bodycamScanline * 0.15);

            float staminaVig = 1.0 - staminaVignette * 0.2;
            vignette *= staminaVig;

            float cornerGlow = smoothstep(0.5, 0.95, dist);
            vec3 glowColor = vec3(0.06 + redTint * 0.12 + bodycamScanline * 0.08, 0.01, 0.08 + redTint * 0.06) * cornerGlow * 0.6;
            color += glowColor;

            color *= vignette;

            if (motionStrength > 0.001) {
                vec4 mbColor = vec4(0.0);
                float mt = 0.0;
                for (float i = -6.0; i <= 6.0; i += 1.0) {
                    float w = exp(-(i * i) / 8.0);
                    vec2 sampleUv = uv + motionDir * (i / 5.0) * motionStrength * 0.6;
                    mbColor += texture2D(tDiffuse, sampleUv) * w;
                    mt += w;
                }
                mbColor /= mt;
                float blend = clamp(motionAmount * 4.0, 0.0, 0.7);
                color = mix(color, mbColor.rgb, blend);
            }

            float lightBoost = 1.0 + bodycamScanline * 0.3;
            color.r *= lightBoost;
            color.b *= (1.0 + bodycamScanline * 0.15);

            color = pow(color, vec3(0.94));
            color = clamp(color, 0.0, 1.0);

            gl_FragColor = vec4(color, 1.0);
        }
    `
};
const realismPass = new ShaderPass(realismShader);
composer.addPass(realismPass);

// Bloom strength variable – defined before use
let bloomStrength = isMobile ? 0.15 : 0.25;
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth, container.clientHeight),
    bloomStrength, 0.15, 0.08
);
composer.addPass(bloomPass);
const outputPass = new OutputPass();
composer.addPass(outputPass);

// ─── UI HELPERS ──────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── GAME STATE ──────────────────────────────────────────────
let currentLevel = 0;
let mazeGroup = null;
let mazeData = null;
let exitX = 0, exitZ = 0;
let spawnX = 0, spawnZ = 0;
let teleporterPos = { x: 0, z: 0 };
let gameRunning = true;
let isTransitioning = false;
const playerHeight = 1.55;
let currentSize = MAZE_SIZE;
let currentHalf = (MAZE_SIZE - 1) / 2;

let stamina = MAX_STAMINA;
let isSprinting = false;

const keys = {};
let isLocked = false;
let yaw = 0, pitch = 0;
let velocity = new THREE.Vector3(0, 0, 0);
let onGround = false;
let landShake = 0;
let bobTime = 0;
let breathPhase = 0;
const BREATH_SPEED = 0.7, BREATH_AMOUNT = 0.018, BREATH_TILT = 0.003;
let smoothMoveX = 0, smoothMoveY = 0;
let headTilt = 0;
let smoothHeadTilt = 0;
let mouseSpeed = 0;

let isSchizo = false;
let schizoTimer = 0;
let flashlightOffTime = 0;
let nearLightSource = false;

let wallMeshes = [];
let originalWallPositions = [];
let wallShiftSeed = 0;

function getTerrainHeight(worldX, worldZ) { return 0; }

// ─── LEVEL MANAGEMENT ───────────────────────────────────────
function generateLevel(level) {
    if (mazeGroup) { scene.remove(mazeGroup); mazeGroup = null; }
    deactivateRedMode();
    redModeActivated = false;
    redModeActive = false;

    const result = buildMaze(MAZE_SIZE, level);
    mazeGroup = result.group;
    mazeData = result.data;
    spawnX = result.spawnPos.x;
    spawnZ = result.spawnPos.z;
    exitX = result.exitPos.x;
    exitZ = result.exitPos.z;
    teleporterPos = { x: exitX, z: exitZ };
    cameraGroup.position.set(spawnX, playerHeight, spawnZ);
    camera.position.set(0, 0, 0);
    velocity.set(0, 0, 0);
    onGround = true;
    landShake = 0;
    breathPhase = 0;
    stamina = MAX_STAMINA;
    isSprinting = false;
    flickerLights.length = 0;
    lightSources = [];
    sanity = 100;
    isSchizo = false;
    wallShiftSeed = Math.random() * 1000;
    gameTime = START_TIME;
    updateTimerUI();

    if (level === 1) {
        showLevelTitle(1, 'The Woodland');
    }
}

// ─── INFO PANEL ─────────────────────────────────────────────
const infoPanel = document.getElementById('infoPanel');
const infoContent = document.getElementById('infoContent');
let showInfo = false;
let startTime = performance.now();
let frameCount = 0, lastFpsUpdate = performance.now(), currentFps = 0;

document.addEventListener('keydown', (e) => {
    if (e.key === 'i' || e.key === 'I') {
        showInfo = !showInfo;
        if (infoPanel) infoPanel.style.display = showInfo ? 'block' : 'none';
        e.preventDefault();
    }
});

function updateInfo() {
    if (!showInfo || !infoContent) return;
    const pos = cameraGroup.position;
    const distToExit = Math.sqrt((pos.x - teleporterPos.x) ** 2 + (pos.z - teleporterPos.z) ** 2);
    const yawDeg = ((yaw * 180 / Math.PI) % 360).toFixed(1);
    infoContent.innerHTML = `
        <span class="label">Coordinates</span> > ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}<br>
        <span class="label">Time Remaining</span> > ${formatTime(gameTime)}<br>
        <span class="label">FPS</span> > ${currentFps}<br>
        <span class="label">Rotation face</span> > ${yawDeg}°<br>
        <span class="label">Distance to exit</span> > ${distToExit.toFixed(1)}m<br>
        <span class="label">Sanity</span> > ${getSanityLevel(sanity)} (${Math.round(sanity)}%)<br>
        <span class="label">Red Mode</span> > ${redModeActive ? 'ACTIVE' : 'OFF'}
    `;
}

// ─── SANITY UI ──────────────────────────────────────────────
function updateSanityUI() {
    const level = getSanityLevel(sanity);
    const letterEl = document.getElementById('sanityLetter');
    const circleEl = document.getElementById('sanityCircle');
    if (!letterEl || !circleEl) return;
    letterEl.textContent = level;
    letterEl.className = '';
    if (sanity < 10) {
        letterEl.classList.add('level-below-f');
        circleEl.classList.add('danger');
    } else {
        letterEl.classList.add('level-' + level);
        circleEl.classList.remove('danger');
    }
}

// ─── MAZE SHIFTING ──────────────────────────────────────────
function updateMazeShifting(time, dt) {
    if (sanity > 30 || wallMeshes.length === 0) {
        for (const wall of wallMeshes) {
            if (wall.userData.shiftOffset) {
                wall.userData.shiftOffset.lerp(new THREE.Vector3(0, 0, 0), 0.02);
                const target = wall.userData.origPos.clone().add(wall.userData.shiftOffset);
                wall.position.lerp(target, 0.05);
            }
        }
        if (realismPass.uniforms) {
            realismPass.uniforms.mazeShift.value += (0 - realismPass.uniforms.mazeShift.value) * 0.02;
        }
        return;
    }

    const camPos = cameraGroup.position;
    const camDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const shiftAmount = (1 - sanity / 30) * 0.6;

    if (realismPass.uniforms) {
        realismPass.uniforms.mazeShift.value += (shiftAmount * 0.5 - realismPass.uniforms.mazeShift.value) * 0.02;
    }

    for (const wall of wallMeshes) {
        const wallPos = wall.userData.origPos;
        const toWall = new THREE.Vector3().copy(wallPos).sub(camPos);
        const dist = toWall.length();
        toWall.normalize();
        const dot = toWall.dot(camDir);

        const isLookingAt = dot > 0.3 && dist < 6;

        if (!isLookingAt && dist < 12) {
            const seed = wallShiftSeed + wall.id;
            const angle = seed * 0.1 + time * 0.0003;
            const shiftX = Math.sin(angle + wall.id * 0.7) * shiftAmount * 0.5;
            const shiftZ = Math.cos(angle * 0.7 + wall.id * 0.5) * shiftAmount * 0.5;
            const targetOffset = new THREE.Vector3(shiftX, 0, shiftZ);
            wall.userData.shiftOffset.lerp(targetOffset, 0.015 + shiftAmount * 0.02);
            const targetPos = wall.userData.origPos.clone().add(wall.userData.shiftOffset);
            wall.position.lerp(targetPos, 0.03 + shiftAmount * 0.04);
        } else {
            wall.userData.shiftOffset.lerp(new THREE.Vector3(0, 0, 0), 0.03);
            const target = wall.userData.origPos.clone().add(wall.userData.shiftOffset);
            wall.position.lerp(target, 0.04);
        }
    }
}

// ─── INPUT ────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === ' ') e.preventDefault();
    const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    keys[k] = true;
    if (e.key === 'Shift') isSprinting = true;
});
document.addEventListener('keyup', (e) => {
    keys[e.key.length === 1 ? e.key.toUpperCase() : e.key] = false;
    if (e.key === 'Shift') isSprinting = false;
});

let pPressed = false;

document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (key === 'P') pPressed = true;
    if (key === '1' && pPressed) {
        if (!isDead && !isTransitioning) {
            gameTime = 119;
            updateTimerUI();
            redModeActivated = false;
            redModeActive = false;
            e.preventDefault();
        }
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    if (key === 'P') pPressed = false;
});

// ─── CLICK HANDLER – pointer lock with .catch() ────────────
renderer.domElement.addEventListener('click', () => {
    if (redModeActive) return;
    if (isLocked) {
        flashlightOn = !flashlightOn;
        const hint = document.getElementById('flashlightHint');
        if (hint) {
            hint.textContent = flashlightOn ? 'click to toggle flashlight' : '🔦 flashlight off';
            hint.classList.add('visible');
            clearTimeout(window._hintTimeout);
            window._hintTimeout = setTimeout(() => hint.classList.remove('visible'), 1500);
        }
    } else if (!isTransitioning && !isDead) {
        renderer.domElement.requestPointerLock().catch(() => {});
    }
});

document.addEventListener('pointerlockchange', () => {
    isLocked = document.pointerLockElement === renderer.domElement;
    if (isLocked) {
        const hint = document.getElementById('flashlightHint');
        if (hint) {
            hint.classList.add('visible');
            clearTimeout(window._hintTimeout);
            window._hintTimeout = setTimeout(() => hint.classList.remove('visible'), 3000);
        }
    }
});

document.addEventListener('mousemove', (e) => {
    if (!isLocked || isTransitioning) return;
    const sens = 0.0018;
    const dx = e.movementX * sens, dy = e.movementY * sens;
    yaw -= dx;
    pitch -= dy;
    pitch = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, pitch));
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    smoothMoveX += e.movementX * 0.0008;
    smoothMoveY += e.movementY * 0.0008;
    smoothMoveX *= 0.92;
    smoothMoveY *= 0.92;
    headTilt = -dx * 2.5;
    smoothHeadTilt += (headTilt - smoothHeadTilt) * 0.08;
    const speed = Math.sqrt(e.movementX * e.movementX + e.movementY * e.movementY);
    mouseSpeed = speed * 0.02;
});

// ─── TOGGLE POINTER LOCK WITH 'M' KEY ──────────────────────
document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (document.pointerLockElement) {
            document.exitPointerLock();
        } else {
            renderer.domElement.requestPointerLock().catch(() => {});
        }
    }
});

document.getElementById('winContinue').addEventListener('click', () => location.reload());

document.getElementById('btnRespawn').addEventListener('click', () => respawn());
document.getElementById('btnMainMenu').addEventListener('click', () => mainMenu());
document.getElementById('btnRestartLevels').addEventListener('click', () => restartLevels());

// ─── TELEPORT TRANSITION ──────────────────────────────────
async function transitionToNextLevel() {
    isTransitioning = true;
    const white = document.getElementById('whiteFlash');
    if (!redModeActive) {
        if (white) white.style.opacity = '1';
        await sleep(250);
        if (white) white.style.opacity = '0';
    } else {
        await sleep(150);
    }
    currentLevel = 1;
    generateLevel(1);
    setTimeout(() => {
        showLevelTitle(1, 'The Woodland');
    }, 300);
    gameTime = START_TIME;
    updateTimerUI();
    if (realismPass.uniforms) {
        realismPass.uniforms.distortion.value = 0.3;
        setTimeout(() => { realismPass.uniforms.distortion.value = 0.15; }, 600);
    }
    isTransitioning = false;
}

function checkTeleporter() {
    if (isTransitioning || isDead) return;
    const px = cameraGroup.position.x, pz = cameraGroup.position.z;
    const dist = Math.sqrt((px - teleporterPos.x) ** 2 + (pz - teleporterPos.z) ** 2);
    if (dist < 1.0) {
        if (currentLevel === 0) transitionToNextLevel();
        else if (currentLevel === 1) {
            const win = document.getElementById('winOverlay');
            if (win) win.classList.add('active');
        }
    }
}

// ─── STAMINA UI ──────────────────────────────────────────────
const staminaContainer = document.getElementById('staminaContainer');
const staminaBar = document.getElementById('staminaBar');

function updateStaminaUI() {
    if (!staminaBar) return;
    const pct = Math.max(0, Math.min(100, (stamina / MAX_STAMINA) * 100));
    staminaBar.style.width = pct + '%';
    staminaBar.classList.toggle('low', pct < 25);
    if (sanity < 30) {
        staminaBar.classList.add('fight-or-flight');
    } else {
        staminaBar.classList.remove('fight-or-flight');
    }
    if (staminaContainer) {
        staminaContainer.style.opacity = (isSprinting && isMoving && onGround) ? '0.9' : '0';
    }
}

// ─── CHECK NEARBY LIGHTS ────────────────────────────────────
function checkNearbyLights() {
    const pos = cameraGroup.position;
    let nearest = Infinity;
    for (const src of lightSources) {
        if (!src.position) continue;
        const d = pos.distanceTo(src.position);
        if (d < nearest) nearest = d;
    }
    return nearest < LIGHT_DETECTION_RADIUS;
}

// ─── MOBILE CONTROLS ──────────────────────────────────────────
let joystickActive = false;
let joystickTouchId = null;
let joystickDir = { x: 0, y: 0 };
let joystickMagnitude = 0;
let lookTouchId = null;
let lastLookX = 0, lastLookY = 0;
let tapStartTime = 0;
let tapStartPos = { x: 0, y: 0 };
let isTapPossible = false;

const joystickContainer = document.getElementById('joystickContainer');
const joystickKnob = document.getElementById('joystickKnob');
const sanityContainer = document.getElementById('sanityContainer');

// ─── SAFE JOYSTICK & SANITY CONTAINER SETUP ──────────────
if (joystickContainer) {
    joystickContainer.style.display = isMobile ? 'block' : 'none';
}
if (sanityContainer) {
    if (isMobile) {
        sanityContainer.classList.add('mobile-sanity');
    } else {
        sanityContainer.classList.remove('mobile-sanity');
    }
}

function handleTouchStart(e) {
    if (isDead || isTransitioning) return;
    e.preventDefault();
    const touches = e.changedTouches;
    for (const touch of touches) {
        if (!joystickContainer) continue;
        const rect = joystickContainer.getBoundingClientRect();
        const touchX = touch.clientX;
        const touchY = touch.clientY;

        if (touchX >= rect.left && touchX <= rect.right &&
            touchY >= rect.top && touchY <= rect.bottom) {
            if (joystickTouchId === null) {
                joystickTouchId = touch.identifier;
                joystickActive = true;
                updateJoystick(touch);
            }
        } else {
            if (lookTouchId === null) {
                lookTouchId = touch.identifier;
                lastLookX = touch.clientX;
                lastLookY = touch.clientY;
                tapStartTime = performance.now();
                tapStartPos.x = touch.clientX;
                tapStartPos.y = touch.clientY;
                isTapPossible = true;
            }
        }
    }
}

function handleTouchMove(e) {
    if (isDead || isTransitioning) return;
    e.preventDefault();
    const touches = e.changedTouches;
    for (const touch of touches) {
        if (touch.identifier === joystickTouchId) {
            updateJoystick(touch);
        }
        if (touch.identifier === lookTouchId) {
            const dx = touch.clientX - lastLookX;
            const dy = touch.clientY - lastLookY;
            const sens = 0.004;
            yaw -= dx * sens;
            pitch -= dy * sens;
            pitch = Math.max(-Math.PI / 2 + 0.08, Math.min(Math.PI / 2 - 0.08, pitch));
            camera.rotation.y = yaw;
            camera.rotation.x = pitch;
            lastLookX = touch.clientX;
            lastLookY = touch.clientY;
            smoothMoveX += dx * 0.0008;
            smoothMoveY += dy * 0.0008;
            smoothMoveX *= 0.92;
            smoothMoveY *= 0.92;
            headTilt = -dx * 2.5;
            smoothHeadTilt += (headTilt - smoothHeadTilt) * 0.08;
            mouseSpeed = Math.sqrt(dx*dx + dy*dy) * 0.02;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                isTapPossible = false;
            }
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    const touches = e.changedTouches;
    for (const touch of touches) {
        if (touch.identifier === joystickTouchId) {
            joystickTouchId = null;
            joystickActive = false;
            joystickDir.x = 0;
            joystickDir.y = 0;
            joystickMagnitude = 0;
            if (joystickKnob) joystickKnob.style.transform = 'translate(-50%, -50%)';
        }
        if (touch.identifier === lookTouchId) {
            lookTouchId = null;
            if (isTapPossible) {
                const dt = performance.now() - tapStartTime;
                const dist = Math.hypot(touch.clientX - tapStartPos.x, touch.clientY - tapStartPos.y);
                if (dt < 200 && dist < 30) {
                    if (!redModeActive) {
                        flashlightOn = !flashlightOn;
                        const hint = document.getElementById('flashlightHint');
                        if (hint) {
                            hint.textContent = flashlightOn ? 'click to toggle flashlight' : '🔦 flashlight off';
                            hint.classList.add('visible');
                            clearTimeout(window._hintTimeout);
                            window._hintTimeout = setTimeout(() => hint.classList.remove('visible'), 1500);
                        }
                    }
                }
            }
            isTapPossible = false;
        }
    }
}

function updateJoystick(touch) {
    if (!joystickContainer) return;
    const rect = joystickContainer.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const radius = rect.width / 2 - 25;
    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.hypot(dx, dy);
    const maxDist = radius;
    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    const limitedDx = Math.cos(angle) * clampedDist;
    const limitedDy = Math.sin(angle) * clampedDist;
    if (joystickKnob) {
        joystickKnob.style.transform = `translate(${-25 + limitedDx}px, ${-25 + limitedDy}px)`;
    }
    const norm = clampedDist / maxDist;
    joystickDir.x = limitedDx / maxDist;
    joystickDir.y = -limitedDy / maxDist;
    joystickMagnitude = norm;
}

if (isMobile) {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    isLocked = true;
}

// ─── START GAME ──────────────────────────────────────────────
function startGame() {
    setTimeout(() => {
        generateLevel(0);
        animate(performance.now());
    }, 100);
}

// ─── ANIMATION LOOP ──────────────────────────────────────────
let stopped = false;
let prevTime = performance.now();
let isMoving = false;

function animate(time) {
    if (stopped) return;

    if (container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(animate);
        return;
    }

    const dt = Math.min((time - prevTime) / 1000, 0.05);
    prevTime = time;

    if (bodycamActive) {
        bodycamTime += dt * 1000;
        drawBodycam(bodycamTime);
    }

    if (!isDead && gameRunning) {
        gameTime -= dt;
        if (gameTime < 0) gameTime = 0;
        updateTimerUI();
        if (gameTime <= 0 && !isDead) triggerDeath('time');

        if (!redModeActivated && gameTime <= 120 && gameTime > 0 && !isDead && !isTransitioning) {
            activateRedMode();
        }
        if (redModeActive && gameTime > 120 && !isDead) {
            deactivateRedMode();
        }
    }

    frameCount++;
    if (time - lastFpsUpdate >= 1000) { currentFps = frameCount; frameCount = 0; lastFpsUpdate = time; }

    isMoving = keys['W'] || keys['S'] || keys['A'] || keys['D'] ||
        keys['ArrowUp'] || keys['ArrowDown'] || keys['ArrowLeft'] || keys['ArrowRight'] ||
        (joystickActive && joystickMagnitude > 0.1);

    nearLightSource = checkNearbyLights();

    if (!isDead) {
        if (sanityOn) {
            if (flashlightOn) {
                sanity = Math.max(0, sanity - SANITY_DRAIN_FLASHLIGHT * dt);
                flashlightOffTime = 0;
            } else {
                if (nearLightSource) {
                    sanity = Math.min(100, sanity + SANITY_REGEN_NEAR_LIGHT * dt);
                    flashlightOffTime = 0;
                } else {
                    flashlightOffTime += dt;
                    if (flashlightOffTime > 2.0) {
                        sanity = Math.max(0, sanity - SANITY_DRAIN_DARKNESS * dt);
                    } else {
                        sanity = Math.max(0, sanity - SANITY_DRAIN_DARKNESS * dt * 0.3);
                    }
                }
            }
        } else {
            sanity = 100;
        }

        if (sanity <= 0) {
            sanity = 0;
            if (!isDead && sanityOn) triggerDeath('sanity');
        }
    }

    const isBelowF = sanity < 10;
    if (isBelowF !== isSchizo) isSchizo = isBelowF;
    updateSanityUI();

    const fightOrFlightActive = sanity < 30 && !isDead;

    const schizoOverlay = document.getElementById('schizoOverlay');
    const sanityFactor = 1 - (sanity / 100);
    const schizoIntensity = Math.min(1, sanityFactor * 1.8);

    if (isSchizo && !isDead && sanityOn) {
        schizoTimer += dt;
        if (schizoOverlay) schizoOverlay.classList.add('active');
        if (sanity < 5 && schizoOverlay) schizoOverlay.classList.add('intense');
        else if (schizoOverlay) schizoOverlay.classList.remove('intense');

        if (realismPass.uniforms) {
            const glitch = 0.15 + 0.65 * schizoIntensity * (0.5 + 0.5 * Math.sin(time * 0.004 + schizoTimer));
            realismPass.uniforms.sanityGlitch.value = Math.min(0.9, glitch);
            realismPass.uniforms.sanityDarkness.value = 0.05 + 0.25 * schizoIntensity * (0.5 + 0.5 * Math.sin(time * 0.002));
            realismPass.uniforms.aberration.value = 0.025 + 0.05 * schizoIntensity * (0.5 + 0.5 * Math.sin(time * 0.006 + schizoTimer));
            realismPass.uniforms.redTint.value = 0.05 + 0.35 * schizoIntensity * (0.5 + 0.5 * Math.sin(time * 0.003 + schizoTimer * 0.7));
            realismPass.uniforms.distortion.value = 0.15 + 0.25 * schizoIntensity;
        }

        for (const fl of flickerLights) {
            const flicker = 0.05 + 0.95 * (0.5 + 0.5 * Math.sin(time * 0.025 + fl.phase + schizoTimer * 4));
            fl.light.intensity += (fl.baseIntensity * flicker * 0.5 - fl.light.intensity) * 0.12;
        }

        if (flashlightOn && Math.random() < 0.12) {
            flashlight.intensity *= (0.3 + Math.random() * 0.7);
        }

        if (realismPass.uniforms) {
            const blurX = smoothMoveX * 0.5 + mouseSpeed * 0.2;
            const blurY = smoothMoveY * 0.5 + mouseSpeed * 0.2;
            realismPass.uniforms.motionBlurX.value += (blurX - realismPass.uniforms.motionBlurX.value) * 0.08;
            realismPass.uniforms.motionBlurY.value += (blurY - realismPass.uniforms.motionBlurY.value) * 0.08;
        }

    } else {
        if (!redModeActive && schizoOverlay) {
            schizoOverlay.classList.remove('active', 'intense');
        }
        if (realismPass.uniforms) {
            realismPass.uniforms.sanityGlitch.value += (0 - realismPass.uniforms.sanityGlitch.value) * 0.03;
            realismPass.uniforms.sanityDarkness.value += (0 - realismPass.uniforms.sanityDarkness.value) * 0.03;
            realismPass.uniforms.aberration.value += (0.025 - realismPass.uniforms.aberration.value) * 0.03;
            realismPass.uniforms.redTint.value += (0 - realismPass.uniforms.redTint.value) * 0.03;
            realismPass.uniforms.distortion.value += (0.15 - realismPass.uniforms.distortion.value) * 0.03;
            realismPass.uniforms.motionBlurX.value += (0 - realismPass.uniforms.motionBlurX.value) * 0.05;
            realismPass.uniforms.motionBlurY.value += (0 - realismPass.uniforms.motionBlurY.value) * 0.05;
        }
        schizoTimer = 0;
        for (const fl of flickerLights) {
            const flicker = 0.6 + 0.4 * Math.sin(time * 0.001 * fl.speed + fl.phase);
            const target = fl.baseIntensity * (0.5 + 0.5 * flicker);
            fl.light.intensity += (target - fl.light.intensity) * 0.05;
        }
    }

    updateMazeShifting(time, dt);

    const canSprint = isSprinting && isMoving && onGround && stamina > 0 && !isDead;
    if (canSprint) {
        stamina = Math.max(0, stamina - STAMINA_DRAIN * dt * (fightOrFlightActive ? 0.8 : 1.0));
        if (stamina <= 0) isSprinting = false;
    } else if (isMoving && onGround && !isDead) {
        stamina = Math.min(MAX_STAMINA, stamina + STAMINA_REGEN_WALK * dt * (fightOrFlightActive ? 1.2 : 1.0));
    } else if (!isDead) {
        stamina = Math.min(MAX_STAMINA, stamina + STAMINA_REGEN * dt * (fightOrFlightActive ? 1.1 : 1.0));
    }
    updateStaminaUI();

    const staminaPct = stamina / MAX_STAMINA;
    if (realismPass.uniforms) {
        const targetStaminaVig = (staminaPct < 0.3) ? (1 - staminaPct / 0.3) * 0.5 : 0;
        const current = realismPass.uniforms.staminaVignette.value || 0;
        realismPass.uniforms.staminaVignette.value = current + (targetStaminaVig - current) * 0.03;
    }

    const sprintActive = canSprint && stamina > 0;
    let baseSpeed = fightOrFlightActive ? FIGHT_FLIGHT_MOVE_SPEED : BASE_MOVE_SPEED;
    let sprintSpeed = fightOrFlightActive ? FIGHT_FLIGHT_SPRINT_SPEED : SPRINT_MOVE_SPEED;
    const currentMoveSpeed = sprintActive ? sprintSpeed : baseSpeed;

    const targetFov = sprintActive ? 92 : (fightOrFlightActive ? 88 : 84);
    if (!isDead) {
        camera.fov += (targetFov - camera.fov) * 0.04;
        camera.updateProjectionMatrix();
    }

    if (realismPass.uniforms) {
        const targetFovScale = sprintActive ? 1.04 : (fightOrFlightActive ? 1.02 : 1.0);
        const cur = realismPass.uniforms.fovScale.value || 1.0;
        realismPass.uniforms.fovScale.value = cur + (targetFovScale - cur) * 0.04;
    }

    flickerTimer += dt;
    if (flickerTimer >= flickerInterval && !isFlickering) {
        isFlickering = true;
        flickerPhase = 0;
    }

    const speed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
    const moveX = smoothMoveX + velocity.x * 0.012;
    const moveY = smoothMoveY + velocity.z * 0.012;
    if (realismPass.uniforms) {
        realismPass.uniforms.movementX.value = Math.max(-1, Math.min(1, moveX));
        realismPass.uniforms.movementY.value = Math.max(-1, Math.min(1, moveY));
        realismPass.uniforms.time.value = time * 0.001;
        const dirtTarget = sprintActive ? 0.5 : 0.15;
        const curDirt = realismPass.uniforms.lensDirt.value || 0;
        realismPass.uniforms.lensDirt.value = curDirt + (dirtTarget - curDirt) * 0.02;
        realismPass.uniforms.bodycamScanline.value = redModeActive ? 0.6 + 0.4 * Math.sin(time * 0.0015) : 0;
    }

    const breathSpeedMult = sprintActive ? 1.9 : (fightOrFlightActive ? 1.4 : 1.0);
    if (!isDead) breathPhase += dt * BREATH_SPEED * breathSpeedMult;
    const breath = Math.sin(breathPhase * Math.PI * 2);
    const breathOffset = breath * BREATH_AMOUNT * breathSpeedMult;
    const breathTilt = breath * BREATH_TILT * breathSpeedMult;

    let bobY = 0, bobX = 0;
    if (isMoving && onGround && !isTransitioning && !isDead) {
        const bobSpeed = sprintActive ? 2.2 : (fightOrFlightActive ? 1.6 : 1.0);
        const bobAmp = sprintActive ? 0.075 : (fightOrFlightActive ? 0.06 : 0.04);
        bobTime += dt * 1.0 * 2 * Math.PI * bobSpeed;
        bobY = Math.sin(bobTime) * bobAmp;
        bobX = Math.sin(bobTime * 0.7) * bobAmp * 0.5;
    }

    if (!isTransitioning && !isDead) {
        camera.position.y = breathOffset + bobY;
        camera.position.x = bobX + smoothHeadTilt * 0.02;
        camera.rotation.z = breathTilt * 0.5 + smoothHeadTilt * 0.015;
        camera.rotation.x += breathTilt * 0.3;
    } else {
        camera.position.set(0, 0, 0);
        camera.rotation.z = 0;
    }

    smoothHeadTilt += (headTilt - smoothHeadTilt) * 0.06;
    updateFlashlight();

    if (!isTransitioning && gameRunning && isLocked) checkTeleporter();

    if (!isTransitioning && gameRunning && isLocked && !isDead) {
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        const strafe = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

        const wasOnGround = onGround;
        onGround = (cameraGroup.position.y <= playerHeight + 0.05 && velocity.y <= 0);

        if (onGround && !wasOnGround && velocity.y <= 0) {
            landShake = LAND_SHAKE_AMOUNT * (sprintActive ? 1.6 : (fightOrFlightActive ? 1.3 : 1.0));
        }
        if (landShake > 0.0001) {
            landShake *= 0.90;
            if (landShake < 0.0001) landShake = 0;
            cameraGroup.position.y -= landShake * dt * 22;
        }

        if (keys[' '] && onGround) {
            velocity.y = JUMP_SPEED * (sprintActive ? 1.12 : (fightOrFlightActive ? 1.08 : 1.0));
            onGround = false;
        }
        velocity.y += GRAVITY * dt;

        let moveX_ = 0, moveZ_ = 0;
        if (keys['W'] || keys['ArrowUp']) { moveX_ += forward.x; moveZ_ += forward.z; }
        if (keys['S'] || keys['ArrowDown']) { moveX_ -= forward.x; moveZ_ -= forward.z; }
        if (keys['A'] || keys['ArrowLeft']) { moveX_ -= strafe.x; moveZ_ -= strafe.z; }
        if (keys['D'] || keys['ArrowRight']) { moveX_ += strafe.x; moveZ_ += strafe.z; }

        if (joystickActive && joystickMagnitude > 0.1) {
            const jx = joystickDir.x;
            const jy = joystickDir.y;
            moveX_ += forward.x * jy + strafe.x * jx;
            moveZ_ += forward.z * jy + strafe.z * jx;
        }

        const inputLen = Math.sqrt(moveX_ * moveX_ + moveZ_ * moveZ_);
        let desiredDir = new THREE.Vector3(moveX_, 0, moveZ_);
        if (inputLen > 0) desiredDir.normalize();

        if (onGround) {
            if (inputLen > 0) {
                const accel = currentMoveSpeed * 5.5;
                velocity.x += desiredDir.x * accel * dt;
                velocity.z += desiredDir.z * accel * dt;
            }
            const friction = sprintActive ? 5.0 : (fightOrFlightActive ? 5.5 : 6.5);
            velocity.x *= (1 - dt * friction);
            velocity.z *= (1 - dt * friction);
            const horSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
            if (horSpeed > currentMoveSpeed) {
                velocity.x = (velocity.x / horSpeed) * currentMoveSpeed;
                velocity.z = (velocity.z / horSpeed) * currentMoveSpeed;
            }
        } else {
            if (inputLen > 0) {
                if (keys['A'] || keys['ArrowLeft'] || keys['D'] || keys['ArrowRight'] ||
                    (joystickActive && Math.abs(joystickDir.x) > 0.1)) {
                    const addSpeed = AIR_ACCEL * dt;
                    velocity.x += desiredDir.x * addSpeed;
                    velocity.z += desiredDir.z * addSpeed;
                    const newSpeed = Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z);
                    if (newSpeed > MAX_SPEED) {
                        velocity.x = (velocity.x / newSpeed) * MAX_SPEED;
                        velocity.z = (velocity.z / newSpeed) * MAX_SPEED;
                    }
                }
            }
            velocity.x *= (1 - dt * 0.7);
            velocity.z *= (1 - dt * 0.7);
        }

        const moveDelta = new THREE.Vector3(velocity.x * dt, velocity.y * dt, velocity.z * dt);
        const newX = cameraGroup.position.x + moveDelta.x;
        const newZ = cameraGroup.position.z + moveDelta.z;

        if (isWalkableDynamic(mazeData, currentSize, currentHalf, newX, cameraGroup.position.z)) {
            cameraGroup.position.x = newX;
        } else { velocity.x = 0; }
        if (isWalkableDynamic(mazeData, currentSize, currentHalf, cameraGroup.position.x, newZ)) {
            cameraGroup.position.z = newZ;
        } else { velocity.z = 0; }

        cameraGroup.position.y += moveDelta.y;
        if (cameraGroup.position.y < playerHeight) {
            cameraGroup.position.y = playerHeight;
            if (velocity.y < 0) velocity.y = 0;
            onGround = true;
        }
        if (cameraGroup.position.y > playerHeight + wallHeight) {
            cameraGroup.position.y = playerHeight + wallHeight;
            if (velocity.y > 0) velocity.y = 0;
        }
    }

    mouseSpeed *= 0.95;
    updateInfo();
    composer.render();
    requestAnimationFrame(animate);
}

startGame();

window.addEventListener('beforeunload', () => {
    stopped = true;
    renderer.dispose();
    if (document.pointerLockElement) document.exitPointerLock();
});
