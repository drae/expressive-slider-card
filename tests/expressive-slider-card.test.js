const { JSDOM } = require("jsdom");
const fs = require("fs");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.HTMLElement.prototype.setPointerCapture = () => {};
w.eval(`customElements.define("ha-card", class extends HTMLElement {});
customElements.define("ha-state-icon", class extends HTMLElement { set icon(v){this._i=v} get icon(){return this._i} });`);
w.eval(fs.readFileSync(process.argv[2] ?? `${__dirname}/../expressive-slider-card.js`, "utf8"));
const calls = [];
const states = {
  "light.a": { state: "on", attributes: { brightness: 128, rgb_color: [255, 200, 150] } },
  "light.b": { state: "off", attributes: {} },
  "light.c": { state: "off", attributes: { supported_color_modes: ["onoff"] } },
  "sensor.p": { state: "3.4", attributes: { unit_of_measurement: "W" } },
};
const hass = () => ({ states: { ...states }, callService: (d, s, data) => calls.push([d, s, data]) });
const mk = (cfg) => { const el = w.document.createElement("expressive-slider-card"); el.setConfig(cfg); el.hass = hass(); w.document.body.append(el); return el; };
const q = (el, sel) => el.shadowRoot.querySelector(sel);
const ok = (c, m) => { if (!c) { console.log("FAIL", m); process.exitCode = 1; } else console.log("ok  ", m); };

const a = mk({ entity: "light.a", name: "A", info: [{ entity: "sensor.p" }] });
const r = a.shadowRoot, t = r.querySelector(".track");
ok(r.querySelector(".val").textContent === "50%", "value text 50%: " + r.querySelector(".val").textContent);
ok(t.classList.contains("lit"), "lit when on");
ok(!r.querySelector(".pip").hidden, "pip shown by default");
ok(r.querySelector(".pip").style.getPropertyValue("--es-pip-bg").includes("25%"), "pip tinted 25%");
ok(r.querySelector(".stop").classList.contains("hide"), "stop hidden with track-right chip");
ok(r.querySelector('[data-slot="track-right"]').textContent.includes("3.4"), "power chip rendered");
ok(t.style.getPropertyValue("--es-glow-a") === "75%" && t.style.getPropertyValue("--es-glow-gap") === "0px" && t.style.getPropertyValue("--es-glow-blur") === "32px", "glow defaults: gap 0, softness 32, strength 75");
ok(t.style.getPropertyValue("--es-glow-edge") === "55%" && t.style.getPropertyValue("--es-glow-edge-w") === "12px", "edge defaults: 55%, 12px");
{ // glow look under styles: glow:; styles glow: false turns it off
  const sg = mk({ entity: "light.a", styles: { glow: { gap: 2, strength: 30 }, name: { size: 14 } } }).shadowRoot.querySelector(".track");
  ok(sg.style.getPropertyValue("--es-glow-gap") === "2px" && sg.style.getPropertyValue("--es-glow-a") === "30%" && sg.style.getPropertyValue("--es-glow-blur") === "32px", "styles.glow sets gap/strength, keeps default softness");
  const eg = mk({ entity: "light.a", styles: { glow: { edge: 0, edge_width: 6 } } }).shadowRoot.querySelector(".track");
  ok(eg.style.getPropertyValue("--es-glow-edge") === "0%" && eg.style.getPropertyValue("--es-glow-edge-w") === "6px", "styles.glow sets edge and edge_width");
  const lg = mk({ entity: "light.a", styles: { glow: [{ gap: 4 }, { drag: 20 }] } }).shadowRoot.querySelector(".track");
  ok(lg.style.getPropertyValue("--es-glow-gap") === "4px" && lg.style.getPropertyValue("--es-glow-drag") === "20%", "styles.glow as a list of single properties");
  const nf = mk({ entity: "light.a", styles: { glow: false } }).shadowRoot.querySelector(".track");
  ok(nf.style.getPropertyValue("--es-glow-a") === "", "styles.glow false turns the glow off");
  const css = mk({ entity: "light.a", styles: { glow: { gap: 2 } } }).shadowRoot.querySelector("#user").textContent;
  ok(!/glow|gap/.test(css), "styles.glow writes no CSS rule");
}
{ // settings read from styles
  const user = (el) => el.shadowRoot.querySelector("#user").textContent;
  const tp = mk({ entity: "light.a", styles: { card: { background: "transparent", padding: 2 } } });
  ok(q(tp, "ha-card").classList.contains("transparent") && !/background/.test(user(tp)) && /ha-card \{ padding: 2px; \}/.test(user(tp)), "card background transparent = transparent mode, other card CSS kept");
  const bgc = mk({ entity: "light.a", styles: { card: { background: "red" } } });
  ok(!q(bgc, "ha-card").classList.contains("transparent") && /ha-card \{ background: red; \}/.test(user(bgc)), "other card background is plain CSS");
  ok(!q(mk({ entity: "light.a", transparent: true }), "ha-card").classList.contains("transparent"), "top-level transparent is ignored");
  const col = mk({ entity: "light.a", styles: { track: { color: "#102030", height: 40, radius: 20 } } });
  ok(q(col, ".track").style.getPropertyValue("--es-active") === "rgb(16,32,48)", "track color sets the slider colour");
  ok(/:host \{ --es-height: 40px; --es-radius: 20px; \}/.test(user(col)) && !/color/.test(user(col)), "track height/radius as variables, color not CSS: " + user(col));
  ok(q(mk({ entity: "light.a", color: "#102030" }), ".track").style.getPropertyValue("--es-active") === "rgb(255,200,150)", "top-level color is ignored");
  const tint = mk({ entity: "light.a", styles: { pip: { background: 40, size: 30 }, icon: { size: 18 } } });
  ok(q(tint, ".pip").style.getPropertyValue("--es-pip-bg").includes(" 40%"), "pip background number = tint %");
  ok(/--es-pip-size: 30px; --es-icon-size: 18px;/.test(user(tint)) && !/\.pip \{/.test(user(tint)), "pip/icon size as variables: " + user(tint));
  const fixed = mk({ entity: "light.a", styles: { pip: { background: "#222" } } });
  ok(q(fixed, ".pip").style.getPropertyValue("--es-pip-bg") === "#222", "pip background colour = fixed");
  const chips = mk({ entity: "light.a", info: [{ entity: "sensor.p" }], styles: { info: { color: "white" }, track_info: { background: "#0008" } } });
  ok(/--es-chip-color: white; --es-chip-bg: #0008;/.test(user(chips)), "info color / track_info background as chip defaults: " + user(chips));
}

// drag: fake rect 0..200
t.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 56 });
const ev = (type, x) => { const e = new w.Event(type, { bubbles: true }); e.clientX = x; e.button = 0; e.pointerId = 1; t.dispatchEvent(e); };
ev("pointerdown", 100); ev("pointermove", 150); ev("pointermove", 160);
ok(t.classList.contains("dragging"), "dragging class");
w.requestAnimationFrame(() => {
  ok(r.querySelector(".val").textContent === "80%", "drag renders 80%: " + r.querySelector(".val").textContent);
  ok(r.querySelector(".bubble").classList.contains("show"), "bubble shows while dragging");
  ev("pointerup", 160);
  ok(!t.classList.contains("dragging"), "drag ended");
  ok(JSON.stringify(calls.at(-1)) === JSON.stringify(["light", "turn_on", { entity_id: "light.a", brightness_pct: 80 }]), "service call " + JSON.stringify(calls.at(-1)));

  // sensor-only update re-renders chips, not the whole card
  states["sensor.p"] = { state: "5.0", attributes: { unit_of_measurement: "W" } };
  a.hass = hass();
  ok(r.querySelector('[data-slot="track-right"]').textContent.includes("5.0"), "chip updated on sensor change");

  // off light, outside pip
  const b = mk({ entity: "light.b", icon_position: "outside" });
  const rb = b.shadowRoot;
  ok(rb.querySelector(".val").textContent === "Off", "off text");
  ok(!rb.querySelector(".track").classList.contains("lit"), "not lit when off");
  ok(rb.querySelector("ha-card").classList.contains("outside"), "outside class");
  ok(rb.querySelector(".pip").style.getPropertyValue("--es-pip-bg").includes("--es-tile"), "off pip outside uses tile");
  ok(rb.querySelector(".track").style.getPropertyValue("--es-inactive").includes("--es-tile"), "off track is tile");
  ok(!rb.querySelector(".stop").classList.contains("hide"), "stop visible when off without chip");

  // icon false, glow false, config re-apply
  b.setConfig({ entity: "light.b", icon: false, glow: false });
  ok(rb.querySelector(".pip").hidden, "icon:false hides pip");
  ok(!rb.querySelector("ha-card").classList.contains("outside"), "outside class cleared");
  ok(rb.querySelector(".track").style.getPropertyValue("--es-glow-a") === "" && rb.querySelector(".track").style.getPropertyValue("--es-glow-edge") === "", "glow vars cleared");

  // tap on pip runs toggle, not a value change
  const n = calls.length;
  r.querySelector(".pip").dispatchEvent(new w.Event("click"));
  ok(JSON.stringify(calls.at(-1)) === JSON.stringify(["light", "toggle", { entity_id: "light.a" }]) && calls.length === n + 1, "pip tap toggles");

  // keyboard
  t.dispatchEvent(Object.assign(new w.Event("keydown"), { key: "ArrowRight", preventDefault() {} }));
  ok(r.querySelector(".val").textContent === "51%", "arrow key steps from the entity value (51%): " + r.querySelector(".val").textContent);

  // on/off-only light snaps to 0 or 100% and turns on without a brightness
  const c = mk({ entity: "light.c" }), tc = c.shadowRoot.querySelector(".track");
  tc.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 56 });
  const evc = (type, x) => { const e = new w.Event(type, { bubbles: true }); e.clientX = x; e.button = 0; e.pointerId = 1; tc.dispatchEvent(e); };
  evc("pointerdown", 10); evc("pointermove", 60); evc("pointerup", 60);
  ok(JSON.stringify(calls.at(-1)) === JSON.stringify(["light", "turn_off", { entity_id: "light.c" }]), "on/off light: drag to 30% turns off " + JSON.stringify(calls.at(-1)));
  evc("pointerdown", 10); evc("pointermove", 140); evc("pointerup", 140);
  ok(JSON.stringify(calls.at(-1)) === JSON.stringify(["light", "turn_on", { entity_id: "light.c" }]), "on/off light: drag to 70% turns on, no brightness " + JSON.stringify(calls.at(-1)));
  tc.dispatchEvent(Object.assign(new w.Event("keydown"), { key: "ArrowRight", preventDefault() {} }));
  ok(tc.getAttribute("aria-valuenow") === "100", "on/off light: arrow key steps to 100: " + tc.getAttribute("aria-valuenow"));

  // unsupported domain / disconnect cleanup
  try { mk({ entity: "switch.x" }); ok(false, "should throw"); } catch (e) { ok(/Unsupported/.test(e.message), "rejects switch domain"); }
  a.remove();
  ok(true, "disconnect without error");
});
