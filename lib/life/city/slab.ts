import * as THREE from 'three'

/**
 * מצלמת רב־מישור — הטכניקה של דיסני מ-1937, ובמקרה שלנו גם היחידה שאין בה המצאה.
 *
 * ניסיתי קודם לחתוך ציור לקופסה תלת־ממדית (Tour Into the Picture): מלבן אחורי סביב נקודת
 * המגוז וארבעה טרפזים סביבו. על רחוב שנצפה באלכסון — וכל רחובות אלנבי שלנו כאלה — היישור
 * מותח שלושה פיקסלים על פני אלף והתוצאה נמרחת. זה תועד ונזרק.
 *
 * מה שכן עובד, בלי אף פיקסל מומצא: **מאור כבר צייר את העומק.** `street` ו-`gate7` מגיעים
 * מפוצלים ל-`far/mid/near`, מיושרים פיקסל־לפיקסל לציור השטוח, ולכל ציור יש כבר גם רצועת
 * `--ground` שממשיכה אותו כלפי מטה (`scripts/life/finish-backdrops.py`). זה כל מה שדרוש.
 *
 * שני כללים גורמים לזה להיראות נכון:
 *
 * 1. **קנה המידה פרופורציוני לעומק.** מישור בעומק `z` מוגדל פי `|z|`, ולכן ממצלמת
 *    ההתייחסות (הראשית, בנקודה 0) שלושתם מתלכדים בדיוק לציור המקורי — אותו ציור, אף
 *    פיקסל לא זז. ברגע שהמצלמה זזה הם נפרדים בקצב שונה. זאת פרלקסה מגיאומטריה, לא מאפקט.
 *
 * 2. **קו האופק של הציור הוא ציר המצלמה.** הציור לא מצולם ממרכזו — האופק בו נמצא בערך
 *    בשני שליש הגובה. לכן כל מישור מוסט כלפי מעלה ב-`(horizon - 0.5)` מגובהו, וגם ההסטה
 *    פרופורציונית לעומק. בלי זה הרחוב נראה כאילו מסתכלים עליו מגובה מטר וחצי מתחת לכביש.
 *
 * גובה העין (`eye`) הוא המספר היחיד שקושר את הציור למטרים: המצלמה יושבת על קו האופק,
 * והרצפה מטר-שבעים מתחתיה. ממנו נגזר הכל — כמה רחוק הכביש שמעבר, באיזה קצב פוגי קטן
 * כשהוא מתרחק, ואיפה בדיוק נגמרת רצועת הרצפה האופקית ומתחילה הרצועה המצוירת.
 */

export type SlabPlane = {
  key: string
  /** עומק המישור במטרים, שלילי — הרחוק ראשון */
  z: number
  /** רק הרקע האחורי אטום; כל השאר חייב שקיפות אחרת הוא חותך את מה שמאחוריו */
  opaque?: boolean
}

export type SlabSpec = {
  /** מפתח הציור — `street`, `gate7` */
  art: string
  /** המישורים, מהרחוק לקרוב */
  planes: SlabPlane[]
  /** יחס הציור, רוחב חלקי גובה */
  aspect: number
  /** שדה הראייה האופקי שבו הציור צויר, במעלות */
  hFovDeg: number
  /** קו האופק כשבר מגובה הציור, מלמעלה */
  horizon: number
  /** גובה העין מעל הכביש, במטרים */
  eye: number
  /** רצועת ההמשך כלפי מטה — אותו רוחב, גובה משלה */
  ground?: { key: string; aspect: number }
}

export const SLABS: Record<string, SlabSpec> = {
  street: {
    art: 'street',
    aspect: 1600 / 625,
    // 106°, ולא 72: ציור ביחס 2.56:1 שממלא מסך אנכי רגיל הוא בהכרח רחב־זווית אופקית.
    // עם 72 המישורים פשוט לא הגיעו לקצה הפריים, ונשארו פסים שחורים למעלה ולמטה.
    hFovDeg: 106,
    horizon: 0.63,
    eye: 1.7,
    planes: [
      { key: 'street--far', z: -26, opaque: true },
      { key: 'street--mid', z: -13 },
      { key: 'street--near', z: -4.5 },
    ],
    ground: { key: 'street--ground', aspect: 1600 / 218 },
  },
  gate7: {
    art: 'gate7',
    aspect: 1600 / 900,
    hFovDeg: 84,
    horizon: 0.6,
    eye: 1.7,
    planes: [
      { key: 'gate7--far', z: -30, opaque: true },
      { key: 'gate7--mid', z: -14 },
      { key: 'gate7--near', z: -5 },
    ],
    ground: { key: 'gate7--ground', aspect: 1600 / 315 },
  },
}

const ART = '/life/art'

function prepare(map: THREE.Texture): THREE.Texture {
  map.colorSpace = THREE.SRGBColorSpace
  map.minFilter = THREE.LinearMipmapLinearFilter
  map.magFilter = THREE.LinearFilter
  map.generateMipmaps = true
  map.anisotropy = 8
  return map
}

function quad(map: THREE.Texture, width: number, height: number, opaque: boolean): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    map: prepare(map),
    transparent: !opaque,
    depthWrite: opaque,
    toneMapped: false,
  })
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), material)
}

export type Slab = {
  group: THREE.Group
  /** גובה העין מעל הכביש — המצלמה יושבת ב-y=0 והרצפה ב-`-eye` */
  eye: number
  /** העומק שממנו והלאה הרצועה המצוירת מכסה את הכביש; מקדימה יש מרובע אופקי */
  floorTo: number
  dispose: () => void
}

/**
 * בונה את הלוח. `reference` הוא עומק המישור הקרוב — שם הכל מתלכד לציור המקורי.
 */
export function buildSlab(spec: SlabSpec, loader: THREE.TextureLoader): Slab {
  const group = new THREE.Group()
  const reference = Math.abs(spec.planes[spec.planes.length - 1]?.z ?? 1)
  const made: THREE.Mesh[] = []

  // רוחב הציור בעומק ההתייחסות, מתוך שדה הראייה שבו הוא צויר
  const widthAtRef = 2 * reference * Math.tan((spec.hFovDeg * Math.PI) / 360)
  const heightAtRef = widthAtRef / spec.aspect
  // מרכז הציור יושב מעל קו האופק בדיוק בהפרש שהצייר נתן לו
  const centerAtRef = (spec.horizon - 0.5) * heightAtRef
  const groundHeightAtRef = spec.ground ? heightAtRef / (spec.ground.aspect / spec.aspect) : 0

  for (const plane of spec.planes) {
    const scale = Math.abs(plane.z) / reference
    const width = widthAtRef * scale
    const height = heightAtRef * scale
    const centerY = centerAtRef * scale

    const art = quad(loader.load(`${ART}/${plane.key}.webp`), width, height, Boolean(plane.opaque))
    art.position.set(0, centerY, plane.z)
    art.renderOrder = Math.round(-plane.z)
    group.add(art)
    made.push(art)

    // ההמשך כלפי מטה — רק לרקע האטום ולמישור הקרוב; האמצע היה מכפיל את אותו אספלט
    if (spec.ground && (plane.opaque || plane === spec.planes[spec.planes.length - 1])) {
      const strip = quad(loader.load(`${ART}/${spec.ground.key}.webp`), width, groundHeightAtRef * scale, Boolean(plane.opaque))
      strip.position.set(0, centerY - (height + groundHeightAtRef * scale) / 2, plane.z)
      strip.renderOrder = Math.round(-plane.z)
      group.add(strip)
      made.push(strip)
    }
  }

  // הקצה התחתון של הציור המורחב יורד בקצב קבוע עם העומק; שם הוא פוגש את הכביש
  const bottomSlope = (heightAtRef / 2 + groundHeightAtRef - centerAtRef) / reference
  const floorTo = bottomSlope > 0 ? spec.eye / bottomSlope : reference

  if (spec.ground) {
    const map = prepare(loader.load(`${ART}/${spec.ground.key}.webp`))
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    map.repeat.set(3, 2)
    const depth = floorTo + 5
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(widthAtRef * 4, depth),
      new THREE.MeshBasicMaterial({ map, toneMapped: false }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(0, -spec.eye, -floorTo + depth / 2)
    floor.renderOrder = -1
    group.add(floor)
    made.push(floor)
  }

  return {
    group,
    eye: spec.eye,
    floorTo,
    dispose() {
      for (const mesh of made) {
        mesh.geometry.dispose()
        const material = mesh.material as THREE.MeshBasicMaterial
        material.map?.dispose()
        material.dispose()
      }
    },
  }
}

/**
 * דמות כ-billboard — תמיד פונה למצלמה, וגובהה במטרים, כדי שילד שהולך לתוך הרחוב באמת יקטן
 * באותו קצב שבו בניין מתרחק.
 */
export function actorBillboard(map: THREE.Texture, metres: number): THREE.Sprite {
  prepare(map)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map, transparent: true, toneMapped: false, depthWrite: false,
      // **אף פעם לא נחתך על ידי התמונה.** הקיר של פנורמה הוא לא בטון — הוא ניחוש עומק
      // שנקרא מקו המגע, ומספיק שהניחוש בזווית אחת יגיד שמונה מטר כדי שאדם שעומד
      // בארבעים ייעלם. ואז, כשהולכים, הזווית משתנה והוא חוזר. זה מה שנראה על המסך
      // כדמויות שבאות ונעלמות, וזה לא באג בהצבה — זה בדיקת עומק מול משטח מדומה.
      // הסדר בין הדמויות עצמן נשמר ב-`renderOrder` לפי המרחק.
      depthTest: false,
    }),
  )
  // `loader.load` מחזיר טקסטורה **ריקה** וממלא אותה כשהקובץ מגיע. לקרוא את `image.width`
  // מיד פירושו יחס 1:1 — וילד בגובה מטר ארבעים יוצא ברוחב מטר ארבעים, עם תסרוקת שנראית
  // כמו סל לחם. זה בדיוק מה שקרה בצילום הראשון. לכן הגובה נקבע מיד והרוחב מחכה לתמונה.
  const fit = () => {
    const w = map.image?.width ?? 0
    const h = map.image?.height ?? 0
    if (w > 0 && h > 0) sprite.scale.set((metres * w) / h, metres, 1)
  }
  sprite.scale.set(metres * 0.4, metres, 1)
  fit()
  if (!map.image) {
    const previous = map.onUpdate
    map.onUpdate = () => {
      fit()
      previous?.()
    }
  }
  return sprite
}
