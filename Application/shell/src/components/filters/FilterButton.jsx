import React from 'react';
import { Filter } from 'lucide-react';
import Button from '../common/Button';

export default function FilterButton({
  active = false,
  onClick,
  label = 'Filters',
  count = 0
}) {
  return (
    <Button
      variant={active ? 'primary' : 'secondary'}
      size="md"
      onClick={onClick}
      icon={Filter}
    >
      <span>{label}</span>
      {count > 0 && (
        <span className="ml-1 px-1.5 py-0.5 text-xs bg-[#553729] text-white rounded-full">
          {count}
        </span>
      )}
    </Button>
  );
}
