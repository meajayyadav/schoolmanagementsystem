import Layout from '@/components/Layout';

export default function Attendance() {
  return (
    <Layout>
      <div className="animate-fade-in" data-testid="attendance-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-2">Mark and track student attendance</p>
        </div>
        <div className="card">
          <p className="text-gray-600">Attendance marking coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}