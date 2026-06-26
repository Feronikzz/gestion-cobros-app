import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, PDFName, rgb, StandardFonts } from 'pdf-lib';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const pdfPath = path.join(process.cwd(), 'public', 'designacion-representante.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const fields = form.getFields().map(f => ({
      name: f.getName(),
      type: f.constructor.name,
    }));
    return NextResponse.json({ fields });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pdfPath = path.join(process.cwd(), 'public', 'designacion-representante.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const fields = form.getFields();
    const fieldNames = fields.map(f => f.getName());

    const setField = (name: string, value: string) => {
      if (!fieldNames.includes(name)) return;
      try {
        const field = form.getTextField(name);
        field.setText(value || '');
      } catch {}
    };

    const setCheck = (name: string, value: boolean) => {
      if (!fieldNames.includes(name)) return;
      try {
        const field = form.getCheckBox(name);
        if (value) field.check(); else field.uncheck();
      } catch {}
    };

    const {
      representado,
      representante,
      lugar,
      dia,
      mes,
      anio,
      consentimiento_dehu,
      solicitud,
    } = body;

    // ── REPRESENTADO (fila superior del formulario) ──
    // ... (rest of representado fields)
    if (representado) {
      setField('Texto1', representado.nombre || '');
      setField('Texto2', representado.apellido1 || '');
      setField('Texto3', representado.apellido2 || '');
      setField('Texto4', representado.nacionalidad || '');
      setField('Texto5', representado.nif || '');
      setField('Texto6', representado.pasaporte || '');
      setField('Texto7', representado.fecha_nac_dd || '');
      setField('Texto8', representado.fecha_nac_mm || '');
      setField('Texto9', representado.fecha_nac_aaaa || '');
      setField('Texto10', representado.localidad_nacimiento || '');
      setField('Texto11', representado.pais || representado.pais_nacimiento || '');
      setField('Texto12', representado.nombre_padre || '');
      setField('Texto13', representado.nombre_madre || '');
      setField('Texto14', representado.domicilio || '');
      setField('Texto15', representado.numero || '');
      setField('Texto16', representado.piso || '');
      setField('Texto17', representado.localidad || '');
      setField('Texto18', representado.cp || '');
      setField('Texto19', representado.provincia || '');
      setField('Texto20', representado.telefono || '');
      setField('Texto21', representado.email || '');
      // Estado civil: Casilla 1=S, 2=C, 3=V, 4=D, 5=Sp
      setCheck('Casilla de verificación1', representado.estado_civil === 'S');
      setCheck('Casilla de verificación2', representado.estado_civil === 'C');
      setCheck('Casilla de verificación3', representado.estado_civil === 'V');
      setCheck('Casilla de verificación4', representado.estado_civil === 'D');
      setCheck('Casilla de verificación5', representado.estado_civil === 'Sp');
    }

    // Texto22 = campo de solicitud/descripción libre (ancho)
    setField('Texto22', solicitud || '');

    // ── REPRESENTANTE ──
    // ...
    if (representante) {
      setField('Texto23', representante.dni_nie || '');
      setField('Texto24', representante.razon_social || '');
      setField('Texto25', representante.nombre || '');
      setField('Texto26', representante.apellido1 || '');
      setField('Texto27', representante.apellido2 || '');
      setField('Texto28', representante.domicilio || '');
      setField('Texto29', representante.numero || '');
      setField('Texto30', representante.piso || '');
      setField('Texto31', representante.localidad || '');
      setField('Texto32', representante.cp || '');
      setField('Texto33', representante.provincia || '');
      setField('Texto34', representante.telefono || '');
      setField('Texto35', representante.email || '');
    }

    // ── FECHA Y LUGAR ──
    // Texto36=Lugar, Texto37=Día, Texto38=Mes, Texto39=Año
    setField('Texto36', lugar || '');
    setField('Texto37', dia || '');
    setField('Texto38', mes || '');
    setField('Texto39', anio || '');

    // Texto40 = área de firma (se deja vacío para firmar a mano)

    // ── CONSENTIMIENTO DEHú ──
    // El PDF original no tiene casilla para DEHú, así que la creamos como anotación de texto
    // Ajustamos la posición para que esté más cerca de la firma y no solape con la solicitud
    if (consentimiento_dehu) {
      const page = pdfDoc.getPage(0);
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      page.drawText('[X] CONSIENTO que las comunicaciones y notificaciones se realicen mediante puesta a disposición en la Dirección Electrónica Habilitada Única (DEHú)', {
        x: 35,
        y: 475, // Bajamos de 497 a 475 para evitar solape con Texto22 si este es multilínea
        size: 7,
        font,
        color: rgb(0, 0, 0),
        maxWidth: 500,
      });
    }

    // NO flatten: mantener campos editables para que el usuario pueda modificar el PDF descargado
    // Marcar NeedAppearances para que los valores se muestren en todos los lectores
    form.acroForm.dict.set(PDFName.of('NeedAppearances'), pdfDoc.context.obj(true));

    const filledPdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(filledPdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="designacion-representante-rellenado.pdf"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
