import Layout from '@/components/Layout';

export default function Grades() {
  return (
    <Layout>
      <div className="animate-fade-in" data-testid="grades-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Grades</h1>
          <p className="text-gray-600 mt-2">Manage student grades and assessments</p>
        </div>
        <div className="card">
          <p className="text-gray-600">Grade management coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}