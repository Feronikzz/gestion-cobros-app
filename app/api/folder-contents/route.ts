import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  const folderPath = req.nextUrl.searchParams.get('path');

  if (!folderPath) {
    return NextResponse.json({ error: 'Parámetro "path" requerido' }, { status: 400 });
  }

  try {
    // Normalize path
    const normalizedPath = path.normalize(folderPath);

    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json({ error: 'La carpeta no existe', path: normalizedPath }, { status: 404 });
    }

    const stat = fs.statSync(normalizedPath);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'La ruta no es una carpeta' }, { status: 400 });
    }

    const entries = fs.readdirSync(normalizedPath, { withFileTypes: true });

    const items = entries
      .filter(e => !e.name.startsWith('.')) // skip hidden files
      .map(entry => {
        const fullPath = path.join(normalizedPath, entry.name);
        let size: number | null = null;
        let modified: string | null = null;

        try {
          const s = fs.statSync(fullPath);
          size = s.isFile() ? s.size : null;
          modified = s.mtime.toISOString();
        } catch {
          // skip stat errors (permissions, etc.)
        }

        return {
          name: entry.name,
          type: entry.isDirectory() ? 'folder' : 'file',
          size,
          modified,
          extension: entry.isFile() ? path.extname(entry.name).toLowerCase().slice(1) : null,
        };
      })
      .sort((a, b) => {
        // folders first, then files
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({ path: normalizedPath, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al leer la carpeta' }, { status: 500 });
  }
}
