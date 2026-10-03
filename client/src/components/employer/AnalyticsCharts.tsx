'use client';

import type { FC } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export const STATUS_COLORS: Record<string, string> = {
  APPLIED: '#6366f1',
  REVIEWED: '#8b5cf6',
  SHORTLISTED: '#f59e0b',
  INTERVIEWED: '#f97316',
  HIRED: '#22c55e',
  REJECTED: '#ef4444',
  WITHDRAWN: '#94a3b8',
};

export interface MonthPoint {
  month: string;
  posted?: number;
  count?: number;
}

export interface TopJobPoint {
  id?: string;
  title: string;
  applicants: number;
  views?: number;
}

const CHART_HEIGHT = 260;

/** Line chart: jobs posted over time. */
export const JobsLineChart: FC<{ data: MonthPoint[]; height?: number }> = ({
  data,
  height = CHART_HEIGHT,
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Line type="monotone" dataKey="posted" stroke="#667eea" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

/** Line chart: applications received per month. */
export const ApplicationsLineChart: FC<{ data: MonthPoint[]; height?: number }> = ({
  data,
  height = CHART_HEIGHT,
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Line type="monotone" dataKey="count" stroke="#22c55e" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
);

/** Pie chart: applications by status. */
export const StatusPieChart: FC<{ data: Array<{ name: string; value: number }>; height?: number }> = ({
  data,
  height = CHART_HEIGHT,
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <PieChart>
      <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
        {data.map((entry) => (
          <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
        ))}
      </Pie>
      <Legend />
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
);

/** Bar chart: top performing jobs by applicant count. */
export const TopJobsBarChart: FC<{ data: TopJobPoint[]; height?: number }> = ({
  data,
  height = 240,
}) => (
  <ResponsiveContainer width="100%" height={height}>
    <BarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="title" hide />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Bar dataKey="applicants" fill="#667eea" radius={[6, 6, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);
