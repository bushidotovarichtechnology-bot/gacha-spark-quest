// Tiny inline Lottie animation: a soft green pulse ring that plays once when
// the "X updates" badge increments. Kept inline (no fetch) and minimal (single
// shape, 30fps, ~0.9s) so it stays cheap to render alongside the CSS pop.
// Color uses a neutral white fill that we tint via parent text color filter is
// not possible in Lottie; instead we hardcode the hacker-green hue (#00FF7A)
// to match --hacker-green token visually.

const updatesPulseAnimation = {
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 27,
  w: 40,
  h: 40,
  nm: "updates-pulse",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "ring",
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0], h: 0, i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
            { t: 6, s: [90], h: 0, i: { x: [0.4], y: [1] }, o: { x: [0.2], y: [0] } },
            { t: 27, s: [0] },
          ],
        },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [20, 20, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [40, 40, 100], h: 0, i: { x: [0.4, 0.4, 0.4], y: [1, 1, 1] }, o: { x: [0.2, 0.2, 0.2], y: [0, 0, 0] } },
            { t: 27, s: [160, 160, 100] },
          ],
        },
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              d: 1,
              ty: "el",
              s: { a: 0, k: [16, 16] },
              p: { a: 0, k: [0, 0] },
              nm: "Ellipse Path 1",
            },
            {
              ty: "st",
              c: { a: 0, k: [0, 1, 0.478, 1] },
              o: { a: 0, k: 100 },
              w: { a: 0, k: 2 },
              lc: 2,
              lj: 2,
              nm: "Stroke 1",
            },
            {
              ty: "tr",
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 },
              sk: { a: 0, k: 0 },
              sa: { a: 0, k: 0 },
              nm: "Transform",
            },
          ],
          nm: "Ring",
        },
      ],
      ip: 0,
      op: 27,
      st: 0,
      bm: 0,
    },
  ],
  markers: [],
};

export default updatesPulseAnimation;
