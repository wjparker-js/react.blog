import { Router, Request, Response } from 'express'
import { AuthService } from '@/services/auth.service'
import { authenticate, AuthError } from '@/middleware/auth'
import { validate } from '@/middleware/validation'
import { authSchemas } from '@/middleware/validation'
import { authRateLimit } from '@/middleware/security'
import { ApiResponse } from '@/types/api'

const router = Router()

// Apply rate limiting to all auth routes
router.use(authRateLimit)

// User registration
router.post('/register', 
  validate(authSchemas.register),
  async (req: Request, res: Response) => {
    try {
      const authResponse = await AuthService.register(req.body)
      
      res.status(201).json({
        success: true,
        data: authResponse,
        message: 'Registration successful',
      } as ApiResponse)
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Registration failed',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// User login
router.post('/login',
  validate(authSchemas.login),
  async (req: Request, res: Response) => {
    try {
      const authResponse = await AuthService.login(req.body, req)
      
      res.json({
        success: true,
        data: authResponse,
        message: 'Login successful',
      } as ApiResponse)
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Login failed',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// Refresh access token
router.post('/refresh',
  validate(authSchemas.refreshToken),
  async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body
      const authResponse = await AuthService.refreshToken(refreshToken, req)
      
      res.json({
        success: true,
        data: authResponse,
        message: 'Token refreshed successfully',
      } as ApiResponse)
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Token refresh failed',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// User logout
router.post('/logout',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      await AuthService.logout(req.token!)
      
      res.json({
        success: true,
        message: 'Logout successful',
      } as ApiResponse)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// Get current user profile
router.get('/profile',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = await AuthService.getProfile(req.user!.id)
      
      res.json({
        success: true,
        data: user,
        message: 'Profile retrieved successfully',
      } as ApiResponse)
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Profile not found',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// Update user profile
router.put('/profile',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = await AuthService.updateProfile(req.user!.id, req.body)
      
      res.json({
        success: true,
        data: user,
        message: 'Profile updated successfully',
      } as ApiResponse)
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Profile update failed',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// Change password
router.post('/change-password',
  authenticate,
  validate(authSchemas.changePassword),
  async (req: Request, res: Response) => {
    try {
      await AuthService.changePassword(req.user!.id, req.body)
      
      res.json({
        success: true,
        message: 'Password changed successfully',
      } as ApiResponse)
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Password change failed',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// Forgot password - request reset token
router.post('/forgot-password',
  validate(authSchemas.forgotPassword),
  async (req: Request, res: Response) => {
    try {
      await AuthService.forgotPassword(req.body)
      
      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      } as ApiResponse)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Password reset request failed',
        message: 'An error occurred while processing your request',
      } as ApiResponse)
    }
  }
)

// Reset password with token
router.post('/reset-password',
  validate(authSchemas.resetPassword),
  async (req: Request, res: Response) => {
    try {
      await AuthService.resetPassword(req.body)
      
      res.json({
        success: true,
        message: 'Password reset successful',
      } as ApiResponse)
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Password reset failed',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// Get user sessions
router.get('/sessions',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const sessions = await AuthService.getUserSessions(req.user!.id)
      
      res.json({
        success: true,
        data: sessions,
        message: 'Sessions retrieved successfully',
      } as ApiResponse)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve sessions',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// Revoke specific session
router.delete('/sessions/:sessionId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params
      await AuthService.revokeSession(req.user!.id, sessionId)
      
      res.json({
        success: true,
        message: 'Session revoked successfully',
      } as ApiResponse)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to revoke session',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// Revoke all sessions except current
router.delete('/sessions',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      await AuthService.revokeAllSessions(req.user!.id, req.token)
      
      res.json({
        success: true,
        message: 'All other sessions revoked successfully',
      } as ApiResponse)
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to revoke sessions',
        message: (error as Error).message,
      } as ApiResponse)
    }
  }
)

// Verify token endpoint (for frontend to check if token is still valid)
router.get('/verify',
  authenticate,
  async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        user: req.user,
        tokenValid: true,
      },
      message: 'Token is valid',
    } as ApiResponse)
  }
)

export default router 