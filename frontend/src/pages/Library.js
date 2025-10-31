import Layout from '@/components/Layout';

export default function Library() {
  return (
    <Layout>
      <div className="animate-fade-in" data-testid="library-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Library</h1>
          <p className="text-gray-600 mt-2">Manage books and library loans</p>
        </div>
        <div className="card">
          <p className="text-gray-600">Library management coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}