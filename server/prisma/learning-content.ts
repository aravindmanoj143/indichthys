/**
 * Indichthys courses (Module 5): lessons + quiz. Written for this platform.
 * Conventions follow standard ichthyological practice (e.g. the International Code of
 * Zoological Nomenclature; Kottelat 2001 and Hubbs & Lagler for counts and measurements).
 * Lesson body: blank lines separate paragraphs; lines starting with "- " are bullets.
 */

export interface CourseContent {
  slug: string;
  title: string;
  summary: string;
  description: string;
  subject: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
  lessons: { title: string; body: string }[];
  quiz: { prompt: string; options: string[]; correct: number; explanation: string }[];
}

export const INDICHTHYS_COURSES: CourseContent[] = [
  {
    slug: 'fish-taxonomy-and-nomenclature',
    title: 'Introduction to fish taxonomy and nomenclature',
    summary: 'How fishes are classified and named: ranks, scientific names, authorities, synonyms and type specimens.',
    description:
      'A short introduction for students, naturalists and field biologists who need to read and use scientific names of fishes correctly.',
    subject: 'taxonomy',
    level: 'beginner',
    duration: 'About 45 minutes',
    lessons: [
      {
        title: 'What taxonomy does',
        body: `Taxonomy discovers, describes, names and classifies organisms. For fishes it answers two practical questions: what is this fish, and how is it related to others?

Organisms are placed in a hierarchy of ranks. For the zebrafish:
- Kingdom: Animalia
- Phylum: Chordata
- Order: Cypriniformes
- Family: Danionidae
- Genus: Danio
- Species: Danio rerio

Higher ranks group species that share a common ancestry. Classifications change as new evidence (morphology, DNA) is studied, so the family or genus of a species can change over time while the species itself stays the same.`,
      },
      {
        title: 'Reading a scientific name',
        body: `A species name is a binomial: the genus name followed by the specific epithet, e.g. Danio rerio. The genus starts with a capital letter, the epithet is all lowercase, and both are written in italics.

The name is often followed by its authority: the author who described the species and the year, e.g. Cyprinus carpio Linnaeus, 1758.

When the author and year are in parentheses, as in Danio rerio (Hamilton, 1822), the species was originally described in a different genus. Hamilton named it Cyprinus rerio; it was later moved to Danio. The original combination is sometimes called the basionym.

Names are governed by the International Code of Zoological Nomenclature (ICZN). When two or more names turn out to apply to the same species, they are synonyms, and under the principle of priority the oldest available name is generally the valid one.`,
      },
      {
        title: 'Type specimens',
        body: `Every species name is tied to physical specimens, the name-bearing types, usually kept in museum collections with catalogue numbers.

- Holotype: the single specimen designated as the name-bearing type in the original description.
- Paratypes: the other specimens of the type series. They are not name-bearing.
- Syntypes: specimens of a type series in which no holotype was designated; together they bear the name.
- Lectotype: one syntype chosen later to be the single name-bearing type.
- Neotype: a specimen designated when no name-bearing type is believed to exist and one is needed to settle the identity of a species.

The type locality is where the name-bearing type was collected. Revisions often re-examine types to decide which populations really belong to a species.`,
      },
      {
        title: 'Where to check names',
        body: `Before using a name in a report or paper, check its current status:

- Eschmeyer's Catalog of Fishes: the authoritative catalogue of fish names, original descriptions, types and synonyms.
- The original description and later revisions of the group.
- GBIF and FishBase for distribution, common names and further references.

On Indichthys, the Taxonomy pages show accepted names, synonyms and the original combination from GBIF, and the Publications repository lists recent species descriptions and revisions.`,
      },
    ],
    quiz: [
      {
        prompt: 'Which of these is the correct way to write the zebrafish’s scientific name?',
        options: ['Danio rerio (genus capitalised, epithet lowercase, both in italics)', 'danio rerio', 'Danio Rerio', 'DANIO RERIO'],
        correct: 0,
        explanation: 'The genus is capitalised, the specific epithet is lowercase, and the binomial is italicised.',
      },
      {
        prompt: 'In “Danio rerio (Hamilton, 1822)”, what do the parentheses around the authority mean?',
        options: [
          'The species was originally described in a different genus',
          'The species name is doubtful',
          'The author was not the first to collect the species',
          'The description was published in two parts',
        ],
        correct: 0,
        explanation: 'Parentheses show the species is now in a different genus from the one it was described in (here Cyprinus).',
      },
      {
        prompt: 'What is a holotype?',
        options: [
          'The single specimen designated as the name-bearing type in the original description',
          'Any specimen collected at the type locality',
          'A specimen chosen later from the syntypes',
          'The best-preserved specimen in a museum',
        ],
        correct: 0,
        explanation: 'A holotype is designated in the original description. A specimen chosen later from syntypes is a lectotype.',
      },
      {
        prompt: 'A lectotype is…',
        options: [
          'a syntype designated later as the single name-bearing type',
          'a replacement type when the holotype is lost',
          'a specimen from the same series as the holotype',
          'a type specimen of a genus',
        ],
        correct: 0,
        explanation: 'Lectotypes are selected from syntypes. A replacement when no name-bearing type exists is a neotype.',
      },
      {
        prompt: 'If two names are found to refer to the same species, which is generally valid under the ICZN?',
        options: ['The oldest available name (principle of priority)', 'The most widely used name', 'The name with the longer description', 'The most recent name'],
        correct: 0,
        explanation: 'The principle of priority generally gives precedence to the oldest available name.',
      },
    ],
  },
  {
    slug: 'meristics-counting-scales-and-fin-rays',
    title: 'Meristics: counting scales and fin rays',
    summary: 'Standard ways to count fin rays, lateral-line scales and other scale rows, and how to write them down.',
    description: 'Practical training in the counts used in identification keys and species descriptions of freshwater fishes.',
    subject: 'identification',
    level: 'intermediate',
    duration: 'About 1 hour',
    lessons: [
      {
        title: 'What meristic characters are',
        body: `Meristic characters are features that can be counted, such as fin rays, scales, gill rakers and vertebrae. They are widely used in identification keys because they vary less than colour or shape.

Good practice:
- Count on the left side of the fish unless it is damaged, and note the side you used.
- Use magnification and good light; a dissecting microscope helps for small fishes.
- Record counts for several specimens and report the range (and mode) rather than a single value.`,
      },
      {
        title: 'Fin-ray formulas',
        body: `Fin formulas give the fin and its rays. Roman numerals stand for spines or unbranched (simple) rays; Arabic numerals stand for soft, branched rays.

For many cyprinids the dorsal fin is written like D iii 8½: three unbranched rays and eight and a half branched rays. The “½” follows the common convention (e.g. Kottelat 2001) that the last two branched rays, which share a single base, are counted together as “1½”.

In spiny-rayed fishes the spinous and soft parts are given together, e.g. D XIII, 11. Authors differ in small details of notation, so always state the convention you follow.`,
      },
      {
        title: 'Scale counts',
        body: `- Lateral-line scales: count the pored scales from the first one behind the shoulder girdle to the one at the end of the hypural plate (the base of the caudal fin). Pored scales continuing onto the caudal fin are added after a plus sign, e.g. 34+2.
- Transverse scale rows: counted between the lateral line and the dorsal-fin origin (and down to the pelvic-fin origin); “½” marks a median row.
- Circumpeduncular scales: the scale rows around the narrowest part of the caudal peduncle.
- Predorsal scales: scales along the dorsal midline from the back of the head to the dorsal-fin origin.

If the lateral line is incomplete, count the scales in the lateral series and note how many are pored.`,
      },
      {
        title: 'Practical tips',
        body: `- For small or delicate fishes, X-rays or cleared-and-stained specimens make fin rays and vertebrae much easier to count.
- Record the specimen’s catalogue number or field code with every count.
- Repeat difficult counts and check outliers before trusting them.
- Before comparing your counts with a description, read its methods section: counting conventions differ between authors, and a difference of one may be a matter of method rather than a different species.`,
      },
    ],
    quiz: [
      {
        prompt: 'In the dorsal-fin formula “D iii 8½”, what do the Roman numerals stand for?',
        options: ['Unbranched (simple) rays or spines', 'Branched rays', 'Scales in front of the fin', 'Pterygiophores'],
        correct: 0,
        explanation: 'Roman numerals are spines or unbranched rays; Arabic numerals are branched rays.',
      },
      {
        prompt: 'What does the “½” in a branched-ray count like 8½ usually mean?',
        options: [
          'The last two branched rays share one base and are counted together as one and a half',
          'Half the fin was damaged',
          'The count is an average of two specimens',
          'One ray is shorter than the others',
        ],
        correct: 0,
        explanation: 'By a common convention, the last two rays on a single base are counted as “1½”.',
      },
      {
        prompt: 'A lateral-line count is written “34+2”. What is the “+2”?',
        options: [
          'Pored scales on the caudal fin beyond the end of the hypural plate',
          'Two missing scales',
          'Scales above the lateral line',
          'Two lateral lines',
        ],
        correct: 0,
        explanation: 'Scales on the caudal fin are given after the plus sign.',
      },
      {
        prompt: 'Where are circumpeduncular scales counted?',
        options: ['Around the narrowest part of the caudal peduncle', 'Around the head', 'Along the base of the dorsal fin', 'Between the pelvic fins'],
        correct: 0,
        explanation: 'They encircle the caudal peduncle at its narrowest point.',
      },
      {
        prompt: 'Why should you read the methods section of a species description before comparing counts?',
        options: ['Counting conventions differ between authors', 'Counts are always given as averages', 'Methods list the type locality', 'It is required by the ICZN'],
        correct: 0,
        explanation: 'Different conventions can shift counts by one, which is not by itself evidence of a different species.',
      },
    ],
  },
  {
    slug: 'morphometrics-measuring-fishes',
    title: 'Morphometrics: measuring fishes',
    summary: 'Standard length, head and body measurements, proportions, and an introduction to landmark-based geometric morphometrics.',
    description: 'How to take and report the measurements used in fish taxonomy, and how to start with geometric morphometrics.',
    subject: 'morphometrics',
    level: 'intermediate',
    duration: 'About 1 hour',
    lessons: [
      {
        title: 'Length measurements',
        body: `- Standard length (SL): from the tip of the snout to the posterior end of the hypural plate, i.e. the base of the caudal fin. The end of the hypural plate shows as a crease when the tail is bent gently.
- Total length (TL): from the tip of the snout to the tip of the longest caudal-fin ray.
- Fork length (FL): to the fork of the caudal fin.

Taxonomists use SL because caudal-fin rays are often broken or worn, which makes TL unreliable.`,
      },
      {
        title: 'Standard body and head measurements',
        body: `Common measurements, taken point to point with digital calipers to 0.1 mm:
- Head length: from the snout tip to the posterior edge of the opercle (state whether you use the bony edge or the membrane).
- Body depth: the greatest depth of the body, often at the dorsal-fin origin.
- Caudal-peduncle length, and caudal-peduncle depth (its least depth).
- Predorsal length: from the snout tip to the dorsal-fin origin.
- Snout length, eye diameter and interorbital width.

Measure on the left side where possible and keep the fish straight; bent specimens give wrong lengths.`,
      },
      {
        title: 'Ratios and proportions',
        body: `Measurements are compared as proportions so that fishes of different sizes can be compared: body measurements as a percentage of standard length (% SL), head measurements as a percentage of head length (% HL), e.g. eye diameter 28% HL.

Proportions change as fishes grow (allometry). Compare specimens of similar size, or analyse a size series with regression, before concluding that two populations differ.`,
      },
      {
        title: 'Geometric morphometrics',
        body: `Geometric morphometrics studies the whole shape using landmarks: points that can be found on every specimen, such as fin origins, the tip of the snout and the end of the hypural plate.

Typical workflow:
- Photograph every specimen in the same orientation, with a scale bar.
- Digitise landmarks, for example with tpsDig2.
- Apply Procrustes superimposition, which removes differences in size, position and orientation so that only shape remains.
- Analyse shape with software such as MorphoJ or the R package geomorph (principal components, comparisons between groups).

See Research Tools for links to these programs.`,
      },
    ],
    quiz: [
      {
        prompt: 'Standard length (SL) is measured from the tip of the snout to…',
        options: ['the posterior end of the hypural plate (base of the caudal fin)', 'the tip of the longest caudal ray', 'the fork of the caudal fin', 'the anus'],
        correct: 0,
        explanation: 'SL ends at the hypural plate; TL and FL go into the caudal fin.',
      },
      {
        prompt: 'Why do taxonomists prefer standard length to total length?',
        options: ['Caudal-fin rays are often broken or worn', 'SL is always larger', 'SL can be measured without calipers', 'TL is not allowed by the ICZN'],
        correct: 0,
        explanation: 'Damaged caudal fins make TL unreliable.',
      },
      {
        prompt: 'Eye diameter is usually reported as a percentage of…',
        options: ['head length', 'total length', 'body depth', 'caudal-peduncle length'],
        correct: 0,
        explanation: 'Head measurements are given as % HL, body measurements as % SL.',
      },
      {
        prompt: 'Caudal-peduncle depth is…',
        options: ['the least depth of the caudal peduncle', 'the greatest depth of the body', 'the depth at the anal-fin origin', 'the length of the caudal fin'],
        correct: 0,
        explanation: 'It is measured at the narrowest point of the peduncle.',
      },
      {
        prompt: 'What does Procrustes superimposition do in geometric morphometrics?',
        options: [
          'Removes differences in size, position and orientation between landmark sets',
          'Counts the landmarks automatically',
          'Corrects colour differences between photographs',
          'Converts measurements to % SL',
        ],
        correct: 0,
        explanation: 'After superimposition, the remaining variation is shape.',
      },
    ],
  },
  {
    slug: 'photographing-fishes-for-identification',
    title: 'Photographing fishes for identification',
    summary: 'How to take photographs that experts can identify from, and handle fishes responsibly while doing it.',
    description: 'For anyone submitting identification requests, documenting surveys or building a photo record of fishes.',
    subject: 'photography',
    level: 'beginner',
    duration: 'About 40 minutes',
    lessons: [
      {
        title: 'Why good photographs matter',
        body: `Colours and patterns of many fishes fade quickly after death and in preservative, so photographs of live or freshly caught fish are often the best record of them.

A good set of photographs lets an expert identify a fish without seeing the specimen, and adds evidence to survey records and publications. Many species differ in details such as the mouth, barbels or fin rays, so a single blurry side view is often not enough.`,
      },
      {
        title: 'Setting up',
        body: `- Use a narrow, clean glass photo tank so the fish stays upright and close to the glass, with a plain background.
- Light the fish with diffuse light to avoid glare and reflections; angle the light away from the glass.
- Keep the camera parallel to the side of the fish so proportions are not distorted.
- Include a scale bar and a small label (field code, date) in the frame.
- By convention, photograph the left side, with the fins spread if possible.`,
      },
      {
        title: 'Which shots to take',
        body: `- A full side (lateral) view of the whole fish.
- Close-ups of the head from the side, from above and from below. The underside shows the mouth, lips and barbels, which are essential for groups like Garra (with its adhesive disc) and hillstream loaches.
- Each fin spread out, for counting rays.
- Any distinctive marks, such as spots, bars or a caudal blotch.
- Live colours before preservation, and note them in writing too.`,
      },
      {
        title: 'Handling and ethics',
        body: `- Keep handling short and the fish in water as much as possible.
- Follow local permits and animal-welfare guidance, including approved anaesthesia where photography requires it.
- Release fish unharmed where you can and where it is legal.
- Record the locality, date and habitat with your photographs.
- Do not publish exact localities of threatened species openly; share them with experts or databases that can restrict access.

When your photographs are ready, submit them as an Expert identification request on Indichthys.`,
      },
    ],
    quiz: [
      {
        prompt: 'Why are photographs of live or freshly caught fishes especially valuable?',
        options: ['Colours and patterns often fade after death and in preservative', 'Preserved fish cannot be identified', 'Museums do not accept specimens', 'Live fish are always larger'],
        correct: 0,
        explanation: 'Colour is often lost in preserved specimens.',
      },
      {
        prompt: 'Which view is the usual convention for the main photograph?',
        options: ['The left side, with fins spread', 'The right side, fins folded', 'From above only', 'From the front'],
        correct: 0,
        explanation: 'The left lateral view is standard, matching how counts and measurements are usually taken.',
      },
      {
        prompt: 'Why photograph the underside of the head of a Garra or hillstream loach?',
        options: ['The mouth, lips, barbels and adhesive disc are key identification characters', 'To show the colour of the belly', 'To measure standard length', 'It is the only side with scales'],
        correct: 0,
        explanation: 'Mouth structures are diagnostic in these groups.',
      },
      {
        prompt: 'How do you best avoid glare on the glass of a photo tank?',
        options: ['Use diffuse light angled away from the glass', 'Use the built-in flash straight on', 'Photograph in direct sunlight', 'Increase the ISO'],
        correct: 0,
        explanation: 'Diffuse, angled light reduces reflections.',
      },
      {
        prompt: 'What should you do with exact localities of threatened species?',
        options: ['Avoid publishing them openly; share with experts or databases that can restrict access', 'Publish them so others can find the fish', 'Never record them', 'Post them on social media for verification'],
        correct: 0,
        explanation: 'Open localities can expose threatened populations to collection and disturbance.',
      },
    ],
  },
];
