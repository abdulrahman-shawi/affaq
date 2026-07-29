"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#2563eb", "#059669", "#d97706", "#7c3aed", "#dc2626", "#0891b2"];

export default function StatsChart({
  type = "bar",
  data,
  dataKey,
  xKey,
  nameKey,
  title,
}: {
  type?: "bar" | "line" | "pie";
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  nameKey?: string;
  title?: string;
}) {
  const chart =
    type === "bar" ? (
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={dataKey} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
      </BarChart>
    ) : type === "line" ? (
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey={dataKey} stroke={COLORS[0]} strokeWidth={2} />
      </LineChart>
    ) : (
      <PieChart>
        <Tooltip />
        <Legend />
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey ?? xKey ?? "name"}
          outerRadius={100}
          label
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    );

  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div dir="ltr" className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chart}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
