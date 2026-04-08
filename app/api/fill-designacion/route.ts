import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
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
      fecha_lugar,
      consentimiento_dehu,
      solicitud,
    } = body;

    // ── REPRESENTADO (fila superior del formulario) ──
    // Texto1=Nombre, Texto2=1er Apellido, Texto3=2º Apellido
    // Texto4=Nacionalidad, Texto5=NIF, Texto6=Pasaporte
    // Texto7=DD, Texto8=MM, Texto9=AAAA, Texto10=Localidad nacim, Texto11=País
    // Texto12=Nombre padre, Texto13=Nombre madre, Casillas1-5=Estado civil
    // Texto14=Domicilio, Texto15=Nº, Texto16=Piso
    // Texto17=Localidad, Texto18=CP, Texto19=Provincia
    // Texto20=Teléfono, Texto21=Email
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
      setField('Texto11', representado.pais || '');
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
    // Texto23=DNI/NIF/NIE, Texto24=Razón Social
    // Texto25=Nombre, Texto26=1er Apellido, Texto27=2º Apellido
    // Texto28=Domicilio, Texto29=Nº, Texto30=Piso
    // Texto31=Localidad, Texto32=CP, Texto33=Provincia
    // Texto34=Teléfono, Texto35=Email
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
    if (fecha_lugar) {
      setField('Texto36', fecha_lugar.lugar || '');
      setField('Texto37', fecha_lugar.dia || '');
      setField('Texto38', fecha_lugar.mes || '');
      setField('Texto39', fecha_lugar.anio || '');
    }

    // Texto40 = área de firma (se deja vacío para firmar a mano)

    // ── CONSENTIMIENTO DEHú (no hay casilla específica, el PDF no la tiene como campo) ──
    // Si en el futuro el PDF tiene una casilla, se activaría aquí

    form.flatten();

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
