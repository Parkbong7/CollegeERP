import React from 'react';
import { Inbox } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your search criteria or filter options.',
  icon: Icon = Inbox,
  actionText,
  onAction
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#FFF8F1] border-2 border-dashed border-[#EBD9CB] rounded-xl my-4">
      <div className="p-3 bg-[#FCE6D8] rounded-full text-[#C66B45] mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-[#553729] mb-1">{title}</h3>
      <p className="text-sm text-[#929071] max-w-sm mb-4">{description}</p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
