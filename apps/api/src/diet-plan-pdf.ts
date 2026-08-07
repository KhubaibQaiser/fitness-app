import PDFDocument from 'pdfkit';
import type { DietPlanPdfData, DietPlanPdfOption } from '@gymos/modules/nutrition';

/** Locked template palette — do not invent new colors. */
const PRIMARY = '#1a365d';
const ACCENT = '#2b6cb0';
const DARK = '#1a202c';
const GREEN = '#276749';
const SOFT_GRAY = '#4a5568';

const DEFAULT_MOTIVATION =
  'You already took the first step by starting. Keep going. Every meal is a chance to get stronger.';

const DEFAULT_HYDRATION =
  'Drink at least 3 litres of water every day. It helps with energy and recovery.';

const IN = 72;
const MARGIN = {
  left: 0.7 * IN,
  right: 0.7 * IN,
  top: 0.55 * IN,
  bottom: 0.55 * IN,
} as const;

type PdfDoc = InstanceType<typeof PDFDocument>;

/**
 * ReportLab-equivalent spacer: consecutive spaceAfter + spaceBefore collapse
 * to max(after, before), matching flowable packing in the locked template.
 */
type Spacer = {
  lastAfter: number;
  before: (pt: number) => void;
  after: (pt: number) => void;
};

const createSpacer = (doc: PdfDoc): Spacer => {
  const spacer: Spacer = {
    lastAfter: 0,
    before: (pt: number) => {
      const gap = Math.max(spacer.lastAfter, pt);
      doc.y += gap;
      spacer.lastAfter = 0;
    },
    after: (pt: number) => {
      spacer.lastAfter = pt;
    },
  };
  return spacer;
};

/**
 * Pixel-locked diet-plan PDF. Spacing values are ReportLab-equivalent points
 * (spaceBefore / spaceAfter / leading). coach_name and client_name are rendered
 * exactly as provided — never hardcoded.
 */
export const renderDietPlanPdf = (data: DietPlanPdfData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: MARGIN.top,
        bottom: MARGIN.bottom,
        left: MARGIN.left,
        right: MARGIN.right,
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = MARGIN.left;
    const width = doc.page.width - MARGIN.left - MARGIN.right;
    const coachName = data.coachName;
    const clientName = data.clientName;
    const motivation =
      data.motivation !== undefined && data.motivation.trim() !== ''
        ? data.motivation.trim()
        : DEFAULT_MOTIVATION;
    const sp = createSpacer(doc);

    // 1. Client Title — spaceBefore 2, spaceAfter 3, leading 22
    sp.before(2);
    writeLine(doc, `${clientName} — Diet Plan`, {
      font: 'Helvetica-Bold',
      size: 18,
      color: PRIMARY,
      width,
      align: 'center',
      leading: 22,
      x: left,
    });
    sp.after(3);

    // 2. Coach Name — spaceBefore 1, spaceAfter 10
    sp.before(1);
    writeLine(doc, coachName, {
      font: 'Helvetica',
      size: 10,
      color: ACCENT,
      width,
      align: 'center',
      leading: 12,
      x: left,
    });
    sp.after(10);

    // 3. Motivation — spaceBefore 2, spaceAfter 14, leading 15
    sp.before(2);
    writeLine(doc, motivation, {
      font: 'Helvetica-Oblique',
      size: 11,
      color: DARK,
      width,
      align: 'center',
      leading: 15,
      x: left,
    });
    sp.after(14);

    // 4–6. Sections
    writeOptionSection(doc, sp, 'Breakfast', data.breakfast, left, width);
    writeOptionSection(doc, sp, 'Lunch', data.lunch, left, width);
    writeFlatSection(doc, sp, 'Dinner', data.dinner, left, width);

    // 7. Note (optional)
    const notes = data.notes ?? [];
    if (notes.length > 0) {
      sp.before(8);
      writeLine(doc, 'Note:', {
        font: 'Helvetica-Bold',
        size: 10,
        color: DARK,
        width,
        align: 'left',
        leading: 12,
        x: left,
      });
      sp.after(0);
      for (const note of notes) {
        writeBulletItem(doc, sp, note, left, width);
      }
    }

    // 8. Hydration Note — title spaceBefore 16, spaceAfter 4; body leading 13.5
    sp.before(16);
    writeLine(doc, 'Hydration Note', {
      font: 'Helvetica-Bold',
      size: 10.5,
      color: GREEN,
      width,
      align: 'center',
      leading: 13,
      x: left,
    });
    sp.after(4);
    const hydrationText =
      data.hydration !== undefined && data.hydration.trim() !== ''
        ? data.hydration.trim()
        : DEFAULT_HYDRATION;
    writeLine(doc, hydrationText, {
      font: 'Helvetica',
      size: 10,
      color: DARK,
      width,
      align: 'center',
      leading: 13.5,
      x: left,
    });
    sp.after(0);

    // 9. Footer — spaceBefore 14
    sp.before(14);
    writeLine(doc, coachName, {
      font: 'Helvetica',
      size: 9,
      color: SOFT_GRAY,
      width,
      align: 'center',
      leading: 11,
      x: left,
    });

    doc.end();
  });

const writeOptionSection = (
  doc: PdfDoc,
  sp: Spacer,
  heading: string,
  options: readonly DietPlanPdfOption[],
  left: number,
  width: number,
): void => {
  if (options.length === 0) return;

  // 4. Section header — spaceBefore 12, spaceAfter 5
  sp.before(12);
  writeLine(doc, heading, {
    font: 'Helvetica-Bold',
    size: 12.5,
    color: PRIMARY,
    width,
    align: 'left',
    leading: 15,
    x: left,
  });
  sp.after(5);

  for (const option of options) {
    const title = option.title.trim();
    // 5. Option title — only if non-empty; spaceBefore 7, spaceAfter 3
    if (title.length > 0) {
      sp.before(7);
      writeLine(doc, title, {
        font: 'Helvetica-Bold',
        size: 10.5,
        color: ACCENT,
        width,
        align: 'left',
        leading: 13,
        x: left,
      });
      sp.after(3);
    }
    for (const item of option.items) {
      writeBulletItem(doc, sp, item, left, width);
    }
  }
};

const writeFlatSection = (
  doc: PdfDoc,
  sp: Spacer,
  heading: string,
  items: readonly string[],
  left: number,
  width: number,
): void => {
  if (items.length === 0) return;

  sp.before(12);
  writeLine(doc, heading, {
    font: 'Helvetica-Bold',
    size: 12.5,
    color: PRIMARY,
    width,
    align: 'left',
    leading: 15,
    x: left,
  });
  sp.after(5);

  for (const item of items) {
    writeBulletItem(doc, sp, item, left, width);
  }
};

/** Food / note bullet: "•  {text}" (two spaces), leftIndent 12, SB/SA 1.5, leading 13. */
const writeBulletItem = (
  doc: PdfDoc,
  sp: Spacer,
  itemText: string,
  left: number,
  width: number,
): void => {
  const text = itemText.trim();
  if (text.length === 0) return;
  sp.before(1.5);
  writeLine(doc, `•  ${text}`, {
    font: 'Helvetica',
    size: 10,
    color: DARK,
    width: width - 12,
    align: 'left',
    leading: 13,
    x: left + 12,
  });
  sp.after(1.5);
};

const writeLine = (
  doc: PdfDoc,
  text: string,
  opts: {
    font: string;
    size: number;
    color: string;
    width: number;
    align: 'left' | 'center';
    leading: number;
    x: number;
  },
): void => {
  doc.font(opts.font).fontSize(opts.size).fillColor(opts.color);
  const lineGap = Math.max(0, opts.leading - opts.size);
  const height = doc.heightOfString(text, { width: opts.width, lineGap });
  doc.text(text, opts.x, doc.y, {
    width: opts.width,
    align: opts.align,
    lineGap,
    height: height + 0.01,
  });
};

/** Filename like `Sami-Diet-Plan.pdf` from the title client_name. */
export const dietPlanFilename = (clientName: string): string => {
  const first = clientName.trim().split(/\s+/)[0] ?? 'Client';
  const safe = first
    .normalize('NFKD')
    .replace(/[^\w\-]+/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const titled = safe.length > 0 ? safe.charAt(0).toUpperCase() + safe.slice(1) : 'Client';
  return `${titled}-Diet-Plan.pdf`;
};
