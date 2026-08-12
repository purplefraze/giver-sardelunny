// Traced from the canonical Living G reference artwork (potrace outline of the
// original bitmap). This geometry is FIXED: never edit, re-draw or approximate it.
// Authored in potrace output space; the component applies the flip transform.
export const LIVING_G_PATH = "M3489 8913 c-245 -164 -349 -459 -256 -726 45 -128 36 -179 -45 -253 -83 -76 -155 -82 -238 -19 -98 74 -211 155 -217 155 -4 0 -14 6 -22 13 -9 7 -50 28 -91 46 -41 18 -82 36 -90 40 -141 74 -545 131 -713 101 -846 -149 -1401 -799 -1374 -1610 31 -942 867 -1638 1812 -1510 265 36 441 -76 410 -264 -30 -176 -145 -216 -500 -175 -330 38 -770 -62 -1080 -244 -1146 -675 -1424 -2221 -588 -3265 667 -833 1761 -1004 2639 -411 209 141 350 283 562 569 157 212 312 643 351 975 63 549 -95 1121 -440 1585 -123 165 -336 369 -452 433 -22 12 -51 29 -66 37 -101 56 -278 -69 -297 -211 -9 -73 12 -107 115 -180 331 -236 566 -577 664 -964 31 -121 37 -152 47 -235 34 -284 -8 -596 -115 -865 -349 -876 -1347 -1288 -2146 -885 -74 37 -227 134 -239 150 -3 4 -27 25 -55 45 -188 142 -396 435 -500 705 -312 813 -18 1668 740 2146 211 133 586 213 853 183 171 -20 392 -18 466 5 586 181 652 975 103 1246 -144 71 -316 87 -590 55 -131 -16 -143 -15 -307 5 -88 11 -267 66 -331 101 -421 233 -642 608 -626 1064 8 231 51 364 190 590 253 412 856 606 1316 423 726 -287 937 -1253 399 -1826 -141 -151 -131 -297 27 -374 107 -53 156 -32 299 122 438 475 518 1144 212 1770 -114 233 56 415 315 336 219 -67 433 -13 595 149 41 41 79 85 84 97 6 13 14 30 20 38 165 251 68 649 -201 829 l-61 41 -262 0 -261 0 -56 -37z m408 -137 c407 -108 388 -706 -25 -786 -315 -62 -562 269 -422 567 80 173 271 266 447 219z";

/** Path space (after the flip transform below) */
export const LIVING_G_VIEWBOX = "0 0 442 960";
export const LIVING_G_TRANSFORM = "translate(0,960) scale(0.1,-0.1)";

/** Measured feature centres in viewBox space (used only for label placement). */
export const G_ANCHORS = {
  smallRing: { x: 380, y: 121 },
  upperRing: { x: 198, y: 289 },
  lowerRing: { x: 203, y: 714 },
} as const;

/** Generous invisible hit bands, in viewBox space. */
export const G_REGION_BANDS = {
  top: { x: 0, y: 0, width: 442, height: 210 },
  middle: { x: 0, y: 210, width: 442, height: 262 },
  bottom: { x: 0, y: 472, width: 442, height: 488 },
} as const;
