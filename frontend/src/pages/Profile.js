import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { User, Mail, Shield, Building } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function Profile() {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="profile-page">
        <div className="page-header">
          <h1 className="text-4xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">Your account information</p>
        </div>

        <Card className="max-w-2xl">
          <div className="flex items-center gap-6 mb-8">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="w-24 h-24 rounded-full" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="text-blue-600" size={48} />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-600 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900 font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="text-gray-400" size={20} />
              <div>
                <p className="text-sm text-gray-600">Role</p>
                <p className="text-gray-900 font-medium capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
            </div>
            {user?.school_id && (
              <div className="flex items-center gap-3">
                <Building className="text-gray-400" size={20} />
                <div>
                  <p className="text-sm text-gray-600">School ID</p>
                  <p className="text-gray-900 font-medium">{user.school_id}</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}