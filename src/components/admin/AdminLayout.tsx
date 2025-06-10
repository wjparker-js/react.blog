import React, { useState } from 'react'
import styled from 'styled-components'
import { Link, navigate } from 'gatsby'
import { useAuth } from '../../hooks/useAuth'

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background: #f5f5f5;
`

const Sidebar = styled.aside<{ isOpen: boolean }>`
  width: ${props => props.isOpen ? '250px' : '60px'};
  background: #2c3e50;
  color: white;
  transition: width 0.3s ease;
  position: fixed;
  height: 100vh;
  overflow-y: auto;
  z-index: 1000;

  @media (max-width: 768px) {
    width: ${props => props.isOpen ? '250px' : '0'};
    transform: translateX(${props => props.isOpen ? '0' : '-100%'});
  }
`

const SidebarHeader = styled.div`
  padding: 1rem;
  border-bottom: 1px solid #34495e;
  text-align: center;
`

const Logo = styled.h1`
  font-size: 1.2rem;
  margin: 0;
  color: #ecf0f1;
`

const SidebarNav = styled.nav`
  padding: 1rem 0;
`

const NavItem = styled(Link)`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: #bdc3c7;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover, &.active {
    background: #34495e;
    color: #ecf0f1;
  }

  .icon {
    width: 20px;
    margin-right: 0.75rem;
    text-align: center;
  }

  .text {
    opacity: ${props => props.theme?.sidebarOpen ? 1 : 0};
    transition: opacity 0.3s ease;
  }
`

const MainContent = styled.main<{ sidebarOpen: boolean }>`
  flex: 1;
  margin-left: ${props => props.sidebarOpen ? '250px' : '60px'};
  transition: margin-left 0.3s ease;

  @media (max-width: 768px) {
    margin-left: 0;
  }
`

const TopBar = styled.header`
  background: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const MenuToggle = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #2c3e50;
`

const UserMenu = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`

const LogoutButton = styled.button`
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #c0392b;
  }
`

const Content = styled.div`
  padding: 1rem;
`

interface AdminLayoutProps {
  children: React.ReactNode
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <LayoutContainer>
      <Sidebar isOpen={sidebarOpen}>
        <SidebarHeader>
          <Logo>CMS Admin</Logo>
        </SidebarHeader>
        <SidebarNav>
          <NavItem to="/admin" activeClassName="active">
            <span className="icon">📊</span>
            <span className="text">Dashboard</span>
          </NavItem>
          <NavItem to="/admin/posts" activeClassName="active">
            <span className="icon">📝</span>
            <span className="text">Posts</span>
          </NavItem>
          <NavItem to="/admin/categories" activeClassName="active">
            <span className="icon">📂</span>
            <span className="text">Categories</span>
          </NavItem>
          <NavItem to="/admin/tags" activeClassName="active">
            <span className="icon">🏷️</span>
            <span className="text">Tags</span>
          </NavItem>
          <NavItem to="/admin/media" activeClassName="active">
            <span className="icon">🖼️</span>
            <span className="text">Media</span>
          </NavItem>
          <NavItem to="/admin/comments" activeClassName="active">
            <span className="icon">💬</span>
            <span className="text">Comments</span>
          </NavItem>
          <NavItem to="/admin/users" activeClassName="active">
            <span className="icon">👥</span>
            <span className="text">Users</span>
          </NavItem>
          <NavItem to="/admin/settings" activeClassName="active">
            <span className="icon">⚙️</span>
            <span className="text">Settings</span>
          </NavItem>
        </SidebarNav>
      </Sidebar>

      <MainContent sidebarOpen={sidebarOpen}>
        <TopBar>
          <MenuToggle onClick={toggleSidebar}>
            ☰
          </MenuToggle>
          <UserMenu>
            <UserInfo>
              <span>Welcome, {user?.name}</span>
              <span>({user?.role})</span>
            </UserInfo>
            <LogoutButton onClick={handleLogout}>
              Logout
            </LogoutButton>
          </UserMenu>
        </TopBar>
        <Content>
          {children}
        </Content>
      </MainContent>
    </LayoutContainer>
  )
}

export default AdminLayout 