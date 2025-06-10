const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = '';
  
  if (req.url === '/') {
    filePath = path.join(__dirname, 'public', 'index.html');
  } else if (req.url === '/blog') {
    filePath = path.join(__dirname, 'public', 'blog.html');
  } else if (req.url === '/admin') {
    filePath = path.join(__dirname, 'public', 'admin.html');
  } else if (req.url === '/admin/login') {
    filePath = path.join(__dirname, 'public', 'admin-login.html');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end('<h1>404 - Page Not Found</h1>');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end('<h1>500 - Server Error</h1>');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📝 Blog Posts: http://localhost:${PORT}/blog`);
  console.log(`📋 Admin Dashboard: http://localhost:${PORT}/admin`);
  console.log(`🔐 Admin Login: http://localhost:${PORT}/admin/login`);
}); 