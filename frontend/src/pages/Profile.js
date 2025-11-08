import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { useEffect, useState } from 'react';
import { schoolsApi, usersApi } from '@/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User, Upload, Edit2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { user, setUser, logout } = useAuth();
  const [schoolName, setSchoolName] = useState('');
  const [profilePic, setProfilePic] = useState(user?.picture || '');
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });

  useEffect(() => {
    // fetch school name if applicable
    const fetchSchool = async () => {
      if (user?.school_id) {
        try {
          const res = await schoolsApi.getOne(user.school_id);
          setSchoolName(res.data?.name || 'Unknown School');
        } catch {
          setSchoolName('Unknown School');
        }
      } else if (user?.role === 'super_admin') {
        setSchoolName('All Schools (Super Admin)');
      }
    };
    fetchSchool();
  }, [user]);

  // 🖼️ Upload handler
  const handleUpload = async (file) => {
    if (!file) return;
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('picture', file); // ✅ Must match backend field name

      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/users/${user.id}/upload-picture`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success('Profile picture updated!');
        const updatedUser = { ...user, picture: data.picture };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser)); // ✅ persist across refresh
        setProfilePic(data.picture);
      } else {
        toast.error(data.detail || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ✏️ Edit / Save profile info
  const handleSave = async () => {
    try {
      const { name, email } = form;
      if (!name || !email) return toast.error('Name and email are required');

      const res = await usersApi.update(user.id, { name, email });
      if (res.status === 200) {
        toast.success('Profile updated successfully');
        const updatedUser = { ...user, name, email };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser)); // ✅ persist updates
        setEditing(false);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    }
  };

  // ✅ Ensure correct full URL for picture display
  const fullPicUrl =
    profilePic?.startsWith('http') || profilePic?.startsWith('data:')
      ? profilePic
      : `${process.env.REACT_APP_BACKEND_URL}${profilePic}`;

  return (
    <Layout>
      <div className="animate-fade-in p-6 flex flex-col items-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-600 mb-8">Manage your personal information</p>

        <Card className="w-full max-w-2xl shadow-md rounded-2xl p-8">
          {/* Profile Header */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="relative">
              {profilePic ? (
                <img
                  src={fullPicUrl}
                  alt={user?.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 shadow"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200 shadow">
                  <User className="text-blue-600" size={64} />
                </div>
              )}
              <label
                htmlFor="upload"
                className="absolute bottom-1 right-1 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full cursor-pointer shadow"
              >
                <Upload size={16} />
                <input
                  id="upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files[0])}
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="flex flex-col text-center md:text-left">
              <h2 className="text-2xl font-semibold text-gray-900">{form.name}</h2>
              <p className="text-gray-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            {/* Buttons */}
          <div className="mt-10 flex justify-center gap-4">
            {editing ? (
              <>
                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
                  <Save className="mr-2 h-4 w-4" /> Save
                </Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setEditing(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            )}
          </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Full Name</p>
              <Input
                type="text"
                value={form.name}
                disabled={!editing}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <Input
                type="email"
                value={form.email}
                disabled={!editing}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Role</p>
              <Input type="text" value={user?.role} disabled />
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">School</p>
              <Input type="text" value={schoolName} disabled />
            </div>
          </div>


          {/* Logout */}
          <div className="mt-6 flex justify-center">
            <Button variant="destructive" onClick={logout}>
              Logout
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
