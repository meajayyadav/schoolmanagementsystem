import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { studentsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const response = await studentsApi.getAll();
      setStudents(response.data);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="students-page">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Students</h1>
            <p className="text-gray-600 mt-2">Manage student enrollment and information</p>
          </div>
          <Button data-testid="add-student-btn">
            Add Student
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : students.length > 0 ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Grade</th>
                  <th>Section</th>
                  <th>Enrollment Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} data-testid={`student-row-${student.id}`}>
                    <td>{student.roll_number}</td>
                    <td>{student.grade_level}</td>
                    <td>{student.class_section}</td>
                    <td>{new Date(student.enrollment_date).toLocaleDateString()}</td>
                    <td>
                      <Button variant="outline" size="sm">View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12" data-testid="no-students-message">
            <Users className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No students yet</h3>
            <p className="text-gray-600">Add students to get started</p>
          </div>
        )}
      </div>
    </Layout>
  );
}