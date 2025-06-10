import { PrismaClient, UserRole, PostStatus, MediaType, CommentStatus } from '@prisma/client'
import bcrypt from 'bcrypt'
import slugify from 'slugify'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123!@#', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gatsby-cms.com' },
    update: {},
    create: {
      email: 'admin@gatsby-cms.com',
      username: 'admin',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      bio: 'System administrator for Gatsby Blog CMS',
      isActive: true,
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Create editor user
  const editorPassword = await bcrypt.hash('editor123!@#', 12)
  const editor = await prisma.user.upsert({
    where: { email: 'editor@gatsby-cms.com' },
    update: {},
    create: {
      email: 'editor@gatsby-cms.com',
      username: 'editor',
      password: editorPassword,
      firstName: 'Editor',
      lastName: 'User',
      role: UserRole.EDITOR,
      bio: 'Content editor for Gatsby Blog CMS',
      isActive: true,
    },
  })
  console.log('✅ Editor user created:', editor.email)

  // Create author user
  const authorPassword = await bcrypt.hash('author123!@#', 12)
  const author = await prisma.user.upsert({
    where: { email: 'author@gatsby-cms.com' },
    update: {},
    create: {
      email: 'author@gatsby-cms.com',
      username: 'author',
      password: authorPassword,
      firstName: 'Author',
      lastName: 'User',
      role: UserRole.AUTHOR,
      bio: 'Content author for Gatsby Blog CMS',
      isActive: true,
    },
  })
  console.log('✅ Author user created:', author.email)

  // Create categories
  const categories = [
    {
      name: 'Technology',
      description: 'Posts about technology, programming, and software development',
      color: '#3B82F6',
      sortOrder: 1,
    },
    {
      name: 'Design',
      description: 'UI/UX design, web design, and creative content',
      color: '#8B5CF6',
      sortOrder: 2,
    },
    {
      name: 'Business',
      description: 'Business insights, entrepreneurship, and industry news',
      color: '#10B981',
      sortOrder: 3,
    },
    {
      name: 'Tutorial',
      description: 'Step-by-step guides and how-to articles',
      color: '#F59E0B',
      sortOrder: 4,
    },
    {
      name: 'News',
      description: 'Latest news and updates in tech and business',
      color: '#EF4444',
      sortOrder: 5,
    },
  ]

  const createdCategories = []
  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: { slug: slugify(categoryData.name, { lower: true }) },
      update: {},
      create: {
        ...categoryData,
        slug: slugify(categoryData.name, { lower: true }),
        isActive: true,
      },
    })
    createdCategories.push(category)
    console.log('✅ Category created:', category.name)
  }

  // Create tags
  const tags = [
    { name: 'React', color: '#61DAFB' },
    { name: 'TypeScript', color: '#3178C6' },
    { name: 'Node.js', color: '#339933' },
    { name: 'Gatsby', color: '#663399' },
    { name: 'JavaScript', color: '#F7DF1E' },
    { name: 'CSS', color: '#1572B6' },
    { name: 'HTML', color: '#E34F26' },
    { name: 'GraphQL', color: '#E10098' },
    { name: 'API', color: '#FF6B6B' },
    { name: 'Database', color: '#4ECDC4' },
    { name: 'Performance', color: '#45B7D1' },
    { name: 'Security', color: '#96CEB4' },
    { name: 'DevOps', color: '#FFEAA7' },
    { name: 'Testing', color: '#DDA0DD' },
    { name: 'Mobile', color: '#98D8C8' },
  ]

  const createdTags = []
  for (const tagData of tags) {
    const tag = await prisma.tag.upsert({
      where: { slug: slugify(tagData.name, { lower: true }) },
      update: {},
      create: {
        ...tagData,
        slug: slugify(tagData.name, { lower: true }),
      },
    })
    createdTags.push(tag)
    console.log('✅ Tag created:', tag.name)
  }

  // Create sample posts
  const posts = [
    {
      title: 'Getting Started with Gatsby and TypeScript',
      content: `# Getting Started with Gatsby and TypeScript

Gatsby is a modern web framework that helps developers build fast, secure, and powerful websites using React. When combined with TypeScript, it provides an excellent developer experience with type safety and better tooling.

## Why Gatsby + TypeScript?

- **Type Safety**: Catch errors at compile time
- **Better Developer Experience**: Enhanced IDE support
- **Modern Tooling**: Latest JavaScript features
- **Performance**: Optimized build process

## Setting Up Your Project

\`\`\`bash
npm install -g gatsby-cli
gatsby new my-blog https://github.com/gatsbyjs/gatsby-starter-typescript
cd my-blog
gatsby develop
\`\`\`

## Key Features

1. **Static Site Generation**: Pre-built pages for better performance
2. **GraphQL Data Layer**: Unified data access across your site
3. **Plugin Ecosystem**: Rich ecosystem of plugins
4. **Image Optimization**: Automatic image processing and optimization

This is just the beginning of your Gatsby journey!`,
      excerpt: 'Learn how to set up a modern blog using Gatsby and TypeScript for better development experience and type safety.',
      status: PostStatus.PUBLISHED,
      publishedAt: new Date('2024-01-15'),
      viewCount: 142,
      metaTitle: 'Getting Started with Gatsby and TypeScript | Modern Web Development',
      metaDescription: 'A comprehensive guide to building fast, type-safe websites with Gatsby and TypeScript. Perfect for modern web development.',
    },
    {
      title: 'Building a Scalable Node.js API with Prisma',
      content: `# Building a Scalable Node.js API with Prisma

Modern applications require robust and scalable backend APIs. In this guide, we'll explore how to build a production-ready API using Node.js, Express, and Prisma ORM.

## What is Prisma?

Prisma is a next-generation ORM that provides:
- Type-safe database access
- Auto-generated client
- Database migrations
- Excellent TypeScript support

## Project Setup

\`\`\`bash
mkdir my-api
cd my-api
npm init -y
npm install prisma @prisma/client express
npm install -D typescript @types/node @types/express tsx
\`\`\`

## Database Schema

\`\`\`prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
\`\`\`

## Best Practices

1. **Use Transactions**: For complex operations
2. **Input Validation**: Always validate user input
3. **Error Handling**: Implement comprehensive error handling
4. **Rate Limiting**: Protect your API from abuse
5. **Authentication**: Secure your endpoints

Start building amazing APIs today!`,
      excerpt: 'Comprehensive guide to building scalable Node.js APIs using Prisma ORM with TypeScript and best practices.',
      status: PostStatus.PUBLISHED,
      publishedAt: new Date('2024-01-10'),
      viewCount: 89,
      metaTitle: 'Building Scalable Node.js APIs with Prisma ORM',
      metaDescription: 'Learn to build production-ready Node.js APIs with Prisma ORM, TypeScript, and modern best practices.',
    },
    {
      title: 'React Performance Optimization Techniques',
      content: `# React Performance Optimization Techniques

Performance is crucial for user experience. Let's explore various techniques to optimize React applications for better performance and user satisfaction.

## Key Optimization Strategies

### 1. Memoization
Use React.memo for component memoization:

\`\`\`jsx
const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{data.map(item => <Item key={item.id} item={item} />)}</div>
})
\`\`\`

### 2. useMemo and useCallback
Optimize expensive calculations and function references:

\`\`\`jsx
const MyComponent = ({ items, onItemClick }) => {
  const expensiveValue = useMemo(() => {
    return items.reduce((acc, item) => acc + item.value, 0)
  }, [items])

  const handleClick = useCallback((id) => {
    onItemClick(id)
  }, [onItemClick])

  return (
    <div>
      <p>Total: {expensiveValue}</p>
      {items.map(item => (
        <Item 
          key={item.id} 
          item={item} 
          onClick={handleClick}
        />
      ))}
    </div>
  )
}
\`\`\`

### 3. Code Splitting
Implement lazy loading for better initial load times:

\`\`\`jsx
const LazyComponent = React.lazy(() => import('./LazyComponent'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  )
}
\`\`\`

## Performance Monitoring

- Use React DevTools Profiler
- Monitor Core Web Vitals
- Implement performance budgets
- Regular performance audits

Remember: Measure before optimizing!`,
      excerpt: 'Master React performance optimization with memoization, code splitting, and modern techniques for faster applications.',
      status: PostStatus.PUBLISHED,
      publishedAt: new Date('2024-01-05'),
      viewCount: 203,
      metaTitle: 'React Performance Optimization - Complete Guide',
      metaDescription: 'Comprehensive guide to React performance optimization techniques including memoization, code splitting, and monitoring.',
    },
    {
      title: 'Draft: Advanced GraphQL Schema Design',
      content: `# Advanced GraphQL Schema Design

This is a draft post about advanced GraphQL schema design patterns and best practices...

## Schema Design Principles

1. **Schema First Approach**
2. **Nullable vs Non-nullable Fields**
3. **Pagination Strategies**
4. **Error Handling**

More content coming soon...`,
      excerpt: 'Advanced patterns and best practices for designing scalable GraphQL schemas.',
      status: PostStatus.DRAFT,
      publishedAt: null,
      viewCount: 0,
      metaTitle: 'Advanced GraphQL Schema Design Patterns',
      metaDescription: 'Learn advanced GraphQL schema design patterns for building scalable and maintainable APIs.',
    },
  ]

  const createdPosts = []
  for (let i = 0; i < posts.length; i++) {
    const postData = posts[i]
    const post = await prisma.post.create({
      data: {
        ...postData,
        slug: slugify(postData.title, { lower: true, strict: true }),
        authorId: i % 2 === 0 ? author.id : editor.id,
        categoryId: createdCategories[i % createdCategories.length].id,
      },
    })

    // Add tags to posts
    const postTags = createdTags.slice(i * 2, (i * 2) + 3) // 3 tags per post
    await prisma.post.update({
      where: { id: post.id },
      data: {
        tags: {
          connect: postTags.map(tag => ({ id: tag.id })),
        },
      },
    })

    createdPosts.push(post)
    console.log('✅ Post created:', post.title)
  }

  // Create sample comments for published posts
  const publishedPosts = createdPosts.filter(post => post.status === PostStatus.PUBLISHED)
  
  const comments = [
    {
      content: 'Great tutorial! This helped me get started with Gatsby and TypeScript. The examples are very clear.',
      author: 'John Developer',
      email: 'john@example.com',
      status: CommentStatus.APPROVED,
    },
    {
      content: 'Thanks for sharing this. I had some issues with the setup but following your guide resolved them.',
      author: 'Sarah Designer',
      email: 'sarah@example.com',
      status: CommentStatus.APPROVED,
    },
    {
      content: 'Excellent explanation of Prisma! I\'ve been looking for a comprehensive guide like this.',
      author: 'Mike Backend',
      email: 'mike@example.com',
      status: CommentStatus.APPROVED,
    },
    {
      content: 'The performance tips are very useful. Implementing these improved my app significantly.',
      author: 'Lisa Frontend',
      email: 'lisa@example.com',
      status: CommentStatus.APPROVED,
    },
    {
      content: 'Spam comment with suspicious content...',
      author: 'Spammer',
      email: 'spam@bad.com',
      status: CommentStatus.PENDING,
    },
  ]

  for (let i = 0; i < comments.length; i++) {
    const commentData = comments[i]
    const post = publishedPosts[i % publishedPosts.length]
    
    await prisma.comment.create({
      data: {
        ...commentData,
        postId: post.id,
      },
    })
    console.log('✅ Comment created for post:', post.title)
  }

  // Create site settings
  await prisma.setting.upsert({
    where: { key: 'site_name' },
    update: {},
    create: {
      key: 'site_name',
      value: 'Gatsby Blog CMS',
      category: 'general',
      description: 'The name of your website',
    },
  })

  await prisma.setting.upsert({
    where: { key: 'site_description' },
    update: {},
    create: {
      key: 'site_description',
      value: 'A modern blog built with Gatsby, React, and TypeScript',
      category: 'general',
      description: 'A brief description of your website',
    },
  })

  await prisma.setting.upsert({
    where: { key: 'site_url' },
    update: {},
    create: {
      key: 'site_url',
      value: 'https://localhost:8000',
      category: 'general',
      description: 'The main URL of your website',
    },
  })

  await prisma.setting.upsert({
    where: { key: 'posts_per_page' },
    update: {},
    create: {
      key: 'posts_per_page',
      value: '10',
      category: 'content',
      description: 'Number of posts to display per page',
    },
  })

  console.log('✅ Site settings created')

  // Create some activity logs
  await prisma.activityLog.createMany({
    data: [
      {
        action: 'user_created',
        entity: 'User',
        entityId: admin.id,
        userId: admin.id,
        userEmail: admin.email,
        details: { role: 'ADMIN' },
      },
      {
        action: 'post_created',
        entity: 'Post',
        entityId: createdPosts[0].id,
        userId: author.id,
        userEmail: author.email,
        details: { title: createdPosts[0].title, status: 'PUBLISHED' },
      },
    ],
  })

  console.log('✅ Activity logs created')

  console.log('\n🎉 Database seeding completed successfully!')
  console.log('\n📋 Summary:')
  console.log(`👤 Users: ${createdCategories.length + 3} (1 admin, 1 editor, 1 author)`)
  console.log(`📁 Categories: ${createdCategories.length}`)
  console.log(`🏷️  Tags: ${createdTags.length}`)
  console.log(`📝 Posts: ${createdPosts.length}`)
  console.log(`💬 Comments: ${comments.length}`)
  console.log(`⚙️  Settings: 4`)
  
  console.log('\n🔐 Default Login Credentials:')
  console.log('Admin: admin@gatsby-cms.com / admin123!@#')
  console.log('Editor: editor@gatsby-cms.com / editor123!@#')
  console.log('Author: author@gatsby-cms.com / author123!@#')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 