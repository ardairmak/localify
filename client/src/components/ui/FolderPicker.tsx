import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Folder, ChevronRight, ArrowLeft, Check, X } from 'lucide-react';
import { browsePath } from '../../api';
import Spinner from './Spinner';

interface Props {
  initialPath?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}

export default function FolderPicker({ initialPath, onSelect, onClose }: Props) {
  const [currentPath, setCurrentPath] = useState<string | undefined>(initialPath || undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['browse', currentPath ?? '__home__'],
    queryFn: () => browsePath(currentPath),
  });

  const navigate = (p: string) => setCurrentPath(p);

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-sp-elevated rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: '70vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sp-hover">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-sp-green" />
            <span className="font-semibold text-sm">Browse Folders</span>
          </div>
          <button onClick={onClose} className="text-sp-muted hover:text-sp-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Current path breadcrumb */}
        {data && (
          <div className="px-5 py-2 bg-sp-hover text-xs text-sp-muted font-mono truncate border-b border-sp-elevated">
            {data.current}
          </div>
        )}

        {/* Directory list */}
        <div className="flex-1 overflow-y-auto py-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Spinner size={24} />
            </div>
          )}

          {isError && (
            <div className="px-5 py-4 text-sm text-red-400">
              Cannot read this directory. Try a different path.
            </div>
          )}

          {data && (
            <>
              {/* Up button */}
              {data.parent && (
                <button
                  onClick={() => navigate(data.parent!)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-sp-hover transition-colors text-left text-sm text-sp-muted"
                >
                  <ArrowLeft size={15} />
                  <span>.. (go up)</span>
                </button>
              )}

              {data.dirs.length === 0 && (
                <p className="px-5 py-4 text-sm text-sp-faint">No subfolders here</p>
              )}

              {data.dirs.map(dir => (
                <button
                  key={dir.path}
                  onClick={() => navigate(dir.path)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-sp-hover transition-colors text-left group"
                >
                  <Folder size={15} className="text-sp-muted flex-shrink-0" />
                  <span className="text-sm text-sp-text flex-1 truncate">{dir.name}</span>
                  <ChevronRight size={14} className="text-sp-faint flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </>
          )}
        </div>

        {/* Footer — select current */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-sp-hover gap-3">
          <span className="text-xs text-sp-muted truncate flex-1">
            {data?.current ?? 'Loading…'}
          </span>
          <button
            onClick={() => data && onSelect(data.current)}
            disabled={!data}
            className="flex items-center gap-2 px-5 py-2 bg-sp-green text-black text-sm font-semibold rounded-full hover:bg-sp-green-hover transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Check size={14} /> Select
          </button>
        </div>
      </div>
    </div>
  );
}
