"use client";

import { Card } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const applicationsData = [
  { month: 'Jan', count: 45 },
  { month: 'Feb', count: 62 },
  { month: 'Mar', count: 50 },
  { month: 'Apr', count: 74 },
  { month: 'May', count: 88 },
  { month: 'Jun', count: 96 },
];

const categoryData = [
  { name: 'Software', value: 42 },
  { name: 'Design', value: 26 },
  { name: 'Data', value: 18 },
  { name: 'Marketing', value: 12 },
];

const skillsData = [
  { skill: 'JavaScript', count: 44 },
  { skill: 'React', count: 38 },
  { skill: 'Node.js', count: 31 },
  { skill: 'UI/UX', count: 22 },
  { skill: 'Python', count: 17 },
];

const deptData = [
  { department: 'CSE', count: 52 },
  { department: 'EEE', count: 20 },
  { department: 'BBA', count: 18 },
  { department: 'CIVIL', count: 10 },
];

const pieColors = ['#2563eb', '#8b5cf6', '#10b981', '#f59e0b'];

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-4 text-lg font-semibold">Applications by Month</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={applicationsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-4 text-lg font-semibold">Jobs by Category</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {categoryData.map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-4 text-lg font-semibold">Top Skills</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillsData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="skill" width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="mb-4 text-lg font-semibold">Applicants by Department</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
