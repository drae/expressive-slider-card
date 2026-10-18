// Light group mode tests for expressive-slider-card. Run: npm test
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
const lt = (pct, extra = {}) => pct > 0
  ? { state: "on", attributes: { brightness: Math.round((pct / 100) * 255), supported_color_modes: ["color_temp"], ...extra } }
  : { state: "off", attributes: { supported_color_modes: ["color_temp"], ...extra } };
const onoff = (on) => ({ state: on ? "on" : "off", attributes: { supported_color_modes: ["onoff"] } });
const states = {};
const reset = (a, b, c, d = 0, e = true) => {
  Object.assign(states, { "light.a": lt(a), "light.b": lt(b), "light.c": lt(c), "light.d": lt(d), "light.e": onoff(e) });
  const any = [a, b, c, d].some((x) => x > 0) || e;
  states["light.g"] = { state: any ? "on" : "off", attributes: { rgb_color: [255, 180, 107], entity_id: ["light.a", "light.b", "light.c", "light.d", "light.e"] } };
  states["light.room"] = { state: "on", attributes: { entity_id: ["light.a", "light.b"] } };
  states["light.nest"] = { state: "on", attributes: { entity_id: ["light.room", "light.c"] } };
};
const hass = () => ({ states: { ...states }, callService: (d, s, data) => calls.push([d, s, data]) });
const mk = (cfg) => { const el = w.document.createElement("expressive-slider-card"); el.setConfig(cfg); el.hass = hass(); w.document.body.append(el); return el; };
const ok = (c, m) => { if (!c) { console.log("FAIL", m); process.exitCode = 1; } else console.log("ok  ", m); };
const q = (el, s) => el.shadowRoot.querySelector(s);
const qa = (el, s) => [...el.shadowRoot.querySelectorAll(s)];
const rect = (el) => { q(el, ".track").getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 56 }); };
const ptr = (el, type, x) => { const e = new w.Event(type, { bubbles: true }); e.clientX = x; e.button = 0; e.pointerId = 1; q(el, ".track").dispatchEvent(e); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => w.requestAnimationFrame(() => r()));
const press = async (el, from, to) => { ptr(el, "pointerdown", from); ptr(el, "pointermove", (from + to) / 2); ptr(el, "pointermove", to); await frame(); };
const drag = async (el, from, to) => { await press(el, from, to); ptr(el, "pointerup", to); };
const val = (el) => q(el, ".val").textContent;
const sentSince = (n) => Object.fromEntries(calls.slice(n).map(([, s, d]) => [d.entity_id, s === "turn_off" ? 0 : d.brightness_pct ?? "on"]));
// Report the card's sent levels back as the lights' states.
const settle = (el, sent) => {
  for (const [id, b] of Object.entries(sent)) states[id] = lt(b);
  el.hass = hass();
};

(async () => {
  reset(100, 40, 20);
  const g = mk({ entity: "light.g", name: "All lights", group: true, double_tap_action: "none" });
  rect(g);
  ok(q(g, ".track").style.getPropertyValue("--es-p") === "0.53", "handle at the mean of dimmable lights on: " + q(g, ".track").style.getPropertyValue("--es-p"));
  ok(val(g) === "20%–100%", "label is the min–max range: " + val(g));
  ok(!q(g, ".range").hidden && q(g, ".range").style.getPropertyValue("--es-lo") === "0.2" && q(g, ".range").style.getPropertyValue("--es-hi") === "1", "band from 20% to 100%");
  ok(qa(g, ".tick").length === 0, "no dots by default");
  ok(q(g, ".track").style.getPropertyValue("--es-active") === "rgb(255,180,107)", "fill = the group's blended colour");

  // drag preview: band and label show where the lights would go, nothing sent yet
  let n0 = calls.length;
  await press(g, 106, 100);
  ok(calls.length === n0, "nothing sent while dragging");
  ok(val(g) === "19%–94%", "label previews the scaled range: " + val(g));
  ok(q(g, ".range").style.getPropertyValue("--es-hi") === "0.94", "band previews the scaled range");
  ptr(g, "pointerup", 100);
  ok(calls.length === n0 + 1, "first light sent at once, the rest staggered");
  await sleep(400);
  let sent = sentSince(n0);
  ok(JSON.stringify(sent) === JSON.stringify({ "light.a": 94, "light.b": 37, "light.c": 19 }), "scaled to a mean of 50, differences kept: " + JSON.stringify(sent));
  ok(!("light.d" in sent) && !("light.e" in sent), "off and on/off-only lights untouched");
  ok(val(g) === "19%–94%", "label shows the sent levels before the lights report back: " + val(g));
  settle(g, sent);
  ok(val(g) === "19%–94%" && q(g, ".track").style.getPropertyValue("--es-p") === "0.5", "handle settles at 50");

  // push to 100: everything pins at 100 ...
  n0 = calls.length;
  await drag(g, 30, 200);
  await sleep(400);
  sent = sentSince(n0);
  ok(sent["light.a"] === 100 && sent["light.b"] === 100 && sent["light.c"] === 100, "at 100 every light is pinned at 100: " + JSON.stringify(sent));
  settle(g, { "light.a": 100, "light.b": 100, "light.c": 100 });
  ok(val(g) === "100%" && q(g, ".range").hidden, "one level: plain % and no band");
  // ... and the remembered spread comes back on the way down
  n0 = calls.length;
  await drag(g, 190, 100);
  await sleep(400);
  sent = sentSince(n0);
  ok(JSON.stringify(sent) === JSON.stringify({ "light.a": 94, "light.b": 37, "light.c": 19 }), "spread restored after pinning at 100: " + JSON.stringify(sent));
  settle(g, sent);

  // a light changed elsewhere starts from its real level
  states["light.a"] = lt(60); g.hass = hass();
  n0 = calls.length;
  await drag(g, 60, 116); // 58% = 1.5 x the mean of 60/37/19
  await sleep(400);
  ok(sentSince(n0)["light.a"] === 90, "a light changed elsewhere scales from its real level: " + JSON.stringify(sentSince(n0)));
  settle(g, sentSince(n0));

  // only on/off lights on: the slider does nothing
  reset(0, 0, 0, 0, true);
  g.hass = hass();
  ok(val(g) === "On" && q(g, ".track").style.getPropertyValue("--es-p") === "0", "only on/off lights on: reads On, handle at 0: " + val(g));
  n0 = calls.length;
  await drag(g, 10, 150);
  await sleep(300);
  ptr(g, "pointerdown", 120); ptr(g, "pointerup", 120);
  await sleep(300);
  ok(calls.length === n0, "no light on: drag and tap do nothing");
  reset(0, 0, 0, 0, false);
  g.hass = hass();
  ok(val(g) === "Off" && q(g, ".val").classList.contains("off"), "all off reads Off");

  // drag to 0 turns off the lights that are on
  reset(80, 30, 0);
  g.hass = hass();
  n0 = calls.length;
  await drag(g, 100, 0);
  await sleep(300);
  ok(JSON.stringify(calls.slice(n0).map((c) => [c[1], c[2].entity_id])) === JSON.stringify([["turn_off", "light.a"], ["turn_off", "light.b"]]), "drag to 0 turns off the lit lights");

  // options
  reset(80, 30, 0);
  const s = mk({ entity: "light.g", double_tap_action: "none", group: { mode: "set", stagger: 0 } });
  rect(s);
  n0 = calls.length;
  await drag(s, 20, 120);
  ok(JSON.stringify(sentSince(n0)) === JSON.stringify({ "light.a": 60, "light.b": 60 }), "mode set: lights on go to one level, no stagger: " + JSON.stringify(sentSince(n0)));
  const t = mk({ entity: "light.g", double_tap_action: "none", group: { targets: "all", stagger: 0 } });
  rect(t);
  n0 = calls.length;
  await drag(t, 20, 110);
  ok(sentSince(n0)["light.c"] === 55 && sentSince(n0)["light.d"] === 55, "targets all: off lights come on at the release level: " + JSON.stringify(sentSince(n0)));
  const dts = mk({ entity: "light.g", group: { show: "dots" } });
  ok(qa(dts, ".tick").length === 2 && q(dts, ".range").hidden, "show dots: a dot per level, no band");
  const both = mk({ entity: "light.g", group: { show: "both", band: "all" } });
  ok(qa(both, ".tick").length === 3 && q(both, ".range").style.getPropertyValue("--es-lo") === "0", "band all: off lights count as 0");
  ok(val(both) === "0%–80%", "band all label: " + val(both));
  ok(val(mk({ entity: "light.g", group: { label: "mixed" } })) === "Mixed", "label mixed");
  ok(val(mk({ entity: "light.g", group: { label: "value" } })) === "55%", "label value = handle %");
  ok(val(mk({ entity: "light.g", group: { value: "max" } })) === "30%–80%" &&
     q(mk({ entity: "light.g", group: { value: "max" } }), ".track").style.getPropertyValue("--es-p") === "0.8", "value max: handle at the brightest light");

  // nested groups are flattened; live is ignored for groups
  reset(50, 50, 10);
  const nest = mk({ entity: "light.nest", group: true, live: true, double_tap_action: "none" });
  rect(nest);
  ok(val(nest) === "10%–50%", "nested group flattened: " + val(nest));
  n0 = calls.length;
  await press(nest, 50, 150);
  await sleep(400);
  ok(calls.length === n0, "live ignored while dragging a group");
  ptr(nest, "pointerup", 150);
  await sleep(400);
  ok(Object.keys(sentSince(n0)).sort().join() === "light.a,light.b,light.c", "nested group sends to each light");

  // a plain light group without group: behaves as before
  reset(100, 40, 20);
  const plain = mk({ entity: "light.g" });
  ok(q(plain, ".range").hidden && val(plain) === "100%", "no group: key = plain light slider");

  // area: members come from the area registry instead of an entity_id list
  reset(60, 20, 0, 80);
  states["light.room"] = { state: "on", attributes: { rgb_color: [1, 2, 3] } }; // a Zigbee group: no member list
  states["light.a"].attributes.rgb_color = [255, 200, 100];
  states["light.b"].attributes.rgb_color = [255, 100, 0];
  states["light.f"] = lt(90);
  const reg = {
    entities: {
      "light.a": { entity_id: "light.a", area_id: "lounge" },
      "light.b": { entity_id: "light.b", device_id: "dev1" },               // area from its device
      "light.c": { entity_id: "light.c", area_id: "lounge" },
      "light.d": { entity_id: "light.d", area_id: "study", device_id: "dev1" }, // its own area beats the device's
      "light.e": { entity_id: "light.e", area_id: "lounge" },               // on/off-only
      "light.f": { entity_id: "light.f", area_id: "lounge", hidden: true },
      "light.room": { entity_id: "light.room", area_id: "lounge" },         // the card's own entity
      "sensor.x": { entity_id: "sensor.x", area_id: "lounge" },
    },
    devices: { dev1: { area_id: "lounge" } },
  };
  const ahass = () => ({ ...hass(), ...reg });
  const mka = (cfg) => { const el = w.document.createElement("expressive-slider-card"); el.setConfig(cfg); el.hass = ahass(); w.document.body.append(el); return el; };
  const ar = mka({ entity: "light.room", group: { area: "lounge" }, double_tap_action: "none" });
  rect(ar);
  ok(val(ar) === "20%–60%", "area members: entity or device area, hidden and own entity left out: " + val(ar));
  ok(q(ar, ".track").style.getPropertyValue("--es-active") === "rgb(255,150,50)", "area fill = blend of the lit members: " + q(ar, ".track").style.getPropertyValue("--es-active"));
  n0 = calls.length;
  await drag(ar, 80, 120);
  await sleep(400);
  ok(Object.keys(sentSince(n0)).sort().join() === "light.a,light.b", "area drag sends to the lit area lights only: " + JSON.stringify(sentSince(n0)));
  // a light added to the area joins without a config change
  reg.entities = { ...reg.entities, "light.d": { entity_id: "light.d", area_id: "lounge" } };
  states["light.d"] = lt(100);
  ar.hass = ahass();
  ok(val(ar).endsWith("100%"), "new area light picked up: " + val(ar));
  // min_lights hides the card until the area has enough dimmable lights
  const one = mka({ entity: "light.room", group: { area: "study", min_lights: 2 } });
  ok(one.style.display === "none", "min_lights: hidden with fewer dimmable lights");
  reg.entities = { ...reg.entities, "light.c": { entity_id: "light.c", area_id: "study" }, "light.d": { entity_id: "light.d", area_id: "study" } };
  one.hass = ahass();
  ok(one.style.display === "", "min_lights: shown once the area has two");
  ok(mka({ entity: "light.room", group: { area: "lounge" } }).style.display === "", "no min_lights: always shown");
  // min_on hides the card until enough dimmable lights are on
  reg.entities = { ...reg.entities, "light.c": { entity_id: "light.c", area_id: "lounge" } };
  states["light.a"] = lt(50); states["light.b"] = lt(0); states["light.c"] = lt(0); states["light.d"] = lt(0);
  const mo = mka({ entity: "light.room", group: { area: "lounge", min_on: 2 } });
  ok(mo.style.display === "none", "min_on: hidden with one light on");
  states["light.c"] = lt(30);
  mo.hass = ahass();
  ok(mo.style.display === "", "min_on: shown with two lights on");

  for (const el of w.document.querySelectorAll("expressive-slider-card")) el.remove();
  ok(true, "disconnect without error");
})();
