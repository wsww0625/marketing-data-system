interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

const colorMap: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  blue:   { bg: 'bg-white', border: 'border-blue-100', text: 'text-blue-600', accent: 'bg-blue-500' },
  green:  { bg: 'bg-white', border: 'border-green-100', text: 'text-green-600', accent: 'bg-green-500' },
  orange: { bg: 'bg-white', border: 'border-orange-100', text: 'text-orange-600', accent: 'bg-orange-500' },
  red:    { bg: 'bg-white', border: 'border-red-100', text: 'text-red-600', accent: 'bg-red-500' },
  purple: { bg: 'bg-white', border: 'border-purple-100', text: 'text-purple-600', accent: 'bg-purple-500' },
};

export default function StatsCard({ title, value, subtitle, color = 'blue' }: StatsCardProps) {
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`${c.bg} rounded-xl border ${c.border} p-5 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-1 h-full ${c.accent}`} />
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className={`text-2xl font-semibold ${c.text}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subtitle && <div className="text-xs text-gray-400 mt-1.5">{subtitle}</div>}
    </div>
  );
}
