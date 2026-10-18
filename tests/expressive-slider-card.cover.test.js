// Cover mode tests for expressive-slider-card. Run: npm test
const { JSDOM } = require("jsdom");
const fs = require("fs");
const dom = new JSDOM(`<!doctype html><body></body>`, { runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.HTMLElement.prototype.setPointerCapture = () => {};
w.HTMLElement.prototype.focus = function () {};
w.eval(`customElements.define("ha-card", class extends HTMLElement {});
customElements.define("ha-state-icon", class extends HTMLElement { set icon(v){this._i=v} get icon(){return this._i} });`);
w.eval(fs.readFileSync(process.argv[2] ?? `${__dirname}/../expressive-slider-card.js`, "utf8"));

const calls = [];
const cov = (pos, state) => ({ state: state ?? (pos > 0 ? "open" : "closed"), attributes: { current_position: pos, supported_features: 15 } });
const states = {
  "cover.s1": cov(36),
  "cover.s2": cov(100),
  "cover.s3": cov(0),
  "cover.g": { state: "open", attributes: { current_position: 68, entity_id: ["cover.s1", "cover.s2"] } },
  "sensor.b1": { state: "14", attributes: { unit_of_measurement: "%" } },
  "sensor.b2": { state: "99", attributes: { unit_of_measurement: "%" } },
  "light.a": { state: "on", attributes: { brightness: 128 } },
};
const hass = () => ({ states: { ...states }, callService: (d, s, data) => calls.push([d, s, data]) });
const mk = (cfg) => { const el = w.document.createElement("expressive-slider-card"); el.setConfig(cfg); el.hass = hass(); w.document.body.append(el); return el; };
const ok = (c, m) => { if (!c) { console.log("FAIL", m); process.exitCode = 1; } else console.log("ok  ", m); };
const last = () => JSON.stringify(calls.at(-1));
const q = (el, s) => el.shadowRoot.querySelector(s);
const qa = (el, s) => [...el.shadowRoot.querySelectorAll(s)];
const rect = (el) => { q(el, ".track").getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 56 }); };
const ptr = (el, type, x) => { const e = new w.Event(type, { bubbles: true }); e.clientX = x; e.button = 0; e.pointerId = 1; q(el, ".track").dispatchEvent(e); };
const click = (node) => node.dispatchEvent(new w.Event("click", { bubbles: true }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => w.requestAnimationFrame(() => r()));
const drag = async (el, from, to) => { ptr(el, "pointerdown", from); ptr(el, "pointermove", (from + to) / 2); ptr(el, "pointermove", to); await frame(); ptr(el, "pointerup", to); };

(async () => {
  // defaults
  const a = mk({ entity: "cover.s1", name: "Shade 1" });
  ok(q(a, "ha-card").classList.contains("cover"), "cover class set");
  ok(q(a, ".val").textContent === "36%", "value 36%: " + q(a, ".val").textContent);
  ok(q(a, ".track").style.getPropertyValue("--es-active") === "rgb(143,195,230)", "sky fill by default");
  ok(q(a, ".pip").style.getPropertyValue("--es-pip-bg").includes("25%"), "pip tinted while partly open");
  ok(q(a, "ha-state-icon").hidden && !q(a, ".pip .shade").hidden, "drawn shade replaces the state icon");
  ok(q(a, ".pip .shade svg rect:nth-child(2)")?.getAttribute("height") === "8", "36% open: fabric 8 of 12 down: " + q(a, ".pip .shade svg rect:nth-child(2)")?.getAttribute("height"));
  const ic = mk({ entity: "cover.s1", icon: "mdi:blinds" });
  ok(!q(ic, "ha-state-icon").hidden && q(ic, ".pip .shade").hidden && q(ic, "ha-state-icon").icon === "mdi:blinds", "configured icon kept");
  ok(qa(a, ".tick").length === 3, "three ticks at 25/50/75");
  ok(q(a, ".val").classList.contains("menuable") && q(a, ".val").getAttribute("role") === "button", "value is the menu button");
  ok(q(a, ".chips").hidden, "no chip row with menu style");
  ok(q(a, ".cv").innerHTML === "", "no header extras at rest");

  // drag with detent: 48% snaps to 50, sends once on release, target shown while moving
  rect(a);
  const n0 = calls.length;
  await drag(a, 20, 96);
  ok(calls.length === n0 + 1, "one command on release");
  ok(last() === JSON.stringify(["cover", "set_cover_position", { entity_id: "cover.s1", position: 50 }]), "48% snaps to 50: " + last());
  ok(q(a, ".val").textContent === "Opening", "value reads Opening: " + q(a, ".val").textContent);
  ok(q(a, ".moving")?.textContent === "36 → 50", "from → to readout: " + q(a, ".moving")?.textContent);
  ok(!!q(a, ".stopbtn"), "stop button shown while moving");
  ok(!q(a, ".ghost").hidden && q(a, ".ghost").style.getPropertyValue("--es-g") === "0.36", "mark at the shade's position");
  ok(q(a, ".track").style.getPropertyValue("--es-p") === "0.5", "handle at the target");

  // cover reports progress, then arrives
  states["cover.s1"] = cov(44, "opening"); a.hass = hass();
  ok(q(a, ".moving")?.textContent === "44 → 50", "readout follows progress");
  states["cover.s1"] = cov(50); a.hass = hass();
  ok(q(a, ".val").textContent === "50%" && !q(a, ".stopbtn") && q(a, ".ghost").hidden, "target cleared on arrival");

  // stop button
  await drag(a, 100, 180);
  ok(last().includes('"position":90'), "drag to 90: " + last());
  click(q(a, ".stopbtn"));
  ok(last() === JSON.stringify(["cover", "stop_cover", { entity_id: "cover.s1" }]), "stop sends stop_cover");
  ok(!q(a, ".stopbtn") && q(a, ".val").textContent === "50%", "stop clears the target");

  // menu
  click(q(a, ".val"));
  ok(!q(a, ".menu").hidden && qa(a, ".menu [data-p]").length === 5, "menu opens with five presets");
  ok(q(a, '.menu [data-p="50"]').classList.contains("cur"), "current preset marked");
  click(q(a, '.menu [data-p="75"]'));
  ok(last() === JSON.stringify(["cover", "set_cover_position", { entity_id: "cover.s1", position: 75 }]) && q(a, ".menu").hidden, "menu item sends 75 and closes");
  click(q(a, ".val"));
  ok(!!q(a, '.menu [data-stop]'), "menu offers Stop while moving");
  click(q(a, '.menu [data-stop]'));
  ok(last().includes("stop_cover"), "menu Stop stops");

  // arrow keys jump between presets
  const k = new w.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true });
  q(a, ".track").dispatchEvent(k);
  await sleep(450);
  ok(last() === JSON.stringify(["cover", "set_cover_position", { entity_id: "cover.s1", position: 75 }]), "ArrowRight from 50 jumps to 75: " + last());

  // live is ignored for covers
  const lv = mk({ entity: "cover.s3", live: true }); rect(lv);
  const n1 = calls.length;
  ptr(lv, "pointerdown", 10); ptr(lv, "pointermove", 60); ptr(lv, "pointermove", 120); await sleep(350);
  ok(calls.length === n1, "nothing sent while dragging even with live: true");
  ptr(lv, "pointerup", 120);
  ok(calls.length === n1 + 1 && last().includes('"position":60'), "sent once on release: " + last());
  ok(q(lv, ".pip .shade svg rect:nth-child(2)")?.getAttribute("height") === "12", "closed shade drawn fully down: " + q(lv, ".pip .shade svg rect:nth-child(2)")?.getAttribute("height"));
  ok(q(lv, ".val").textContent === "Opening", "closed shade opening");

  // steps style
  const st = mk({ entity: "cover.s2", cover: { preset_style: "steps" } }); rect(st);
  ptr(st, "pointerdown", 124); ptr(st, "pointerup", 124); await sleep(300);
  ok(last().includes('"entity_id":"cover.s2","position":50'), "steps: tap at 62% lands on 50: " + last());
  ok(!q(st, ".val").classList.contains("menuable"), "steps: value runs the tap action, no menu");

  // fill: closed (slider shows how far down)
  const fc = mk({ entity: "cover.s3", cover: { fill: "closed" } }); rect(fc);
  ok(q(fc, ".track").style.getPropertyValue("--es-p") === "1", "closed shade = full fill with fill: closed");
  ok(q(fc, ".tick").style.getPropertyValue("--t") === "0.75", "ticks flip with fill: closed");
  await drag(fc, 190, 150);
  ok(last() === JSON.stringify(["cover", "set_cover_position", { entity_id: "cover.s3", position: 25 }]), "75% down = position 25: " + last());

  // chips
  const ch = mk({ entity: "cover.s2", cover: { preset_style: "chips" } });
  ok(!q(ch, ".chips").hidden && qa(ch, ".chips button").length === 5, "chip row with five chips");
  ok(q(ch, '.chips [data-p="100"]').classList.contains("on"), "Open chip active at 100");
  click(q(ch, '.chips [data-p="25"]'));
  ok(last() === JSON.stringify(["cover", "set_cover_position", { entity_id: "cover.s2", position: 25 }]), "chip sends 25");

  // ticks off / preset_style none
  ok(qa(mk({ entity: "cover.s1", cover: { ticks: false } }), ".tick").length === 0, "ticks: false");
  ok(qa(mk({ entity: "cover.s1", cover: { preset_style: "none" } }), ".tick").length === 0, "no ticks with preset_style none");

  // group: mixed band and staggered sends
  states["cover.s1"] = cov(36); states["cover.s2"] = cov(100);
  const g = mk({ entity: "cover.g", name: "All shades", cover: { stagger: 30 } });
  ok(q(g, ".val").textContent === "Mixed", "group shows Mixed: " + q(g, ".val").textContent);
  ok(!q(g, ".range").hidden && q(g, ".range").style.getPropertyValue("--es-lo") === "0.36" && q(g, ".range").style.getPropertyValue("--es-hi") === "1", "spread band 36–100");
  const n2 = calls.length;
  click(q(g, ".val")); click(q(g, '.menu [data-p="0"]'));
  ok(calls.length === n2 + 1 && last() === JSON.stringify(["cover", "set_cover_position", { entity_id: "cover.s1", position: 0 }]), "first member sent at once");
  await sleep(60);
  ok(calls.length === n2 + 2 && last() === JSON.stringify(["cover", "set_cover_position", { entity_id: "cover.s2", position: 0 }]), "second member after the stagger");
  click(q(g, ".stopbtn"));
  ok(last() === JSON.stringify(["cover", "stop_cover", { entity_id: "cover.g" }]), "group stop goes to the group");

  // battery chip
  const b1 = mk({ entity: "cover.s1", battery: "sensor.b1" });
  ok(q(b1, ".batt.low svg") && q(b1, ".batt").textContent === "14%", "low battery chip with icon: " + q(b1, ".batt")?.textContent);
  ok(!q(mk({ entity: "cover.s1", battery: "sensor.b2" }), ".batt"), "healthy battery hidden by default");
  const b3 = mk({ entity: "cover.s1", battery: "sensor.b2", battery_show: "always" });
  ok(q(b3, ".batt") && !q(b3, ".batt").classList.contains("low"), "battery_show: always, not low");
  states["sensor.b2"] = { state: "12", attributes: {} }; b3.hass = hass();
  ok(q(b3, ".batt").classList.contains("low"), "battery chip updates when the sensor drops");
  const bl = mk({ entity: "light.a", battery: "sensor.b1" });
  ok(!!q(bl, ".batt.low") && !q(bl, "ha-card").classList.contains("cover"), "battery works on a light card too");

  // travel_time: estimated movement when the cover reports the new position at once
  states["cover.s3"] = cov(0);
  const tv = mk({ entity: "cover.s3", cover: { travel_time: 1 } });
  click(q(tv, ".val")); click(q(tv, '.menu [data-p="50"]'));   // 0 → 50 at 1 s per full travel = 500 ms
  states["cover.s3"] = cov(50); tv.hass = hass();                // optimistic report arrives straight away
  await sleep(260);
  const mid = q(tv, ".moving")?.textContent ?? "";
  const est = Number(mid.split(" ")[0]);
  ok(est > 5 && est < 45 && mid.endsWith("→ 50"), "estimated position mid-move: " + mid);
  ok(q(tv, ".val").textContent === "Opening" && !!q(tv, ".stopbtn"), "still moving despite the instant report");
  const g1 = Number(q(tv, ".ghost").style.getPropertyValue("--es-g"));
  ok(g1 > 0.05 && g1 < 0.45, "mark follows the estimate: " + g1);
  const fm = Number(q(tv, ".pip .shade svg rect:nth-child(2)")?.getAttribute("height"));
  ok(fm > 6 && fm < 12, "icon follows the estimate, not the instant report: " + fm);
  await sleep(400);
  ok(q(tv, ".val").textContent === "50%" && !q(tv, ".stopbtn") && q(tv, ".ghost").hidden, "settles when the estimate arrives");
  ok(Number(q(tv, ".pip .shade svg rect:nth-child(2)")?.getAttribute("height")) === 6, "icon at half when settled: " + Number(q(tv, ".pip .shade svg rect:nth-child(2)")?.getAttribute("height")));
  const ta = mk({ entity: "cover.s3", cover: { travel_time: 1, moving_handle: "actual" } });
  states["cover.s3"] = cov(50); ta.hass = hass();
  click(q(ta, ".val")); click(q(ta, '.menu [data-p="0"]'));
  states["cover.s3"] = cov(0); ta.hass = hass();
  await sleep(260);
  const hp = Number(q(ta, ".track").style.getPropertyValue("--es-p"));
  ok(hp > 0.05 && hp < 0.45, "moving_handle: actual puts the handle on the estimate: " + hp);
  click(q(ta, ".stopbtn"));
  ok(last().includes("stop_cover") && !q(ta, ".stopbtn"), "stop ends the estimate");

  // glow: lights only by default
  const cg = mk({ entity: "cover.s1" });
  ok(cg.shadowRoot.querySelector(".track").style.getPropertyValue("--es-glow-a") === "" && !q(cg, ".track").classList.contains("lit"), "no glow on a cover by default");
  ok(q(mk({ entity: "cover.s1", glow: true }), ".track").style.getPropertyValue("--es-glow-a") === "75%", "glow: true turns it on for a cover");
  ok(q(mk({ entity: "cover.s1", styles: { glow: { strength: 40 } } }), ".track").style.getPropertyValue("--es-glow-a") === "40%", "styles.glow turns it on for a cover");
  ok(q(mk({ entity: "light.a" }), ".track").style.getPropertyValue("--es-glow-a") === "75%", "lights still glow by default");

  // light cards unaffected
  const la = mk({ entity: "light.a" });
  ok(!q(la, "ha-card").classList.contains("cover") && qa(la, ".tick").length === 0 && q(la, ".chips").hidden, "light card has no cover parts");
  click(q(la, ".val"));
  ok(last() === JSON.stringify(["light", "toggle", { entity_id: "light.a" }]), "light value tap still toggles");

  // cover: false falls back to the plain slider
  const pl = mk({ entity: "cover.s1", cover: false });
  ok(!q(pl, "ha-card").classList.contains("cover") && q(pl, ".val").textContent === "36%", "cover: false = plain slider");

  for (const el of w.document.querySelectorAll("expressive-slider-card")) el.remove();
  ok(true, "disconnect without error");
})();
