import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  School, Users, BookOpen, Calendar, DollarSign, Bell, Award, 
  Eye, EyeOff, Check, ArrowRight, Play, Star, Shield, Zap,
  Youtube
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Landing() {
  const { user, login, register, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

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
    {
      icon: Users,
      title: 'Student Management',
      description: 'Comprehensive student enrollment, profiles, and academic tracking',
      benefits: ['Digital enrollment', 'Progress tracking', 'Parent portal']
    },
    {
      icon: Calendar,
      title: 'Attendance System', 
      description: 'Real-time attendance marking with automated notifications and reports',
      benefits: ['Real-time tracking', 'Automated alerts', 'Detailed reports']
    },
    {
      icon: Award,
      title: 'Grade Management',
      description: 'Complete gradebook with analytics and performance insights',
      benefits: ['Automated grading', 'Performance analytics', 'Report cards']
    },
    {
      icon: BookOpen,
      title: 'Library System',
      description: 'Digital library management with book tracking and loan system',
      benefits: ['Digital catalog', 'Loan management', 'Reading analytics']
    },
    {
      icon: DollarSign,
      title: 'Fee Management',
      description: 'Streamlined fee collection with automated billing and payment tracking',
      benefits: ['Online payments', 'Automated billing', 'Payment history']
    },
    {
      icon: Bell,
      title: 'Announcements',
      description: 'Instant communication platform for all school stakeholders',
      benefits: ['Broadcast messages', 'Targeted alerts', 'Mobile notifications']
    }
  ];

  const stats = [
    { number: '500+', label: 'Schools Trust Us' },
    { number: '50K+', label: 'Active Students' },
    { number: '10K+', label: 'Teachers' },
    { number: '99%', label: 'Satisfaction Rate' }
  ];

  const benefits = [
    { icon: Shield, text: 'Enterprise-grade security' },
    { icon: Zap, text: 'Lightning fast performance' },
    { icon: Star, text: 'Award-winning design' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-2 rounded-xl">
                <School className="text-white" size={28} />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                EduManage
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                Features
              </a>
              <a href="#demo" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">
                Demo
              </a>
              <Button 
                onClick={() => setShowAuth(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                Get Started
              </Button>
            </div>

            <Button 
              onClick={() => setShowAuth(true)} 
              className="md:hidden bg-blue-600 hover:bg-blue-700 text-white"
            >
              Login
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-28 bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Zap size={16} />
              Trusted by 500+ educational institutions
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Modern School
              <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent"> Management </span>
              Made Simple
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Streamline operations, enhance learning experiences, and connect your entire educational ecosystem with our all-in-one platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                onClick={() => setShowAuth(true)} 
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold rounded-xl"
              >
                Start Free Trial
                <ArrowRight size={20} className="ml-2" />
              </Button>
              
              <Button 
                onClick={() => setShowVideo(true)}
                variant="outline"
                size="lg"
                className="border-2 border-gray-300 text-gray-700 hover:border-blue-600 hover:text-blue-600 px-8 py-6 text-lg font-semibold rounded-xl"
              >
                <Play size={20} className="mr-2" />
                Watch Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stat.number}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Bar */}
      <div className="bg-gray-50 border-y border-gray-200 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center justify-center gap-3">
                <benefit.icon className="text-blue-600" size={20} />
                <span className="text-gray-700 font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Video Section */}
      <section id="demo" className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              See EduManage in Action
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Watch our 2-minute demo to see how EduManage can transform your school management experience.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Video Thumbnail */}
            <div 
              className="relative bg-gray-900 rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => setShowVideo(true)}
            >
              <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 inline-flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Play size={40} className="ml-1" fill="white" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">EduManage Platform Demo</h3>
                  <p className="text-blue-100 flex items-center justify-center gap-2">
                    <Youtube size={20} />
                    Click to watch the full demo video
                  </p>
                </div>
              </div>
              
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-6 group-hover:scale-110 transition-transform duration-300">
                  <Play size={48} className="text-white ml-1" fill="white" />
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-gray-600 text-sm">
                2-minute overview • Full platform walkthrough • Real use cases
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Everything Your School Needs
            </h2>
            <p className="text-lg text-gray-600">
              Comprehensive tools designed to simplify school administration and enhance learning outcomes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white"
                onMouseEnter={() => setActiveFeature(index)}
              >
                <CardContent className="p-6">
                  <div className="bg-blue-50 p-3 rounded-lg w-fit group-hover:bg-blue-100 transition-colors mb-4">
                    <feature.icon className="text-blue-600" size={24} />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 leading-relaxed">
                    {feature.description}
                  </p>
                  
                  <ul className="space-y-2">
                    {feature.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-center gap-2 text-sm text-gray-600">
                        <Check size={16} className="text-green-500 flex-shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
              Ready to Transform Your School?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Join hundreds of forward-thinking schools that have already modernized their operations with EduManage.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={() => setShowAuth(true)} 
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-semibold rounded-xl"
              >
                Start Your Free Trial
              </Button>
              
              <Button 
                onClick={() => setShowVideo(true)}
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg font-semibold rounded-xl"
              >
                <Play size={20} className="mr-2" />
                Watch Demo Video
              </Button>
            </div>
            
            <p className="text-blue-200 text-sm mt-6">
              No credit card required • 14-day free trial • Full feature access
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="bg-white p-2 rounded-lg">
                <School className="text-blue-600" size={24} />
              </div>
              <span className="text-2xl font-bold text-white">EduManage</span>
            </div>
            
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Empowering educational institutions with modern, efficient management solutions.
            </p>
            
            <div className="text-gray-400 text-sm">
              © 2024 EduManage. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      <Dialog open={showAuth} onOpenChange={setShowAuth}>
        <DialogContent className="sm:max-w-md border-0 shadow-2xl">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-xl">
                <School className="text-white" size={32} />
              </div>
            </div>
            <DialogTitle className="text-2xl font-bold text-center text-gray-900">
              Welcome to EduManage
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="login" className="mt-4">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-lg">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
                disabled
              >
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter your email or mobile number"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-lg"
                    required
                  />
                  {/* <p className="text-xs text-gray-500">You can login using your email address or mobile number</p> */}
                </div>
                
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-lg pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700">
                  Sign In
                </Button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-lg border-gray-300"
                  onClick={() => googleLogin()}
                  disabled
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
                  Continue with Google
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 rounded-lg"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-lg"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Create password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-lg"
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700">
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Video Demo Dialog */}
      <Dialog open={showVideo} onOpenChange={setShowVideo}>
        <DialogContent className="max-w-4xl border-0 shadow-2xl p-0 bg-black">
          <div className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/gVcnr97BroY?si=Nik46Ll2GH3zY43C"
              title="EduManage Platform Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-lg"
            ></iframe>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}