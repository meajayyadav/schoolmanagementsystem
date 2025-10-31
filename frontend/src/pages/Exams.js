import Layout from '@/components/Layout';

export default function Exams() {
  return (
    <Layout>
      <div className="animate-fade-in" data-testid="exams-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Exams</h1>
          <p className="text-gray-600 mt-2">Schedule and manage examinations</p>
        </div>
        <div className="card">
          <p className="text-gray-600">Exam scheduling coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}