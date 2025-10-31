import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { announcementsApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Bell, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const response = await announcementsApi.getAll();
      setAnnouncements(response.data);
    } catch (error) {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'badge-danger';
      case 'low': return 'badge-info';
      default: return 'badge-warning';
    }
  };

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="announcements-page">
        <div className="page-header flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-600 mt-2">School-wide notifications and updates</p>
          </div>
          <Button data-testid="add-announcement-btn">
            New Announcement
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="card hover:shadow-lg transition-shadow" data-testid={`announcement-${announcement.id}`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    {announcement.priority === 'high' ? (
                      <AlertCircle className="text-red-600" size={24} />
                    ) : (
                      <Bell className="text-blue-600" size={24} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{announcement.title}</h3>
                      <span className={`badge ${getPriorityColor(announcement.priority)}`}>
                        {announcement.priority}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{announcement.content}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12" data-testid="no-announcements-message">
            <Bell className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No announcements yet</h3>
            <p className="text-gray-600">Create your first announcement</p>
          </div>
        )}
      </div>
    </Layout>
  );
}