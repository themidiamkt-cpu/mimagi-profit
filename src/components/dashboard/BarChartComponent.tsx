import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '@/utils/formatters';

interface BarChartProps {
  data: { name: string; value: number; color?: string }[];
  title?: string;
}

const COLORS = ['hsl(210, 60%, 15%)', 'hsl(185, 60%, 35%)', 'hsl(210, 30%, 50%)', 'hsl(38, 92%, 50%)'];

export function BarChartComponent({ data, title }: BarChartProps) {
  return (
    <div className="h-64">
      {title && <h4 className="text-sm font-medium text-muted-foreground mb-2">{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 20, top: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
          <Tooltip 
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: 0,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          />
          <Bar dataKey="value" radius={0}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
