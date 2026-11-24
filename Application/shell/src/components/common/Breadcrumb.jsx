import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumb({ items = [] }) {
  return (
    <nav className="flex items-center space-x-2 text-xs text-[#929071] mb-4">
      <Link to="/" className="hover:text-[#C66B45] flex items-center transition-colors">
        <Home className="w-3.5 h-3.5 mr-1" />
        <span>Home</span>
      </Link>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-[#EBD9CB]" />
            {isLast || !item.href ? (
              <span className="font-semibold text-[#553729]">{item.label}</span>
            ) : (
              <Link to={item.href} className="hover:text-[#C66B45] transition-colors">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
