import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ChevronDown, ArrowUp, ArrowDown } from 'lucide-react';
import styles from './TrendChart.module.css';

/**
 * Custom Tooltip for the Trend Chart
 */
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <div className={styles.tooltipHeader}>
          <p className={styles.tooltipLabel}>{label}</p>
        </div>
        <div className={styles.tooltipBody}>
          <div className={styles.tooltipItem}>
            <div className={styles.tooltipDot} style={{ backgroundColor: '#4361EE' }}></div>
            <span className={styles.tooltipName}>Daily Revenue</span>
            <span className={styles.tooltipValue}>₹{payload[0].value.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const TrendChart = ({ title, subtitle, mainValue, growth, data, timeframe = 'Monthly' }) => {
  const isPositive = growth >= 0;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.label}>{title}</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.timeframeSelector}>
            <span>{timeframe}</span>
            <span className={styles.iconWrapper}><ChevronDown size={14} /></span>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.summaryInfo}>
          <p className={styles.subtitle}>{subtitle}</p>
          <div className={styles.valueRow}>
            <span className={styles.mainValue}>{mainValue}</span>
            <span className={styles.currencyCode}>INR</span>
            {growth !== undefined && (
              <div className={`${styles.growthBadge} ${isPositive ? styles.positive : styles.negative}`}>
                {isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                <span>{isPositive ? '+' : ''}{growth}%</span>
              </div>
            )}
          </div>
        </div>

        <div className={styles.chartArea}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={data} 
              margin={{ top: 10, right: 0, left: -5, bottom: 25 }}
              barGap={0}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4361EE" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4361EE" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                vertical={false} 
                stroke="#EEF0F8" 
                strokeDasharray="0" 
              />
              
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#7A89B0', fontWeight: 500 }}
                dy={10}
                interval={Math.floor(data.length / 6)}
                padding={{ left: 0, right: 0 }}
              />
              
              <YAxis
                hide={false}
                axisLine={false}
                tickLine={false}
                width={40}
                tick={{ fontSize: 10, fill: '#7A89B0', fontWeight: 500, textAnchor: 'start' }}
                tickFormatter={(value) => {
                  if (value === 0) return '₹0';
                  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
                  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
                  return `₹${value}`;
                }}
                domain={[0, 'auto']}
              />
              
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(232, 236, 248, 0.5)', radius: [6, 6, 0, 0] }}
              />
              
              <Bar 
                dataKey="revenue" 
                fill="url(#barGradient)"
                radius={[6, 6, 0, 0]}
                barSize={12}
                animationDuration={1500}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TrendChart;
