import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { School, Users, BookOpen, Calendar, DollarSign, Bell, Award, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff } from "lucide-react";

export default function Landing() {
  const { user, login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
const [showPassword, setShowPassword] = useState(false);
  if (user) {
    navigate('/dashboard');
    return null;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      navigate('/dashboard');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const success = await register(email, password, name, 'super_admin');
    if (success) {
      navigate('/dashboard');
    }
  };

  const features = [
    { icon: Users, title: 'Student Management', desc: 'Comprehensive student enrollment and tracking' },
    { icon: Calendar, title: 'Attendance System', desc: 'Real-time attendance marking and monitoring' },
    { icon: Award, title: 'Grade Management', desc: 'Track academic performance and progress' },
    { icon: BookOpen, title: 'Library System', desc: 'Manage books, loans, and reading records' },
    { icon: DollarSign, title: 'Fee Management', desc: 'Streamlined fee collection and tracking' },
    { icon: Bell, title: 'Announcements', desc: 'Instant communication with all stakeholders' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="landing-hero relative">
        <div className="relative z-10">
          {/* Navigation */}
          <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <School className="text-white" size={36} />
              <span className="text-white text-2xl font-bold">EduManage</span>
            </div>
            <Button 
              data-testid="header-login-btn"
              onClick={() => setShowAuth(true)} 
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Login
            </Button>
          </nav>

          {/* Hero Content */}
          <div className="container mx-auto px-6 py-24 text-center">
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Multi-Tenant School
              <br />
              Management System
            </h1>
            <p className="text-xl lg:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto">
              Streamline operations, enhance learning, and connect your entire educational ecosystem
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                data-testid="hero-get-started-btn"
                onClick={() => setShowAuth(true)} 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg"
              >
                Get Started
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed for modern educational institutions
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-8 hover:shadow-xl transition-all duration-300 border-0">
                <feature.icon className="text-blue-600 mb-4" size={40} />
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Ready to Transform Your School?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of schools already using EduManage
          </p>
          <Button 
            data-testid="cta-start-free-btn"
            onClick={() => setShowAuth(true)} 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg"
          >
            Start Free Trial
          </Button>
        </div>
      </div>

      {/* Auth Dialog */}
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="sm:max-w-md" data-testid="auth-dialog">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">Welcome to EduManage</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="login" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
              <TabsTrigger disabled value="register" data-testid="register-tab">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" data-testid="login-form">
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                <div>
                  <Input
                    data-testid="login-email-input"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="relative">
  <Input
    data-testid="login-password-input"
    type={showPassword ? "text" : "password"}
    placeholder="Password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
    className="pr-10"
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
    aria-label={showPassword ? "Hide password" : "Show password"}
  >
    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>
</div>
                <Button data-testid="login-submit-btn" type="submit" className="w-full">
                  Login
                </Button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>
                <Button disabled
                  data-testid="login-google-btn"
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => googleLogin()}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" data-testid="register-form">
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
                <div>
                  <Input
                    data-testid="register-name-input"
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    data-testid="register-email-input"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Input
                    data-testid="register-password-input"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button data-testid="register-submit-btn" type="submit" className="w-full">
                  Register
                </Button>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>
                <Button
                  data-testid="register-google-btn"
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => googleLogin()}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}