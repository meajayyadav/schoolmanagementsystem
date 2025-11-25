import { useState, useCallback, useEffect } from 'react'; // Change useState to useEffect
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { bulkUploadApi, schoolsApi } from '@/api'; // Import bulkUploadApi instead of studentsApi
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  Upload, Download, FileText, CheckCircle, 
  AlertCircle, ArrowLeft, Users, School,
  X, Clock, CheckSquare, AlertTriangle
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import Layout from '@/components/Layout';

export default function BulkUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [schools, setSchools] = useState([]);
  const [file, setFile] = useState(null);

  // Load schools for super admin - FIX: Change useState to useEffect
  useEffect(() => {
    if (user?.role === 'super_admin') {
      const loadSchools = async () => {
        try {
          const res = await schoolsApi.getAll();
          setSchools(res.data || []);
        } catch (err) {
          toast.error('Failed to load schools');
        }
      };
      loadSchools();
    }
  }, [user]);

  const onDrop = useCallback((acceptedFiles) => {
    const uploadedFile = acceptedFiles[0];
    if (uploadedFile) {
      if (!uploadedFile.name.endsWith('.xlsx') && !uploadedFile.name.endsWith('.csv')) {
        toast.error('Please upload only Excel (.xlsx) or CSV files');
        return;
      }
      if (uploadedFile.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setFile(uploadedFile);
      setUploadResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    if (user.role === 'super_admin' && !selectedSchool) {
      toast.error('Please select a school first');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (user.role === 'super_admin') {
        formData.append('school_id', selectedSchool);
      } else if (user.role === 'school_admin') {
        formData.append('school_id', user.school_id);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // FIX: Use bulkUploadApi instead of studentsApi
      const response = await bulkUploadApi.bulkUpload(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      clearInterval(progressInterval);
      setProgress(100);
      
      setUploadResult(response.data);
      toast.success('Bulk upload completed successfully!');
    } catch (error) {
      // FIX: Handle different error response structure
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Upload failed. Please check your file format.';
      toast.error(errorMessage);
      setUploadResult(null);
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      // FIX: Use bulkUploadApi instead of studentsApi
      const response = await bulkUploadApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_bulk_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Template downloaded successfully');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadResult(null);
    setProgress(0);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/students')}
              className="gap-2"
            >
              <ArrowLeft size={16} />
              Back to Students
            </Button> */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Bulk Student Upload</h1>
              <p className="text-gray-600 mt-1">Upload multiple students using Excel or CSV files</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* School Selection for Super Admin */}
            {user?.role === 'super_admin' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <School size={18} />
                    Select School
                  </CardTitle>
                  <CardDescription>
                    Choose the school where students will be enrolled
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select onValueChange={setSelectedSchool} value={selectedSchool}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school) => (
                        <SelectItem key={school.code} value={school.code}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Upload Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload size={20} />
                  Upload Student Data
                </CardTitle>
                <CardDescription>
                  Upload an Excel or CSV file with student information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
                  } ${file ? 'border-green-500 bg-green-50' : ''}`}
                >
                  <input {...getInputProps()} />
                  <div className="space-y-3">
                    {file ? (
                      <>
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                        <p className="text-lg font-semibold text-green-700">File Selected</p>
                        <p className="text-sm text-gray-600">{file.name}</p>
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                        <div>
                          <p className="text-lg font-semibold text-gray-700">
                            {isDragActive ? 'Drop the file here' : 'Drag & drop your file here'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            or click to browse (Excel or CSV, max 10MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* File Actions */}
                {file && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetUpload();
                      }}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                )}

                {/* Progress Bar */}
                {uploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Uploading...</span>
                      <span className="font-medium">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* Upload Button */}
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !file || (user.role === 'super_admin' && !selectedSchool)}
                  className="w-full gap-2"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Clock size={16} />
                      Uploading... ({progress}%)
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload Students
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Upload Results */}
            {uploadResult && (
              <Card className={
                uploadResult.errors && uploadResult.errors.length > 0 
                  ? 'border-orange-200 bg-orange-50' 
                  : 'border-green-200 bg-green-50'
              }>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {uploadResult.errors && uploadResult.errors.length > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    Upload Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-2xl font-bold text-green-600">{uploadResult.successCount || 0}</p>
                      <p className="text-sm text-gray-600">Successful</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg border">
                      <p className="text-2xl font-bold text-red-600">{uploadResult.errorCount || 0}</p>
                      <p className="text-sm text-gray-600">Errors</p>
                    </div>
                  </div>

                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium text-gray-900">Errors found:</p>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {uploadResult.errors.map((error, index) => (
                          <div key={index} className="p-3 bg-white border border-red-200 rounded-lg text-sm">
                            <p className="font-medium text-red-700">Row {error.row}:</p>
                            <p className="text-red-600">{error.message}</p>
                            {error.details && (
                              <p className="text-red-500 text-xs mt-1">{error.details}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={resetUpload}
                      className="flex-1"
                    >
                      Upload Another File
                    </Button>
                    <Button
                      onClick={() => navigate('/students')}
                      className="flex-1 gap-2"
                    >
                      <Users size={16} />
                      View Students
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Instructions Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={18} />
                  Template Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={downloadTemplate}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Download size={16} />
                  Download Template
                </Button>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Required Fields:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-green-600" />
                      <span>Name (Full name)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-green-600" />
                      <span>Roll Number (Unique)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-green-600" />
                      <span>Grade Level</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-green-600" />
                      <span>Class Section</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-green-600" />
                      <span>Father's Name</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Optional Fields:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-blue-600" />
                      <span>Date of Birth (YYYY-MM-DD)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-blue-600" />
                      <span>Enrollment Date (YYYY-MM-DD)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle size={14} className="text-blue-600" />
                      <span>Contact Information</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">Tips:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Ensure roll numbers are unique</li>
                    <li>• Use valid date formats</li>
                    <li>• Keep file under 10MB</li>
                    <li>• Download template for reference</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-gray-600">
                <p>If you encounter any issues with the bulk upload:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-orange-500 mt-0.5" />
                    <span>Check all required fields are filled</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-orange-500 mt-0.5" />
                    <span>Verify date formats are correct</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-orange-500 mt-0.5" />
                    <span>Ensure no duplicate roll numbers</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}