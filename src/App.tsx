import { Route, Routes } from 'react-router';

import { ReportsPage } from './features/reporting/ReportsPage.tsx';

export function App() {
  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-1 px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Accounting Reports
          </h1>
          <p className="text-sm text-slate-500">
            A BalanceSheet and a ProfitAndLoss, aggregated into Categories by a ReportTemplate.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
        <Routes>
          <Route path="/" element={<ReportsPage />} />
          <Route path="/reports/:templateId/:period?" element={<ReportsPage />} />
          <Route path="*" element={<p>There is no page at this address.</p>} />
        </Routes>
      </main>
    </div>
  );
}
