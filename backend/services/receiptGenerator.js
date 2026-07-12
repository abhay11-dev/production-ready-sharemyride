const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ─── Fonts ──────────────────────────────────────────────────────────────
// Standard PDF core fonts (Helvetica, etc.) have NO glyph for the Indian
// Rupee sign (U+20B9) or for emoji, which is why the old receipt rendered
// broken glyphs like "Ø=Þ—" and "¹" instead of icons and "₹". We embed a
// small subsetted Noto Sans (Latin + ₹) instead, and draw all icons as
// vector shapes so nothing depends on emoji font coverage.
const FONT_REGULAR = path.join(__dirname, '../fonts/NotoSans-Regular.ttf');
const FONT_BOLD = path.join(__dirname, '../fonts/NotoSans-Bold.ttf');

// ─── Brand palette (matches the frontend ShareMyRide theme) ───────────────
const BRAND = {
  blue: '#2563EB',
  blueDark: '#1D4ED8',
  blueLight: '#EFF6FF',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  amber: '#D97706',
  amberLight: '#FFFBEB',
  red: '#DC2626',
  redLight: '#FEF2F2',
  gray900: '#111827',
  gray600: '#4B5563',
  gray400: '#9CA3AF',
  gray100: '#F3F4F6',
  border: '#E5E7EB',
  white: '#FFFFFF',
};

const STATUS_BADGE = {
  pending: { color: BRAND.amber, bg: BRAND.amberLight, label: 'Pending' },
  accepted: { color: BRAND.blue, bg: BRAND.blueLight, label: 'Confirmed' },
  confirmed: { color: BRAND.blue, bg: BRAND.blueLight, label: 'Confirmed' },
  completed: { color: BRAND.green, bg: BRAND.greenLight, label: 'Completed' },
  cancelled: { color: BRAND.gray600, bg: BRAND.gray100, label: 'Cancelled' },
  rejected: { color: BRAND.red, bg: BRAND.redLight, label: 'Rejected' },
};

// ─── Vector icon helpers (no emoji anywhere) ───────────────────────────────
// Each icon is drawn inside a colored circular badge so the receipt keeps a
// clean, modern look without depending on emoji glyph support in the font.

function iconBadge(doc, { x, y, r = 10, bg = BRAND.blueDark, type }) {
  doc.circle(x, y, r).fill(bg);
  const iconColor = BRAND.white;
  const s = r * 0.62; // icon scale relative to badge radius

  switch (type) {
    case 'car': {
      // Minimalist car silhouette: cab + body + two wheels
      const w = s * 1.7, h = s * 0.7;
      doc.roundedRect(x - w / 2, y - h * 0.15, w, h * 0.55, h * 0.25).fill(iconColor);
      doc.roundedRect(x - w * 0.3, y - h * 0.75, w * 0.6, h * 0.6, h * 0.2).fill(iconColor);
      doc.circle(x - w * 0.28, y + h * 0.42, h * 0.28).fill(iconColor);
      doc.circle(x + w * 0.28, y + h * 0.42, h * 0.28).fill(iconColor);
      break;
    }
    case 'person': {
      // Head + shoulders
      doc.circle(x, y - s * 0.32, s * 0.36).fill(iconColor);
      doc.ellipse(x, y + s * 0.42, s * 0.52, s * 0.44).fill(iconColor);
      break;
    }
    case 'rupee': {
      doc.font(FONT_BOLD).fontSize(s * 1.5).fillColor(iconColor);
      doc.text('\u20B9', x - s, y - s * 0.72, { width: s * 2, align: 'center' });
      break;
    }
    case 'doc': {
      // Invoice / document icon: filled card with "text line" gaps
      const w = s * 1.1, h = s * 1.5;
      doc.roundedRect(x - w / 2, y - h / 2, w, h, w * 0.12).fill(iconColor);
      const gap = h * 0.16;
      for (let i = 0; i < 3; i++) {
        doc
          .rect(x - w * 0.32, y - h * 0.22 + i * gap, w * 0.64, gap * 0.32)
          .fill(bg);
      }
      break;
    }
    case 'check': {
      doc
        .save()
        .lineWidth(Math.max(2, s * 0.26))
        .strokeColor(iconColor)
        .lineCap('round')
        .lineJoin('round')
        .moveTo(x - s * 0.5, y)
        .lineTo(x - s * 0.1, y + s * 0.4)
        .lineTo(x + s * 0.55, y - s * 0.45)
        .stroke()
        .restore();
      break;
    }
  }
}

// ─── Small drawing helpers, reused across sections ─────────────────────────

function sectionHeader(doc, { x, y, width, title, icon }) {
  doc.roundedRect(x, y, width, 22, 3).fill(BRAND.blueLight);
  iconBadge(doc, { x: x + 15, y: y + 11, r: 8, bg: BRAND.blueDark, type: icon });
  doc.font(FONT_BOLD).fontSize(10.5).fillColor(BRAND.blueDark);
  doc.text(title, x + 30, y + 6.5);
  return y + 22 + 8;
}

function kvRows(doc, { x, y, rows, labelWidth = 150, valueWidth = 315 }) {
  rows.forEach(([label, value]) => {
    doc.font(FONT_REGULAR).fontSize(9).fillColor(BRAND.gray600);
    doc.text(label, x, y, { width: labelWidth });
    doc.font(FONT_BOLD).fontSize(9).fillColor(BRAND.gray900);
    doc.text(String(value), x + labelWidth + 20, y, { width: valueWidth, align: 'left' });
    y += 15;
  });
  return y;
}

function statusBadge(doc, { x, y, status }) {
  const meta = STATUS_BADGE[status] || STATUS_BADGE.pending;
  doc.font(FONT_BOLD).fontSize(9);
  const label = meta.label;
  const textWidth = doc.widthOfString(label);
  const padX = 8, h = 18;
  const w = textWidth + padX * 2;
  doc.roundedRect(x - w, y, w, h, h / 2).fill(meta.bg);
  doc.fillColor(meta.color).text(label, x - w, y + 5, { width: w, align: 'center' });
}

function routeVisual(doc, { x, y, width, from, to }) {
  const dotX = x + 6;
  doc.circle(dotX, y + 4, 3).fill(BRAND.blue);
  doc.circle(dotX, y + 36, 3).fill(BRAND.green);
  doc
    .save()
    .dash(2, { space: 2 })
    .lineWidth(1)
    .strokeColor(BRAND.border)
    .moveTo(dotX, y + 8)
    .lineTo(dotX, y + 32)
    .stroke()
    .undash()
    .restore();

  doc.font(FONT_REGULAR).fontSize(7).fillColor(BRAND.gray400);
  doc.text('FROM', x + 18, y - 3);
  doc.font(FONT_BOLD).fontSize(9.5).fillColor(BRAND.gray900);
  doc.text(from || 'N/A', x + 18, y + 6, { width: width - 18 });

  doc.font(FONT_REGULAR).fontSize(7).fillColor(BRAND.gray400);
  doc.text('TO', x + 18, y + 26);
  doc.font(FONT_BOLD).fontSize(9.5).fillColor(BRAND.gray900);
  doc.text(to || 'N/A', x + 18, y + 35, { width: width - 18 });

  return y + 54;
}

/**
 * Generate PDF receipt for booking with a unified, emoji-free design.
 */
exports.generateReceipt = async (transaction, booking, passenger, driver) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });

      // Register the embedded Unicode font (covers ₹ and all Latin text).
      doc.registerFont('NotoSans', FONT_REGULAR);
      doc.registerFont('NotoSans-Bold', FONT_BOLD);
      // Keep local aliases matching the constants used throughout this file.

      const receiptsDir = path.join(__dirname, '../receipts');
      if (!fs.existsSync(receiptsDir)) {
        fs.mkdirSync(receiptsDir, { recursive: true });
      }

      const filename = `receipt_${transaction._id}.pdf`;
      const filepath = path.join(receiptsDir, filename);
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      const pageWidth = 495;
      const leftMargin = 50;
      const status = booking.status || 'completed';

      // ============================================
      // HEADER BAND
      // ============================================
      doc.rect(50, 50, pageWidth, 60).fill(BRAND.blue);
      doc.rect(50, 50, pageWidth, 3).fill(BRAND.blueDark);

      // Logo chip
      doc.roundedRect(leftMargin + 15, 65, 26, 26, 6).fill(BRAND.white);
      doc.font(FONT_BOLD).fontSize(13).fillColor(BRAND.blue);
      doc.text('S', leftMargin + 15, 74, { width: 26, align: 'center' });

      doc.font(FONT_BOLD).fontSize(16).fillColor(BRAND.white);
      doc.text('ShareMyRide', leftMargin + 50, 68);
      doc.font(FONT_REGULAR).fontSize(8.5).fillColor('#DBEAFE');
      doc.text('Your trusted ride-sharing partner', leftMargin + 50, 88);

      doc.font(FONT_BOLD).fontSize(10).fillColor(BRAND.white);
      doc.text('RIDE RECEIPT', 340, 68, { width: 155, align: 'right' });
      doc.font(FONT_REGULAR).fontSize(8).fillColor('#DBEAFE');
      doc.text(
        `#${transaction._id.toString().slice(-10).toUpperCase()}`,
        340,
        84,
        { width: 155, align: 'right' }
      );

      let yPos = 128;

      // ============================================
      // META ROW — issue date + status badge
      // ============================================
      doc.font(FONT_REGULAR).fontSize(9).fillColor(BRAND.gray600);
      doc.text(
        `Issued ${new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}`,
        leftMargin,
        yPos
      );
      statusBadge(doc, { x: 545, y: yPos - 4, status });
      yPos += 22;

      doc.moveTo(50, yPos).lineTo(545, yPos).lineWidth(0.75).strokeColor(BRAND.border).stroke();
      yPos += 18;

      // ============================================
      // RIDE DETAILS
      // ============================================
      yPos = sectionHeader(doc, { x: leftMargin, y: yPos, width: pageWidth, title: 'RIDE DETAILS', icon: 'car' });

      yPos = routeVisual(doc, {
        x: leftMargin,
        y: yPos,
        width: pageWidth,
        from: booking.pickupLocation,
        to: booking.dropLocation,
      });

      yPos = kvRows(doc, {
        x: leftMargin,
        y: yPos,
        rows: [
          [
            'Journey Date:',
            new Date(booking.rideId.date).toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          ],
          ['Departure Time:', booking.rideId.time],
          ['Seats Booked:', `${booking.seatsBooked} Seat(s)`],
        ],
      });
      yPos += 4;

      // ============================================
      // TRANSACTION / PAYMENT DETAILS
      // ============================================
      yPos = sectionHeader(doc, { x: leftMargin, y: yPos, width: pageWidth, title: 'TRANSACTION DETAILS', icon: 'doc' });
      yPos = kvRows(doc, {
        x: leftMargin,
        y: yPos,
        rows: [
          ['Transaction ID:', transaction._id.toString()],
          ['Payment ID:', transaction.razorpayPaymentId || 'N/A'],
          [
            'Payment Date:',
            new Date(transaction.paymentCapturedAt).toLocaleString('en-IN', {
              dateStyle: 'long',
              timeStyle: 'short',
            }),
          ],
          ['Payment Method:', (transaction.paymentMethod || 'online').toUpperCase()],
        ],
      });
      yPos += 4;

      // ============================================
      // PASSENGER & DRIVER
      // ============================================
      yPos = sectionHeader(doc, { x: leftMargin, y: yPos, width: pageWidth, title: 'CONTACT INFORMATION', icon: 'person' });

      const boxWidth = (pageWidth - 15) / 2;
      const boxTop = yPos;
      const boxHeight = 66;

      // Passenger card
      doc.roundedRect(leftMargin, boxTop, boxWidth, boxHeight, 4).fillAndStroke(BRAND.blueLight, BRAND.border);
      doc.font(FONT_BOLD).fontSize(9.5).fillColor(BRAND.blueDark);
      doc.text('PASSENGER', leftMargin + 12, boxTop + 10);
      doc.font(FONT_REGULAR).fontSize(8).fillColor(BRAND.gray600);
      doc.text('Name', leftMargin + 12, boxTop + 28);
      doc.font(FONT_BOLD).fontSize(9).fillColor(BRAND.gray900);
      doc.text(passenger.name, leftMargin + 12, boxTop + 39, { width: boxWidth - 24 });
      doc.font(FONT_REGULAR).fontSize(8).fillColor(BRAND.gray600);
      doc.text('Email', leftMargin + 12, boxTop + 54);
      doc.font(FONT_BOLD).fontSize(8.5).fillColor(BRAND.gray900);
      doc.text(passenger.email, leftMargin + 12, boxTop + 65, { width: boxWidth - 24 });

      // Driver card
      const driverX = leftMargin + boxWidth + 15;
      doc.roundedRect(driverX, boxTop, boxWidth, boxHeight, 4).fillAndStroke(BRAND.greenLight, BRAND.border);
      doc.font(FONT_BOLD).fontSize(9.5).fillColor(BRAND.green);
      doc.text('DRIVER', driverX + 12, boxTop + 10);
      doc.font(FONT_REGULAR).fontSize(8).fillColor(BRAND.gray600);
      doc.text('Name', driverX + 12, boxTop + 28);
      doc.font(FONT_BOLD).fontSize(9).fillColor(BRAND.gray900);
      doc.text(driver.name, driverX + 12, boxTop + 39, { width: boxWidth - 24 });
      doc.font(FONT_REGULAR).fontSize(8).fillColor(BRAND.gray600);
      doc.text('Vehicle', driverX + 12, boxTop + 54);
      doc.font(FONT_BOLD).fontSize(9).fillColor(BRAND.gray900);
      doc.text(booking.rideId.vehicleNumber, driverX + 12, boxTop + 65, { width: boxWidth - 24 });

      yPos = boxTop + boxHeight + 10;

      // ============================================
      // FARE BREAKDOWN
      // ============================================
      yPos = sectionHeader(doc, { x: leftMargin, y: yPos, width: pageWidth, title: 'FARE BREAKDOWN', icon: 'rupee' });

      const fareRow = (label, amount, y) => {
        doc.font(FONT_REGULAR).fontSize(9.5).fillColor(BRAND.gray600);
        doc.text(label, leftMargin, y);
        doc.font(FONT_BOLD).fontSize(9.5).fillColor(BRAND.gray900);
        doc.text(`\u20B9${amount.toFixed(2)}`, 440, y, { width: 95, align: 'right' });
      };

      fareRow('Base Fare', booking.baseFare, yPos);
      yPos += 15;
      fareRow('Platform Service Fee', booking.platformFee, yPos);
      yPos += 15;
      fareRow('GST (18% on Service Fee)', booking.gst, yPos);
      yPos += 10;

      doc.moveTo(leftMargin, yPos).lineTo(545, yPos).lineWidth(0.75).strokeColor(BRAND.border).stroke();
      yPos += 8;

      // Total banner
      doc.roundedRect(leftMargin, yPos, pageWidth, 24, 3).fill(BRAND.blueLight);
      doc.font(FONT_BOLD).fontSize(11).fillColor(BRAND.blueDark);
      doc.text('TOTAL AMOUNT PAID', leftMargin + 12, yPos + 7);
      doc.fontSize(12.5);
      doc.text(`\u20B9${booking.totalFare.toFixed(2)}`, 440, yPos + 5.5, { width: 95, align: 'right' });
      yPos += 24 + 8;

      // Commission / driver net note
      doc.font(FONT_REGULAR).fontSize(7.5).fillColor(BRAND.gray600);
      doc.text(
        `Platform Commission (10%): \u20B9${transaction.baseCommissionAmount.toFixed(2)}   |   GST: \u20B9${transaction.gstAmount.toFixed(2)}`,
        leftMargin,
        yPos,
        { width: pageWidth }
      );
      yPos += 11;
      doc.font(FONT_BOLD).fontSize(8.5).fillColor(BRAND.green);
      doc.text(`Driver Net Earnings: \u20B9${transaction.driverNetAmount.toFixed(2)}`, leftMargin, yPos);
      yPos += 16;

      // ============================================
      // PAYMENT COMPLETED BANNER
      // ============================================
      doc.roundedRect(leftMargin, yPos, pageWidth, 26, 4).fill(BRAND.greenLight);
      iconBadge(doc, { x: leftMargin + 20, y: yPos + 13, r: 8, bg: BRAND.green, type: 'check' });
      doc.font(FONT_BOLD).fontSize(10).fillColor(BRAND.green);
      doc.text('PAYMENT COMPLETED', leftMargin, yPos + 9.5, { width: pageWidth, align: 'center' });
      yPos += 26 + 10;

      // ============================================
      // FOOTER — placed directly below the actual content. Only breaks to
      // a new page if the footer block genuinely wouldn't fit above the
      // bottom margin (avoids forcing an unnecessary blank page).
      // ============================================
      let footerY = yPos + 14;
      if (footerY + 45 > 792) {
        doc.addPage();
        footerY = 60;
      }
      doc.moveTo(50, footerY).lineTo(545, footerY).lineWidth(0.75).strokeColor(BRAND.border).stroke();

      doc.font(FONT_BOLD).fontSize(10).fillColor(BRAND.blue);
      doc.text('Thank you for choosing ShareMyRide!', 50, footerY + 10, { width: pageWidth, align: 'center' });

      doc.font(FONT_REGULAR).fontSize(7.5).fillColor(BRAND.gray600);
      doc
        .text('For support: support@sharemyride.com  |  +91-1800-123-4567', 50, footerY + 26, {
          width: pageWidth,
          align: 'center',
        })
        .text('This is a computer-generated receipt. No signature required.', 50, footerY + 37, {
          width: pageWidth,
          align: 'center',
        });

      doc.end();

      stream.on('finish', () => resolve({ filepath, filename }));
      stream.on('error', (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = exports;