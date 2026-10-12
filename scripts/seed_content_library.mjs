// Seeds exercises/taping_techniques/routine_items (+ *_stages join rows)
// from the legacy prototype's assets/js/content.js EXERCISES_EN/TAPING_EN/
// ROUTINE_EN arrays, ported verbatim. Safe to re-run: upserts by slug.
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// slug = legacy `id` with its `ex-`/`tp-`/`r-` prefix stripped.
const EXERCISES = [
  {
    slug: 'brow',
    name: 'Brow lift',
    stages: [2, 3, 4, 5],
    region: 'Upper face',
    muscle: 'Frontalis',
    why: 'The brow is often the last region to return. Working it keeps the pathway active and prevents the forehead from becoming stiff on the affected side.',
    reps: 5,
    hold: 3,
    rest: 5,
    steps: [
      'Sit facing a mirror, shoulders down, jaw loose.',
      'Place two fingers flat on the <b>unaffected</b> eyebrow and hold it still. This stops the good side doing the work.',
      'Raise the affected eyebrow as if mildly surprised. Aim for a small movement you can control, not the biggest you can manage.',
      'Hold for three seconds, then let it fall on its own. Do not push it down.',
      'Wait five seconds between repetitions.',
    ],
    cues: ['Lift — small and slow', 'Hold — keep the shoulders soft', 'Release — let it drop by itself', 'Rest — nothing to do here'],
    watch: 'If the eye closes or the mouth pulls when you lift, use less effort. That linkage gets stronger with practice, so we practise below it.',
  },
  {
    slug: 'eye',
    name: 'Gentle eye closure',
    stages: [1, 2, 3, 4, 5],
    region: 'Eye',
    muscle: 'Orbicularis oculi',
    why: 'Closure protects the cornea. Gentle repeated closure also restores the blink pattern, which recovers separately from forceful closing.',
    reps: 8,
    hold: 2,
    rest: 4,
    steps: [
      'Look straight ahead. Let the face rest first.',
      'Close both eyes softly, as if falling asleep — not squeezing shut.',
      'Hold for two seconds and notice whether the affected lid has met the lower lid.',
      'Open slowly and completely.',
      'If the lid does not fully close, do not force it. Close as far as it goes and support the lid gently with a clean fingertip.',
    ],
    cues: ['Soft close — like falling asleep', 'Hold — feel the lids meet', 'Open slowly', 'Rest'],
    watch: 'Forceful squeezing recruits the mouth and the neck. If you feel the corner of your mouth move, you are squeezing.',
  },
  {
    slug: 'nose',
    name: 'Nostril flare',
    stages: [2, 3, 4],
    region: 'Mid-face',
    muscle: 'Nasalis',
    why: 'The mid-face lifts the nasolabial fold and supports the upper lip. It responds well to small isolated work and is easy to skip.',
    reps: 6,
    hold: 2,
    rest: 4,
    steps: [
      'Breathe in through the nose and let the nostrils widen as you do.',
      'Try to widen the nostril on the affected side slightly more.',
      'Hold two seconds, release fully.',
      'Keep the upper lip still — this is a nose movement, not a sneer.',
    ],
    cues: ['Breathe in — widen', 'Hold', 'Release', 'Rest'],
    watch: 'Keep the top teeth covered. If the lip lifts to show teeth, the wrong muscle has taken over.',
  },
  {
    slug: 'smile',
    name: 'Gentle smile',
    stages: [2, 3, 4, 5],
    region: 'Mouth',
    muscle: 'Zygomaticus major',
    why: 'The most functionally important and the most commonly overdone. A controlled small smile trains the pattern; a forced big smile trains the compensation.',
    reps: 6,
    hold: 3,
    rest: 6,
    steps: [
      'Rest your lips together, teeth apart.',
      'Draw both corners of the mouth up and slightly outward — a closed-lip smile, roughly a third of your maximum.',
      'Watch the mirror: are the corners moving the same distance? If not, use less effort until they are.',
      'Hold three seconds, release slowly over two seconds.',
      'Let the face go completely blank between repetitions.',
    ],
    cues: ['Small smile — a third of maximum', 'Hold — check the two corners', 'Release slowly', 'Blank face'],
    watch: 'The eye narrowing as you smile is the linkage we are working against. Less effort, not more repetitions.',
  },
  {
    slug: 'pucker',
    name: 'Lip pucker and seal',
    stages: [2, 3, 4, 5],
    region: 'Mouth',
    muscle: 'Orbicularis oris',
    why: 'Lip seal is what lets you drink, eat, and speak plosive sounds. It is often the first change patients notice in daily life.',
    reps: 6,
    hold: 3,
    rest: 5,
    steps: [
      'Bring the lips together and forward, as if about to say "ooh".',
      'Keep the pucker centred — do not let it drift towards the stronger side.',
      'Hold three seconds. Press the lips together lightly, no clenching.',
      'Release and let the lips part.',
    ],
    cues: ['Pucker forward — say "ooh"', 'Centre it', 'Hold — light pressure', 'Release'],
    watch: 'If the pucker pulls sideways, place a fingertip lightly at the strong corner to keep it honest.',
  },
  {
    slug: 'cheek',
    name: 'Cheek puff with hold',
    stages: [3, 4, 5],
    region: 'Mid-face',
    muscle: 'Buccinator, orbicularis oris',
    why: 'Air retention tests the seal under load and builds the endurance you need for speech and eating rather than for exercises.',
    reps: 5,
    hold: 5,
    rest: 6,
    steps: [
      'Take a normal breath and puff both cheeks with the lips closed.',
      'Hold for five seconds without letting air escape.',
      'If air escapes on the affected side, hold that cheek lightly with a clean hand and try again.',
      'Release slowly through the nose, not with a pop.',
    ],
    cues: ['Puff — lips sealed', 'Hold five', 'Release through the nose', 'Rest'],
    watch: 'Do not do this one if you have had recent ear surgery or your clinician has told you to avoid pressure changes.',
  },
  {
    slug: 'separate',
    name: 'Eye–mouth separation',
    stages: [3, 4],
    region: 'Coordination',
    muscle: 'Coordination drill',
    why: 'This is the core drill against synkinesis — the linked movement where one region fires when you ask for another. Separation is trained slowly and at low effort.',
    reps: 5,
    hold: 4,
    rest: 8,
    steps: [
      'Watch the mirror. Smile gently — a third of maximum — while consciously keeping both eyes wide open.',
      'If the eye narrows at all, reduce the smile until it does not.',
      'Hold four seconds with the eye open, then release.',
      'Now reverse it: close the eyes softly while keeping the mouth completely still.',
      'Rest eight seconds between repetitions. This drill fatigues quickly.',
    ],
    cues: ['Smile — eyes stay open', 'Hold — separate', 'Release', 'Now: eyes close, mouth still'],
    watch: 'This is the exercise where less is genuinely more. Five accurate repetitions beat twenty linked ones.',
  },
  {
    slug: 'release',
    name: 'Tightness release',
    stages: [3, 4, 5],
    region: 'Release',
    muscle: 'Stretch and release',
    why: 'Later in recovery, tightness limits movement more than weakness does. Release work restores range that activation work cannot reach.',
    reps: 3,
    hold: 15,
    rest: 10,
    steps: [
      'Place clean fingertips on the tight area — commonly the cheek or the side of the chin.',
      'Apply light, steady pressure and stretch the skin slowly in the direction opposite to the tightness.',
      'Hold fifteen seconds, breathing normally. It should feel like a stretch, never a sharp pain.',
      'Release slowly and let the tissue settle before repeating.',
    ],
    cues: ['Find the tight spot', 'Stretch slow — hold fifteen', 'Breathe', 'Release'],
    watch: 'Stop if you feel sharp pain, pins and needles, or increased twitching afterwards.',
  },
];

const TAPING = [
  {
    slug: 'rest',
    name: 'Resting support',
    stages: [1, 2],
    goal: 'Hold the mid-face against gravity while the nerve is quiet, so the tissue does not stretch and set in a dropped position.',
    tension: 'Very light — about 10% stretch. You should be able to slide a fingertip underneath.',
    wear: '4–6 hours during the day. Never overnight.',
    strips: [
      {
        where: 'Cheek',
        from: 'Just above the jawline, below the affected corner of the mouth',
        to: 'Up and outward towards the cheekbone',
        note: 'Anchor with no stretch, apply the middle with light stretch, finish the last 2 cm with no stretch.',
      },
      {
        where: 'Mouth corner',
        from: '1 cm out from the affected corner of the lip',
        to: 'Diagonally up towards the ear',
        note: 'This one is very light. Its job is a cue, not a lift.',
      },
    ],
  },
  {
    slug: 'assist',
    name: 'Movement assist',
    stages: [2, 3],
    goal: 'Reduce the effort a movement takes, so you can practise the correct pattern at low effort instead of straining into a wrong one.',
    tension: 'Light to moderate — about 25% stretch across the middle of the strip.',
    wear: 'During exercise sessions, plus up to 4 hours after.',
    strips: [
      {
        where: 'Zygomatic line',
        from: 'The affected corner of the mouth',
        to: 'Along the natural smile line to just in front of the ear',
        note: 'Apply while the face is at rest, not while smiling.',
      },
      {
        where: 'Brow',
        from: 'Just above the affected eyebrow, at the outer third',
        to: 'Up towards the hairline',
        note: 'Keep well clear of the eye. If it pulls the lid, remove and reposition lower.',
      },
    ],
  },
  {
    slug: 'guide',
    name: 'Directional guide',
    stages: [3, 4],
    goal: 'Give the skin a directional cue during coordination work and mildly discourage the linked movement you are trying to separate.',
    tension: 'Light — about 15%. The cue is sensory, not mechanical.',
    wear: 'During coordination exercises only. 20–30 minutes.',
    strips: [
      {
        where: 'Lower lid support',
        from: 'The outer corner of the eye',
        to: 'Outward and slightly down, towards the temple',
        note: 'Never across the lid itself. Below the orbital rim only.',
      },
      {
        where: 'Cheek counter-cue',
        from: 'Mid-cheek',
        to: 'Downward and outward',
        note: 'This opposes the upward pull that comes with synkinesis.',
      },
    ],
  },
];

const ROUTINE = [
  {
    slug: 'eye',
    name: 'Eye care',
    stages: [1, 2, 3, 4, 5],
    when: 'Morning, through the day, and before sleep',
    icon: 'droplet',
    body: 'If your eye does not close fully, protecting the cornea is the single most important thing in your day — more important than any exercise. Preservative-free lubricating drops during the day, ointment at night, and a check with your clinician if the eye becomes red, painful, or your vision changes.',
    items: [
      'Lubricating drops on waking',
      'Drops every 2–3 hours while awake',
      'Ointment and taped closure or a moisture chamber at night',
      'Sunglasses outdoors, including on cloudy days',
    ],
  },
  {
    slug: 'eat',
    name: 'Eating and drinking',
    stages: [1, 2, 3],
    when: 'Every meal',
    icon: 'smile',
    body: 'Food collecting in the affected cheek and drinks escaping the lip seal are mechanical problems with mechanical answers. Smaller mouthfuls, food towards the stronger side, a mirror check after eating, and a straw only if it does not make the seal harder.',
    items: [
      'Smaller mouthfuls, slower pace',
      'Place food towards the unaffected side',
      'Rinse and check the affected cheek after eating',
      'Sit upright while drinking',
    ],
  },
  {
    slug: 'massage',
    name: 'Massage',
    stages: [1, 2, 3, 4, 5],
    when: 'Once or twice daily, 3–4 minutes',
    icon: 'heart',
    body: 'Slow circular pressure with clean fingertips over the cheek, jaw, and around the mouth. This maintains circulation and tissue mobility. It is not a workout — if it feels vigorous, ease off.',
    items: ['Clean, dry hands', 'Small circles, light pressure, upward direction', 'Both sides, not only the affected side', 'Stop if it causes twitching'],
  },
  {
    slug: 'sleep',
    name: 'Sleep and rest',
    stages: [1, 2, 3, 4, 5],
    when: 'Nightly',
    icon: 'moon',
    body: 'Facial fatigue is real and it flattens your movement quality. Sleep on your back or on the unaffected side so the face is not pressed into a pillow, and take the afternoon dip seriously — practise when you are fresh.',
    items: [
      'Back or unaffected side, not face-down',
      'Eye protection before lights out',
      'Practise in the morning if evenings are heavy',
      'Rest days are part of the programme',
    ],
  },
  {
    slug: 'speech',
    name: 'Speech practice',
    stages: [3, 4, 5],
    when: 'Once daily, 3 minutes',
    icon: 'mic',
    body: 'Plosive and labial sounds need lip seal, so they double as an exercise you can do without a mirror. Read aloud slowly and exaggerate slightly.',
    items: ['Read aloud for 3 minutes daily', 'Emphasise p, b, m, f, v, w', 'Slow enough to keep the seal', 'Record yourself weekly if you find it useful'],
  },
];

function instructionsOf(row) {
  if (row.steps) return row.steps.join(' ');
  if (row.items) return row.items.join(' ');
  if (row.strips) return row.strips.map((s) => `${s.where}: ${s.from} -> ${s.to}. ${s.note}`).join(' ');
  return row.name;
}

// @neondatabase/serverless's `sql` is a plain tagged-template function (no
// postgres.js-style `sql(identifier)` helper for dynamic table/column
// names), so each table gets its own literal-SQL upsert rather than one
// generic parameterized helper.

async function seedExercises(rows) {
  let index = 0;
  for (const row of rows) {
    const { slug, name, stages } = row;
    const instructions = instructionsOf(row);
    const details = JSON.stringify(row);

    const [existing] = await sql`select id from exercises where slug = ${slug}`;
    let id = existing?.id;
    if (existing) {
      await sql`
        update exercises
        set name = ${name}, instructions = ${instructions}, details = ${details}::jsonb,
            sort_order = ${index}, updated_at = now()
        where id = ${id}
      `;
    } else {
      const [inserted] = await sql`
        insert into exercises (slug, name, instructions, details, sort_order)
        values (${slug}, ${name}, ${instructions}, ${details}::jsonb, ${index})
        returning id
      `;
      id = inserted.id;
    }

    await sql`delete from exercise_stages where exercise_id = ${id}`;
    for (const stage of stages) {
      await sql`insert into exercise_stages (exercise_id, stage) values (${id}, ${stage})`;
    }
    index += 1;
  }
}

async function seedTaping(rows) {
  let index = 0;
  for (const row of rows) {
    const { slug, name, stages } = row;
    const instructions = instructionsOf(row);
    const details = JSON.stringify(row);

    const [existing] = await sql`select id from taping_techniques where slug = ${slug}`;
    let id = existing?.id;
    if (existing) {
      await sql`
        update taping_techniques
        set name = ${name}, instructions = ${instructions}, details = ${details}::jsonb,
            sort_order = ${index}, updated_at = now()
        where id = ${id}
      `;
    } else {
      const [inserted] = await sql`
        insert into taping_techniques (slug, name, instructions, details, sort_order)
        values (${slug}, ${name}, ${instructions}, ${details}::jsonb, ${index})
        returning id
      `;
      id = inserted.id;
    }

    await sql`delete from taping_technique_stages where taping_technique_id = ${id}`;
    for (const stage of stages) {
      await sql`insert into taping_technique_stages (taping_technique_id, stage) values (${id}, ${stage})`;
    }
    index += 1;
  }
}

async function seedRoutine(rows) {
  let index = 0;
  for (const row of rows) {
    const { slug, name, stages } = row;
    const instructions = instructionsOf(row);
    const details = JSON.stringify(row);

    const [existing] = await sql`select id from routine_items where slug = ${slug}`;
    let id = existing?.id;
    if (existing) {
      await sql`
        update routine_items
        set name = ${name}, instructions = ${instructions}, details = ${details}::jsonb,
            sort_order = ${index}, updated_at = now()
        where id = ${id}
      `;
    } else {
      const [inserted] = await sql`
        insert into routine_items (slug, name, instructions, details, sort_order)
        values (${slug}, ${name}, ${instructions}, ${details}::jsonb, ${index})
        returning id
      `;
      id = inserted.id;
    }

    await sql`delete from routine_item_stages where routine_item_id = ${id}`;
    for (const stage of stages) {
      await sql`insert into routine_item_stages (routine_item_id, stage) values (${id}, ${stage})`;
    }
    index += 1;
  }
}

await seedExercises(EXERCISES);
await seedTaping(TAPING);
await seedRoutine(ROUTINE);

console.log(`Seeded ${EXERCISES.length} exercises, ${TAPING.length} taping techniques, ${ROUTINE.length} routine items.`);
