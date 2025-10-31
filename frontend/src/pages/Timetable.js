import Layout from '@/components/Layout';

export default function Timetable() {
  return (
    <Layout>
      <div className="animate-fade-in" data-testid="timetable-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Timetable</h1>
          <p className="text-gray-600 mt-2">Manage class schedules and timetables</p>
        </div>
        <div className="card">
          <p className="text-gray-600">Timetable management coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}