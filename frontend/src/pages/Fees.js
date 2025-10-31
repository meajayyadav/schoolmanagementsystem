import Layout from '@/components/Layout';

export default function Fees() {
  return (
    <Layout>
      <div className="animate-fade-in" data-testid="fees-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Fees</h1>
          <p className="text-gray-600 mt-2">Manage fee collection and payments</p>
        </div>
        <div className="card">
          <p className="text-gray-600">Fee management coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}