'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { compressImage, formatBytes } from '@/lib/utils/compress-image';
import {
  Upload, FolderPlus, Folder, FileText, Download, Trash2, ArrowLeft,
  Image as ImageIcon, File, Loader2, X, RefreshCw, Eye, AlertTriangle, Minimize2
} from 'lucide-react';

interface FileItem {
  name: string;
  id: string | null;
  type: 'folder' | 'file';
  size: number | null;
  mimeType: string | null;
  created: string | null;
  updated: string | null;
}

interface FileManagerProps {
  clienteId: string;
  clienteNombre: string;
  procedimientos?: { id: string; titulo: string }[];
}

// Check if file is previewable
function isPreviewable(name: string): 'image' | 'pdf' | null {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
  if (ext === 'pdf') return 'pdf';
  return null;
}

export function FileManager({ clienteId, clienteNombre, procedimientos = [] }: FileManagerProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [previewName, setPreviewName] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Construir la ruta completa en storage
  const getStoragePath = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    let base = `${user.id}/${clienteId}`;
    if (currentPath.length > 0) base += `/${currentPath.join('/')}`;
    return base;
  }, [clienteId, currentPath, supabase]);

  // Listar archivos
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const path = await getStoragePath();
      if (!path) return;

      const { data, error: listError } = await supabase.storage
        .from('documentos')
        .list(path, { limit: 200, sortBy: { column: 'name', order: 'asc' } });

      if (listError) throw listError;

      const mapped: FileItem[] = (data || [])
        .filter(item => item.name !== '.emptyFolderPlaceholder')
        .map(item => ({
          name: item.name,
          id: item.id,
          type: item.id === null ? 'folder' : 'file',
          size: (item.metadata as any)?.size || null,
          mimeType: (item.metadata as any)?.mimetype || null,
          created: item.created_at,
          updated: item.updated_at,
        }));

      mapped.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setItems(mapped);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getStoragePath, supabase]);

  useEffect(() => { loadFiles(); }, [currentPath]);

  const openFolder = (folderName: string) => setCurrentPath(prev => [...prev, folderName]);
  const goBack = () => setCurrentPath(prev => prev.slice(0, -1));
  const goToPath = (index: number) => setCurrentPath(prev => prev.slice(0, index));

  // Crear carpeta
  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      const path = await getStoragePath();
      if (!path) return;
      const folderPath = `${path}/${newFolderName.trim()}/.emptyFolderPlaceholder`;
      await supabase.storage
        .from('documentos')
        .upload(folderPath, new Blob([''], { type: 'text/plain' }));
      setNewFolderName('');
      setShowNewFolder(false);
      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ─── Subir archivos con COMPRESION y DUPLICADOS ───
  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    setCompressionInfo(null);

    try {
      const path = await getStoragePath();
      if (!path) return;

      const existingNames = new Set(items.filter(i => i.type === 'file').map(i => i.name));
      let totalOriginal = 0;
      let totalCompressed = 0;
      let skipped = 0;

      for (let i = 0; i < files.length; i++) {
        const originalFile = files[i];

        // ── Detección de duplicados ──
        if (existingNames.has(originalFile.name)) {
          const overwrite = window.confirm(
            `El archivo "${originalFile.name}" ya existe en esta carpeta.\n\n¿Deseas reemplazarlo?`
          );
          if (!overwrite) {
            skipped++;
            continue;
          }
        }

        setUploadProgress(`Comprimiendo y subiendo ${i + 1 - skipped}/${files.length - skipped}: ${originalFile.name}`);

        // ── Compresión de imágenes ──
        totalOriginal += originalFile.size;
        const file = await compressImage(originalFile, { maxWidth: 1600, maxHeight: 1600, quality: 0.75 });
        totalCompressed += file.size;

        const filePath = `${path}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        // Registrar en tabla documentos (evitar duplicados en BD)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const procId = currentPath.length > 0
            ? procedimientos.find(p => p.titulo === currentPath[0] || p.id === currentPath[0])?.id
            : null;

          // Check si ya existe en BD por nombre+carpeta
          const carpeta = currentPath.join('/') || null;
          const { data: existingDoc } = await supabase
            .from('documentos')
            .select('id')
            .eq('cliente_id', clienteId)
            .eq('nombre', file.name)
            .eq('carpeta', carpeta ?? '')
            .maybeSingle();

          if (!existingDoc) {
            await supabase.from('documentos').insert({
              user_id: user.id,
              cliente_id: clienteId,
              procedimiento_id: procId || null,
              nombre: file.name,
              tipo: 'ESCANEADO',
              archivo_url: filePath,
              carpeta: carpeta,
            });
          }
        }
      }

      // Mostrar info de compresión
      const saved = totalOriginal - totalCompressed;
      if (saved > 1024) {
        const pct = Math.round((saved / totalOriginal) * 100);
        setCompressionInfo(
          `Ahorro: ${formatBytes(saved)} (${pct}%) — Original: ${formatBytes(totalOriginal)} → Subido: ${formatBytes(totalCompressed)}` +
          (skipped > 0 ? ` — ${skipped} archivo(s) omitido(s)` : '')
        );
        setTimeout(() => setCompressionInfo(null), 8000);
      }

      setUploadProgress(null);
      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ─── Previsualizar archivo ───
  const previewFile = async (fileName: string) => {
    const type = isPreviewable(fileName);
    if (!type) return;

    setPreviewLoading(true);
    setPreviewName(fileName);
    setPreviewType(type);

    try {
      const path = await getStoragePath();
      if (!path) return;

      const { data, error: dlError } = await supabase.storage
        .from('documentos')
        .download(`${path}/${fileName}`);

      if (dlError) throw dlError;
      if (!data) return;

      const url = URL.createObjectURL(data);
      setPreviewUrl(url);
    } catch (err: any) {
      setError(err.message);
      closePreview();
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewType(null);
    setPreviewName('');
  };

  // Descargar archivo
  const downloadFile = async (fileName: string) => {
    try {
      const path = await getStoragePath();
      if (!path) return;
      const { data, error: dlError } = await supabase.storage
        .from('documentos')
        .download(`${path}/${fileName}`);
      if (dlError) throw dlError;
      if (!data) return;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Eliminar archivo
  const deleteFile = async (fileName: string) => {
    if (!confirm(`¿Eliminar "${fileName}"?\nEsta acción no se puede deshacer.`)) return;
    try {
      const path = await getStoragePath();
      if (!path) return;
      const { error: delError } = await supabase.storage
        .from('documentos')
        .remove([`${path}/${fileName}`]);
      if (delError) throw delError;
      await loadFiles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Icono según tipo
  const getFileIcon = (name: string) => {
    const type = isPreviewable(name);
    if (type === 'image') return <ImageIcon className="w-5 h-5 text-purple-500" />;
    if (type === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  // Drop zone
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  // Calcular tamaño total visible
  const totalSize = items.filter(i => i.type === 'file').reduce((sum, i) => sum + (i.size || 0), 0);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <Folder className="w-4 h-4 text-blue-500" />
            <button onClick={() => goToPath(0)} className="text-blue-600 hover:underline font-medium">
              {clienteNombre}
            </button>
            {currentPath.map((segment, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="text-gray-400">/</span>
                <button onClick={() => goToPath(i + 1)} className="text-blue-600 hover:underline">
                  {segment}
                </button>
              </span>
            ))}
            {totalSize > 0 && (
              <span className="text-xs text-gray-400 ml-2">({formatBytes(totalSize)})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadFiles} className="p-1.5 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100" title="Recargar">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowNewFolder(!showNewFolder)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50" title="Nueva carpeta">
              <FolderPlus className="w-4 h-4" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Subir
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => handleUpload(e.target.files)}
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt,.tif,.tiff,.bmp"
            />
          </div>
        </div>

        {/* New folder input */}
        {showNewFolder && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border-b border-blue-100">
            <FolderPlus className="w-4 h-4 text-blue-500" />
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createFolder()}
              className="form-input text-sm flex-1"
              placeholder="Nombre de la carpeta..."
              autoFocus
            />
            <button onClick={createFolder} className="btn btn-primary btn-sm">Crear</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="text-gray-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload progress */}
        {uploadProgress && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border-b border-yellow-100">
            <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
            <span className="text-sm text-yellow-700">{uploadProgress}</span>
          </div>
        )}

        {/* Compression info */}
        {compressionInfo && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border-b border-green-100">
            <Minimize2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">{compressionInfo}</span>
            <button onClick={() => setCompressionInfo(null)} className="text-green-400 hover:text-green-600 ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border-b border-red-100">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-600">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Drag & Drop zone / File list */}
        <div
          className={`min-h-[200px] transition-colors ${dragOver ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando...
            </div>
          ) : items.length === 0 && currentPath.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Upload className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm">Arrastra archivos aquí o pulsa &quot;Subir&quot;</p>
              <p className="text-xs mt-1">Las imágenes se comprimen automáticamente al subir</p>
              {procedimientos.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs text-gray-500">Carpetas de expedientes:</span>
                  {procedimientos.map(p => (
                    <button key={p.id} onClick={() => openFolder(p.titulo)} className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100">
                      {p.titulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : items.length === 0 && currentPath.length > 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <button onClick={goBack} className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-4">
                <ArrowLeft className="w-4 h-4" /> Volver atrás
              </button>
              <Upload className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm">Carpeta vacía — arrastra archivos aquí</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Back button */}
              {currentPath.length > 0 && (
                <button onClick={goBack} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left">
                  <ArrowLeft className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Volver atrás</span>
                </button>
              )}

              {/* Procedimientos como carpetas virtuales (solo en raíz) */}
              {currentPath.length === 0 && procedimientos.map(p => (
                <button
                  key={p.id}
                  onClick={() => openFolder(p.titulo)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left group"
                >
                  <Folder className="w-5 h-5 text-blue-400" />
                  <span className="flex-1 text-sm font-medium text-gray-800">{p.titulo}</span>
                  <span className="text-xs text-gray-400 group-hover:text-blue-500">Expediente</span>
                </button>
              ))}

              {/* Items */}
              {items.map(item => (
                <div key={item.name} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
                  {item.type === 'folder' ? (
                    <button onClick={() => openFolder(item.name)} className="flex items-center gap-3 flex-1 text-left">
                      <Folder className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => isPreviewable(item.name) ? previewFile(item.name) : downloadFile(item.name)}
                      className="flex items-center gap-3 flex-1 text-left"
                      title={isPreviewable(item.name) ? 'Clic para previsualizar' : 'Clic para descargar'}
                    >
                      {getFileIcon(item.name)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-gray-400">{formatBytes(item.size || 0)}</p>
                      </div>
                    </button>
                  )}
                  {item.type === 'file' && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isPreviewable(item.name) && (
                        <button onClick={() => previewFile(item.name)} className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-purple-50" title="Previsualizar">
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => downloadFile(item.name)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50" title="Descargar">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteFile(item.name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal de previsualización ── */}
      {(previewUrl || previewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={closePreview}>
          <div className="relative bg-white rounded-lg shadow-2xl max-w-[90vw] max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Preview header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
              <span className="text-sm font-medium text-gray-700 truncate max-w-[60vw]">{previewName}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadFile(previewName)} className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50" title="Descargar">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={closePreview} className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-red-50" title="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Preview content */}
            <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 48px)', maxWidth: '90vw' }}>
              {previewLoading ? (
                <div className="flex items-center justify-center p-20 text-gray-400">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando vista previa...
                </div>
              ) : previewType === 'image' && previewUrl ? (
                <img src={previewUrl} alt={previewName} className="max-w-full max-h-[80vh] object-contain mx-auto" />
              ) : previewType === 'pdf' && previewUrl ? (
                <iframe src={previewUrl} className="w-[80vw] h-[80vh] border-0" title={previewName} />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
