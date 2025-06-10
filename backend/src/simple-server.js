const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple test routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/posts', (req, res) => {
  res.json([
    {
      id: '1',
      title: 'Getting Started with Gatsby and TypeScript',
      slug: 'getting-started-gatsby-typescript',
      excerpt: 'Learn how to set up a modern blog using Gatsby and TypeScript for better development experience and type safety.',
      content: '# Getting Started with Gatsby and TypeScript\n\nGatsby is a modern web framework...',
      status: 'published',
      category: 'React',
      author: 'John Doe',
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      views: 142
    },
    {
      id: '2',
      title: 'React Performance Optimization Techniques',
      slug: 'react-performance-optimization',
      excerpt: 'Master React performance optimization with memoization, code splitting, and modern techniques for faster applications.',
      content: '# React Performance Optimization\n\nPerformance is crucial...',
      status: 'published',
      category: 'React',
      author: 'Jane Smith',
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z',
      views: 203
    },
    {
      id: '3',
      title: 'Building Modern APIs with Node.js and Prisma',
      slug: 'modern-apis-nodejs-prisma',
      excerpt: 'Learn to build production-ready Node.js APIs with Prisma ORM, TypeScript, and modern best practices.',
      content: '# Building Modern APIs\n\nModern API development...',
      status: 'published',
      category: 'Node.js',
      author: 'Mike Johnson',
      createdAt: '2023-12-28T00:00:00Z',
      updatedAt: '2023-12-28T00:00:00Z',
      views: 156
    }
  ]);
});

app.get('/api/categories', (req, res) => {
  res.json([
    { id: '1', name: 'React', slug: 'react', count: 2 },
    { id: '2', name: 'Node.js', slug: 'nodejs', count: 1 },
    { id: '3', name: 'TypeScript', slug: 'typescript', count: 1 }
  ]);
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@example.com' && password === 'admin123') {
    res.json({
      success: true,
      token: 'mock-jwt-token',
      user: {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

app.get('/api/admin/stats', (req, res) => {
  res.json({
    totalPosts: 3,
    totalUsers: 2,
    totalComments: 12,
    totalViews: 501,
    recentPosts: [
      { title: 'Getting Started with Gatsby', views: 142, date: '2024-01-15' },
      { title: 'React Performance', views: 203, date: '2024-01-05' }
    ]
  });
});

// Catch all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Simple Backend Server running at http://localhost:${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
  console.log(`📝 Posts API: http://localhost:${PORT}/api/posts`);
  console.log(`🔐 Login API: POST http://localhost:${PORT}/api/auth/login`);
}); 