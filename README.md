# Trusted DOM renderer

Consumes exact PP RenderPlans, not HAT source code. Native semantic DOM, keyboard
buttons, labelled forms and bounded JSON details replace Vue. `textContent` only;
no HTML parser, eval, remote component registry or external URL dereference.
Trusted renderer capability is the existing PP region-role/value/action algebra,
not a new semantic vocabulary. Presentation actions return exact IDs/handles to
the caller. Zixcel alone validates InputDeclaration and editable values.

Replacing a view disposes its listeners; focus is restored only when the same
exact control survives. No global timers, watchers or retained DOM cache.

`spatial` is a bounded first-person Three.js/WebGL2 thinking garden; `structured` is the
accessible native list. Installed exact controls remain the sole operation path.
World roles appear as procedural characters, records as objects. Geometry, camera
and colors are presentation, never new canonical entities or inferred links.
Only declared Scene relations are drawn. Owner-declared text/fields and inputs
remain native DOM; no general-purpose game engine or WebAssembly payload is loaded.

`world-model.mjs` owns bounded layout and uses Three.js PerspectiveCamera and Raycaster/Ray intersection;
`world-gpu.mjs` owns one Three.js InstancedMesh, box geometry, Lambert material and explicit GPU disposal;
`world-runtime.mjs` owns host input, labels and demand rendering;
`spatial.mjs` connects them to existing exact IDs/buttons. No inference, service
credentials, communication protocol or persistence is added to the renderer.

Limits: 512 source objects/relations, 8 non-overlapping visible labels, 8192 cube
instances, 1.44 million framebuffer pixels, DPR <= 1.5, <= 30 drawn frames/second
during movement and no scheduled frames at idle. Blur, hidden documents, panels,
pointer cancellation and teardown stop movement. Context loss is visible and
recoverable; the exact object directory remains usable without a GPU. This is
explicit degraded presentation, not a substitute successful owner result.

WASD/arrows walk; R/F or PageUp/PageDown rise/descend; drag looks; wheel moves;
E talks to or inspects the aimed object. Touch uses the six direction buttons and
drag. Height is bounded to 0.4–18 presentation units, not physical geography.
Conversations contain caller-provided native DOM and exact existing actions,
not generated speech, simulated reasoning or automatic approval. The directory can locate any offscreen object.
Native HTML elements provide text input, keyboard interaction, and accessibility.
No jumping, physics, voxel editing, automatic reasoning or synthetic personas are
implemented by this presentation package.

Source integration is tested by the Delivery client's compound desktop/mobile
Playwright case, including 128 entities, 127 relations, touch/keyboard, STATE
replacement and full disposal. That fixture test is not installed Hatter or D2
acceptance; final immutable publication and product owner cutover remain separate.

`pnpm test:browser` additionally validates actual Three.js draw statistics, exact activation,
512-object bounds, idle rendering, mobile controls, loss/recovery and 20 teardown
cycles per viewport. No screenshots or image readback are performed. Its synthetic
roles never enter the installed product. No textures, external models, loaders,
postprocessing, physics engine or animation-loop timer are installed.

## Caller-owned presentation

Product work status and semantic reason descriptions belong to the installed caller. `SceneRenderer` accepts a trusted `describeUnresolved(reason)` slot; without it, the renderer displays the original reason without interpreting it. This callback is supplied by trusted application code, never by a delivered scene or package data.
