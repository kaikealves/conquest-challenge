import { Route, Routes } from 'react-router';

import { ReportsPage } from './features/reporting/ReportsPage.tsx';

export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Accounting Reports</h1>
        <p className="text-slate-600">
          A BalanceSheet and a ProfitAndLoss, aggregated into Categories by a ReportTemplate.
        </p>
      </header>

      <Routes>
        <Route path="/" element={<ReportsPage />} />
        <Route path="/reports/:templateId/:period?" element={<ReportsPage />} />
        <Route path="*" element={<p>There is no page at this address.</p>} />
      </Routes>
    </main>
  );
}
