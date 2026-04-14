'use client';

import { useState, useEffect, useCallback } from 'react';
import { Folder, File, FileText, Image, FileSpreadsheet, FileArchive, RefreshCw, AlertCircle, ChevronRight, ArrowLeft } from 'lucide-react';

interface FolderItem {
  name: string;
  type: 'file' | 'folder';
  size: number | null;
  modified: string | null;
  extension: string | null;
}

interface CarpetaLocalViewerProps {
  basePath: string;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4 text-red-500" />,
  doc: <FileText className="w-4 h-4 text-blue-500" />,
  docx: <FileText className="w-4 h-4 text-blue-500" />,
  xls: <FileSpreadsheet className="w-4 h-4 text-green-600" />,
  xlsx: <FileSpreadsheet className="w-4 h-4 text-green-600" />,
  jpg: <Image className="w-4 h-4 text-purple-500" />,
  jpeg: <Image className="w-4 h-4 text-purple-500" />,
  png: <Image className="w-4 h-4 text-purple-500" />,
  gif: <Image className="w-4 h-4 text-purple-500" />,
  zip: <FileArchive className="w-4 h-4 text-amber-600" />,
  rar: <FileArchive className="w-4 h-4 text-amber-600" />,
};

function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function CarpetaLocalViewer({ basePath }: CarpetaLocalViewerProps) {
  const [currentPath, setCurrentPath] = useState(basePath);
  const [items, setItems] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [isLocal, setIsLocal] = useState<boolean | null>(null);

  // Detect if running on localhost
  useEffect(() => {
    const host = window.location.hostname;
    setIsLocal(host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.'));
  }, []);

  const fetchContents = useCallback(async (folderPath: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/folder-contents?path=${encodeURIComponent(folderPath)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al leer la carpeta');
        setItems([]);
      } else {
        setItems(data.items || []);
      }
    } catch (err: any) {
      setError('No se pudo conectar con el servidor.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLocal) fetchContents(currentPath);
  }, [currentPath, fetchContents, isLocal]);

  // If running remotely, show a simple message instead of the viewer
  if (isLocal === false) {
    return (
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div className="flex items-start gap-2 text-sm text-gray-500">
          <Folder className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p>El listado de archivos solo está disponible cuando la app se ejecuta en local.</p>
            <p className="text-xs text-gray-400 mt-1">Para ver los archivos, ejecuta la app con <code className="bg-gray-200 px-1 rounded">npm run dev</code> en el mismo equipo donde están las carpetas.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLocal === null) return null; // still detecting

  const navigateToFolder = (folderName: string) => {
    setPathHistory(prev => [...prev, currentPath]);
    const sep = currentPath.includes('/') ? '/' : '\\';
    setCurrentPath(currentPath + sep + folderName);
  };

  const navigateBack = () => {
    const prev = pathHistory[pathHistory.length - 1];
    if (prev) {
      setPathHistory(h => h.slice(0, -1));
      setCurrentPath(prev);
    }
  };

  const getIcon = (item: FolderItem) => {
    if (item.type === 'folder') return <Folder className="w-4 h-4 text-amber-500" />;
    return FILE_ICONS[item.extension || ''] || <File className="w-4 h-4 text-gray-400" />;
  };

  // Relative path for display
  const relativePath = currentPath.startsWith(basePath)
    ? currentPath.slice(basePath.length).replace(/^[\\/]/, '') || '/'
    : currentPath;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          {pathHistory.length > 0 && (
            <button onClick={navigateBack} className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors" title="Atrás">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-gray-600 truncate" title={currentPath}>{relativePath === '/' ? basePath : relativePath}</span>
        </div>
        <button onClick={() => fetchContents(currentPath)} className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors" title="Recargar">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {error ? (
        <div className="p-4 text-center">
          <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-gray-600">{error}</p>
          <p className="text-xs text-gray-400 mt-1">Esta función solo funciona cuando la app se ejecuta en local.</p>
        </div>
      ) : loading ? (
        <div className="p-4 text-center text-sm text-gray-400">Cargando contenido...</div>
      ) : items.length === 0 ? (
        <div className="p-4 text-center text-sm text-gray-400">Carpeta vacía</div>
      ) : (
        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
          {items.map(item => (
            <div
              key={item.name}
              className={`flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${item.type === 'folder' ? 'cursor-pointer' : ''}`}
              onClick={item.type === 'folder' ? () => navigateToFolder(item.name) : undefined}
            >
              {getIcon(item)}
              <span className="flex-1 min-w-0 truncate text-gray-800">{item.name}</span>
              {item.size !== null && (
                <span className="text-xs text-gray-400 flex-shrink-0">{formatSize(item.size)}</span>
              )}
              {item.modified && (
                <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:inline">{formatDate(item.modified)}</span>
              )}
              {item.type === 'folder' && (
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!error && !loading && items.length > 0 && (
        <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          {items.filter(i => i.type === 'folder').length} carpeta{items.filter(i => i.type === 'folder').length !== 1 ? 's' : ''}, {items.filter(i => i.type === 'file').length} archivo{items.filter(i => i.type === 'file').length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
