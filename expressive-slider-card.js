/*
 * expressive-slider-card
 * Copyright (c) 2026 Paul Owen
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * A Material 3 "Expressive"-style slider for Home Assistant: split track with a gap
 * either side of a thin handle, track coloured from the entity (light rgb_color),
 * and a value bubble that pops up above the handle while dragging.
 *
 *   type: custom:expressive-slider-card
 *   entity: light.lounge_main_sofa
 *   name: Sofa                 # optional
 *   bubble: drag               # drag | always | never
 *   live: false                # true = send updates while dragging (throttled)
 *   step: 1
 *   min: 0                     # optional range limits, e.g. max: 25 for a TV that never goes louder;
 *   max: 100                   # the default is the entity's own range. Not used on covers or light groups.
 *   icon: mdi:sofa             # optional; defaults to the entity's own icon; false hides it
 *   icon_position: track       # track (a round pip inside the start of the slider) | outside (left of the slider)
 *   glow: false                # the soft light round the fill; on by default for lights only
 *   tap_action:                # tapping the name, the % or the icon (a tap on the slider sets the value)
 *     action: toggle
 *   hold_action:               # holding the slider
 *     action: more-info
 *   double_tap_action:         # double tapping the slider; a single tap then waits 250 ms before setting the value
 *     action: toggle
 *   Actions follow the usual HA / Bubble Card form: more-info, toggle, navigate (navigation_path),
 *   url (url_path), perform-action (perform_action, data, target), fire-dom-event, none.
 *   An `entity:` inside an action targets that entity instead of the card's.
 *   info:                      # optional secondary readings, e.g. power use
 *     - entity: sensor.lounge_main_sofa_power
 *       icon: mdi:flash
 *       position: track        # track (inside the slider) | header (the row above it)
 *       align: right           # left | center | right
 *       background: "#0008"    # this chip's fill inside the slider
 *       color: white
 *       styles:                # same form as a `styles` block below
 *         size: 13
 *       tap_action:            # default: more-info for this chip's entity
 *         action: more-info
 *   battery: sensor.x_battery  # optional battery reading in the header
 *   battery_show: low          # low (only below battery_low) | always
 *   battery_low: 20            # %; below this the chip turns the alert colour and its icon blinks
 *   cover:                     # cover entities only; every key is optional
 *     fill: open               # open (fill = HA position, 100 = fully up) | closed (fill = how far the shade is down;
 *                              # the value, menu and chips then read as % closed too; presets stay HA positions)
 *     presets: [0, 25, 50, 75, 100]  # HA positions
 *     preset_style: menu       # menu (tap the value) | chips (a row under the slider) | steps (slider only lands on presets) | none
 *     ticks: true              # dots on the track at the presets between the ends
 *     detent: 3                # % either side of a preset that snaps onto it
 *     moving_handle: target    # target (handle at the requested position, a mark at the shade) | actual (the reverse)
 *     stop_button: true        # a stop button in the header while the cover moves
 *     stagger: 400             # ms between members of a cover group
 *     travel_time: 45          # optional: seconds from closed to open; the card then shows an estimated position
 *                              # (for covers that report the new position at once)
 *   group:                     # light groups only; every key is optional
 *     band: on                 # on (the band spans the lights that are on) | all (off lights count as 0)
 *     show: band               # band | dots (one per level) | both
 *     value: mean              # mean | max: where the handle sits, from the dimmable lights that are on
 *     label: range             # range ("20%–100%") | mixed ("Mixed") | value (the handle %)
 *     mode: scale              # scale (keep the lights' differences) | set (all to the same level)
 *     targets: on              # on (only lights already on) | all (lights that are off come on too)
 *     stagger: 150             # ms between each light's command
 *     area: living_room        # take the members from this area instead of the entity's entity_id list
 *     min_lights: 0            # hide the card while there are fewer dimmable members than this
 *     min_on: 0                # hide the card while fewer dimmable members than this are on
 *                              # Acts only while a dimmable light is on. Scaling remembers the spread, so lights
 *                              # pinned at 100% get their differences back. On/off-only members are left out.
 *   styles:                    # one block per element
 *     card:
 *       background: transparent  # transparent = no background, border or shadow (for stacking)
 *     name:
 *       size: 13               # bare numbers become px
 *       weight: 500
 *     value:
 *       color: var(--primary-text-color)
 *     track:
 *       color: "#f5c27a"       # the slider colour, instead of the entity's
 *       height: 56
 *       radius: 20
 *     pip:
 *       size: 36               # the round background behind the icon
 *       background: 90         # number = % of the slider colour mixed with black while on; or a fixed colour
 *     icon:
 *       size: 22
 *     glow:
 *       gap: 0                 # px of clear space between the fill and the glow
 *       softness: 32           # px blur
 *       strength: 75           # % opacity
 *       edge: 55               # % opacity of a dark edge over the glow, so it sits behind the fill; 0 = none
 *       edge_width: 12         # px the edge takes to fade out
 *       drag: 10               # % extra while dragging
 *
 * Elements: card, header, name (alias title), value (alias state), info (all chips),
 * track_info (chips inside the slider), track, fill, empty, handle, bubble, pip, icon, stop, glow.
 * Properties are CSS names; size, weight and colour are short for font-size, font-weight and color.
 * Track: height, radius, inner-radius, gap, handle-width, and tile (the colour the empty part is mixed from).
 * info: color and track_info: background are defaults that a chip's own settings override.
 * Each block can also be a list of single properties. A plain string is used as raw CSS.
 *
 * Supported domains: light (brightness), fan (percentage), cover (position),
 * media_player (volume), input_number / number (value). A light that only does on/off
 * snaps to 0 or 100%. A cover only sends when the slider is released.
 */

const VERSION = "1.4.0";
const FALLBACK_RGB = [255, 196, 140]; // warm white, for a light that reports no colour
const SKY_RGB = [143, 195, 230]; // cover fill
const VIOLET_RGB = [179, 157, 219]; // media player (volume) fill
const THROTTLE_MS = 300;
const HOLD_MS = 500;
const DOUBLE_TAP_MS = 250;
const KEY_MS = 400;
const DRAG_THRESHOLD_PX = 6;
const OFF_STATES = new Set(["off", "unavailable", "unknown", "closed"]);
const MOVING_STATES = new Set(["opening", "closing"]);
const COVER_DEFAULTS = { fill: "open", presets: [0, 25, 50, 75, 100], preset_style: "menu", ticks: true, detent: 3,
  moving_handle: "target", stop_button: true, stagger: 400 };
const GROUP_DEFAULTS = { band: "on", show: "band", value: "mean", label: "range", mode: "scale", targets: "on", stagger: 150 };
const GLOW_DEFAULTS = { gap: 0, softness: 32, strength: 75, drag: 10, edge: 55, edge_width: 12 };
const PIP_TINT = 90;
const GROUP_PENDING_MS = 4000; // sent levels are shown until the lights report them, or this long after the last command
const TARGET_STALE_MS = 8000;  // a cover target is dropped after this long without movement
const TARGET_MAX_MS = 180000;  // and always after this long

try {
  CSS.registerProperty({ name: "--es-p", syntax: "<number>", inherits: true, initialValue: "0" });
} catch (_) {
  /* already registered */
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const same = (a, b) => a.length === (b?.length ?? -1) && a.every((x, n) => x === b[n]);
const px = (v) => (typeof v === "number" ? `${v}px` : v);
const setVar = (el, name, value) => (value == null ? el.style.removeProperty(name) : el.style.setProperty(name, value));
const flat = (b) => (Array.isArray(b) ? Object.assign({}, ...b) : b && typeof b === "object" ? b : {});

// A light with no brightness reports only the onoff colour mode; with no modes reported, assume brightness.
const onOffOnly = (s) => {
  const modes = s.attributes.supported_color_modes;
  return Array.isArray(modes) && modes.length > 0 && modes.every((m) => m === "onoff");
};

const numeric = (domain) => ({
  range: (s) => [s.attributes.min, s.attributes.max, s.attributes.step],
  read: (s) => Number(s.state),
  write: (hass, id, v) => hass.callService(domain, "set_value", { entity_id: id, value: v }),
});

const DOMAINS = {
  light: {
    step: (s) => (onOffOnly(s) ? 100 : undefined),
    read: (s) => (s.state === "on" ? Math.round(((s.attributes.brightness ?? 255) / 255) * 100) : 0),
    write: (hass, id, v) =>
      v <= 0
        ? hass.callService("light", "turn_off", { entity_id: id })
        : hass.callService("light", "turn_on", onOffOnly(hass.states[id]) ? { entity_id: id } : { entity_id: id, brightness_pct: v }),
  },
  fan: {
    read: (s) => (s.state === "on" ? s.attributes.percentage ?? 100 : 0),
    write: (hass, id, v) => hass.callService("fan", "set_percentage", { entity_id: id, percentage: v }),
  },
  cover: {
    read: (s) => s.attributes.current_position ?? (s.state === "open" ? 100 : 0),
    write: (hass, id, v) => hass.callService("cover", "set_cover_position", { entity_id: id, position: v }),
  },
  media_player: {
    read: (s) => Math.round((s.attributes.volume_level ?? 0) * 100),
    write: (hass, id, v) => hass.callService("media_player", "volume_set", { entity_id: id, volume_level: v / 100 }),
  },
  input_number: numeric("input_number"),
  number: numeric("number"),
};

// Default fills, one per domain so lights, covers and volume read apart.
const DEFAULT_RGB = new Map([
  [DOMAINS.light, FALLBACK_RGB],
  [DOMAINS.cover, SKY_RGB],
  [DOMAINS.media_player, VIOLET_RGB],
]);

const parseColor = (c) => {
  if (Array.isArray(c)) return c;
  if (typeof c !== "string") return null;
  const hex = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? [...hex[1]].map((x) => x + x).join("") : hex[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  }
  const rgb = c.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
  return rgb ? rgb.slice(1, 4).map(Number) : null;
};

const isLight = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;

const STYLE_TARGETS = {
  card: "ha-card", header: ".head", name: ".name", title: ".name", value: ".val", state: ".val",
  info: ".chip", track_info: ".track .chip", track: ".track", fill: ".active", empty: ".inactive",
  handle: ".handle", bubble: ".bubble", pip: ".pip", icon: ".pip ha-state-icon", stop: ".stop",
};
const STYLE_ALIASES = { size: "font-size", weight: "font-weight", colour: "color" };
// Properties that set a card-wide variable instead of a CSS rule.
const STYLE_VARS = {
  track: { height: "--es-height", radius: "--es-radius", "inner-radius": "--es-inner-radius", gap: "--es-gap",
    "handle-width": "--es-handle-width", tile: "--es-tile" },
  pip: { size: "--es-pip-size" },
  icon: { size: "--es-icon-size" },
  info: { color: "--es-chip-color" },
  track_info: { background: "--es-chip-bg" },
};
const UNITLESS = new Set(["font-weight", "opacity", "z-index", "line-height", "flex", "flex-grow", "flex-shrink", "order"]);

// One style block ({ size: 13 } or [{ size: 13 }]) as [property, value] pairs.
const toDecls = (props, vars = {}) =>
  Object.entries(flat(props)).map(([k, v]) => {
    const name = STYLE_ALIASES[k] ?? k;
    const prop = vars[k] ?? vars[name] ?? name;
    return [prop, typeof v === "number" && !UNITLESS.has(prop) ? `${v}px` : String(v).replace(/[{};]/g, "")];
  });

const css = (decls) => decls.map(([p, v]) => `${p}: ${v};`).join(" ");

// `styles:` as CSS, plus the settings the card reads itself.
const parseStyles = (styles) => {
  const out = { css: "", transparent: false, color: undefined, pipBg: undefined, glow: undefined };
  if (!styles) return out;
  if (typeof styles === "string") return { ...out, css: styles };
  const rules = [];
  const host = [];
  for (const [el, props] of Object.entries(styles)) {
    if (el === "glow") {
      out.glow = props;
      continue;
    }
    if (!STYLE_TARGETS[el]) continue;
    const { ...block } = flat(props);
    if (el === "card" && ["transparent", "none"].includes(block.background)) {
      out.transparent = true;
      delete block.background;
    }
    if (el === "track" && "color" in block) {
      out.color = block.color;
      delete block.color;
    }
    if (el === "pip" && "background" in block) {
      out.pipBg = block.background;
      delete block.background;
    }
    const decls = toDecls(block, STYLE_VARS[el]);
    host.push(...decls.filter(([p]) => p.startsWith("--es-")));
    const own = decls.filter(([p]) => !p.startsWith("--es-"));
    if (own.length) rules.push(`${STYLE_TARGETS[el]} { ${css(own)} }`);
  }
  if (host.length) rules.unshift(`:host { ${css(host)} }`);
  out.css = rules.join("\n");
  return out;
};

const ALIGNS = ["left", "center", "right"];

// The empty part of the track uses Bubble Card's button background, so it matches Bubble rows.
const TILE = "var(--es-tile, var(--bubble-main-background-color, var(--background-color-2, var(--secondary-background-color, #2a2b2f))))";

const CSS_TEXT = `
  :host { display: block; }
  ha-card { position: relative; padding: 12px 16px 16px; overflow: visible; --pip: var(--es-pip-size, 36px); }
  ha-card.transparent { background: none; border: none; box-shadow: none; padding: 4px 0 8px; }
  [hidden] { display: none !important; }
  .head { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; column-gap: 10px;
          align-items: baseline; margin-bottom: 8px; }
  .head.centred { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); }
  .head-l, .head-r { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
  .head-l { grid-column: 1; }
  .head > [data-slot="header-center"] { grid-column: 2; }
  .head-r { grid-column: 3; justify-self: end; }
  .name { min-width: 0; font-weight: 600; font-size: var(--es-name-size, 15px); color: var(--primary-text-color); cursor: pointer;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .val { font-size: var(--es-value-size, 18px); font-weight: 600; color: var(--primary-text-color); cursor: pointer;
         font-variant-numeric: tabular-nums; }
  .val.off { color: var(--secondary-text-color); }
  .track { --hw: var(--es-handle-width, 4px); --gap: var(--es-gap, 6px); --r: var(--es-radius, 16px); --ir: var(--es-inner-radius, 6px);
           --pc: clamp(0, var(--es-p), 1); /* the settle overshoots slightly; keep the shape inside the track */
           position: relative; height: var(--es-height, 56px);
           touch-action: pan-y; cursor: pointer; outline: none; user-select: none; -webkit-user-select: none;
           transition: --es-p 420ms cubic-bezier(.3,1.4,.6,1); }
  .track.dragging { transition: none; --es-glow-lift: var(--es-glow-drag, 10%); --es-glow-blur-lift: 5px; }
  .seg { position: absolute; top: 0; bottom: 0; transition: background-color 250ms; }
  .active { left: 0; background: var(--es-active); border-radius: var(--r) var(--ir) var(--ir) var(--r);
            width: max(0px, calc(var(--pc) * (100% - var(--hw)) - var(--gap))); }
  .inactive { right: 0; background: var(--es-inactive); border-radius: var(--ir) var(--r) var(--r) var(--ir);
              width: max(0px, calc(100% - var(--pc) * (100% - var(--hw)) - var(--hw) - var(--gap))); }
  /* Glow: a pseudo-element set out by the gap with only an outer shadow, so the gap stays see-through. */
  .active::before { --gg: var(--es-glow-gap, 0px); content: ""; position: absolute; pointer-events: none; opacity: 0;
                    transition: opacity 250ms, box-shadow 250ms; inset: calc(-1 * var(--gg));
                    border-radius: calc(var(--r) + var(--gg)) calc(var(--ir) + var(--gg)) calc(var(--ir) + var(--gg)) calc(var(--r) + var(--gg));
                    box-shadow: 0 0 var(--es-glow-edge-w, 12px) 0 rgb(0 0 0 / var(--es-glow-edge, 55%)),
                                0 0 calc(var(--es-glow-blur, 32px) + var(--es-glow-blur-lift, 0px)) 0
                                color-mix(in srgb, var(--es-active) calc(var(--es-glow-a, 75%) + var(--es-glow-lift, 0%)), transparent); }
  .track.lit .active::before { opacity: 1; }
  .handle { position: absolute; z-index: 2; top: -6px; bottom: -6px; width: var(--hw); border-radius: 2px;
            left: calc(var(--pc) * (100% - var(--hw))); background: var(--es-handle); }
  .track:focus-visible .handle { outline: 2px solid var(--primary-color); outline-offset: 3px; }
  .stop { position: absolute; z-index: 1; right: 10px; top: 50%; width: 4px; height: 4px; margin-top: -2px; border-radius: 50%;
          background: var(--es-handle); transition: opacity 150ms; }
  .stop.hide { opacity: 0; }
  /* Icon pip at the start of the slider (or outside it, to the left); the handle is drawn over it. */
  .pip { position: absolute; z-index: 1; top: 50%; left: calc(var(--hw) + var(--gap) + 6px);
         width: var(--pip); height: var(--pip); margin-top: calc(var(--pip) / -2);
         border-radius: 50%; display: grid; place-items: center; cursor: pointer;
         background: var(--es-pip-bg); color: var(--es-pip-fg); transition: background-color 250ms, color 250ms;
         --mdc-icon-size: var(--es-icon-size, 22px); }
  .pip .shade svg { display: block; width: var(--es-icon-size, 22px); height: var(--es-icon-size, 22px); }
  .outside .track { margin-left: calc(var(--pip) + 12px); }
  .outside .pip { left: calc(-1 * (var(--pip) + 12px)); }
  .info { display: flex; gap: 6px; }
  .info:empty { display: none; }
  .chip { display: inline-flex; align-items: center; gap: 3px; cursor: pointer; white-space: nowrap;
          font-size: var(--es-info-size, 12px); font-variant-numeric: tabular-nums; color: var(--es-chip-color, var(--secondary-text-color)); }
  .chip ha-icon { --mdc-icon-size: 14px; }
  /* In the header a flex chip takes its baseline from the icon, so lay it out inline. */
  .head .chip { display: inline-block; font-size: var(--es-value-size, 13px); }
  .head .chip ha-icon { vertical-align: -2px; margin-right: 3px; }
  .track .info { position: absolute; top: 50%; transform: translateY(-50%); }
  .track [data-slot="track-left"] { left: 10px; }
  .with-pip:not(.outside) .track [data-slot="track-left"] { left: calc(var(--hw) + var(--gap) + var(--pip) + 14px); }
  .track [data-slot="track-center"] { left: 50%; transform: translate(-50%, -50%); }
  .track [data-slot="track-right"] { right: 10px; }
  .track .chip { padding: 4px 10px; border-radius: 999px; color: var(--es-chip-color, var(--primary-text-color));
                 background: var(--es-chip-bg, color-mix(in srgb, var(--card-background-color, #1c1c1e) 60%, transparent)); }
  .bubble { position: absolute; z-index: 3; bottom: calc(100% + 10px);
            width: var(--es-bubble-diameter, 40px); height: var(--es-bubble-diameter, 40px); border-radius: 50%;
            left: calc(var(--pc) * (100% - var(--hw)) + var(--hw) / 2); transform: translateX(-50%) scale(0);
            transform-origin: 50% 100%; display: grid; place-items: center; pointer-events: none;
            background: var(--es-active); color: var(--es-on-active);
            font: 600 var(--es-bubble-size, 14px)/1 var(--ha-font-family-body, inherit); font-variant-numeric: tabular-nums;
            transition: transform 150ms cubic-bezier(.2,0,0,1); }
  .bubble.show { transform: translateX(-50%) scale(1); }
  /* Covers: a fixed header height so the stop button and battery chip never change the row height. */
  .cover .head { height: 24px; align-items: center; }
  .cover .head-l, .cover .head-r { align-items: center; }
  .cv { display: inline-flex; align-items: center; gap: 8px; }
  .cv:empty { display: none; }
  .moving { font-size: 12px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .stopbtn { border: 0; padding: 0; width: 22px; height: 22px; border-radius: 50%; display: inline-grid; place-items: center; cursor: pointer;
             background: ${TILE}; color: var(--primary-text-color); }
  .stopbtn i { display: block; width: 8px; height: 8px; border-radius: 2px; background: currentColor; }
  .val.menuable { text-decoration: underline dotted color-mix(in srgb, var(--primary-text-color) 40%, transparent); text-underline-offset: 3px; }
  .val:focus-visible, .stopbtn:focus-visible, .chips button:focus-visible, .menu button:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
  .ticks { position: absolute; inset: 0; pointer-events: none; }
  .tick { position: absolute; z-index: 1; top: 50%; width: 4px; height: 4px; margin: -2px 0 0 -2px; border-radius: 50%;
          left: calc(var(--t) * (100% - var(--hw)) + var(--hw) / 2); background: var(--primary-text-color); opacity: .55; }
  .ghost { position: absolute; z-index: 2; top: 8px; bottom: 8px; width: 2px; border-radius: 1px; pointer-events: none;
           left: calc(var(--es-g) * (100% - var(--hw)) + 1px); background: var(--primary-text-color); opacity: .45; }
  .range { position: absolute; z-index: 1; top: 50%; height: 6px; margin-top: -3px; border-radius: 3px; pointer-events: none;
           left: calc(var(--es-lo) * (100% - var(--hw))); width: calc((var(--es-hi) - var(--es-lo)) * (100% - var(--hw)));
           background: var(--primary-text-color); opacity: .22; }
  .chips { display: grid; grid-template-columns: repeat(var(--n, 5), 1fr); gap: 4px; margin-top: 8px; }
  .chips button { border: 0; height: 28px; border-radius: 14px; cursor: pointer; font: 500 12px var(--ha-font-family-body, inherit);
                  background: ${TILE}; color: var(--secondary-text-color); }
  .chips button.on { background: color-mix(in srgb, var(--es-active) 85%, #000); color: var(--es-on-active); }
  .menu { position: absolute; z-index: 10; right: 16px; top: 36px; min-width: 150px; padding: 6px; border-radius: 16px; display: grid; gap: 2px;
          background: ${TILE}; box-shadow: 0 8px 24px rgba(0, 0, 0, .5); }
  ha-card.transparent .menu { right: 0; top: 28px; }
  .menu button { border: 0; background: none; color: var(--primary-text-color); text-align: left; padding: 8px 10px; border-radius: 10px; cursor: pointer;
                 display: flex; justify-content: space-between; gap: 12px; font: 500 13px var(--ha-font-family-body, inherit); }
  .menu button:hover, .menu button.cur { background: var(--card-background-color, #3a3b3d); }
  .menu button span { color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
  .menu hr { border: 0; height: 1px; margin: 4px 6px; background: var(--card-background-color, #3a3b3d); }
  .batt { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap;
          color: var(--secondary-text-color); cursor: pointer; }
  .batt svg { flex-shrink: 0; }
  .batt.low { color: var(--es-alert, rgb(255, 60, 10)); }
  .batt.low svg { animation: es-blink 1.2s ease-in-out infinite; }
  @keyframes es-blink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) { .batt.low svg { animation: none; } .bubble { transition: none; } }
`;

const HTML = `
  <style>${CSS_TEXT}</style>
  <style id="user"></style>
  <ha-card>
    <div class="head">
      <div class="head-l"><span class="name"></span><span class="info" data-slot="header-left"></span></div>
      <span class="info" data-slot="header-center"></span>
      <div class="head-r"><span class="info" data-slot="header-right"></span><span class="cv"></span><span class="val"></span></div>
    </div>
    <div class="track" tabindex="0" role="slider">
      <div class="seg active"></div><div class="seg inactive"></div><div class="range" hidden></div><div class="ticks"></div>
      <div class="info" data-slot="track-left"></div><div class="info" data-slot="track-center"></div>
      <div class="info" data-slot="track-right"></div><div class="stop"></div>
      <div class="pip" hidden><ha-state-icon></ha-state-icon><span class="shade" hidden></span></div><div class="ghost" hidden></div><div class="handle"></div><div class="bubble"></div>
    </div>
    <div class="chips" hidden></div>
    <div class="menu" role="menu" hidden></div>
  </ha-card>`;

// Roller shade drawn at its position: headrail, fabric down to the bottom bar, and a faint sill.
const shadeIcon = (pos) => {
  const down = Math.max(1, Math.round(((100 - clamp(pos, 0, 100)) / 100) * 12));
  return `<svg viewBox="0 0 24 24" aria-hidden="true">` +
    `<rect x="3" y="3" width="18" height="3" rx="1.5" fill="currentColor"/>` +
    `<rect x="5" y="6" width="14" height="${down}" fill="currentColor" opacity="${down > 1 ? 0.9 : 0.35}"/>` +
    `<rect x="4" y="${6 + down}" width="16" height="2" rx="1" fill="currentColor"/>` +
    `<rect x="5" y="20" width="14" height="1.5" rx=".75" fill="currentColor" opacity=".35"/></svg>`;
};

// Battery outline sized to 12px text; the inner bar shows roughly how full it is.
const batteryIcon = (pct) => {
  const w = Math.max(1, Math.round((clamp(pct, 0, 100) / 100) * 9));
  return `<svg width="16" height="9" viewBox="0 0 16 9" aria-hidden="true">` +
    `<rect x=".75" y=".75" width="12.5" height="7.5" rx="1.75" fill="none" stroke="currentColor" stroke-width="1.5"/>` +
    `<rect x="14" y="3" width="1.6" height="3" rx=".6" fill="currentColor"/>` +
    `<rect x="2.5" y="2.5" width="${w}" height="4" rx=".6" fill="currentColor"/></svg>`;
};

const endLabel = (pos) => (pos >= 100 ? "Open" : pos <= 0 ? "Closed" : null);

class ExpressiveSliderCard extends HTMLElement {
  static getStubConfig(hass) {
    const entity = Object.keys(hass.states).find((e) => e.startsWith("light.")) ?? "";
    return { entity };
  }

  setConfig(config) {
    if (!config.entity) throw new Error("entity is required");
    const domain = config.entity.split(".")[0];
    if (!DOMAINS[domain]) throw new Error(`Unsupported domain: ${domain}`);
    this._config = { bubble: "drag", live: false, step: 1, info_position: "track", info_align: "right", ...config };
    const action = (a, fallback) => (typeof a === "string" ? { action: a } : a ?? { action: fallback });
    this._actions = {
      tap: action(config.tap_action, "toggle"),
      hold: action(config.hold_action, "more-info"),
      double_tap: action(config.double_tap_action, "toggle"),
    };
    this._info = (config.info ?? []).map((i) => (typeof i === "string" ? { entity: i } : i));
    this._battery = config.battery ? { entity: config.battery, show: config.battery_show ?? "low", low: Number(config.battery_low ?? 20) } : null;
    this._cover = domain === "cover" && config.cover !== false ? { ...COVER_DEFAULTS, ...(config.cover ?? {}) } : null;
    if (this._cover) this._cover.presets = [...new Set(this._cover.presets.map(Number))].sort((x, y) => x - y);
    const group = domain === "light" && config.group ? { ...GROUP_DEFAULTS, ...flat(config.group) } : null;
    if (JSON.stringify(group) !== JSON.stringify(this._group)) this._spread = this._gPending = null;
    this._group = group;
    this._clearTarget();
    this._style = parseStyles(config.styles);
    // Lights glow by default; other domains when glow: true or a styles: glow: block is set.
    const g = this._style.glow;
    const glow = domain === "light" || config.glow !== undefined || g !== undefined;
    this._glow = !glow || config.glow === false || g === false ? null : { ...GLOW_DEFAULTS, ...flat(g) };
    this._domain = DOMAINS[domain];
    if (!this.shadowRoot) this._build();
    this._applyConfig();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const s = hass.states[this._config.entity];
    const info = this._info.map((i) => hass.states[i.entity]);
    // The battery sensor and group members also affect the render.
    const extra = [this._battery?.entity, ...this._members(s)].map((id) => id && hass.states[id]);
    const entityChanged = s !== this._stateObj;
    const extraChanged = !same(extra, this._extraStates);
    if (!entityChanged && !extraChanged && same(info, this._infoStates)) return;
    this._stateObj = s;
    this._infoStates = info;
    this._extraStates = extra;
    if (entityChanged) this._trackTarget();
    if (this._dragging) return;
    if (entityChanged || extraChanged) this._render();
    else this._renderInfo();
  }

  _members(s) {
    const area = this._group?.area;
    const ids = area ? this._areaLights(area) : (this._cover || this._group) && s?.attributes.entity_id;
    if (!Array.isArray(ids)) return [];
    if (!this._group) return ids;
    // Light groups can nest; flatten to the lights.
    const out = [];
    const seen = new Set();
    const add = (id) => {
      if (seen.has(id)) return;
      seen.add(id);
      const inner = this._hass?.states[id]?.attributes.entity_id;
      if (Array.isArray(inner)) inner.forEach(add);
      else out.push(id);
    };
    ids.forEach(add);
    return out;
  }

  // The area's lights, by the entity's own area or else its device's; hidden and config entities are left out.
  _areaLights(area) {
    const h = this._hass;
    if (!h?.entities) return [];
    const c = this._areaCache;
    if (c?.area === area && c.entities === h.entities && c.devices === h.devices) return c.ids;
    const ids = Object.values(h.entities)
      .filter((e) => e.entity_id.startsWith("light.") && e.entity_id !== this._config.entity && !e.hidden && !e.entity_category &&
        (e.area_id ?? h.devices?.[e.device_id]?.area_id) === area)
      .map((e) => e.entity_id);
    this._areaCache = { area, entities: h.entities, devices: h.devices, ids };
    return ids;
  }

  // Dimmable members and their levels; sent levels stand in until the lights report back.
  _groupLevels() {
    const ls = this._members(this._stateObj).map((id) => ({ id, s: this._hass?.states[id] }))
      .filter(({ s }) => s && s.state !== "unavailable" && !onOffOnly(s));
    const pend = this._gPending;
    if (pend && (Date.now() > pend.until ||
        ls.every(({ id, s }) => !pend.levels.has(id) || Math.abs(DOMAINS.light.read(s) - pend.levels.get(id)) <= 1))) {
      this._gPending = null;
    }
    const levels = this._gPending?.levels;
    return ls.map(({ id, s }) => ({ id, b: levels?.has(id) ? levels.get(id) : DOMAINS.light.read(s) }));
  }

  _groupMetric(bs, exact = false) {
    const on = bs.filter((b) => b > 0);
    if (!on.length) return 0;
    const m = this._group.value === "max" ? Math.max(...on) : on.reduce((a, b) => a + b, 0) / on.length;
    return exact ? m : Math.round(m);
  }

  // Each light's level if the group were released at v; null while no dimmable light is on.
  _groupPlan(v) {
    const g = this._group;
    const ls = this._groupLevels();
    const lit = ls.filter((l) => l.b > 0);
    if (!lit.length) return null;
    const targets = g.targets === "all" ? ls : lit;
    const level = (x) => clamp(Math.round(x), 1, 100);
    const plan = new Map(ls.map((l) => [l.id, l.b]));
    let ideal = null;
    if (v <= 0) {
      targets.forEach((l) => plan.set(l.id, 0));
    } else if (g.mode === "set") {
      targets.forEach((l) => plan.set(l.id, v));
    } else {
      // Scale from the remembered spread while the lights still sit where the card put them.
      const base = new Map(lit.map((l) => {
        const r = this._spread?.get(l.id);
        return [l.id, r && Math.abs(r.sent - l.b) <= 1 ? r.ideal : l.b];
      }));
      const at = (k) => this._groupMetric(lit.map((l) => level(base.get(l.id) * k)), true);
      // Smallest factor that brings the handle value up to v (clamping makes it a search, not a ratio).
      let lo = 0;
      let hi = 100 / Math.min(...base.values());
      for (let n = 0; n < 40; n++) {
        const mid = (lo + hi) / 2;
        if (at(mid) < v) lo = mid;
        else hi = mid;
      }
      ideal = new Map(lit.map((l) => [l.id, base.get(l.id) * hi]));
      lit.forEach((l) => plan.set(l.id, level(ideal.get(l.id))));
      if (g.targets === "all") ls.filter((l) => l.b === 0).forEach((l) => plan.set(l.id, v));
    }
    return { plan, ideal };
  }

  _sendGroup(v) {
    const r = this._groupPlan(v);
    if (!r) return this._render();
    const cur = new Map(this._groupLevels().map((l) => [l.id, l.b]));
    this._spread = r.ideal ? new Map([...r.ideal].map(([id, ideal]) => [id, { ideal, sent: r.plan.get(id) }])) : null;
    const changes = [...r.plan].filter(([id, b]) => cur.get(id) !== b);
    const gap = Number(this._group.stagger) || 0;
    this._gPending = changes.length ? { levels: r.plan, until: Date.now() + changes.length * gap + GROUP_PENDING_MS } : null;
    this._staggered(changes.map(([id, b]) => () => DOMAINS.light.write(this._hass, id, b)), gap);
    this._render();
  }

  // Run each send `gap` ms apart, so a Zigbee/Insteon network never gets them all at once.
  _staggered(sends, gap) {
    this._clearStagger();
    sends.forEach((go, i) => (i === 0 || !gap ? go() : this._staggerTimers.push(setTimeout(go, i * gap))));
  }

  _clearStagger() {
    for (const t of this._staggerTimers ?? []) clearTimeout(t);
    this._staggerTimers = [];
  }

  // The faint band behind the handle: [lo, hi] as fractions, or null to hide it.
  _setBand(range) {
    this._rangeEl.hidden = !range;
    if (!range) return;
    this._rangeEl.style.setProperty("--es-lo", range[0]);
    this._rangeEl.style.setProperty("--es-hi", range[1]);
  }

  _setTicks(fractions) {
    this._ticks.replaceChildren(...fractions.map((t) => {
      const d = document.createElement("span");
      d.className = "tick";
      d.style.setProperty("--t", t);
      return d;
    }));
  }

  // A light group's spread as a band and/or dots.
  _renderSpread(levels) {
    const g = this._group;
    const vals = g.band === "all" ? levels : levels.filter((b) => b > 0);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const mixed = vals.length > 1 && lo !== hi;
    this._setBand(mixed && g.show !== "dots" ? [lo / 100, hi / 100] : null);
    this._setTicks(mixed && g.show !== "band" ? [...new Set(vals)].map((b) => b / 100) : []);
    return { lit: levels.some((b) => b > 0), mixed, lo, hi };
  }

  _groupText(v, sp) {
    if (!sp.lit) return this._stateObj?.state === "on" ? "On" : "Off"; // only on/off lights are on
    if (!sp.mixed) return `${sp.hi}%`;
    if (this._group.label === "mixed") return "Mixed";
    if (this._group.label === "value") return `${v}%`;
    return `${sp.lo}%–${sp.hi}%`;
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    // "auto" lets the content set the height; a fixed row count leaves a gap below in grids and Bubble pop-ups.
    return { columns: 12, rows: "auto", min_columns: 4 };
  }

  disconnectedCallback() {
    // Pop-ups and view changes detach cards; don't leave a pending tap or key press to fire later.
    clearTimeout(this._holdTimer);
    clearTimeout(this._tapTimer);
    clearTimeout(this._keyTimer);
    this._press = this._tapTimer = this._pending = null;
    if (this._dragging) this._end();
    this._clearTarget();
    this._clearStagger();
    this._closeMenu();
  }

  _range() {
    const r = this._domain.range?.(this._stateObj) ?? [0, 100, this._domain.step?.(this._stateObj) ?? this._config.step];
    const own = !this._cover && !this._group;
    const min = own && this._config.min != null ? this._config.min : r[0];
    const max = own && this._config.max != null ? this._config.max : r[1];
    return { min: Number(min), max: Number(max), step: Number(r[2] ?? this._config.step) || 1 };
  }

  _build() {
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = HTML;
    const $ = (sel) => root.querySelector(sel);
    this._card = $("ha-card");
    this._userStyle = $("#user");
    this._head = $(".head");
    this._nameEl = $(".name");
    this._valEl = $(".val");
    this._track = $(".track");
    this._bubble = $(".bubble");
    this._pip = $(".pip");
    this._icon = $("ha-state-icon");
    this._shadeEl = $(".pip .shade");
    this._stop = $(".stop");
    this._cv = $(".cv");
    this._ticks = $(".ticks");
    this._ghost = $(".ghost");
    this._rangeEl = $(".range");
    this._chips = $(".chips");
    this._menu = $(".menu");
    this._infoEls = Object.fromEntries([...root.querySelectorAll("[data-slot]")].map((el) => [el.dataset.slot, el]));

    this._track.addEventListener("pointerdown", (e) => this._down(e));
    this._track.addEventListener("pointermove", (e) => this._move(e));
    this._track.addEventListener("pointerup", (e) => this._up(e));
    this._track.addEventListener("pointercancel", () => this._cancel());
    this._track.addEventListener("keydown", (e) => this._key(e));
    const tap = () => this._run(this._actions.tap);
    this._nameEl.addEventListener("click", tap);
    // With the cover preset menu, the value opens the menu instead of running the tap action.
    const valTap = () => (this._cover?.preset_style === "menu" ? this._toggleMenu() : tap());
    this._valEl.addEventListener("click", valTap);
    this._valEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); valTap(); }
      if (e.key === "Escape") this._closeMenu();
    });
    this._cv.addEventListener("click", (e) => {
      if (e.target.closest(".stopbtn")) this._stopCover();
      else if (e.target.closest(".batt")) this._run({ action: "more-info", entity: this._battery.entity });
    });
    this._chips.addEventListener("click", (e) => {
      const b = e.target.closest("[data-p]");
      if (b) this._sendPosition(Number(b.dataset.p));
    });
    this._menu.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      this._closeMenu();
      if (b.dataset.stop) this._stopCover();
      else this._sendPosition(Number(b.dataset.p));
    });
    this._menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { this._closeMenu(); this._valEl.focus(); }
    });
    this._outside = (e) => { if (!e.composedPath().includes(this)) this._closeMenu(); };
    // The pip and chips sit on the track, so keep their presses from starting a drag.
    this._pip.addEventListener("pointerdown", (e) => e.stopPropagation());
    this._pip.addEventListener("click", tap);
    for (const el of Object.values(this._infoEls)) {
      el.addEventListener("pointerdown", (e) => e.target.closest(".chip") && e.stopPropagation());
      el.addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        const i = this._info[chip.dataset.index];
        this._run({ entity: i.entity, ...(i.tap_action ?? { action: "more-info" }) });
      });
    }
  }

  // Everything that depends only on the config.
  _applyConfig() {
    const cfg = this._config;
    this._card.classList.toggle("transparent", this._style.transparent);
    this._userStyle.textContent = this._style.css;
    const g = this._glow;
    setVar(this._track, "--es-glow-gap", g && px(g.gap));
    setVar(this._track, "--es-glow-blur", g && px(g.softness));
    setVar(this._track, "--es-glow-a", g && `${g.strength}%`);
    setVar(this._track, "--es-glow-drag", g && `${g.drag}%`);
    setVar(this._track, "--es-glow-edge", g && `${g.edge}%`);
    setVar(this._track, "--es-glow-edge-w", g && px(g.edge_width));

    const pip = cfg.icon !== false;
    this._pip.hidden = !pip;
    this._card.classList.toggle("with-pip", pip);
    this._card.classList.toggle("outside", pip && cfg.icon_position === "outside");
    this._icon.icon = typeof cfg.icon === "string" ? cfg.icon : undefined;
    // Off, the pip stands out from what is behind it: the empty track, or the card when outside.
    this._pipOffBg = cfg.icon_position === "outside" ? TILE : "var(--card-background-color, #3a3b3d)";

    const cv = this._cover;
    this._card.classList.toggle("cover", !!cv);
    const menu = cv?.preset_style === "menu";
    this._valEl.classList.toggle("menuable", menu);
    if (menu) {
      this._valEl.setAttribute("tabindex", "0");
      this._valEl.setAttribute("role", "button");
      this._valEl.setAttribute("aria-haspopup", "menu");
    } else {
      for (const a of ["tabindex", "role", "aria-haspopup", "aria-expanded"]) this._valEl.removeAttribute(a);
    }
    this._closeMenu();
    const inner = cv && cv.ticks && cv.preset_style !== "none" ? cv.presets.filter((p) => p > 0 && p < 100) : [];
    this._setTicks(inner.map((p) => this._shown(p) / 100));
    this._chips.hidden = cv?.preset_style !== "chips";
    if (cv?.preset_style === "chips") this._chips.style.setProperty("--n", cv.presets.length);
  }

  // Cover position in slider terms (flipped with fill: closed); its own inverse.
  _shown(pos) {
    return this._cover?.fill === "closed" ? 100 - pos : pos;
  }

  _coverLabel(pos, suffix = "") {
    return endLabel(pos) ?? (this._cover?.fill === "closed" ? `${Math.round(100 - pos)}% closed` : `${Math.round(pos)}%${suffix}`);
  }

  // Snap onto the presets: always for steps, within the detent otherwise.
  _snap(v) {
    const cv = this._cover;
    if (!cv || cv.preset_style === "none") return v;
    const shown = cv.presets.map((p) => this._shown(p));
    if (cv.preset_style === "steps") return shown.reduce((best, p) => (Math.abs(p - v) < Math.abs(best - v) ? p : best), shown[0]);
    return shown.find((p) => Math.abs(p - v) <= Number(cv.detent)) ?? v;
  }

  _colors() {
    const s = this._stateObj;
    // A cover is never "off": closed is just position 0.
    const on = !!s && (this._cover ? !["unavailable", "unknown"].includes(s.state) : !OFF_STATES.has(s.state));
    const rgb = parseColor(this._style.color) ?? (on ? (this._group?.area ? this._blend() : s.attributes.rgb_color) : null) ??
      DEFAULT_RGB.get(this._domain) ?? null;
    const active = rgb ? `rgb(${rgb.join(",")})` : "var(--state-icon-active-color, var(--primary-color))";
    const pb = this._style.pipBg;
    return {
      on,
      active,
      inactive: on ? `color-mix(in srgb, ${active} 24%, ${TILE})` : TILE,
      onActive: rgb ? (isLight(rgb) ? "rgba(0,0,0,.75)" : "#fff") : "var(--text-primary-color, #fff)",
      pipOn: typeof pb === "string" ? pb : `color-mix(in srgb, ${active} ${pb ?? PIP_TINT}%, #000)`,
      // The lit icon sits on a near-full-colour pip, so it needs the fill's contrast colour, softened.
      pipFg: rgb && isLight(rgb) ? "rgba(0,0,0,.7)" : "rgba(255,255,255,.7)",
    };
  }

  // The mean colour of the members that are on.
  _blend() {
    const cs = this._members(this._stateObj).map((id) => this._hass?.states[id])
      .filter((x) => x?.state === "on" && Array.isArray(x.attributes.rgb_color)).map((x) => x.attributes.rgb_color);
    return cs.length ? [0, 1, 2].map((i) => Math.round(cs.reduce((a, c) => a + c[i], 0) / cs.length)) : null;
  }

  // Full render after a state change.
  _render() {
    if (!this._track || !this._config) return;
    if (this._group) {
      const dim = this._members(this._stateObj).map((id) => this._hass?.states[id]).filter((x) => x && !onOffOnly(x));
      const on = dim.filter((x) => x.state === "on").length;
      const g = this._group;
      this.style.display = dim.length < (Number(g.min_lights) || 0) || on < (Number(g.min_on) || 0) ? "none" : "";
    }
    const s = this._stateObj;
    this._unavailable = !s || s.state === "unavailable";
    this._r = s ? this._range() : { min: 0, max: 100, step: 1 };
    this._unit = this._domain.range ? s?.attributes.unit_of_measurement ?? "" : "%";
    const c = (this._c = this._colors());

    this._card.style.opacity = this._unavailable ? 0.5 : "";
    this._track.style.setProperty("--es-active", c.active);
    this._track.style.setProperty("--es-inactive", c.inactive);
    this._track.style.setProperty("--es-on-active", c.onActive);
    this._track.setAttribute("aria-valuemin", this._r.min);
    this._track.setAttribute("aria-valuemax", this._r.max);
    this._track.setAttribute("aria-label", this._name());
    this._nameEl.textContent = this._name();
    if (!this._pip.hidden) {
      this._icon.hass = this._hass;
      this._icon.stateObj = s;
      // Covers get a drawn shade that follows the position, unless an icon is configured.
      const drawn = !!this._cover && typeof this._config.icon !== "string";
      this._icon.hidden = drawn;
      this._shadeEl.hidden = !drawn;
      this._shadeLevel = null;
    }
    this._renderInfo();
    this._renderHeaderExtras();
    this._renderValue(this._handleValue());
  }

  // The entity value, or for a moving cover (handle at target) the requested position.
  _handleValue() {
    const s = this._stateObj;
    if (!s) return 0;
    if (this._group) return this._groupMetric(this._groupLevels().map((l) => l.b));
    const pos = this._domain.read(s);
    if (!this._cover) return pos;
    const at = this._target != null && this._cover.moving_handle !== "actual" ? this._target : this._simPos() ?? pos;
    return this._shown(at);
  }

  // Cover movement: the requested position is kept until the cover gets there, stops short or times out.
  _moving() {
    const s = this._stateObj;
    if (!this._cover || !s) return null;
    const sim = this._simPos();
    if (sim != null) return { from: sim, to: this._target, dir: Math.sign(this._target - sim) || 1 };
    const pos = this._domain.read(s);
    if (this._target != null && Math.abs(this._target - pos) > 1) return { from: pos, to: this._target, dir: Math.sign(this._target - pos) };
    if (MOVING_STATES.has(s.state)) return { from: pos, to: null, dir: s.state === "opening" ? 1 : -1 };
    return null;
  }

  _setTarget(pos) {
    if (!this._cover) return;
    const from = this._simPos() ?? (this._stateObj ? this._domain.read(this._stateObj) : pos);
    this._clearTarget();
    this._target = pos;
    this._targetMax = setTimeout(() => this._dropTarget(), TARGET_MAX_MS);
    const travel = Number(this._cover.travel_time) || 0;
    if (travel > 0 && Math.abs(pos - from) > 1) {
      // Estimated movement at travel_time, ignoring an optimistic position report.
      this._sim = { from, t0: Date.now(), dur: (Math.abs(pos - from) / 100) * travel * 1000 };
      this._simTimer = setInterval(() => {
        if (this._simPos() == null) this._dropTarget();
        else if (!this._dragging) {
          this._renderHeaderExtras();
          this._renderValue(this._handleValue());
        }
      }, 250);
    } else {
      this._armStale();
    }
  }

  _simPos() {
    const sim = this._sim;
    if (!sim || this._target == null) return null;
    const f = (Date.now() - sim.t0) / sim.dur;
    return f >= 1 ? null : sim.from + (this._target - sim.from) * f;
  }

  _armStale() {
    clearTimeout(this._targetStale);
    this._targetStale = setTimeout(() => {
      if (!MOVING_STATES.has(this._stateObj?.state)) this._dropTarget();
      else this._armStale();
    }, TARGET_STALE_MS);
  }

  _clearTarget() {
    clearTimeout(this._targetStale);
    clearTimeout(this._targetMax);
    clearInterval(this._simTimer);
    this._target = this._targetStale = this._targetMax = this._simTimer = this._sim = null;
  }

  _dropTarget() {
    if (this._target == null) return;
    this._clearTarget();
    if (!this._dragging) this._render();
  }

  _trackTarget() {
    if (this._target == null || !this._stateObj || this._sim) return; // a simulated move ends on its own clock
    if (Math.abs(this._domain.read(this._stateObj) - this._target) <= 1) this._clearTarget();
    else this._armStale();
  }

  // Redrawn only when the fabric moves a step (12 from open to closed).
  _renderShade(pos) {
    if (this._shadeEl.hidden || pos == null) return;
    const level = Math.round(((100 - pos) / 100) * 12);
    if (level === this._shadeLevel) return;
    this._shadeLevel = level;
    this._shadeEl.innerHTML = shadeIcon(pos);
  }

  // Battery chip, and for covers the movement readout, stop button, shade, ghost, band, chips and menu.
  _renderHeaderExtras() {
    const parts = [];
    const b = this._battery && this._hass?.states[this._battery.entity];
    const pct = b ? Number(b.state) : NaN;
    if (Number.isFinite(pct) && (this._battery.show === "always" || pct < this._battery.low)) {
      const low = pct < this._battery.low;
      parts.push(`<span class="batt${low ? " low" : ""}" role="button" aria-label="Battery ${Math.round(pct)}%">${batteryIcon(pct)}${Math.round(pct)}%</span>`);
    }
    const m = this._moving();
    if (m?.to != null) parts.push(`<span class="moving">${Math.round(m.from)} → ${Math.round(m.to)}</span>`);
    if (m && this._cover.stop_button) parts.push(`<button class="stopbtn" type="button" aria-label="Stop"><i></i></button>`);
    this._cv.innerHTML = parts.join("");

    if (!this._cover) return;
    const s = this._stateObj;
    const pos = s ? this._domain.read(s) : null;
    this._renderShade(m ? m.from : pos);
    // A mark at the other end of the movement from the handle.
    this._ghost.hidden = m?.to == null;
    if (m?.to != null) this._ghost.style.setProperty("--es-g", this._shown(this._cover.moving_handle === "actual" ? m.to : m.from) / 100);
    const ps = this._members(s).map((id) => this._hass?.states[id]).filter(Boolean).map((x) => this._domain.read(x));
    this._mixed = ps.length > 1 && Math.min(...ps) !== Math.max(...ps);
    const ends = this._mixed ? [this._shown(Math.min(...ps)), this._shown(Math.max(...ps))] : null;
    this._setBand(ends && [Math.min(...ends) / 100, Math.max(...ends) / 100]);
    if (this._cover.preset_style === "chips") {
      const cur = m?.to ?? pos;
      this._chips.innerHTML = [...this._cover.presets].reverse().map((p) =>
        `<button type="button" data-p="${p}" class="${!this._mixed && cur === p ? "on" : ""}">${endLabel(p) ?? this._shown(p)}</button>`).join("");
    }
    if (!this._menu.hidden) this._fillMenu();
  }

  // The value alone; this is all that runs while dragging.
  _renderValue(v) {
    const { min, max } = this._r;
    const c = this._c;
    const p = (this._p = max > min ? clamp((v - min) / (max - min), 0, 1) : 0);
    const lit = c.on && p > 0;
    const off = this._stateObj && (this._stateObj.state === "off" || (this._domain === DOMAINS.light && v === 0));
    const t = this._track;
    t.style.setProperty("--es-p", p);
    t.style.setProperty("--es-handle", p > 0 ? c.active : "var(--secondary-text-color)");
    t.setAttribute("aria-valuenow", v);
    t.classList.toggle("lit", !!this._glow && lit);
    // While dragging (or after a key press) a group's band and label show where the lights would go.
    const plan = this._group && (this._dragging || this._pending != null) ? this._groupPlan(v)?.plan : null;
    const sp = this._group ? this._renderSpread(plan ? [...plan.values()] : this._groupLevels().map((l) => l.b)) : null;
    this._valEl.textContent = this._unavailable ? "Unavailable" : this._cover ? this._coverText(v) : sp ? this._groupText(v, sp)
      : off ? "Off" : `${this._fmt(v)}${this._unit}`;
    this._valEl.classList.toggle("off", this._unavailable || (sp ? !sp.lit && this._stateObj?.state !== "on" : !this._cover && !!off));
    this._bubble.textContent = this._fmt(v);
    this._bubble.classList.toggle("show",
      this._config.bubble === "always" || (this._config.bubble === "drag" && !!this._dragging));
    this._syncStop();
    if (!this._pip.hidden) {
      this._pip.style.setProperty("--es-pip-bg", lit ? c.pipOn : this._pipOffBg);
      this._pip.style.setProperty("--es-pip-fg", lit ? c.pipFg : "var(--secondary-text-color)");
    }
  }

  _coverText(v) {
    if (this._dragging || this._pending != null) return this._coverLabel(this._shown(v));
    const m = this._moving();
    if (m) return m.dir > 0 ? "Opening" : "Closing";
    if (this._mixed) return "Mixed";
    return this._coverLabel(this._domain.read(this._stateObj));
  }

  // The stop dot marks the far end; hidden when the fill reaches it or a chip sits there.
  _syncStop() {
    this._stop.classList.toggle("hide", this._p >= 0.97 || this._infoEls["track-right"].childElementCount > 0);
  }

  _renderInfo() {
    const cfg = this._config;
    const slots = {};
    this._info.forEach((i, n) => {
      const s = this._infoStates?.[n];
      if (!s || ["unavailable", "unknown"].includes(s.state)) return;
      const where = (i.position ?? cfg.info_position) === "header" ? "header" : "track";
      const align = i.align ?? cfg.info_align;
      (slots[`${where}-${ALIGNS.includes(align) ? align : "right"}`] ??= []).push(this._chip(i, s, n));
    });
    for (const [slot, el] of Object.entries(this._infoEls)) el.replaceChildren(...(slots[slot] ?? []));
    this._head.classList.toggle("centred", !!slots["header-center"]);
    this._syncStop();
  }

  _chip(i, s, n) {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.dataset.index = n;
    if (i.background) chip.style.setProperty("--es-chip-bg", i.background);
    if (i.color) chip.style.color = i.color;
    for (const [prop, val] of toDecls(i.styles)) chip.style.setProperty(prop, val);
    if (i.icon) {
      const icon = document.createElement("ha-icon");
      icon.setAttribute("icon", i.icon);
      chip.append(icon);
    }
    chip.append(this._hass?.formatEntityState?.(s) ??
      `${s.state}${s.attributes.unit_of_measurement ? " " + s.attributes.unit_of_measurement : ""}`);
    return chip;
  }

  _name() {
    return this._config.name ?? this._stateObj?.attributes.friendly_name ?? this._config.entity;
  }

  _fmt(v) {
    const dp = (String(this._r.step).split(".")[1] ?? "").length;
    return Number(v).toFixed(dp);
  }

  _valueAt(clientX) {
    const r = this._rect ?? this._track.getBoundingClientRect();
    const { min, max, step } = this._r;
    const p = clamp((clientX - r.left) / r.width, 0, 1);
    return this._snap(clamp(Math.round((min + p * (max - min)) / step) * step, min, max));
  }

  // Drag sets the value, a tap jumps to that spot, hold and double tap run their actions.
  // Nothing moves until the pointer passes DRAG_THRESHOLD_PX, so a hold or double tap never changes the value.
  _down(e) {
    if (this._unavailable || e.button > 0) return;
    this._track.setPointerCapture(e.pointerId);
    this._rect = this._track.getBoundingClientRect();
    this._press = { x: e.clientX };
    this._holdTimer = setTimeout(() => {
      if (this._dragging || !this._press) return;
      this._press = null;
      this._fire("haptic", "medium");
      this._run(this._actions.hold);
    }, HOLD_MS);
  }

  _move(e) {
    if (!this._press) return;
    if (!this._dragging) {
      if (Math.abs(e.clientX - this._press.x) < DRAG_THRESHOLD_PX) return;
      if (this._group && !this._groupLevels().some((l) => l.b > 0)) return;
      clearTimeout(this._holdTimer);
      this._dragging = true;
      this._track.classList.add("dragging");
    }
    this._value = this._valueAt(e.clientX);
    this._frame ??= requestAnimationFrame(() => {
      this._frame = null;
      if (this._dragging) this._renderValue(this._value);
    });
    if (this._config.live && !this._cover && !this._group && !this._throttle) {
      this._throttle = setTimeout(() => {
        this._throttle = null;
        if (this._dragging) this._send(this._value);
      }, THROTTLE_MS);
    }
  }

  _up(e) {
    clearTimeout(this._holdTimer);
    if (!this._press) return; // the hold action already ran
    this._press = null;
    if (this._dragging) {
      this._end();
      this._send(this._value);
      return;
    }
    const v = this._valueAt(e.clientX);
    this._rect = null;
    if ((this._actions.double_tap.action ?? "none") === "none") {
      this._send(v);
    } else if (this._tapTimer) {
      clearTimeout(this._tapTimer);
      this._tapTimer = null;
      this._run(this._actions.double_tap);
    } else {
      this._tapTimer = setTimeout(() => {
        this._tapTimer = null;
        this._send(v);
      }, DOUBLE_TAP_MS);
    }
  }

  _cancel() {
    // The browser took over (vertical scroll): drop the change.
    clearTimeout(this._holdTimer);
    this._press = null;
    this._end();
    this._render();
  }

  _end() {
    this._dragging = false;
    this._rect = null;
    this._track.classList.remove("dragging");
    cancelAnimationFrame(this._frame);
    this._frame = null;
    clearTimeout(this._throttle);
    this._throttle = null;
  }

  _send(v) {
    if (this._cover) return this._sendPosition(this._shown(v));
    if (this._group) return this._sendGroup(v);
    this._renderValue(v);
    this._domain.write(this._hass, this._config.entity, v);
  }

  // A cover group gets one command per member, `stagger` ms apart.
  _sendPosition(pos) {
    pos = clamp(Math.round(pos), 0, 100);
    this._clearStagger();
    this._setTarget(pos);
    this._render();
    const members = this._members(this._stateObj);
    const gap = Number(this._cover?.stagger ?? 0);
    const ids = members.length && gap > 0 ? members : [this._config.entity];
    this._staggered(ids.map((id) => () => this._domain.write(this._hass, id, pos)), gap);
  }

  _stopCover() {
    this._clearStagger();
    this._hass.callService("cover", "stop_cover", { entity_id: this._config.entity });
    this._clearTarget();
    this._render();
  }

  _toggleMenu() {
    if (!this._menu.hidden) return this._closeMenu();
    this._fillMenu();
    this._menu.hidden = false;
    this._valEl.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", this._outside, true);
    this._menu.querySelector("button.cur, button")?.focus();
  }

  _closeMenu() {
    if (!this._menu || this._menu.hidden) return;
    this._menu.hidden = true;
    this._valEl.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", this._outside, true);
  }

  _fillMenu() {
    const s = this._stateObj;
    const m = this._moving();
    const cur = m?.to ?? (s && !this._mixed ? this._domain.read(s) : null);
    const items = [...this._cover.presets].reverse().map((p) =>
      `<button type="button" role="menuitem" data-p="${p}" class="${cur === p ? "cur" : ""}">` +
      `${this._coverLabel(p, " open")}<span>${this._shown(p)}</span></button>`);
    if (m) items.push(`<hr><button type="button" role="menuitem" data-stop="1">Stop</button>`);
    this._menu.innerHTML = items.join("");
  }

  _key(e) {
    if (this._unavailable) return;
    const { min, max, step } = this._r;
    const cur = this._pending ?? this._handleValue();
    let next = null;
    if (this._cover && this._cover.preset_style !== "none" && e.key.startsWith("Arrow")) {
      // Arrow keys jump between presets on a cover.
      const shown = this._cover.presets.map((p) => this._shown(p)).sort((x, y) => x - y);
      const up = e.key === "ArrowRight" || e.key === "ArrowUp";
      next = up ? shown.find((p) => p > cur) ?? max : [...shown].reverse().find((p) => p < cur) ?? min;
    } else {
      const big = Math.max(step, (max - min) / 10);
      const delta = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big }[e.key];
      next = delta !== undefined ? cur + delta : e.key === "Home" ? min : e.key === "End" ? max : null;
      if (next === null) return;
      next = clamp(next, min, max);
    }
    e.preventDefault();
    this._pending = next;
    this._renderValue(next);
    clearTimeout(this._keyTimer);
    this._keyTimer = setTimeout(() => {
      this._pending = null;
      this._send(next);
    }, KEY_MS);
  }

  _run(a) {
    const entity = a.entity ?? this._config.entity;
    switch (a.action) {
      case "toggle":
        return this._toggle(entity);
      case "more-info":
        return this._fire("hass-more-info", { entityId: entity });
      case "navigate":
        if (!a.navigation_path) return;
        history.pushState(null, "", a.navigation_path);
        return window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
      case "url":
        return a.url_path && window.open(a.url_path, "_blank");
      case "perform-action":
      case "call-service": {
        const [domain, service] = (a.perform_action ?? a.service ?? "").split(".");
        if (domain && service) this._hass.callService(domain, service, a.data ?? a.service_data ?? {}, a.target);
        return;
      }
      case "fire-dom-event":
        return this._fire("ll-custom", a);
    }
  }

  _fire(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }

  _toggle(entity) {
    const domain = entity.split(".")[0];
    const own = ["light", "fan", "cover", "media_player", "switch", "input_boolean"].includes(domain);
    this._hass.callService(own ? domain : "homeassistant", "toggle", { entity_id: entity });
  }
}

if (!customElements.get("expressive-slider-card")) {
  console.info(`%c EXPRESSIVE-SLIDER-CARD %c ${VERSION} `, "background:#c97e0b;color:#fff;font-weight:600", "background:#28282a;color:#fff");
  customElements.define("expressive-slider-card", ExpressiveSliderCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "expressive-slider-card",
    name: "Expressive slider",
    description: "Material 3 Expressive-style slider with a split track and value bubble",
    preview: true,
  });
}
