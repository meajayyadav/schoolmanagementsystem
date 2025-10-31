import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { classesApi } from '@/api';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await classesApi.getAll();
      setClasses(response.data);
    } catch (error) {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="classes-page">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Classes</h1>
            <p className="text-gray-600 mt-2">Manage class sections and assignments</p>
          </div>
          <Button data-testid="add-class-btn">
            Add Class
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : classes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((cls) => (
              <div key={cls.id} className="card hover:shadow-lg transition-shadow" data-testid={`class-card-${cls.id}`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <BookOpen className="text-purple-600" size={28} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">{cls.name}</h3>
                    <p className="text-sm text-gray-600">Grade: {cls.grade} - Section: {cls.section}</p>
                    <p className="text-sm text-gray-600 mt-2">Subjects: {cls.subjects.length}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12" data-testid="no-classes-message">
            <BookOpen className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No classes yet</h3>
            <p className="text-gray-600">Add classes to organize your school</p>
          </div>
        )}
      </div>
    </Layout>
  );
}