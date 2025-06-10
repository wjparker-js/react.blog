import React from 'react'
import { Link } from 'gatsby'

const IndexPage = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Blog CMS</h1>
      <p>Welcome to the Gatsby Blog CMS</p>
      <ul>
        <li><Link to="/admin">Go to Admin Dashboard</Link></li>
        <li><Link to="/admin/login">Admin Login</Link></li>
      </ul>
    </div>
  )
}

export default IndexPage
