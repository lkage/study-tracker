const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export default function ColorPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`w-8 h-8 rounded-full border-2 transition-all ${
            value === color ? 'border-gray-900 scale-110' : 'border-gray-200 hover:scale-105'
          }`}
          style={{ backgroundColor: color }}
          aria-label={`색상 ${color}`}
        />
      ))}
    </div>
  );
}
