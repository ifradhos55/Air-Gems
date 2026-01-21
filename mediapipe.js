const COLORS = ["ruby","emerald","sapphire","amethyst","amber","ice","slate"];
const gemsEl = document.getElementById("gems");

const GEM_SVG = () => `
  <svg viewBox="0 0 120 120" aria-hidden="true">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="rgba(255,255,255,.55)"/>
        <stop offset=".35" stop-color="rgba(255,255,255,.10)"/>
        <stop offset="1" stop-color="rgba(0,0,0,.18)"/>
      </linearGradient>
    </defs>
    <path d="M60 10 L92 30 L110 62 L92 94 L60 110 L28 94 L10 62 L28 30 Z"
          fill="var(--c)" opacity="0.92"/>
    <path d="M60 10 L92 30 L60 62 L28 30 Z" fill="url(#g1)" opacity=".65"/>
    <path d="M28 30 L60 62 L10 62 Z" fill="rgba(255,255,255,.08)"/>
    <path d="M92 30 L110 62 L60 62 Z" fill="rgba(255,255,255,.10)"/>
    <path d="M10 62 L60 62 L28 94 Z" fill="rgba(0,0,0,.12)"/>
    <path d="M60 62 L110 62 L92 94 Z" fill="rgba(0,0,0,.10)"/>
    <path d="M28 94 L60 62 L92 94 L60 110 Z" fill="rgba(255,255,255,.07)"/>
  </svg>
`;

function makeGems(count=24){
    gemsEl.innerHTML = "";
    for (let i=0; i<count; i++){
        const gem = document.createElement("div");
        gem.className = "gem";
        gem.dataset.color = COLORS[i % COLORS.length];
        gem.innerHTML = `
      <div class="bgGlow"></div>
      ${GEM_SVG()}
      <div class="label">G${String(i+1).padStart(2,"0")}</div>
    `;
        gem.addEventListener("click", () => cycleGem(gem, true));
        gem.addEventListener("touchstart", (e) => { e.preventDefault(); cycleGem(gem, true); }, {passive:false});
        gemsEl.appendChild(gem);
    }
}

function cycleGem(gem, showToast=false){
    const cur = gem.dataset.color;
    const next = COLORS[(COLORS.indexOf(cur)+1) % COLORS.length];
    gem.dataset.color = next;
    pressFX(gem);
    if (showToast) toast(`${gem.querySelector(".label").textContent} → ${next}`);
}

function resetGems(){
    [...gemsEl.children].forEach((g,i)=> g.dataset.color = COLORS[i % COLORS.length]);
    toast("Reset colors");
}

function shuffleGems(){
    const nodes = [...gemsEl.children];
    for (let i=nodes.length-1; i>0; i--){
        const j = Math.floor(Math.random()*(i+1));
        [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
    }
    gemsEl.innerHTML = "";
    nodes.forEach(n => gemsEl.appendChild(n));
    toast("Shuffled");
}

function pressFX(gem){
    gem.classList.add("pressed");
    clearTimeout(gem._pt);
    gem._pt = setTimeout(()=>gem.classList.remove("pressed"), 110);
}

makeGems();

document.getElementById("shuffleBtn").addEventListener("click", shuffleGems);
document.getElementById("resetBtn").addEventListener("click", resetGems);

const toastEl = document.getElementById("toast");
let toastT = null;
function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(()=>toastEl.classList.remove("show"), 900);
}

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const pointer = document.getElementById("pointer");

const camLed = document.getElementById("camLed");
const camText = document.getElementById("camText");
const handLed = document.getElementById("handLed");
const handText = document.getElementById("handText");
const pinchText = document.getElementById("pinchText");
const fpsText = document.getElementById("fpsText");

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");

let camera = null;
let hands = null;

let px = 0, py = 0;
let vx = 0, vy = 0;
const FOLLOW = 0.22;
const DAMP   = 0.68;

let pinched = false;
const PINCH_ON  = 0.040;
const PINCH_OFF = 0.060;

let lastPressedEl = null;

let lastFrameTime = performance.now();
let fpsEMA = 0;

function setCam(on){
    camLed.classList.toggle("on", on);
    camText.textContent = on ? "CAM ON" : "CAM OFF";
    startBtn.disabled = on;
    stopBtn.disabled = !on;
}
function setHand(on){
    handLed.classList.toggle("on", on);
    handText.textContent = on ? "HAND OK" : "NO HAND";
}

function resizeCanvas(){
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener("resize", resizeCanvas);

function dist(a,b){
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function viewportXYFromLandmark(lm){
    const x = (1 - lm.x) * window.innerWidth;
    const y = lm.y * window.innerHeight;
    return {x,y};
}

function tapUnderPointer(x,y){
    const el = document.elementFromPoint(x, y);
    const gem = el?.classList?.contains("gem") ? el : el?.closest?.(".gem");
    if (!gem) return;
    pressFX(gem);
    cycleGem(gem, false);
    lastPressedEl = gem;
}

function updatePointerSmooth(targetX, targetY){
    const ax = (targetX - px) * FOLLOW;
    const ay = (targetY - py) * FOLLOW;

    vx = (vx + ax) * DAMP;
    vy = (vy + ay) * DAMP;

    px += vx;
    py += vy;

    pointer.style.transform = `translate(${px}px, ${py}px)`;
}

function chooseActiveHand(multiHandLandmarks){
    let best = 0;
    let bestX = -Infinity;
    for (let i=0; i<multiHandLandmarks.length; i++){
        const wrist = multiHandLandmarks[i][0];
        if (wrist.x > bestX){
            bestX = wrist.x;
            best = i;
        }
    }
    return best;
}

async function start(){
    if (hands) return;

    hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.85,
        minTrackingConfidence: 0.85
    });

    hands.onResults(onResults);

    camera = new Camera(video, {
        onFrame: async () => { await hands.send({image: video}); },
        width: 1280,
        height: 720
    });

    try{
        await camera.start();
        setCam(true);
        toast("Camera started — pinch to press gems");
    } catch (e){
        console.error(e);
        toast("Camera blocked/unavailable");
        setCam(false);
    }
}

function stop(){
    if (camera){ camera.stop(); camera = null; }
    if (hands){ hands.close(); hands = null; }

    setCam(false);
    setHand(false);

    ctx.clearRect(0,0,canvas.width,canvas.height);
    pinchText.textContent = "PINCH: —";
    fpsText.textContent = "FPS: —";

    pointer.classList.remove("pinch");
    pointer.style.transform = "translate(-9999px,-9999px)";

    pinched = false;
    lastPressedEl = null;
    vx = vy = 0;

    toast("Stopped");
}

startBtn.addEventListener("click", start);
stopBtn.addEventListener("click", stop);

function onResults(results){
    resizeCanvas();

    const now = performance.now();
    const dt = Math.max(1, now - lastFrameTime);
    lastFrameTime = now;
    const fps = 1000 / dt;
    fpsEMA = fpsEMA ? (fpsEMA*0.85 + fps*0.15) : fps;
    fpsText.textContent = `FPS: ${fpsEMA.toFixed(0)}`;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (results.image) ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    const handsLM = results.multiHandLandmarks || [];
    const hasHands = handsLM.length > 0;
    setHand(hasHands);

    if (!hasHands){
        pinchText.textContent = "PINCH: —";
        pinched = false;
        pointer.classList.remove("pinch");
        return;
    }

    const idx = chooseActiveHand(handsLM);
    const lm = handsLM[idx];

    const indexTip = lm[8];
    const thumbTip = lm[4];

    const {x: tx, y: ty} = viewportXYFromLandmark(indexTip);
    updatePointerSmooth(tx, ty);

    const p = dist(indexTip, thumbTip);
    pinchText.textContent = `PINCH: ${p.toFixed(3)}`;

    if (!pinched && p < PINCH_ON){
        pinched = true;
        pointer.classList.add("pinch");
        tapUnderPointer(px, py);
    } else if (pinched && p > PINCH_OFF){
        pinched = false;
        pointer.classList.remove("pinch");
        lastPressedEl = null;
    }

    drawLandmarks(ctx, [indexTip, thumbTip], {radius: 6});
}

toast("Click Start Camera");
