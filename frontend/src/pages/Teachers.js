import Layout from '@/components/Layout';

export default function Teachers() {
  return (
    <Layout>
      <div className="animate-fade-in" data-testid="teachers-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Teachers</h1>
          <p className="text-gray-600 mt-2">Manage teaching staff</p>
        </div>
        <div className="card">
          <p className="text-gray-600">Teacher management coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}