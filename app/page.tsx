"use client";

import { useEffect, useRef, useState } from "react";

type Shot = { id: number; src: string };
const FILTERS = [
  { name: "Natural", value: "none", preview: "#dcc2a6" },
  { name: "B&W", value: "grayscale(1) contrast(1.08)", preview: "#9c9c9c" },
  { name: "Warm", value: "sepia(.22) saturate(1.18)", preview: "#d99b63" },
  { name: "Cool", value: "hue-rotate(185deg) saturate(.85)", preview: "#8cafbd" },
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
    setShots((current) => [...current.slice(-2), { id: Date.now(), src: canvas.toDataURL("image/jpeg", .92) }]);
  }

  function takePhoto() {
    if (!stream || countdown !== null) return;
    let value = 3; setCountdown(value);
    const timer = window.setInterval(() => { value -= 1; if (value === 0) { window.clearInterval(timer); setCountdown(null); captureFrame(); } else setCountdown(value); }, 800);
  }

  function downloadStrip() {
    if (!shots.length) return;
    const strip = document.createElement("canvas"), width = 900, pad = 38, photoH = 600;
    strip.width = width; strip.height = pad + shots.length * (photoH + pad) + 120;
    const ctx = strip.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#f7f1e7"; ctx.fillRect(0, 0, strip.width, strip.height);
    Promise.all(shots.map((shot) => new Promise<HTMLImageElement>((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = shot.src; }))).then((images) => {
      images.forEach((img, index) => ctx.drawImage(img, pad, pad + index * (photoH + pad), width - pad * 2, photoH));
      ctx.fillStyle = "#1f1d1a"; ctx.font = "600 28px Arial"; ctx.textAlign = "center";
      ctx.fillText("THE SNAP ROOM  •  GOOD MOMENTS ONLY", width / 2, strip.height - 58);
      const link = document.createElement("a"); link.download = "snap-room-photo-strip.jpg"; link.href = strip.toDataURL("image/jpeg", .94); link.click();
    });
  }

  return <main>
    <nav><a className="brand" href="#top">THE SNAP ROOM</a><div className="nav-links"><a href="#how">HOW IT WORKS</a><a href="#about">ABOUT</a><a href="#faq">FAQ</a></div><a className="nav-cta" href="#booth">OPEN THE BOOTH</a></nav>
    <section className="hero" id="top"><div className="eyebrow">YOUR CAMERA • YOUR MOMENT</div><h1>STEP IN.<br/><em>SNAP AWAY.</em></h1><p className="hero-copy">A tiny photo booth living right in your browser. No sign-up, no uploads—just you, a timer, and three good shots.</p><a className="primary" href="#booth">START THE CAMERA <span>→</span></a><div className="scribble">good moments only ↗</div></section>
    <section className="booth-section" id="booth">
      <div className="section-intro"><span>01 / THE BOOTH</span><h2>Ready when<br/>you are.</h2><p>Pick a look, strike a pose, and let the countdown do the rest.</p></div>
      <div className="booth-shell"><div className="camera-stage"><video ref={videoRef} autoPlay playsInline muted style={{filter:filter.value}}/>{!stream&&<div className="camera-empty"><div className="lens">◎</div><p>Your camera preview will appear here.</p><button onClick={startCamera} disabled={starting}>{starting?"OPENING…":"ALLOW CAMERA"}</button>{cameraError&&<small>{cameraError}</small>}</div>}{countdown!==null&&<div className="countdown">{countdown}</div>}<div className="live-tag">{stream?"● LIVE":"CAMERA OFF"}</div></div>
        <div className="controls"><div className="filters" aria-label="Photo filter">{FILTERS.map(item=><button key={item.name} className={filter.name===item.name?"active":""} onClick={()=>setFilter(item)} aria-label={`Use ${item.name} filter`}><i style={{background:item.preview}}/>{item.name}</button>)}</div><button className="shutter" onClick={takePhoto} disabled={!stream||countdown!==null} aria-label="Take photo"><span/></button><div className="shot-count">{shots.length} / 3 SHOTS</div></div>
      </div><canvas ref={canvasRef} hidden/>
    </section>
    <section className="strip-section" id="how"><div className="strip-copy"><span>02 / YOUR STRIP</span><h2>Three frames.<br/><em>One memory.</em></h2><p>Your photos never leave this device. Download the strip, keep it forever, or clear the booth and go again.</p><div className="privacy">✦ PRIVATE BY DESIGN<br/><small>Nothing is uploaded or stored.</small></div></div>
      <div className="photo-strip">{Array.from({length:3}).map((_,index)=>shots[index]?<img key={shots[index].id} src={shots[index].src} alt={`Your captured photo ${index+1}`}/>:<div className="placeholder" key={index}><b>{index+1}</b><span>YOUR PHOTO</span></div>)}<div className="strip-mark">THE SNAP ROOM<br/><small>{new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()}</small></div></div>
      <div className="strip-actions"><button onClick={downloadStrip} disabled={!shots.length}>DOWNLOAD STRIP ↓</button><button className="secondary" onClick={()=>setShots([])} disabled={!shots.length}>START OVER ↻</button></div>
    </section>
    <section className="steps" id="about"><span>03 / EASY AS...</span><div className="step-grid"><article><b>1</b><h3>ALLOW</h3><p>Give the booth camera access. It stays local to your browser.</p></article><article><b>2</b><h3>POSE</h3><p>Choose a filter and watch the short countdown.</p></article><article><b>3</b><h3>KEEP</h3><p>Download your finished photo strip in one click.</p></article></div></section>
    <footer id="faq"><div><div className="brand">THE SNAP ROOM</div><p>A pocket-sized booth for very good days.</p></div><div className="footer-note">NO ACCOUNT. NO CLOUD. NO FUSS.<br/><small>Made for spontaneous people.</small></div><a href="#top">BACK TO TOP ↑</a></footer>
  </main>;
}
