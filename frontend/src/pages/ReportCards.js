import Layout from '@/components/Layout';

export default function ReportCards() {
  return (
    <Layout>
      <div className="animate-fade-in" data-testid="report-cards-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Report Cards</h1>
          <p className="text-gray-600 mt-2">Generate and view student report cards</p>
        </div>
        <div className="card">
          <p className="text-gray-600">Report card generation coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}