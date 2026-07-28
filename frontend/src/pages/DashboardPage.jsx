import React, { useCallback, useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { analyticsApi } from '../api/resources';
import { LoadingState, ErrorState, EmptyState } from '../components/UiStates';
import KpiCard from '../components/KpiCard';
import { daysAgoBogotaDateStr, todayBogotaDateStr } from '../utils/dateUtils';

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Completado',
};

const STATUS_COLORS = {
  pending: '#C08A2E',
  confirmed: '#2F6F5F',
  cancelled: '#B14A4A',
  completed: '#8A8F89',
};

export default function DashboardPage() {
  const [range, setRange] = useState({ from: daysAgoBogotaDateStr(14), to: todayBogotaDateStr() });
  const [loadState, setLoadState] = useState('loading');
  const [summary, setSummary] = useState(null);
  const [byDay, setByDay] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [spaceUsage, setSpaceUsage] = useState([]);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [summaryRes, byDayRes, statusRes, usageRes] = await Promise.all([
        analyticsApi.summary(range),
        analyticsApi.byDay(range),
        analyticsApi.statusDistribution(range),
        analyticsApi.spaceUsage(range),
      ]);
      setSummary(summaryRes.data);
      setByDay(byDayRes.data.items);
      setStatusDist(statusRes.data.items.map((s) => ({ ...s, label: STATUS_LABELS[s.status] || s.status })));
      setSpaceUsage(usageRes.data.items);
      setLoadState('ready');
    } catch (err) {
      setLoadState('error');
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-soft">Indicadores de reservas y uso de espacios.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-md2 border border-border bg-white p-3 shadow-card">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-soft">Desde</label>
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="focus-ring w-full rounded-md2 border border-border px-3 py-1.5 text-sm"
            />
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-ink-soft">Hasta</label>
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="focus-ring w-full rounded-md2 border border-border px-3 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      {loadState === 'loading' && <LoadingState label="Calculando indicadores…" />}
      {loadState === 'error' && <ErrorState onRetry={load} />}

      {loadState === 'ready' && summary && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total de reservas" value={summary.totalReservations} tone="default" />
            <KpiCard label="Confirmadas" value={summary.confirmedReservations} tone="brand" />
            <KpiCard
              label="Tasa de cancelación"
              value={`${(summary.cancellationRate * 100).toFixed(1)}%`}
              tone={summary.cancellationRate > 0.2 ? 'danger' : 'ochre'}
            />
            <KpiCard
              label="Espacio más reservado"
              value={summary.topSpace?.name || '—'}
              hint={summary.topSpace ? `${summary.topSpace.confirmedCount} reservas confirmadas` : 'Sin datos en el rango'}
              tone="brand"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-md2 border border-border bg-white p-5 shadow-card">
              <h3 className="mb-4 font-display text-sm font-semibold text-ink">Reservas por día</h3>
              {byDay.length === 0 ? (
                <EmptyState title="Sin reservas en el rango" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={byDay}>
                    <CartesianGrid stroke="#E2E0D6" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#3A4540' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#3A4540' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#2F6F5F" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-md2 border border-border bg-white p-5 shadow-card">
              <h3 className="mb-4 font-display text-sm font-semibold text-ink">Distribución por estado</h3>
              {statusDist.length === 0 ? (
                <EmptyState title="Sin reservas en el rango" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusDist} dataKey="count" nameKey="label" outerRadius={80} label>
                      {statusDist.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#8A8F89'} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-md2 border border-border bg-white p-5 shadow-card lg:col-span-2">
              <h3 className="mb-1 font-display text-sm font-semibold text-ink">Uso por espacio</h3>
              <p className="mb-4 text-xs text-ink-soft">
                Medido en horas confirmadas dentro del rango seleccionado.
              </p>
              {spaceUsage.length === 0 ? (
                <EmptyState title="Sin reservas confirmadas en el rango" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={spaceUsage}>
                    <CartesianGrid stroke="#E2E0D6" strokeDasharray="3 3" />
                    <XAxis dataKey="spaceName" tick={{ fontSize: 11, fill: '#3A4540' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#3A4540' }} />
                    <Tooltip />
                    <Bar dataKey="confirmedHours" fill="#C08A2E" radius={[4, 4, 0, 0]} name="Horas confirmadas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
