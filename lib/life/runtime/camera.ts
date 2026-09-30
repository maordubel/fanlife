import type PhaserNS from 'phaser'

/**
 * הזום — one rule for every scene, and it is "never show the edge of the world".
 *
 * The first version scaled the zoom off the viewport width and clipped or overshot
 * depending on the room: on a portrait phone the bedroom was drawn in the top third of
 * the glass with the camera's background colour under it, and on a wide screen the
 * window at the top of that same room was somewhere the camera could not reach. Both are
 * the same mistake — treating zoom as a style rather than as a constraint.
 *
 * So the zoom FILLS: whichever axis needs more magnification wins, the map always covers
 * the canvas, and the camera scrolls on the other axis. A phone in portrait sees a tall
 * slice of the street and a laptop sees a wide one, and neither ever sees past the edge.
 *
 * `floor` keeps a large map from becoming a diorama on a big screen — a child 34 pixels
 * tall has to stay legible — and the hard cap stops a small room magnifying into
 * abstraction on a very tall viewport.
 */
export function fillZoom(
  camera: PhaserNS.Cameras.Scene2D.Camera,
  width: number,
  height: number,
  floor: number,
): number {
  const viewWidth = camera.width || 800
  const viewHeight = camera.height || 600
  const fill = Math.max(viewWidth / width, viewHeight / height)
  const zoom = Math.min(Math.max(fill, floor), 7)
  return Number(zoom.toFixed(3))
}


/**
 * מסגרת — how much of the painting the glass shows.
 *
 * Filling the canvas edge to edge is right for a wide street and wrong for a nearly
 * square room on a phone held upright: covering a 4:3 painting with a 9:19 viewport
 * throws away three quarters of the width and leaves the player looking through a letter
 * slot. So the camera is allowed to fall short of covering — down to 70% of it — and the
 * space it cannot fill becomes a dark frame rather than a crop.
 *
 * That is not a compromise, it is how painted adventures have always been shown: the
 * picture is the composition, and the composition survives being framed.
 */
export function frameZoom(
  scene: PhaserNS.Scene,
  width: number,
  height: number,
  cover = 0.72,
): { zoom: number; viewWidth: number; viewHeight: number } {
  const viewWidth = scene.scale.gameSize.width || scene.cameras.main.width || 800
  const viewHeight = scene.scale.gameSize.height || scene.cameras.main.height || 600
  const fill = Math.max(viewWidth / width, viewHeight / height)
  const contain = Math.min(viewWidth / width, viewHeight / height)
  const zoom = Number(Math.min(Math.max(contain, fill * cover), 7).toFixed(3))
  return { zoom, viewWidth, viewHeight }
}

/**
 * מסך מלא — the painting fills the glass, edge to edge, and the camera does the rest.
 *
 * `frameCamera` below was the right answer for the day the game was a painting shown in
 * a frame with a console under it. It is the wrong answer for a phone held upright, which
 * is where this game is actually played: it left the picture in the top two thirds of the
 * screen with a hairline and a dead band under it, and Maor's note on the result was one
 * word — "cut". The model he named instead (Very Little Nightmares) does the opposite:
 * the room fills the whole screen, the character stands in a tall slice of it, and the
 * camera follows him along the room. Nothing is letterboxed because nothing needs to be:
 * the picture is bigger than the glass on one axis, and that axis scrolls.
 *
 * So: whichever axis needs more magnification wins (COVER, not contain), the viewport is
 * the entire canvas, and the scene sets bounds and follows. A 16:9 backdrop on a 9:19.5
 * phone shows about a quarter of the room's width at once — a corridor of the street, not
 * the street — which is exactly the framing VLN uses and the reason a small child in a
 * big painted world reads as a small child in a big painted world.
 *
 * `lift` is a fraction of the viewport height by which the picture may be magnified past
 * cover, so a portrait phone has a little vertical room to scroll and the floor band can
 * be lifted clear of a thumb resting at the bottom of the glass. 1 = exact cover.
 */
export function fillCamera(
  scene: PhaserNS.Scene,
  camera: PhaserNS.Cameras.Scene2D.Camera,
  width: number,
  height: number,
  lift = 1,
): { zoom: number; viewWidth: number; viewHeight: number } {
  const viewWidth = scene.scale.gameSize.width || camera.width || 800
  const viewHeight = scene.scale.gameSize.height || camera.height || 600
  const cover = Math.max(viewWidth / width, viewHeight / height)
  const zoom = Number(Math.min(cover * Math.max(1, lift), 7).toFixed(3))
  camera.setViewport(0, 0, viewWidth, viewHeight)
  camera.setZoom(zoom)
  return { zoom, viewWidth, viewHeight }
}

/**
 * Frame the painting and hand back the strip it actually occupies.
 *
 * On a phone held upright, a room painted across the frame cannot both fill the glass and
 * keep its composition — so it keeps its composition and the camera's viewport shrinks to
 * exactly the picture. What is left over is not a bug in the layout, it is where the
 * dialogue box and the thumb pad live, which is how a painted adventure has always been
 * laid out on a tall screen.
 */
export function frameCamera(
  scene: PhaserNS.Scene,
  camera: PhaserNS.Cameras.Scene2D.Camera,
  width: number,
  height: number,
  cover = 0.72,
): number {
  const { zoom, viewWidth, viewHeight } = frameZoom(scene, width, height, cover)
  const pictureHeight = Math.min(viewHeight, Math.ceil(height * zoom))
  camera.setViewport(0, 0, viewWidth, pictureHeight)
  camera.setZoom(zoom)
  return zoom
}
