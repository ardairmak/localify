import { Music2 } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <Music2 size={64} className="text-sp-faint" />
      <div>
        <p className="text-xl font-bold text-sp-text">{title}</p>
        {description && <p className="text-sp-muted mt-1 text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
