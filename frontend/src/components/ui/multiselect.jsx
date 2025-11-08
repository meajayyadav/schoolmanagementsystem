import { useState } from 'react';
import { X } from 'lucide-react';

export const MultiSelect = ({ options, value = [], onChange, placeholder }) => {
  const [open, setOpen] = useState(false);

  const toggleValue = (val) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <div className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="border rounded-lg p-2 flex flex-wrap gap-1 cursor-pointer min-h-[42px]"
      >
        {value.length > 0 ? (
          value.map((v) => (
            <span
              key={v}
              className="bg-blue-100 text-blue-700 px-2 py-1 text-xs rounded-md flex items-center gap-1"
            >
              {v}
              <X
                size={12}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleValue(v);
                }}
              />
            </span>
          ))
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-md max-h-48 overflow-auto">
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => toggleValue(opt.value)}
              className={`p-2 hover:bg-gray-100 cursor-pointer ${
                value.includes(opt.value) ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
