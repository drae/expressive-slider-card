# Expressive Slider Card

A Material 3 "Expressive"-style slider card for Home Assistant. The track is split, with a gap either side of a thin handle. The fill takes its colour from the entity, and a value bubble pops up above the handle while you drag.

It is a single plain JavaScript file with no dependencies.

## Supported entities

| Domain | Controls |
| --- | --- |
| `light` | brightness (on/off-only lights snap to 0 or 100%) |
| `light` group | every member at once, see [Light groups](#light-groups) |
| `fan` | percentage |
| `cover` | position, see [Covers](#covers) |
| `media_player` | volume |
| `input_number`, `number` | value |

## Installation

### Manual

1. Copy `expressive-slider-card.js` to `/config/www/` (any subfolder works).
2. Add a dashboard resource of type **JavaScript module**:
   ```
   /local/expressive-slider-card.js?v=1
   ```
3. Raise `?v=` whenever you replace the file, then hard-refresh the browser.

### HACS

Add this repository as a custom repository, with the category **Dashboard**.

## Basic use

```yaml
type: custom:expressive-slider-card
entity: light.lounge_main_sofa
name: Sofa
```

## Options

| Key | Default | Description |
| --- | --- | --- |
| `entity` | required | The entity to control. |
| `name` | entity name | The header text. |
| `icon` | entity icon | Any `mdi:` icon. `false` hides it. |
| `icon_position` | `track` | `track`: a round pip at the start of the slider. `outside`: to the left of the slider. |
| `bubble` | `drag` | `drag`, `always` or `never`. |
| `live` | `false` | `true` sends updates while dragging (throttled to 300 ms). |
| `step` | `1` | The value step. |
| `glow` | lights only | `true` or `false`: the soft light round the fill. Set its look under `styles.glow`. |
| `info` | none | Extra readings, see [Info chips](#info-chips). |
| `info_position` | `track` | The default `position` for info chips. |
| `info_align` | `right` | The default `align` for info chips. |
| `battery` | none | A battery sensor shown in the header. |
| `battery_show` | `low` | `low` shows it only below `battery_low`. `always` shows it at all times. |
| `battery_low` | `20` | Below this %, the chip turns the alert colour and its icon blinks. |
| `cover` | | Cover options, see [Covers](#covers). |
| `group` | | Light group options, see [Light groups](#light-groups). |
| `styles` | | Appearance, see [Styles](#styles). |
| `tap_action` | `toggle` | Tapping the name, the value or the icon. A tap on the slider sets the value. |
| `hold_action` | `more-info` | Holding the slider. |
| `double_tap_action` | `toggle` | Double-tapping the slider. A single tap waits 250 ms before setting the value, unless this is `none`. |

### Actions

Actions use the usual Home Assistant and Bubble Card form: `more-info`, `toggle`, `navigate` (`navigation_path`), `url` (`url_path`), `perform-action` (`perform_action`, `data`, `target`), `fire-dom-event` and `none`. An `entity:` inside an action targets that entity instead of the card's. A plain string, such as `tap_action: more-info`, is short for `action: more-info`.

```yaml
tap_action:
  action: navigate
  navigation_path: "#lounge"
```

### Info chips

Info chips are secondary readings, such as power use, shown inside the slider or in the header. A plain entity ID works as a chip with the defaults.

```yaml
info:
  - entity: sensor.lounge_main_sofa_power
    icon: mdi:flash
    position: track      # track (inside the slider) | header (the row above it)
    align: right         # left | center | right
    background: "#0008"  # this chip's fill inside the slider
    color: white
    styles:
      size: 13
    tap_action:          # default: more-info for this chip's entity
      action: more-info
```

## Covers

Every key is optional.

```yaml
type: custom:expressive-slider-card
entity: cover.sunroom_shades
cover:
  fill: open             # open: fill = HA position (100 = fully up)
                         # closed: fill = how far the shade is down; the value, menu and chips read as % closed
  presets:               # HA positions
    - 0
    - 25
    - 50
    - 75
    - 100
  preset_style: menu     # menu (tap the value) | chips (a row under the slider) | steps (slider only lands on presets) | none
  ticks: true            # dots on the track at the presets between the ends
  detent: 3              # % either side of a preset that snaps onto it
  moving_handle: target  # target: handle at the requested position, a mark at the shade | actual: the reverse
  stop_button: true      # a stop button in the header while the cover moves
  stagger: 400           # ms between members of a cover group
  travel_time: 45        # seconds from closed to open; the card then shows an estimated position
```

A cover sends its new position only when you release the slider. Without an `icon`, the pip shows a drawn shade that follows the position. Set `travel_time` for covers that report the new position straight away instead of while they move.

## Light groups

Point the card at a light group, for example `light.all_lights`, to control every member at once. Every key is optional.

```yaml
type: custom:expressive-slider-card
entity: light.all_lights
name: All lights
icon: mdi:lightbulb-group
group:
  band: on        # on: the band spans the lights that are on | all: off lights count as 0
  show: band      # band | dots (one per level) | both
  value: mean     # mean | max: where the handle sits, from the dimmable lights that are on
  label: range    # range ("20%–100%") | mixed ("Mixed") | value (the handle %)
  mode: scale     # scale: keep the lights' differences | set: all to the same level
  targets: on     # on: only lights already on | all: lights that are off come on too
  stagger: 150    # ms between each light's command
```

The slider acts only while at least one dimmable light is on. In `scale` mode the card remembers the original spread, so lights pushed to 100% get their differences back when you drag down again. Members that only switch on and off are left out.

Raise `stagger` for lights that drop commands sent close together. Insteon, for example, needs about 1000 ms.

## Styles

Every part of the card's appearance is set under `styles`, with one block per element.

```yaml
styles:
  card:
    background: transparent  # transparent: no background, border or shadow (for stacking); anything else is a CSS background
  name:
    size: 13                 # bare numbers become px
    weight: 500
  value:
    color: var(--primary-text-color)
  track:
    color: "#f5c27a"         # the slider colour, instead of the entity's
    height: 56
    radius: 20
  pip:
    size: 36                 # the round background behind the icon
    background: 25           # number: % of the slider colour mixed with black while on; or a fixed colour
  icon:
    size: 22
  glow:
    gap: 0                   # px of clear space between the fill and the glow
    softness: 33             # px blur
    strength: 66             # % opacity
    drag: 10                 # % extra while dragging
```

**Elements:** `card`, `header`, `name` (alias `title`), `value` (alias `state`), `info` (all chips), `track_info` (chips inside the slider), `track`, `fill`, `empty`, `handle`, `bubble`, `pip`, `icon`, `stop` and `glow`.

- Properties use CSS names. `size`, `weight` and `color` are short for `font-size`, `font-weight` and `color`.
- `track` also takes `inner-radius`, `gap`, `handle-width` and `tile` (the colour the empty part is mixed from).
- `pip.background` applies while the entity is on. When it is off, the pip always uses the automatic background.
- `info.color` and `track_info.background` are defaults. A chip's own settings override them.
- `glow: false` under `styles` turns the glow off.
- Each block can also be a list of single properties. A plain string is used as raw CSS.

## Development

```sh
npm install
npm test
```

The tests run the card in [jsdom](https://github.com/jsdom/jsdom) against a mock `hass` object. Each file prints `ok` or `FAIL` per check and exits non-zero on any failure. To test another copy of the card, run `node tests/<file>.test.js path/to/card.js`.

## License

BSD 3-Clause. See [LICENSE](LICENSE).
