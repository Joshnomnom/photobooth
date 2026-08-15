"use client";

import { useEffect, useRef, useState } from "react";

type Shot = { id: number; src: string };
const FILTERS = [
  { name: "Original", value: "none", preview: "#ffd8b4" },
  { name: "Candy", value: "saturate(1.35) brightness(1.05)", preview: "#ff8fb1" },
  { name: "Dreamy", value: "sepia(.12) saturate(.85) brightness(1.12)", preview: "#d6c4ff" },
  { name: "Sunny", value: "sepia(.24) saturate(1.25)", preview: "#ffd45c" },
  { name: "Blueberry", value: "hue-rotate(178deg) saturate(.82)", preview: "#8ed4ff" },
  { name: "Sketch", value: "grayscale(1) contrast(1.25) brightness(1.12)", preview: "#9b9b9b" },
  { name: "Rose", value: "sepia(.16) hue-rotate(300deg) saturate(1.2)", preview: "#ef9caf" },
  { name: "Mint", value: "sepia(.12) hue-rotate(95deg) saturate(.9)", preview: "#9edbc0" },
  { name: "Retro", value: "sepia(.38) contrast(.9) saturate(.8)", preview: "#b99167" },
  { name: "Pop", value: "contrast(1.18) saturate(1.65)", preview: "#ff6b5f" },
  { name: "Fade", value: "contrast(.82) brightness(1.12) saturate(.72)", preview: "#d8cfc5" },
  { name: "Night", value: "brightness(.82) contrast(1.18) hue-rotate(205deg)", preview: "#526895" },
];
const THEMES = [
  { name: "Strawberry", id: "berry", color: "#ff8eaa", emoji: "🍓" },
  { name: "Sky", id: "sky", color: "#84d7f4", emoji: "☁️" },
  { name: "Lemon", id: "lemon", color: "#ffd95c", emoji: "☀️" },
  { name: "Grape", id: "grape", color: "#b8a1ee", emoji: "🍇" },
];
const BORDERS = [
  { name: "Wiggle", id: "wiggle" },
  { name: "Dots", id: "dots" },
  { name: "Rainbow", id: "rainbow" },
  { name: "Notebook", id: "notebook" },
  { name: "Hearts", id: "hearts" },
  { name: "Stars", id: "stars" },
  { name: "Checker", id: "checker" },
  { name: "Sticker", id: "sticker" },
];
const LAYOUTS = [
  { name: "Classic", id: "1x3", cols: 1, rows: 3 },
  { name: "Tall Six", id: "1x6", cols: 1, rows: 6 },
  { name: "Postcard", id: "2x2", cols: 2, rows: 2 },
  { name: "Six Pack", id: "2x3", cols: 2, rows: 3 },
  { name: "Nine", id: "3x3", cols: 3, rows: 3 },
  { name: "Party 16", id: "4x4", cols: 4, rows: 4 },
];

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [shots, setShots] = useState<Shot[]>([]);
  const [filter, setFilter] = useState(FILTERS[0]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [starting, setStarting] = useState(false);
  const [theme, setTheme] = useState(THEMES[0]);
  const [border, setBorder] = useState(BORDERS[0]);
  const [layout, setLayout] = useState(LAYOUTS[0]);
  const shotLimit = layout.cols * layout.rows;

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  async function startCamera() {
    setStarting(true); setCameraError("");
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = next;
      setStream(next);
    } catch { setCameraError("Camera access was blocked. Allow camera permission, then try again."); }
    finally { setStarting(false); }
  }

  function captureFrame() {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.filter = filter.value;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height); ctx.restore();
    setShots((current) => current.length >= shotLimit ? current : [...current, { id: Date.now(), src: canvas.toDataURL("image/jpeg", .92) }]);
  }

  function takePhoto() {
    if (!stream || countdown !== null || shots.length >= shotLimit) return;
    let value = 3; setCountdown(value);
    const timer = window.setInterval(() => { value -= 1; if (value === 0) { window.clearInterval(timer); setCountdown(null); captureFrame(); } else setCountdown(value); }, 800);
  }

  function downloadStrip() {
    if (!shots.length) return;
    const strip = document.createElement("canvas"), width = 1200, pad = 42, gap = 26;
    const cellW = (width - pad * 2 - gap * (layout.cols - 1)) / layout.cols;
    const cellH = cellW * .75;
    strip.width = width; strip.height = pad + layout.rows * cellH + (layout.rows - 1) * gap + 150;
    const ctx = strip.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = theme.id === "sky" ? "#eaf9ff" : theme.id === "lemon" ? "#fff9d9" : theme.id === "grape" ? "#f1ebff" : "#fff0f3"; ctx.fillRect(0, 0, strip.width, strip.height);
    Promise.all(shots.map((shot) => new Promise<HTMLImageElement>((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = shot.src; }))).then((images) => {
      images.forEach((img, index) => {
        const col = index % layout.cols, row = Math.floor(index / layout.cols);
        const x = pad + col * (cellW + gap), y = pad + row * (cellH + gap);
        ctx.drawImage(img, x, y, cellW, cellH);
        ctx.lineWidth = border.id === "rainbow" ? 16 : 9;
        ctx.strokeStyle = border.id === "rainbow" ? theme.color : "#51423b";
        if (["dots","hearts","stars"].includes(border.id)) ctx.setLineDash([5, 16]); else if (["notebook","checker"].includes(border.id)) ctx.setLineDash([20, 9]); else ctx.setLineDash([]);
        ctx.strokeRect(x, y, cellW, cellH);
      });
      ctx.fillStyle = "#1f1d1a"; ctx.font = "600 28px Arial"; ctx.textAlign = "center";
      ctx.fillText(`THE SNAP ROOM  •  ${layout.id.toUpperCase()}  •  GOOD MOMENTS ONLY`, width / 2, strip.height - 62);
      const link = document.createElement("a"); link.download = "snap-room-photo-strip.jpg"; link.href = strip.toDataURL("image/jpeg", .94); link.click();
    });
  }

  return <main className={`theme-${theme.id}`}>
    <nav><a className="brand" href="#top">✿ THE SNAP ROOM</a><div className="nav-links"><a href="#how">HOW IT WORKS</a><a href="#about">ABOUT</a><a href="#faq">FAQ</a></div><a className="nav-cta" href="#booth">OPEN THE BOOTH ♡</a></nav>
    <section className="hero" id="top"><div className="doodle doodle-star">☆</div><div className="doodle doodle-flower">✿</div><div className="eyebrow">YOUR CAMERA • YOUR LITTLE MOMENT</div><h1>SMILE,<br/><em>cutie!</em></h1><p className="hero-copy">A tiny, cozy photo booth drawn just for you. Pick your colors, decorate your frames, and make three happy memories.</p><a className="primary" href="#booth">LET&apos;S TAKE PICS <span>→</span></a><div className="scribble">made with crayons + love ♡</div></section>
    <section className="booth-section" id="booth">
      <div className="section-intro"><span>01 / DRESS IT UP</span><h2>Make it<br/><em>yours.</em></h2><p>Choose a color mood, a camera filter, and a hand-drawn frame before you pose.</p></div>
      <div className="booth-shell"><div className={`camera-stage border-${border.id}`}><video ref={videoRef} autoPlay playsInline muted style={{filter:filter.value}}/>{!stream&&<div className="camera-empty"><div className="lens">☻</div><p>Your cute face goes here!</p><button onClick={startCamera} disabled={starting}>{starting?"OPENING…":"TURN ON CAMERA ♡"}</button>{cameraError&&<small>{cameraError}</small>}</div>}{countdown!==null&&<div className="countdown">{countdown}</div>}<div className="live-tag">{stream?"● SMILE!":"CAMERA NAPPING"}</div></div>
        <div className="customizer"><div className="option-group"><strong>PHOTO GRID</strong><div className="layout-picker">{LAYOUTS.map(item=><button key={item.id} className={layout.id===item.id?"active":""} onClick={()=>{setLayout(item);setShots([])}} aria-label={`Use ${item.id} photo grid`}><i className={`grid-icon grid-${item.id}`} style={{gridTemplateColumns:`repeat(${item.cols},1fr)`}}>{Array.from({length:item.cols*item.rows}).map((_,i)=><span key={i}/>)}</i><b>{item.id}</b><small>{item.name}</small></button>)}</div></div><div className="option-group"><strong>COLOR THEME</strong><div className="theme-picker">{THEMES.map(item=><button key={item.id} className={theme.id===item.id?"active":""} style={{"--swatch":item.color} as React.CSSProperties} onClick={()=>setTheme(item)} aria-label={`Use ${item.name} theme`}><span>{item.emoji}</span>{item.name}</button>)}</div></div><div className="option-group"><strong>PHOTO FILTER</strong><div className="filters" aria-label="Photo filter">{FILTERS.map(item=><button key={item.name} className={filter.name===item.name?"active":""} onClick={()=>setFilter(item)} aria-label={`Use ${item.name} filter`}><i style={{background:item.preview}}/>{item.name}</button>)}</div></div><div className="option-group"><strong>FRAME BORDER</strong><div className="border-picker">{BORDERS.map(item=><button key={item.id} className={border.id===item.id?`active mini-${item.id}`:`mini-${item.id}`} onClick={()=>setBorder(item)}>{item.name}</button>)}</div></div></div>
        <div className="controls"><div className="tiny-note">3... 2... 1...<br/>then magic!</div><button className="shutter" onClick={takePhoto} disabled={!stream||countdown!==null||shots.length>=shotLimit} aria-label="Take photo"><span>{shots.length>=shotLimit?"✓":"♡"}</span></button><div className="shot-count">{shots.length} / {shotLimit}<br/>HAPPY SHOTS</div></div>
      </div><canvas ref={canvasRef} hidden/>
    </section>
    <section className="strip-section" id="how"><div className="strip-copy"><span>02 / YOUR GRID</span><h2>{layout.id} frames.<br/><em>One memory.</em></h2><p>Your photos never leave this device. Fill your {layout.name.toLowerCase()} grid, download it, or clear the booth and go again.</p><div className="privacy">✦ PRIVATE BY DESIGN<br/><small>Nothing is uploaded or stored.</small></div></div>
      <div className={`photo-strip border-${border.id} layout-${layout.id}`} style={{"--grid-cols":layout.cols} as React.CSSProperties}><div className="photo-grid">{Array.from({length:shotLimit}).map((_,index)=>shots[index]?<img key={shots[index].id} src={shots[index].src} alt={`Capture ${index+1}`}/>:<div className="placeholder" key={index}><b>{["♡","☆","☻","✿"][index%4]}</b><span>{index+1}</span></div>)}</div><div className="strip-mark">✿ THE SNAP ROOM ✿<br/><small>{layout.id.toUpperCase()} • {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()}</small></div></div>
      <div className="strip-actions"><button onClick={downloadStrip} disabled={!shots.length}>DOWNLOAD STRIP ↓</button><button className="secondary" onClick={()=>setShots([])} disabled={!shots.length}>START OVER ↻</button></div>
    </section>
    <section className="steps" id="about"><span>03 / EASY AS...</span><div className="step-grid"><article><b>1</b><h3>ALLOW</h3><p>Give the booth camera access. It stays local to your browser.</p></article><article><b>2</b><h3>POSE</h3><p>Choose a filter and watch the short countdown.</p></article><article><b>3</b><h3>KEEP</h3><p>Download your finished photo strip in one click.</p></article></div></section>
    <footer id="faq"><div><div className="brand">THE SNAP ROOM</div><p>A pocket-sized booth for very good days.</p></div><div className="footer-note">NO ACCOUNT. NO CLOUD. NO FUSS.<br/><small>Made for spontaneous people.</small></div><a href="#top">BACK TO TOP ↑</a></footer>
  </main>;
}
