import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { studentsApi, schoolsApi, classesApi, studentPromotionApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  GraduationCap,
  Users,
  ArrowRight,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
  School,
  BookOpen
} from 'lucide-react';

export default function StudentPromotion() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Promotion configuration
  const [promotionConfig, setPromotionConfig] = useState({
    school_id: '',
    from_class_id: '',
    to_class_id: '',
    academic_year: '',
    promotion_type: 'annual'
  });

  // Set default academic year (current year + 1)
  useEffect(() => {
    const nextYear = new Date().getFullYear() + 1;
    setPromotionConfig(prev => ({
      ...prev,
      academic_year: `${nextYear}-${nextYear + 1}`
    }));
  }, []);

  // Load schools for super admin
  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadSchools();
    } else {
      // For school admin, set current school and load classes
      setPromotionConfig(prev => ({ ...prev, school_id: user.school_id }));
      loadClasses(user.school_id);
    }
  }, [user]);

  // Load classes when school is selected
  useEffect(() => {
    if (promotionConfig.school_id) {
      loadClasses(promotionConfig.school_id);
    }
  }, [promotionConfig.school_id]);

  // Load students when source class is selected
  useEffect(() => {
    if (promotionConfig.from_class_id) {
      loadStudents();
    } else {
      setStudents([]);
      setSelectedStudents([]);
    }
  }, [promotionConfig.from_class_id]);

  const loadSchools = async () => {
    try {
      const res = await schoolsApi.getAll();
      setSchools(res.data || []);
    } catch (error) {
      toast.error('Failed to load schools');
    }
  };

  const loadClasses = async (schoolId) => {
    try {
      const res = await classesApi.getAll({ school_id: schoolId });
      setClasses(res.data.data || res.data || []);
    } catch (error) {
      toast.error('Failed to load classes');
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await studentsApi.getAll({ 
        class_id: promotionConfig.from_class_id,
        status: 'active'
      });
      const studentsWithSelection = (res.data.data || []).map(student => ({
        ...student,
        selected: false
      }));
      setStudents(studentsWithSelection);
      setSelectedStudents([]);
    } catch (error) {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSelect = (studentId, selected) => {
    const updatedStudents = students.map(student =>
      student.id === studentId ? { ...student, selected } : student
    );
    setStudents(updatedStudents);
    
    if (selected) {
      setSelectedStudents(prev => [...prev, studentId]);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleSelectAll = (selected) => {
    const updatedStudents = students.map(student => ({
      ...student,
      selected
    }));
    setStudents(updatedStudents);
    setSelectedStudents(selected ? students.map(s => s.id) : []);
  };

  const handlePromote = async () => {
    if (!promotionConfig.from_class_id || !promotionConfig.to_class_id || !promotionConfig.academic_year) {
      return toast.error('Please fill all required fields');
    }

    if (selectedStudents.length === 0) {
      return toast.error('Please select at least one student');
    }

    if (promotionConfig.from_class_id === promotionConfig.to_class_id) {
      return toast.error('Source and target classes cannot be the same');
    }

    try {
      setPromoting(true);
      const payload = {
        ...promotionConfig,
        student_ids: selectedStudents
      };

      const res = await studentPromotionApi.promoteStudents(payload);
      
      if (res.data.success) {
        toast.success(`Successfully promoted ${res.data.data.successful.length} students`);
        
        // Show promotion summary
        if (res.data.data.failed.length > 0) {
          toast.warning(`${res.data.data.failed.length} promotions failed`);
        }
        
        // Reset and reload
        setShowConfirmDialog(false);
        setSelectedStudents([]);
        loadStudents(); // Reload to show updated students
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Promotion failed');
    } finally {
      setPromoting(false);
    }
  };

  const fromClass = classes.find(c => c.id === promotionConfig.from_class_id);
  const toClass = classes.find(c => c.id === promotionConfig.to_class_id);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Student Promotion
              </h1>
              <p className="text-gray-600 mt-2">
                Promote students to next academic year and manage class transitions
              </p>
            </div>
            
            <Button
              variant="outline"
              onClick={() => navigate('/students')}
            >
              Back to Students
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Promotion Configuration */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  Promotion Configuration
                </CardTitle>
                <CardDescription>
                  Configure source and target classes for student promotion
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* School Selection (Super Admin Only) */}
                  {user.role === 'super_admin' && (
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-2 block">
                        School *
                      </Label>
                      <Select
                        value={promotionConfig.school_id}
                        onValueChange={(val) => setPromotionConfig(prev => ({ ...prev, school_id: val }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select School" />
                        </SelectTrigger>
                        <SelectContent>
                          {schools.map(school => (
                            <SelectItem key={school.id} value={school.id}>
                              {school.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Source Class */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Current Class *
                    </Label>
                    <Select
                      value={promotionConfig.from_class_id}
                      onValueChange={(val) => setPromotionConfig(prev => ({ ...prev, from_class_id: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Current Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} {cls.section ? `- ${cls.section}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Target Class */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Target Class *
                    </Label>
                    <Select
                      value={promotionConfig.to_class_id}
                      onValueChange={(val) => setPromotionConfig(prev => ({ ...prev, to_class_id: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Target Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} {cls.section ? `- ${cls.section}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Academic Year */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Academic Year *
                    </Label>
                    <Input
                      type="text"
                      value={promotionConfig.academic_year}
                      onChange={(e) => setPromotionConfig(prev => ({ ...prev, academic_year: e.target.value }))}
                      placeholder="e.g., 2024-2025"
                    />
                  </div>
                </div>

                {/* Promotion Preview */}
                {fromClass && toClass && (
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-center gap-6">
                      <div className="text-center">
                        <Badge variant="outline" className="text-lg px-4 py-2">
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            {fromClass.name} {fromClass.section ? `- ${fromClass.section}` : ''}
                          </div>
                        </Badge>
                        <p className="text-sm text-gray-600 mt-2">Current Class</p>
                        <p className="text-xs text-gray-500">{students.length} students</p>
                      </div>
                      
                      <ArrowRight className="w-6 h-6 text-blue-600" />
                      
                      <div className="text-center">
                        <Badge className="text-lg px-4 py-2 bg-green-600">
                          <div className="flex items-center gap-2">
                            <School className="w-4 h-4" />
                            {toClass.name} {toClass.section ? `- ${toClass.section}` : ''}
                          </div>
                        </Badge>
                        <p className="text-sm text-gray-600 mt-2">Target Class</p>
                        <p className="text-xs text-gray-500">Academic Year: {promotionConfig.academic_year}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Students List */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Students for Promotion
                    <Badge variant="secondary">
                      {students.length} students
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {students.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="select-all"
                          checked={selectedStudents.length === students.length}
                          onCheckedChange={handleSelectAll}
                        />
                        <Label htmlFor="select-all" className="text-sm">
                          Select All ({selectedStudents.length}/{students.length})
                        </Label>
                      </div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : students.length > 0 ? (
                  <div className="space-y-3">
                    {students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={student.selected}
                            onCheckedChange={(checked) => handleStudentSelect(student.id, checked)}
                          />
                          <div className="flex items-center gap-3">
                            {student.picture ? (
                              <img
                                src={`${process.env.REACT_APP_BACKEND_URL}${student.picture}`}
                                alt={student.name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">{student.name}</p>
                              <p className="text-sm text-gray-500">
                                Roll No: {student.roll_number} • Father: {student.father_name}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Badge variant={student.selected ? "default" : "outline"}>
                          {student.selected ? 'Selected' : 'Not Selected'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : promotionConfig.from_class_id ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No students found
                    </h3>
                    <p className="text-gray-500">
                      No active students found in the selected class.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Filter className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Select a class
                    </h3>
                    <p className="text-gray-500">
                      Please select a current class to view students.
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedStudents.length > 0 && (
                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedStudents([]);
                        setStudents(students.map(s => ({ ...s, selected: false })));
                      }}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      onClick={() => setShowConfirmDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Promote Selected ({selectedStudents.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Confirm Promotion
            </DialogTitle>
            <DialogDescription>
              This action will promote {selectedStudents.length} students to the next academic year.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Important Notes:</span>
              </div>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• This action cannot be undone</li>
                <li>• Student academic history will be updated</li>
                <li>• Students will be moved to the target class</li>
                <li>• Make sure you have selected the correct academic year</li>
              </ul>
            </div>

            <div className="text-sm text-gray-600">
              <p><strong>From:</strong> {fromClass?.name} {fromClass?.section ? `- ${fromClass.section}` : ''}</p>
              <p><strong>To:</strong> {toClass?.name} {toClass?.section ? `- ${toClass.section}` : ''}</p>
              <p><strong>Academic Year:</strong> {promotionConfig.academic_year}</p>
              <p><strong>Students:</strong> {selectedStudents.length} students</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={promoting}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePromote}
              disabled={promoting}
              className="bg-green-600 hover:bg-green-700"
            >
              {promoting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Promoting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Promotion
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}