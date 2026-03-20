import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import './WidgetStyles.css';

const ChartWidget = ({ data, config, loading }) => {
  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

  const transformData = () => {
    if (!data?.labels || !data?.datasets) return [];
    
    return data.labels.map((label, index) => {
      const item = { name: label };
      data.datasets.forEach((dataset, dsIndex) => {
        item[dataset.label || `serie${dsIndex}`] = dataset.data[index];
      });
      return item;
    });
  };

  const chartData = transformData();

  if (loading) {
    return (
      <div className="widget-chart widget-loading">
        <div className="skeleton skeleton-chart"></div>
      </div>
    );
  }

  if (!data || chartData.length === 0) {
    return (
      <div className="widget-chart widget-empty">
        <i className="bi bi-graph-up"></i>
        <p>Sin datos disponibles</p>
      </div>
    );
  }

  const renderChart = () => {
    const tipo = data?.tipo || 'line';

    switch (tipo) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              {data.datasets?.map((dataset, index) => (
                <Bar 
                  key={index}
                  dataKey={dataset.label || `serie${index}`}
                  fill={COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'doughnut':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey={data.datasets?.[0]?.label || 'serie0'}
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={tipo === 'doughnut' ? 40 : 0}
                outerRadius={80}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'line':
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }} 
              />
              <Legend />
              {data.datasets?.map((dataset, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={dataset.label || `serie${index}`}
                  stroke={COLORS[index % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[index % COLORS.length], strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="widget-chart">
      {renderChart()}
    </div>
  );
};

export default ChartWidget;