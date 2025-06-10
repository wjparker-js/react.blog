# Gatsby Blog CMS

A modern, full-featured blog content management system built with Gatsby, React, TypeScript, Prisma, and MySQL. This project transforms the original Gatsby blog starter into a complete CMS with authentication, content management, and admin dashboard.

## 🚀 Features

### Content Management
- **WYSIWYG Editor**: Rich text editing with inline images and YouTube videos
- **Post Management**: Create, edit, publish, and schedule blog posts
- **Category & Tag System**: Organize content with hierarchical categories and tags
- **Media Library**: Upload and manage images and videos with automatic optimization
- **Comment System**: Moderated comment system with approval workflow
- **SEO Optimization**: Built-in meta tags, Open Graph, and sitemap generation

### User Management & Security
- **Role-Based Access Control**: Admin, Editor, Author, and Viewer roles
- **JWT Authentication**: Secure authentication with refresh tokens
- **Session Management**: Active session tracking and management
- **Password Security**: Bcrypt hashing with configurable rounds
- **Rate Limiting**: Protection against brute force attacks
- **Input Sanitization**: XSS protection and input validation

### Technical Features
- **TypeScript**: Full type safety across the entire stack
- **Prisma ORM**: Type-safe database operations with migrations
- **Redis Caching**: Performance optimization with Redis
- **File Upload**: Secure file upload with type validation
- **API Documentation**: RESTful API with comprehensive endpoints
- **Docker Support**: Containerized deployment with Docker Compose
- **Development Tools**: Hot reload, linting, and testing setup

## 🏗️ Architecture

```
📁 Project Structure
├── 📁 backend/           # Node.js + Express API
│   ├── 📁 src/
│   │   ├── 📁 config/    # Database & environment config
│   │   ├── 📁 middleware/ # Auth, validation, security
│   │   ├── 📁 routes/    # API endpoints
│   │   ├── 📁 services/  # Business logic
│   │   ├── 📁 types/     # TypeScript definitions
│   │   └── 📁 prisma/    # Database schema & seeds
│   └── 📄 Dockerfile
├── 📁 admin/             # React admin dashboard
├── 📁 src/               # Gatsby frontend
├── 📁 prisma/            # Database schema
├── 📄 docker-compose.yml
└── 📄 package.json
```

## 🛠️ Technology Stack

### Backend
- **Node.js 20+** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Prisma ORM** - Database ORM
- **MySQL 8.0** - Primary database
- **Redis 7** - Caching and sessions
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Joi** - Input validation
- **Multer & Sharp** - File upload and processing

### Frontend
- **Gatsby 5** - Static site generator
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Styled Components** - CSS-in-JS styling
- **React Helmet** - SEO management

### DevOps
- **Docker & Docker Compose** - Containerization
- **GitHub Actions** - CI/CD (future)
- **Nginx** - Reverse proxy (optional)

## 📋 Prerequisites

- **Node.js** 20 or higher
- **npm** 9 or higher
- **MySQL** 8.0 (or Docker)
- **Redis** 7 (or Docker)
- **Git**

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/your-username/gatsby-blog-cms.git
cd gatsby-blog-cms

# Install all dependencies
npm run install:all
```

### 2. Environment Setup

```bash
# Copy environment file
cp backend/env.example backend/.env

# Update the database connection in backend/.env
DATABASE_URL="mysql://root:SealTeam6@localhost:3306/gatsby_blog_cms"
```

### 3. Database Setup

```bash
# Start MySQL and Redis (using Docker)
docker-compose up mysql redis -d

# Setup database
npm run db:setup
```

### 4. Start Development

```bash
# Start all services
npm run dev

# Or start individually
npm run dev:backend    # Backend API (port 3001)
npm run dev:admin      # Admin dashboard (port 3000)
npm run dev:frontend   # Gatsby site (port 8000)
```

## 🐳 Docker Development

```bash
# Start all services with Docker
npm run docker:dev

# Stop services
npm run docker:stop

# Clean up containers and volumes
npm run docker:clean
```

## 📊 Database Schema

The system uses 13 database models:

- **User** - User accounts with roles
- **Post** - Blog posts with metadata
- **Category** - Hierarchical categories
- **Tag** - Post tags
- **Media** - File uploads
- **Comment** - Post comments
- **UserSession** - Active sessions
- **PasswordReset** - Password reset tokens
- **SocialProfile** - Social media profiles
- **SocialPost** - Social media integrations
- **PostRevision** - Post version history
- **ActivityLog** - Audit trail
- **Setting** - System configuration

## 🔐 Default Credentials

After seeding, use these credentials to log in:

- **Admin**: `admin@gatsby-cms.com` / `admin123!@#`
- **Editor**: `editor@gatsby-cms.com` / `editor123!@#`
- **Author**: `author@gatsby-cms.com` / `author123!@#`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Content Management
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post

### Categories & Tags
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag

### Media Management
- `POST /api/media/upload` - Upload files
- `GET /api/media` - List media
- `DELETE /api/media/:id` - Delete media

## 🔧 Configuration

### Environment Variables

**Database**
- `DATABASE_URL` - MySQL connection string
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port

**Authentication**
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `JWT_EXPIRES_IN` - Token expiration time
- `BCRYPT_ROUNDS` - Password hashing rounds

**File Upload**
- `UPLOAD_DIR` - Upload directory
- `MAX_FILE_SIZE` - Maximum file size
- `ALLOWED_IMAGE_TYPES` - Allowed image types
- `ALLOWED_VIDEO_TYPES` - Allowed video types

**Security**
- `RATE_LIMIT_WINDOW_MS` - Rate limit window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## 🚀 Deployment

### Production Build

```bash
# Build all components
npm run build

# Start production servers
npm run start
```

### Docker Production

```bash
# Deploy with Docker Compose
npm run docker:prod

# Check service status
docker-compose ps

# View logs
docker-compose logs -f backend
```

### Ubuntu 24 Server Deployment

1. **Install Docker and Docker Compose**
```bash
sudo apt update
sudo apt install docker.io docker-compose-v2
sudo usermod -aG docker $USER
```

2. **Clone and Deploy**
```bash
git clone <repository-url>
cd gatsby-blog-cms
cp backend/env.example backend/.env
# Edit .env with production values
docker-compose up -d
```

3. **Setup Nginx (Optional)**
```bash
sudo apt install nginx
sudo cp nginx/conf.d/default.conf /etc/nginx/sites-available/gatsby-cms
sudo ln -s /etc/nginx/sites-available/gatsby-cms /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run backend tests
npm run test:backend

# Run admin dashboard tests
npm run test:admin

# Type checking
npm run type-check
```

## 📚 Development Scripts

```bash
# Database operations
npm run db:migrate    # Run migrations
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio
npm run db:reset      # Reset database

# Code quality
npm run lint          # Lint all code
npm run format        # Format code
npm run type-check    # TypeScript checking

# Docker operations
npm run docker:dev    # Development environment
npm run docker:prod   # Production environment
npm run docker:clean  # Clean up containers
```

## 🔒 Security Considerations

- Change default JWT secrets in production
- Use strong passwords for database users
- Enable HTTPS in production
- Configure firewall rules
- Regular security updates
- Monitor logs for suspicious activity
- Backup database regularly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original Gatsby Starter Apple by [Sungik Choi](https://github.com/sungik-choi/gatsby-starter-apple)
- Gatsby.js team for the excellent framework
- Prisma team for the amazing ORM
- All contributors and maintainers

## 📞 Support

For support, email support@your-domain.com or create an issue on GitHub.

---

**Built with ❤️ using modern web technologies** 