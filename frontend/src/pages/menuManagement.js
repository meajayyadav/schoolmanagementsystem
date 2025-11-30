import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { menusApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Search,
  Filter,
  MoreHorizontal,
  Save,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/hooks/use-confirm';

// Available icons for selection
const AVAILABLE_ICONS = [
  'Home', 'School', 'Users', 'GraduationCap', 'BookOpen', 'ClipboardCheck',
  'TrendingUp', 'Clock', 'DollarSign', 'Bell', 'Library', 'FileText',
  'Award', 'Briefcase', 'UserCheck', 'Settings', 'BarChart', 'Calendar',
  'MessageCircle', 'Mail', 'Phone', 'MapPin', 'Heart', 'Star','IndianRupeeIcon'
];

const ROLE_OPTIONS = [
  { value: 'super_admin', label: 'Super Admin', color: 'bg-purple-100 text-purple-800' },
  { value: 'school_admin', label: 'School Admin', color: 'bg-blue-100 text-blue-800' },
  { value: 'teacher', label: 'Teacher', color: 'bg-green-100 text-green-800' },
  { value: 'student', label: 'Student', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'parent', label: 'Parent', color: 'bg-orange-100 text-orange-800' }
];

export default function MenuManagement() {
  const { user } = useAuth();
  const { confirm, ConfirmDialog } = useConfirm();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    path: '',
    icon: 'Home',
    roles: [],
    order: 0,
    is_active: true
  });

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      setLoading(true);
      const res = await menusApi.getAll();
      setMenus(res.data.data || []);
    } catch {
      toast.error('Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const menuData = {
        name: formData.name,
        path: formData.path,
        icon: formData.icon,
        roles: formData.roles,
        order: formData.order,
        is_active: formData.is_active
      };

      if (editingMenu) {
        await menusApi.update(editingMenu.id, menuData);
        toast.success('Menu updated successfully');
      } else {
        await menusApi.create(menuData);
        toast.success('Menu created successfully');
      }
      
      setDialogOpen(false);
      resetForm();
      loadMenus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save menu');
    }
  };

  const handleDelete = async (menu) => {
    const confirmed = await confirm({
      title: 'Delete Menu',
      description: `Are you sure you want to delete "${menu.name}"? This will remove this menu from all schools. This action cannot be undone.`,
    });
    if (!confirmed) return;
    
    try {
      await menusApi.delete(menu.id); // Fixed: using menu.id instead of menu._id
      toast.success('Menu deleted successfully');
      loadMenus();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete menu');
    }
  };

  const handleEdit = (menu) => {
    setEditingMenu(menu);
    setFormData({
      name: menu.name,
      path: menu.path,
      icon: menu.icon,
      roles: menu.roles,
      order: menu.order,
      is_active: menu.is_active !== false // Handle both is_active and isActive
    });
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingMenu(null);
    setFormData({
      name: '',
      path: '',
      icon: 'Home',
      roles: [],
      order: menus.length,
      is_active: true
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingMenu(null);
    setFormData({
      name: '',
      path: '',
      icon: 'Home',
      roles: [],
      order: 0,
      is_active: true
    });
  };

  const toggleRole = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleReorder = async (draggedIndex, targetIndex) => {
    const reorderedMenus = [...menus];
    const [draggedItem] = reorderedMenus.splice(draggedIndex, 1);
    reorderedMenus.splice(targetIndex, 0, draggedItem);

    // Update local order
    const updatedMenus = reorderedMenus.map((menu, index) => ({
      ...menu,
      order: index
    }));

    setMenus(updatedMenus);

    // Send to backend
    try {
      await menusApi.reorder({
        menus: updatedMenus.map(menu => ({ id: menu.id, order: menu.order }))
      });
      toast.success('Menu order updated');
    } catch {
      toast.error('Failed to update menu order');
      // Revert on error
      loadMenus();
    }
  };

  const filteredMenus = menus.filter(menu =>
    menu.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    menu.path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count active/inactive menus
  const activeMenusCount = menus.filter(menu => menu.is_active !== false).length;
  const inactiveMenusCount = menus.filter(menu => menu.is_active === false).length;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in" data-testid="menu-management-page">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Central Menu Management</h1>
            <p className="text-gray-600 mt-1">Manage navigation menus for all schools in the system</p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Menu Item
          </Button>
        </div>

        {/* Filters Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="search">Search Menus</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or path..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Scope</Label>
                <div className="px-3 py-2 bg-blue-50 text-blue-700 rounded-md border border-blue-200 text-sm font-medium">
                  Global (All Schools)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Menus</p>
                  <p className="text-2xl font-bold text-gray-900">{menus.length}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Filter className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Menus</p>
                  <p className="text-2xl font-bold text-green-900">
                    {activeMenusCount}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Eye className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Inactive Menus</p>
                  <p className="text-2xl font-bold text-red-900">
                    {inactiveMenusCount}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <EyeOff className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menus Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Navigation Menus
              <Badge variant="secondary">{filteredMenus.length} items</Badge>
            </CardTitle>
            <CardDescription>
              Manage global navigation menus that apply to all schools. Drag and drop to reorder.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="animate-pulse bg-gray-200 h-12 w-12 rounded-lg"></div>
                    <div className="space-y-2 flex-1">
                      <div className="animate-pulse bg-gray-200 h-4 w-1/4 rounded"></div>
                      <div className="animate-pulse bg-gray-200 h-4 w-1/3 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMenus.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Order</TableHead>
                      <TableHead>Menu Item</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMenus.map((menu, index) => (
                      <TableRow key={menu.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                            <span className="text-sm text-gray-500">{menu.order + 1}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="bg-gray-100 p-2 rounded-lg">
                              <span className="text-sm font-medium">{menu.icon}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{menu.name}</p>
                              <p className="text-sm text-gray-500 capitalize">{menu.icon} icon</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm text-gray-600">
                          {menu.path}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {menu.roles && menu.roles.map(role => {
                              const roleConfig = ROLE_OPTIONS.find(r => r.value === role);
                              return (
                                <Badge 
                                  key={role} 
                                  variant="outline" 
                                  className={roleConfig?.color || 'bg-gray-100 text-gray-800'}
                                >
                                  {roleConfig?.label || role}
                                </Badge>
                              );
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={menu.is_active !== false ? 'default' : 'secondary'}
                            className={menu.is_active !== false ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}
                          >
                            {menu.is_active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(menu)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(menu)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No menus found
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first menu item'}
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Menu Item
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMenu ? 'Edit Menu Item' : 'Create New Menu Item'}
              </DialogTitle>
              <DialogDescription>
                {editingMenu 
                  ? 'Update the menu item details below. Changes will apply to all schools.' 
                  : 'Add a new menu item to the global navigation system. This will be available across all schools.'
                }
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Menu Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Dashboard"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="path">Path *</Label>
                  <Input
                    id="path"
                    value={formData.path}
                    onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                    placeholder="e.g., /dashboard"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">Icon</Label>
                <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an icon" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ICONS.map(icon => (
                      <SelectItem key={icon} value={icon}>
                        {icon}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Access Roles *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map(role => (
                    <div key={role.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`role-${role.value}`}
                        checked={formData.roles.includes(role.value)}
                        onChange={() => toggleRole(role.value)}
                        className="rounded border-gray-300"
                      />
                      <Label 
                        htmlFor={`role-${role.value}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                </div>

                <div className="flex items-center justify-between space-y-0 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="is_active">Active Status</Label>
                    <div className="text-sm text-gray-500">
                      Show this menu in navigation
                    </div>
                  </div>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 text-blue-700 text-sm">
                  <span className="font-medium">Scope:</span>
                  <span>Global - This menu will be available to all schools</span>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMenu ? 'Update Menu' : 'Create Menu'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <ConfirmDialog />
      </div>
    </Layout>
  );
}