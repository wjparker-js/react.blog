# React Blog CMS

A modern, full-stack blog content management system built with React, Node.js, and MySQL.

## ✨ Features

- 📝 **Blog Management**: Create, edit, and publish blog posts
- 👥 **Admin Dashboard**: Complete admin interface with analytics
- 🔐 **Authentication**: Secure login system
- 📱 **Responsive Design**: Works on all devices
- 🎨 **Modern UI**: Clean, professional interface
- 🚀 **Fast Performance**: Optimized for speed

## 🏃‍♂️ Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MySQL database
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/react-blog.git
cd react-blog
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
# Copy example env file
cp backend/.env.example backend/.env

# Edit backend/.env with your database credentials
```

4. **Start the development servers**
```bash
# Option 1: Simple static server (working)
node simple-server.js

# Option 2: Full development environment (requires setup)
npm run dev
```

## 🌐 Access Points

- **Main Site**: http://localhost:8000
- **Blog Posts**: http://localhost:8000/blog
- **Admin Dashboard**: http://localhost:8000/admin
- **Admin Login**: http://localhost:8000/admin/login

### Default Admin Credentials
- **Email**: admin@example.com
- **Password**: admin123

## 📁 Project Structure

```
react-blog/
├── backend/           # Node.js API server
│   ├── src/          # TypeScript source code
│   └── .env          # Environment variables
├── public/           # Static HTML files (current working version)
├── src/              # React frontend source
│   ├── components/   # React components
│   ├── pages/        # Page components
│   └── posts/        # Markdown blog posts
├── simple-server.js  # Simple static file server
└── package.json      # Project dependencies
```

## 📝 Blog Posts

Sample blog posts are included:
- Getting Started with Gatsby and TypeScript
- React Performance Optimization Techniques  
- Building Modern APIs with Node.js and Prisma

Posts are located in `src/posts/blog/` as Markdown files.

## 🛠️ Technology Stack

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **CSS3** - Modern styling
- **HTML5** - Semantic markup

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type safety
- **MySQL** - Database
- **Redis** - Caching
- **JWT** - Authentication

### Development
- **Gatsby** - Static site generation (planned)
- **Webpack** - Module bundling
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 🚧 Current Status

This is a **working prototype** with:
- ✅ Static blog site serving content
- ✅ Admin dashboard interface
- ✅ Blog post management UI
- ✅ Responsive design
- 🔄 Backend API (in development)
- 🔄 Database integration (in development)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ using React and Node.js**
