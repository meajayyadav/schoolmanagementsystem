import Layout from '@/components/Layout';

export default function Staff() {
  return (
    <Layout>
      <div className="animate-fade-in" data-testid="staff-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Staff</h1>
          <p className="text-gray-600 mt-2">Manage non-teaching staff</p>
        </div>
        <div className="card">
          <p className="text-gray-600">Staff management coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}