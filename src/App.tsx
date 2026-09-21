import { ReportScreen } from './features/reporting/ReportScreen.tsx';

export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Accounting Reports</h1>
        <p className="text-slate-600">
          A BalanceSheet and a ProfitAndLoss, aggregated into Categories by a ReportTemplate.
        </p>
      </header>

      <ReportScreen />
    </main>
  );
}
