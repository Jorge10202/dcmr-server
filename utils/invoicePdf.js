import PDFDocument from 'pdfkit';

export function buildInvoicePDF({ order, user, items, company }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const BRAND_BROWN = '#5B3A29';
    const BRAND_GOLD  = '#F4B400';
    const TEXT        = '#333333';
    const MUTED       = '#777777';
    const ROW_ALT     = '#FFF9E6';
    const LINE        = '#EAEAEA';

    const M = doc.page.margins;
    const L = M.left;
    const R = doc.page.width - M.right;
    const innerW = R - L;
    const PAGE_BOTTOM = doc.page.height - M.bottom;

    const money = (n) => `Q ${Number(n || 0).toFixed(2)}`;

    const hr = (y, color = LINE, w = 1) => {
      doc.save()
        .lineWidth(w).strokeColor(color)
        .moveTo(L, y).lineTo(R, y).stroke()
        .restore();
    };

    const ensureSpace = (need = 80) => {
      if (doc.y + need > PAGE_BOTTOM) {
        doc.addPage();
        return true;
      }
      return false;
    };

    const sectionTitle = (txt) => {
      doc.moveDown(1);
      doc
        .font('Helvetica-Bold').fontSize(12).fillColor(BRAND_BROWN)
        .text(txt, L, doc.y, { width: innerW });
      hr(doc.y + 4, BRAND_GOLD, 1.5);
      doc.moveDown(0.8);
      doc.font('Helvetica').fillColor(TEXT);
    };

    const headerY = 38;
    const headerH = 72;

    doc
      .save()
      .rect(L, headerY, innerW, headerH)
      .fill(BRAND_BROWN)
      .restore();

    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold').fontSize(18)
      .text(company?.name || 'DCMR · Mueblería', L + 16, headerY + 12, { width: innerW / 2 - 16 });

    doc
      .font('Helvetica-Bold').fontSize(16)
      .text('Comprobante de Compra', L + innerW / 2, headerY + 12, {
        width: innerW / 2 - 16,
        align: 'right'
      });

    const fecha = new Date(order?.created_at || Date.now()).toLocaleString();
    doc
      .font('Helvetica').fontSize(9)
      .text(company?.address || '', L + 16, headerY + 40, { width: innerW / 2 - 16 })
      .text(company?.phone ? `Tel: ${company.phone}` : '', L + 16, headerY + 52);

    doc
      .text(`Fecha: ${fecha}`, L + innerW / 2, headerY + 40, {
        width: innerW / 2 - 16,
        align: 'right'
      });

    doc.moveDown(3);

    const boxTop = doc.y;
    const boxPad = 10;
    const boxW = innerW;
    const boxH = 78;

    doc
      .save()
      .roundedRect(L, boxTop, boxW, boxH, 8)
      .strokeColor(BRAND_GOLD).lineWidth(1.2).stroke()
      .restore();

    doc
      .fillColor(BRAND_BROWN)
      .font('Helvetica-Bold').fontSize(11)
      .text('Datos del Cliente', L + boxPad, boxTop + boxPad);

    doc
      .font('Helvetica').fontSize(10).fillColor(TEXT);

    const colW = boxW / 2 - 16;
    const leftX = L + boxPad;
    const rightX = L + boxW / 2;

    doc.text(`Nombre: ${user?.nombre || ''}`, leftX, boxTop + boxPad + 18, { width: colW });
    doc.text(user?.direccion ? `Dirección: ${user.direccion}` : '', leftX, doc.y + 2, { width: colW });

    doc.text(user?.telefono ? `Teléfono: ${user.telefono}` : '', rightX, boxTop + boxPad + 18, { width: colW });
    doc.text(user?.correo ? `Correo: ${user.correo}` : '', rightX, doc.y + 2, { width: colW });

    doc.moveDown(2);

    sectionTitle('Detalle de Productos');

    const C = {
      prod: { x: L,       w: 150, label: 'Producto',    align: 'left'  },
      desc: { x: L + 150, w: innerW - (150 + 60 + 70 + 90), label: 'Descripción', align: 'left' },
      qty:  { x: R - (60 + 70 + 90), w: 60,  label: 'Cant.', align: 'center' },
      prc:  { x: R - (70 + 90),      w: 70,  label: 'Precio', align: 'right'  },
      sub:  { x: R - 90,             w: 90,  label: 'Subtotal', align: 'right' }
    };

    const drawHeader = () => {
      const y = doc.y + 4;
      doc
        .save()
        .rect(L, y - 3, innerW, 20)
        .fill(BRAND_BROWN)
        .restore();

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF');
      doc.text(C.prod.label, C.prod.x + 6, y, { width: C.prod.w - 12 });
      doc.text(C.desc.label, C.desc.x + 6, y, { width: C.desc.w - 12 });
      doc.text(C.qty.label,  C.qty.x,       y, { width: C.qty.w,  align: 'center' });
      doc.text(C.prc.label,  C.prc.x,       y, { width: C.prc.w,  align: 'right'  });
      doc.text(C.sub.label,  C.sub.x,       y, { width: C.sub.w,  align: 'right'  });

      hr(y + 20, BRAND_GOLD, 1);
      doc.moveDown(1.4);
      doc.font('Helvetica').fontSize(10).fillColor(TEXT);
    };

    drawHeader();

    const PADY = 6;
    let grandTotal = 0;

    const normalized = (s) =>
      (s || '-')
        .toString()
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

    items.forEach((it, idx) => {
      const prodText = normalized(it.nombre);
      const descText = normalized(it.descripcion);

      const hProd = doc.heightOfString(prodText, { width: C.prod.w - 12, lineGap: 1.4 });
      const hDesc = doc.heightOfString(descText, { width: C.desc.w - 12, lineGap: 1.4 });
      const rowH  = Math.max(hProd, hDesc, 12) + PADY * 2;

      if (doc.y + rowH > PAGE_BOTTOM - 100) {
        doc.addPage();
        drawHeader();
      }

      const y0 = doc.y;

      if (idx % 2 === 0) {
        doc.save()
          .rect(L, y0, innerW, rowH)
          .fill(ROW_ALT)
          .restore();
      }

      const yText = y0 + PADY;

      doc.fillColor(TEXT);
      doc.text(prodText, C.prod.x + 6, yText, { width: C.prod.w - 12, lineGap: 1.4 });
      doc.text(descText, C.desc.x + 6, yText, { width: C.desc.w - 12, lineGap: 1.4 });
      doc.text(String(it.quantity), C.qty.x, yText, { width: C.qty.w, align: 'center' });
      doc.text(money(it.unit_price), C.prc.x, yText, { width: C.prc.w, align: 'right' });

      const sub = Number(it.quantity) * Number(it.unit_price);
      grandTotal += sub;
      doc.text(money(sub), C.sub.x, yText, { width: C.sub.w, align: 'right' });

      doc.y = y0 + rowH;
      hr(doc.y, LINE, 1);
      doc.moveDown(0.2);
    });

    doc.moveDown(0.8);
    let boxY = doc.y + 12;
    const boxW2 = 230;
    const boxH2 = 56;
    const boxX2 = R - boxW2;

    if (boxY + boxH2 > PAGE_BOTTOM - 60) {
      doc.addPage();
      boxY = doc.y + 4;
    }

    doc
      .save()
      .roundedRect(boxX2, boxY, boxW2, boxH2, 8)
      .strokeColor(BRAND_GOLD).lineWidth(1.2).stroke()
      .restore();

    doc
      .font('Helvetica-Bold').fontSize(11).fillColor(BRAND_BROWN)
      .text('Total:', boxX2 + 12, boxY + 10, { width: boxW2 - 24 });

    doc
      .font('Helvetica-Bold').fontSize(12).fillColor(TEXT)
      .text(money(grandTotal), boxX2 + 12, boxY + 28, {
        width: boxW2 - 24,
        align: 'right'
      });

    const defaultNote =
      `Nota: Su producto se entregará en dos días hábiles. ` +
      `Para consultas comuníquese al ${company?.phone || ''}.`;

    const bankName = process.env.BANK_NAME || 'Banco Industrial';
    const bankAcc  = process.env.BANK_ACCOUNT || '000-000000-0';
    const bankHold = process.env.BANK_HOLDER || (company?.name || 'DCMR · Mueblería');
    const waPhone  = process.env.COMPANY_WHATSAPP || (company?.phone || '');

    const depositNote =
      `Este pedido se registró como pago por depósito bancario.\n` +
      `Realice el depósito a: ${bankName}, cuenta ${bankAcc}, a nombre de ${bankHold}.\n` +
      (waPhone ? `Al finalizar, envíe su comprobante por WhatsApp al ${waPhone}.` : 'Al finalizar, envíe su comprobante por WhatsApp.');

    let noteText = order?.status === 'deposito' ? depositNote : defaultNote;

    let noteY = boxY + boxH2 + 16;
    if (noteY + 48 > PAGE_BOTTOM) { doc.addPage(); noteY = doc.y; }

    const noteW = innerW;
    const noteH = doc.heightOfString(noteText, { width: noteW - 24, lineGap: 1.5 });

    doc
      .save()
      .roundedRect(L, noteY, noteW, noteH + 18, 8)
      .fill('#FFFDF5')
      .strokeColor(BRAND_GOLD).lineWidth(1).stroke()
      .restore();

    doc
      .font('Helvetica').fontSize(10).fillColor(TEXT)
      .text(noteText, L + 12, noteY + 9, { width: noteW - 24, lineGap: 1.5 });

    const footY = PAGE_BOTTOM - 26;
    hr(footY, LINE, 1);
    doc
      .font('Helvetica').fontSize(9).fillColor(MUTED)
      .text(company?.name || 'DCMR · Mueblería', L, footY + 6, { width: innerW / 2 })
      .text('Gracias por su compra', R - innerW / 2, footY + 6, { width: innerW / 2, align: 'right' });

    doc.end();
  });
}
