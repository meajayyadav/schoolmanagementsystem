import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, Plus, Search, Users, BookMarked, Calendar, 
  User, Mail, Phone, Clock, AlertCircle, CheckCircle2,
  Filter, BookText, GraduationCap, List, Eye, Edit, Trash2,
  School, Building
} from 'lucide-react';
import { libraryApi, studentsApi, schoolsApi } from '@/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Library() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [students, setStudents] = useState([]);
  const [loans, setLoans] = useState([]);
  const [myLoans, setMyLoans] = useState([]);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('books');
  const [showAddBookDialog, setShowAddBookDialog] = useState(false);
  const [showEditBookDialog, setShowEditBookDialog] = useState(false);
  const [showDeleteBookDialog, setShowDeleteBookDialog] = useState(false);
  const [showIssueBookDialog, setShowIssueBookDialog] = useState(false);
  const [showReturnBookDialog, setShowReturnBookDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    isbn: '',
    genre: '',
    total_copies: 1,
    available: 1,
    publisher: '',
    publication_year: new Date().getFullYear(),
    description: ''
  });

  const [editBookForm, setEditBookForm] = useState({
    id: '',
    title: '',
    author: '',
    isbn: '',
    genre: '',
    total_copies: 1,
    available: 1,
    publisher: '',
    publication_year: new Date().getFullYear(),
    description: ''
  });

  const [loanForm, setLoanForm] = useState({
    book_id: '',
    student_id: '',
    due_date: ''
  });

  const genres = [
    'Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History', 
    'Biography', 'Technology', 'Arts', 'Literature', 'Children', 
    'Young Adult', 'Reference', 'Textbook', 'Other'
  ];

  // Check if user can edit/delete books
  const canEditDelete = user.role === 'super_admin' || user.role === 'school_admin';

  // 📚 Load data based on user role
  useEffect(() => {
    if (user.role === 'super_admin') {
      loadSchools();
    } else {
      loadBooks();
      if (user.role === 'school_admin') {
        loadStudents();
        loadAllLoans();
      } else if (user.role === 'student') {
        loadMyLoans();
      }
    }
  }, [user.role]);

  useEffect(() => {
    if (user.role === 'super_admin' && selectedSchool) {
      loadBooks();
      loadStudents();
      loadAllLoans();
    }
  }, [selectedSchool, user.role]);

  const loadSchools = async () => {
    try {
      setLoading(true);
      const res = await schoolsApi.getAll();
      setSchools(res.data?.data || res.data || []);
      if (res.data?.data?.length > 0) {
        setSelectedSchool(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load schools', err);
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const loadBooks = async () => {
    try {
      setLoading(true);
      const params = user.role === 'super_admin' ? { school_id: selectedSchool } : {};
      const res = await libraryApi.getBooks(params);
      setBooks(res.data || []);
    } catch (err) {
      console.error('Failed to load books', err);
      toast.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const params = user.role === 'super_admin' ? { school_id: selectedSchool } : {};
      const res = await studentsApi.getAll(params);
      setStudents(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load students', err);
    }
  };

  const loadAllLoans = async () => {
    try {
      const params = user.role === 'super_admin' ? { school_id: selectedSchool } : {};
      const res = await libraryApi.getAllLoans(params);
      setLoans(res.data || []);
    } catch (err) {
      console.error('Failed to load loans', err);
    }
  };

  const loadMyLoans = async () => {
    try {
      const res = await libraryApi.getStudentLoans(user.id);
      setMyLoans(res.data || []);
    } catch (err) {
      console.error('Failed to load my loans', err);
    }
  };

  // ➕ Add new book
  const handleAddBook = async (e) => {
    e.preventDefault();
    try {
      const data = user.role === 'super_admin' 
        ? { ...bookForm, school_id: selectedSchool }
        : bookForm;
      
      await libraryApi.addBook(data);
      toast.success('Book added successfully!');
      setShowAddBookDialog(false);
      setBookForm({
        title: '', author: '', isbn: '', genre: '', total_copies: 1, 
        available: 1, publisher: '', publication_year: new Date().getFullYear(), description: ''
      });
      loadBooks();
    } catch (err) {
      console.error('Failed to add book', err);
      toast.error('Failed to add book');
    }
  };

  // ✏️ Edit book
  const handleEditBook = async (e) => {
    e.preventDefault();
    try {
      await libraryApi.updateBook(editBookForm.id, editBookForm);
      toast.success('Book updated successfully!');
      setShowEditBookDialog(false);
      setEditBookForm({
        id: '', title: '', author: '', isbn: '', genre: '', total_copies: 1, 
        available: 1, publisher: '', publication_year: new Date().getFullYear(), description: ''
      });
      loadBooks();
    } catch (err) {
      console.error('Failed to update book', err);
      toast.error('Failed to update book');
    }
  };

  // 🗑️ Delete book
  const handleDeleteBook = async () => {
    try {
      await libraryApi.deleteBook(selectedBook.id);
      toast.success('Book deleted successfully!');
      setShowDeleteBookDialog(false);
      setSelectedBook(null);
      loadBooks();
    } catch (err) {
      console.error('Failed to delete book', err);
      toast.error('Failed to delete book');
    }
  };

  // 📖 Issue book to student
  const handleIssueBook = async (e) => {
    e.preventDefault();
    try {
      const data = user.role === 'super_admin'
        ? { ...loanForm, school_id: selectedSchool }
        : loanForm;
      
      await libraryApi.issueBook(data);
      toast.success('Book issued successfully!');
      setShowIssueBookDialog(false);
      setLoanForm({ book_id: '', student_id: '', due_date: '' });
      loadBooks();
      loadAllLoans();
    } catch (err) {
      console.error('Failed to issue book', err);
      toast.error('Failed to issue book');
    }
  };

  // 🔄 Return book (for both admin and student)
  const handleReturnBook = async (loanId) => {
    try {
      await libraryApi.returnBook(loanId);
      toast.success('Book returned successfully!');
      setShowReturnBookDialog(false);
      setSelectedBook(null);
      setSelectedLoan(null);
      loadBooks();
      if (user.role === 'super_admin' || user.role === 'school_admin') {
        loadAllLoans();
      } else {
        loadMyLoans();
      }
    } catch (err) {
      console.error('Failed to return book', err);
      toast.error('Failed to return book');
    }
  };

  // Open edit book dialog
  const openEditBookDialog = (book) => {
    setEditBookForm({
      id: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn || '',
      genre: book.genre || '',
      total_copies: book.total_copies,
      available: book.available,
      publisher: book.publisher || '',
      publication_year: book.publication_year || new Date().getFullYear(),
      description: book.description || ''
    });
    setShowEditBookDialog(true);
  };

  // Open delete book dialog
  const openDeleteBookDialog = (book) => {
    setSelectedBook(book);
    setShowDeleteBookDialog(true);
  };

  // 🔍 Filter books
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.isbn?.includes(searchTerm);
    
    if (filterStatus === 'available') return matchesSearch && book.available > 0;
    if (filterStatus === 'unavailable') return matchesSearch && book.available === 0;
    return matchesSearch;
  });

  // 📊 Statistics
  const stats = {
    totalBooks: books.length,
    availableBooks: books.filter(book => book.available > 0).length,
    totalLoans: (user.role === 'super_admin' || user.role === 'school_admin') ? loans.length : myLoans.length,
    overdueLoans: ((user.role === 'super_admin' || user.role === 'school_admin') ? loans : myLoans)
      .filter(loan => new Date(loan.due_date) < new Date() && !loan.returned_date).length
  };

  // Check if loan is overdue
  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date();
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Get current school name
  const getCurrentSchoolName = () => {
    if (user.role !== 'super_admin') return '';
    const school = schools.find(s => s.id === selectedSchool);
    return school ? school.name : '';
  };

  return (
    <Layout>
      <div className="animate-fade-in" data-testid="library-page">
        {/* Header */}
        <div className="page-header flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {user.role === 'super_admin' ? 'All Schools Library' : 'School Library'}
            </h1>
            <p className="text-gray-600 mt-2">
              {user.role === 'student' 
                ? 'Browse books and manage your loans' 
                : user.role === 'super_admin'
                ? `Manage library for ${getCurrentSchoolName() || 'selected school'}`
                : 'Manage books and library operations'
              }
            </p>
          </div>
          
          {(user.role === 'school_admin' || user.role === 'super_admin') && (
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Button 
                onClick={() => setShowAddBookDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Book
              </Button>
              <Button 
                onClick={() => setShowIssueBookDialog(true)}
                variant="outline"
              >
                <BookMarked className="mr-2 h-4 w-4" /> Issue Book
              </Button>
            </div>
          )}
        </div>

        {/* School Selector for Super Admin */}
        {user.role === 'super_admin' && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building className="h-5 w-5 text-blue-600" />
                <label className="text-sm font-medium text-gray-700">Select School:</label>
                <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choose a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map(school => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSchool && (
                  <Badge variant="outline" className="ml-2">
                    {getCurrentSchoolName()}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Books</CardTitle>
              <BookText className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">{stats.totalBooks}</div>
              <p className="text-xs text-blue-600">Books in collection</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Available</CardTitle>
              <BookOpen className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">{stats.availableBooks}</div>
              <p className="text-xs text-green-600">Ready for loan</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">
                {(user.role === 'super_admin' || user.role === 'school_admin') ? 'Active Loans' : 'My Loans'}
              </CardTitle>
              <Users className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800">{stats.totalLoans}</div>
              <p className="text-xs text-purple-600">
                {(user.role === 'super_admin' || user.role === 'school_admin') ? 'Books issued' : 'Books borrowed'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800">{stats.overdueLoans}</div>
              <p className="text-xs text-orange-600">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
            <TabsTrigger value="books" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              All Books
            </TabsTrigger>
            {(user.role === 'super_admin' || user.role === 'school_admin') && (
              <TabsTrigger value="loans" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                All Loans
              </TabsTrigger>
            )}
            <TabsTrigger value="myLoans" className="flex items-center gap-2">
              <BookMarked className="h-4 w-4" />
              {user.role === 'student' ? 'My Loans' : 'Student View'}
            </TabsTrigger>
          </TabsList>

          {/* Books Tab */}
          <TabsContent value="books" className="space-y-6">
            {/* Search and Filter */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search books by title, author, or ISBN..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full lg:w-48">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Books</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Books Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {loading ? (
                <div className="col-span-full flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Loading books...</span>
                </div>
              ) : filteredBooks.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <BookOpen className="mx-auto text-gray-300 mb-4" size={64} />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Books Found</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {searchTerm ? 'No books match your search criteria.' : 'No books available in the library.'}
                  </p>
                  {(user.role === 'school_admin' || user.role === 'super_admin') && (
                    <Button 
                      onClick={() => setShowAddBookDialog(true)}
                      className="mt-4 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add First Book
                    </Button>
                  )}
                </div>
              ) : (
                filteredBooks.map((book) => (
                  <Card key={book.id} className="hover:shadow-lg transition-all duration-200 group">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant={book.available > 0 ? "default" : "secondary"} className="mb-2">
                          {book.available > 0 ? `${book.available} Available` : 'Out of Stock'}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {book.genre}
                        </Badge>
                      </div>
                      <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                      <CardDescription className="line-clamp-1">by {book.author}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <BookMarked className="h-4 w-4" />
                          <span>ISBN: {book.isbn}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Published: {book.publication_year}</span>
                        </div>
                        {book.publisher && (
                          <div className="flex items-center gap-2">
                            <BookText className="h-4 w-4" />
                            <span className="line-clamp-1">{book.publisher}</span>
                          </div>
                        )}
                      </div>
                      {book.description && (
                        <p className="text-sm text-gray-500 mt-3 line-clamp-2">{book.description}</p>
                      )}
                      
                      <div className="flex gap-2 mt-4">
                        {(user.role === 'super_admin' || user.role === 'school_admin') && (
                          <>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              disabled={book.available === 0}
                              onClick={() => {
                                setLoanForm(prev => ({ ...prev, book_id: book.id }));
                                setShowIssueBookDialog(true);
                              }}
                            >
                              {book.available > 0 ? 'Issue' : 'Unavailable'}
                            </Button>
                            {canEditDelete && (
                              <div className="flex gap-1">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => openEditBookDialog(book)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => openDeleteBookDialog(book)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                        {user.role === 'student' && book.available > 0 && (
                          <Button size="sm" className="flex-1">
                            Request Book
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* All Loans Tab (Admin Only) */}
          {(user.role === 'super_admin' || user.role === 'school_admin') && (
            <TabsContent value="loans" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5 text-blue-600" />
                    All Book Loans
                  </CardTitle>
                  <CardDescription>Manage and track all book loans in the library</CardDescription>
                </CardHeader>
                <CardContent>
                  {loans.length === 0 ? (
                    <div className="text-center py-8">
                      <BookMarked className="mx-auto text-gray-300 mb-4" size={48} />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Loans</h3>
                      <p className="text-gray-500">No books have been issued to students yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {loans.map((loan) => (
                        <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-gray-900">
                                {books.find(b => b.id === loan.book_id)?.title || 'Unknown Book'}
                              </h4>
                              <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                                {loan.status}
                              </Badge>
                              {isOverdue(loan.due_date) && loan.status === 'active' && (
                                <Badge variant="destructive">Overdue</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>Issued to: {students.find(s => s.id === loan.student_id)?.name || 'Unknown Student'}</p>
                              <p>Due Date: {formatDate(loan.due_date)}</p>
                              {loan.returned_date && (
                                <p>Returned: {formatDate(loan.returned_date)}</p>
                              )}
                            </div>
                          </div>
                          {loan.status === 'active' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setShowReturnBookDialog(true);
                              }}
                            >
                              Mark Returned
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* My Loans / Student View Tab */}
          <TabsContent value="myLoans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookMarked className="h-5 w-5 text-blue-600" />
                  {user.role === 'student' ? 'My Borrowed Books' : 'Student Loans View'}
                </CardTitle>
                <CardDescription>
                  {user.role === 'student' 
                    ? 'Books currently issued to you' 
                    : 'View books issued to students'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(user.role === 'student' ? myLoans : loans).length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {user.role === 'student' ? 'No Books Borrowed' : 'No Active Loans'}
                    </h3>
                    <p className="text-gray-500">
                      {user.role === 'student' 
                        ? 'You haven\'t borrowed any books yet.' 
                        : 'No books have been issued to students yet.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(user.role === 'student' ? myLoans : loans)
                      .filter(loan => user.role === 'student' ? true : loan.status === 'active')
                      .map((loan) => (
                      <div key={loan.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {books.find(b => b.id === loan.book_id)?.title || 'Unknown Book'}
                            </h4>
                            <Badge variant={loan.status === 'active' ? 'default' : 'secondary'}>
                              {loan.status}
                            </Badge>
                            {isOverdue(loan.due_date) && loan.status === 'active' && (
                              <Badge variant="destructive">Overdue</Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Author: {books.find(b => b.id === loan.book_id)?.author || 'Unknown'}</p>
                            <p>Due Date: {formatDate(loan.due_date)}</p>
                            {user.role !== 'student' && (
                              <p>Student: {students.find(s => s.id === loan.student_id)?.name || 'Unknown'}</p>
                            )}
                            {loan.returned_date && (
                              <p>Returned: {formatDate(loan.returned_date)}</p>
                            )}
                          </div>
                        </div>
                        {loan.status === 'active' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedLoan(loan);
                              setShowReturnBookDialog(true);
                            }}
                          >
                            {user.role === 'student' ? 'Return Book' : 'Mark Returned'}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Book Dialog */}
        <Dialog open={showAddBookDialog} onOpenChange={setShowAddBookDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-600" />
                Add New Book
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Book Title *</label>
                  <Input
                    placeholder="Enter book title"
                    value={bookForm.title}
                    onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Author *</label>
                  <Input
                    placeholder="Enter author name"
                    value={bookForm.author}
                    onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">ISBN</label>
                  <Input
                    placeholder="Enter ISBN"
                    value={bookForm.isbn}
                    onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Genre</label>
                  <Select value={bookForm.genre} onValueChange={(v) => setBookForm({ ...bookForm, genre: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map(genre => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Total Copies *</label>
                  <Input
                    type="number"
                    min="1"
                    value={bookForm.total_copies}
                    onChange={(e) => setBookForm({ 
                      ...bookForm, 
                      total_copies: parseInt(e.target.value),
                      available: parseInt(e.target.value)
                    })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Publisher</label>
                  <Input
                    placeholder="Enter publisher"
                    value={bookForm.publisher}
                    onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Publication Year</label>
                  <Input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={bookForm.publication_year}
                    onChange={(e) => setBookForm({ ...bookForm, publication_year: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                <textarea
                  placeholder="Enter book description"
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Add Book
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Book Dialog */}
        <Dialog open={showEditBookDialog} onOpenChange={setShowEditBookDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                Edit Book
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditBook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Book Title *</label>
                  <Input
                    placeholder="Enter book title"
                    value={editBookForm.title}
                    onChange={(e) => setEditBookForm({ ...editBookForm, title: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Author *</label>
                  <Input
                    placeholder="Enter author name"
                    value={editBookForm.author}
                    onChange={(e) => setEditBookForm({ ...editBookForm, author: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">ISBN</label>
                  <Input
                    placeholder="Enter ISBN"
                    value={editBookForm.isbn}
                    onChange={(e) => setEditBookForm({ ...editBookForm, isbn: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Genre</label>
                  <Select value={editBookForm.genre} onValueChange={(v) => setEditBookForm({ ...editBookForm, genre: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      {genres.map(genre => (
                        <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Total Copies *</label>
                  <Input
                    type="number"
                    min="1"
                    value={editBookForm.total_copies}
                    onChange={(e) => setEditBookForm({ 
                      ...editBookForm, 
                      total_copies: parseInt(e.target.value)
                    })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Available Copies *</label>
                  <Input
                    type="number"
                    min="0"
                    max={editBookForm.total_copies}
                    value={editBookForm.available}
                    onChange={(e) => setEditBookForm({ ...editBookForm, available: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Publisher</label>
                  <Input
                    placeholder="Enter publisher"
                    value={editBookForm.publisher}
                    onChange={(e) => setEditBookForm({ ...editBookForm, publisher: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Publication Year</label>
                  <Input
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    value={editBookForm.publication_year}
                    onChange={(e) => setEditBookForm({ ...editBookForm, publication_year: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                <textarea
                  placeholder="Enter book description"
                  value={editBookForm.description}
                  onChange={(e) => setEditBookForm({ ...editBookForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Update Book
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Book Dialog */}
        <Dialog open={showDeleteBookDialog} onOpenChange={setShowDeleteBookDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                Delete Book
              </DialogTitle>
            </DialogHeader>
            {selectedBook && (
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900">{selectedBook.title}</h4>
                  <p className="text-sm text-gray-600">by {selectedBook.author}</p>
                  <p className="text-sm text-red-600 mt-2">
                    This action cannot be undone. This will permanently delete the book and all associated loan records.
                  </p>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline"
                    onClick={() => setShowDeleteBookDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleDeleteBook}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Book
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Issue Book Dialog */}
        <Dialog open={showIssueBookDialog} onOpenChange={setShowIssueBookDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-blue-600" />
                Issue Book to Student
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleIssueBook} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Select Book *</label>
                <Select 
                  value={loanForm.book_id} 
                  onValueChange={(v) => setLoanForm({ ...loanForm, book_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a book" />
                  </SelectTrigger>
                  <SelectContent>
                    {books.filter(book => book.available > 0).map(book => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title} by {book.author} ({book.available} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Select Student *</label>
                <Select 
                  value={loanForm.student_id} 
                  onValueChange={(v) => setLoanForm({ ...loanForm, student_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} - Grade {student.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Due Date *</label>
                <Input
                  type="date"
                  value={loanForm.due_date}
                  onChange={(e) => setLoanForm({ ...loanForm, due_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!loanForm.book_id || !loanForm.student_id || !loanForm.due_date}
                >
                  Issue Book
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Return Book Dialog */}
        <Dialog open={showReturnBookDialog} onOpenChange={setShowReturnBookDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Return Book
              </DialogTitle>
            </DialogHeader>
            {selectedLoan && (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900">
                    {books.find(b => b.id === selectedLoan.book_id)?.title || 'Unknown Book'}
                  </h4>
                  <p className="text-sm text-gray-600">
                    by {books.find(b => b.id === selectedLoan.book_id)?.author || 'Unknown Author'}
                  </p>
                  {user.role !== 'student' && (
                    <p className="text-sm text-gray-600 mt-1">
                      Issued to: {students.find(s => s.id === selectedLoan.student_id)?.name || 'Unknown Student'}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Are you sure you want to mark this book as returned?
                </p>
                <DialogFooter>
                  <Button 
                    onClick={() => handleReturnBook(selectedLoan.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Confirm Return
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}