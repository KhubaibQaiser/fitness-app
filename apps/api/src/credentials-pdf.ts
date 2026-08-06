import PDFDocument from 'pdfkit';
import type { CredentialsPdfData } from '@gymos/modules/coaching';

const dash = (value: string | number | null | undefined): string =>
  value === null || value === undefined || value === '' ? '—' : String(value);

const fmtCm = (cm: number | null | undefined): string =>
  cm === null || cm === undefined ? '—' : `${cm} cm`;

const fmtKg = (kg: number | null | undefined): string =>
  kg === null || kg === undefined ? '—' : `${kg} kg`;

/** Form-layout credentials PDF for a signed client intake. */
export const renderCredentialsPdf = (data: CredentialsPdfData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { client, latestVitals, latestWeightKg, goal } = data;
    const generatedAt = new Date().toISOString();
    const signedAt = client.intake?.signedAt ?? '—';
    const left = doc.page.margins.left;
    const labelW = 160;
    const valueX = left + labelW;
    const valueW = doc.page.width - doc.page.margins.right - valueX;

    doc.fontSize(18).text('Client credentials', { align: 'left' });
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#555555').text(`Generated ${generatedAt}`);
    doc.fillColor('#000000');
    doc.moveDown();

    const section = (title: string) => {
      doc.moveDown(0.5);
      const y = doc.y;
      doc.fontSize(12).fillColor('#111111').text(title, left, y);
      doc
        .moveTo(left, doc.y + 4)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y + 4)
        .strokeColor('#cccccc')
        .stroke();
      doc.moveDown(0.7);
      doc.fontSize(10).fillColor('#000000');
    };

    const row = (label: string, value: string) => {
      const y = doc.y;
      doc.text(label, left, y, { width: labelW });
      doc.text(value, valueX, y, { width: valueW });
      doc.moveDown(0.15);
    };

    section('Identity');
    row('Full name', client.name);
    row('Gender', client.sex === 'M' ? 'Male' : 'Female');
    row('Date of birth', dash(client.dob));
    row('Height', fmtCm(client.heightCm));
    row('Activity level', dash(client.activityLevel));

    section('Contact');
    row('WhatsApp / phone', dash(client.phone));
    row('Email', dash(client.email));

    section('Body');
    row('Weight', fmtKg(latestWeightKg));
    row('Waist', fmtCm(latestVitals?.waistCm));
    row('Chest', fmtCm(latestVitals?.chestCm));
    row('Hip', fmtCm(latestVitals?.hipCm));
    row('Arm', fmtCm(latestVitals?.armCm));
    row('Thigh', fmtCm(latestVitals?.thighCm));

    section('Goal');
    row('Preset', dash(goal?.preset));
    row('Rate', dash(goal?.rate));
    row('Start weight', fmtKg(goal?.startWeightKg ?? null));
    row('Target weight', fmtKg(goal?.targetWeightKg ?? null));

    section('Medical');
    const flags = client.medicalFlags;
    const conditions =
      flags?.conditions !== undefined && flags.conditions.length > 0
        ? flags.conditions.join(', ')
        : '—';
    row('Conditions', conditions);
    row(
      'Physician clearance',
      flags?.physicianClearanceRequired === true
        ? 'Required'
        : flags?.physicianClearanceRequired === false
          ? 'Not required'
          : '—',
    );
    row('Pregnant', flags?.pregnant === true ? 'Yes' : 'No');

    section('Client signature');
    row('Signed at', signedAt);

    const raw = client.intake?.signaturePngBase64 ?? '';
    const base64 = raw.includes(',') ? (raw.split(',')[1] ?? raw) : raw;
    try {
      const img = Buffer.from(base64, 'base64');
      if (img.length > 0) {
        doc.moveDown(0.4);
        doc.image(img, left, doc.y, { fit: [280, 100] });
      }
    } catch {
      doc.moveDown(0.3);
      doc.fillColor('#aa0000').text('Signature image could not be rendered.');
      doc.fillColor('#000000');
    }

    doc.end();
  });

export const credentialsFilename = (name: string): string => {
  const safe = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `client-${safe || 'credentials'}-credentials.pdf`;
};
