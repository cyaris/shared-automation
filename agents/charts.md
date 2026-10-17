# Charts

Applies to Canvas, D3, and chart code.
## Canvas Rendering And D3

- For dense or frequently animated graphics where Canvas is the appropriate renderer, prefer native Canvas 2D for rendering and animated rendering rather than representing individual graphical objects as SVG/DOM elements.
- Prefer the flow `data -> D3/layout/animation calculations -> render-ready data -> Canvas drawing`. Use D3 where it provides an appropriate abstraction for scales, interpolation, easing, layouts, force simulations, data transformations, or similar visualization math rather than reimplementing that functionality in raw JavaScript. Use D3 utilities directly with Canvas when they support a Canvas context; D3 does not imply SVG rendering.
- Avoid DOM-oriented `d3-selection`/`d3-transition` patterns for dense Canvas-rendered graphics. Transitions should generally interpolate numerical/application state and render the resulting state to Canvas.
- Keep renderers simple and declarative. Separate computation, state, animation, interaction, and drawing when doing so materially improves clarity, testing, or reuse, while applying the applicable single-use guidance: calculation logic used by only one Canvas drawing function may live directly in that function when it remains clear and manageable. Name geometry and extract semantic drawing primitives only when the name or abstraction adds material value.
- Keep `requestAnimationFrame` callbacks small by delegating substantial state updates, calculations, and drawing to appropriately scoped named functions, and make animations time-based rather than frame-count-based. This callback boundary does not require each delegated operation to be split into additional single-use helpers.
- Pause timer-driven animation launches and repeating effect cadence while the document is hidden. Use `createPausableTimer` instead of raw `setTimeout`, `setInterval`, or `d3-timer` scheduling for animation work so hidden time preserves the remaining delay and returning to the page does not replay accumulated callbacks. Audit RAF-only paths separately; browsers pause RAF for hidden documents, and those paths need no timer replacement when a resumed timestamp gap cannot enqueue missed work.
- Contain temporary Canvas state with `context.save()`/`context.restore()` when drawing changes transforms or shared context properties.
- Use D3 color scales/interpolation where applicable while preserving application-defined palettes/colors as the source of truth.
- Do not use D3 merely for the sake of using D3; simple application-specific calculations should remain ordinary JavaScript when that is clearer.
- Do not introduce a Canvas framework or retained-mode scene graph when native Canvas plus appropriate D3 utilities is sufficient, and do not add abstractions that merely rename Canvas APIs without semantic value.
- Preserve meaningful rendering performance. Isolate and document a less-readable hot-path optimization when profiling justifies it rather than sacrificing performance solely for abstraction.
- Reusable Canvas mechanics (context/DPR setup, resize handling, `requestAnimationFrame` and visibility-aware timer lifecycle, elapsed-time/progress helpers, generic primitive drawing) belong in `svelte-lib`. Application/domain-specific rendering behavior, such as chart- or scene-specific drawing and motion, belongs in the consuming repository.
- Prefer a d3-shape line/curve generator's `.context(canvasContext)` mode to draw directly to a Canvas 2D context instead of building and re-parsing an SVG `d` string every frame.
- Canvas has no CSS `:hover`. To hit-test a stroked line/curve, build a `Path2D` from the same d3-shape generator and use `context.isPointInStroke(path2D, x, y)` against the tracked pointer position rather than reimplementing point-to-curve distance math.
- Canvas rasterizes sub-device-pixel strokes unevenly across browsers (Safari in particular can render the same fractional-width line anywhere from near-invisible to roughly double its requested width depending on position). Snap stroke geometry to the device pixel grid with `snapToDevicePixel` before drawing a line that needs to look the same weight everywhere.
- When two adjacent shapes share a boundary, draw that boundary once rather than letting each shape stroke its own edge; a shared edge stroked from both sides renders roughly twice as heavy as an edge stroked from only one side.
- A circle stroked with `context.arc` + `context.stroke()` renders as a hollow ring whenever its diameter is smaller than its stroke width, because the stroke's inner edge falls past the center instead of closing over it. Use `strokeOrFillCircle` for a circle whose radius may shrink below half its stroke width so it fills solid instead of hollowing out.
- Keep canvas/SVG helper names tied to the primitive or behavior they provide rather than to project-specific chart layer names.

## Responsive Charts

- Use mobile-first sizing for embedded chart/tool shells: full width below desktop, and preserve established desktop widths at `min-[1300px]` when a project already uses that as its large-screen breakpoint.
- For chart internals, use `640px` as the compact mobile cutoff, `900px` as the point where desktop chart behavior should usually return, and `1300px` as the large-shell breakpoint unless local project conventions require different values. Keep desktop-affecting scales, force layouts, and dimensions unchanged at or above the applicable desktop cutoff.
- For responsive charts, derive render-ready dimensions and density from the active viewport mode while preserving
  established desktop geometry at or above the desktop cutoff. Keep breakpoint selection and generic layout mechanics
  shared; keep chart-specific domains, labels, marks, and interaction semantics in the consuming application.

## Chart Colors

- When de-emphasizing chart marks relative to a semantic surface, keep the rendered colors opaque and use
  `color-mix(in srgb, <mark-color> 50%, var(--ui-surface))`, matching filtered legend marks. Keep active marks and any
  interaction-defined neighborhood at their original colors. Do not use element opacity when the intended result is a
  stable surface-relative color rather than revealing content underneath.
- Use `chart-line` for fully opaque neutral chart geometry:
  - Default it to `ui-border` so chart geometry keeps the same quiet neutral weight as control borders.
  - Axes and ticks
  - Forecast or reference dividers
  - Neutral outlines and outer frames
- Use the opaque `chart-band` and `chart-band-subtle` roles for plot-region shading. Derive their default colors from `chart-line` and `ui-surface` instead of recreating them with element opacity or fixed palette utilities.
