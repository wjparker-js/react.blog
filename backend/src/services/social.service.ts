import { PrismaClient, UserRole } from '@prisma/client'
import { redisClient } from '@/config/redis'
import { logger } from '@/utils/logger'
import { emailService } from '@/utils/email'
import jwt from 'jsonwebtoken'
import { config } from '@/config/env'
import axios from 'axios'

const prisma = new PrismaClient()

interface SocialProvider {
  id: string
  name: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scope: string[]
  authUrl: string
  tokenUrl: string
}

interface SocialProfile {
  id: string
  email: string
  name: string
  avatar?: string
  provider: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

interface FollowStats {
  followersCount: number
  followingCount: number
  mutualFollowsCount: number
  isFollowing: boolean
  isFollowedBy: boolean
}

interface SocialShareData {
  platform: 'twitter' | 'facebook' | 'linkedin' | 'reddit' | 'pinterest'
  title: string
  description: string
  url: string
  image?: string
  tags?: string[]
}

interface SocialPost {
  id: string
  platform: string
  content: string
  mediaUrls?: string[]
  scheduledAt?: Date
  publishedAt?: Date
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  metrics?: {
    likes: number
    shares: number
    comments: number
    impressions: number
  }
}

export class SocialService {
  private readonly CACHE_TTL = 3600 // 1 hour
  private readonly FOLLOW_CACHE_TTL = 1800 // 30 minutes

  // Social Authentication
  async authenticateWithProvider(provider: string, code: string, state?: string): Promise<{ user: any; isNewUser: boolean }> {
    try {
      const providerConfig = this.getProviderConfig(provider)
      if (!providerConfig) {
        throw new Error(`Unsupported provider: ${provider}`)
      }

      // Exchange code for access token
      const tokenData = await this.exchangeCodeForToken(providerConfig, code)
      
      // Get user profile from provider
      const socialProfile = await this.getUserProfile(providerConfig, tokenData.access_token)
      
      // Find or create user
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: socialProfile.email },
            {
              socialProfiles: {
                some: {
                  providerId: socialProfile.id,
                  provider: provider.toUpperCase()
                }
              }
            }
          ]
        },
        include: {
          socialProfiles: true
        }
      })

      let isNewUser = false
      
      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            name: socialProfile.name,
            email: socialProfile.email,
            avatar: socialProfile.avatar,
            isEmailVerified: true, // Trust social provider
            role: UserRole.VIEWER,
            socialProfiles: {
              create: {
                provider: provider.toUpperCase(),
                providerId: socialProfile.id,
                email: socialProfile.email,
                name: socialProfile.name,
                avatar: socialProfile.avatar,
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined
              }
            }
          },
          include: {
            socialProfiles: true
          }
        })
        isNewUser = true
        
        // Send welcome email
        await emailService.sendWelcomeEmail(user.email, user.name)
      } else {
        // Update existing user's social profile
        const existingSocialProfile = user.socialProfiles.find(
          sp => sp.provider === provider.toUpperCase() && sp.providerId === socialProfile.id
        )

        if (existingSocialProfile) {
          // Update existing social profile
          await prisma.socialProfile.update({
            where: { id: existingSocialProfile.id },
            data: {
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
              name: socialProfile.name,
              avatar: socialProfile.avatar
            }
          })
        } else {
          // Create new social profile for existing user
          await prisma.socialProfile.create({
            data: {
              userId: user.id,
              provider: provider.toUpperCase(),
              providerId: socialProfile.id,
              email: socialProfile.email,
              name: socialProfile.name,
              avatar: socialProfile.avatar,
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined
            }
          })
        }

        // Update user's last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })
      }

      // Clear cache
      await this.clearUserCache(user.id)

      return { user, isNewUser }
    } catch (error) {
      logger.error('Social authentication failed:', error)
      throw new Error('Social authentication failed')
    }
  }

  async disconnectSocialProfile(userId: string, provider: string): Promise<void> {
    try {
      await prisma.socialProfile.deleteMany({
        where: {
          userId,
          provider: provider.toUpperCase()
        }
      })

      await this.clearUserCache(userId)
      logger.info(`Disconnected ${provider} profile for user ${userId}`)
    } catch (error) {
      logger.error('Failed to disconnect social profile:', error)
      throw new Error('Failed to disconnect social profile')
    }
  }

  // User Following System
  async followUser(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new Error('Users cannot follow themselves')
    }

    try {
      // Check if follow relationship already exists
      const existingFollow = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      })

      if (existingFollow) {
        throw new Error('Already following this user')
      }

      // Create follow relationship
      await prisma.userFollow.create({
        data: {
          followerId,
          followingId
        }
      })

      // Clear cache
      await Promise.all([
        this.clearFollowCache(followerId),
        this.clearFollowCache(followingId)
      ])

      // Send notification to followed user
      const [follower, following] = await Promise.all([
        prisma.user.findUnique({ where: { id: followerId }, select: { name: true, email: true } }),
        prisma.user.findUnique({ where: { id: followingId }, select: { name: true, email: true } })
      ])

      if (follower && following) {
        await emailService.sendFollowNotification(following.email, following.name, follower.name)
      }

      logger.info(`User ${followerId} followed user ${followingId}`)
    } catch (error) {
      logger.error('Failed to follow user:', error)
      throw error
    }
  }

  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    try {
      await prisma.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId
          }
        }
      })

      // Clear cache
      await Promise.all([
        this.clearFollowCache(followerId),
        this.clearFollowCache(followingId)
      ])

      logger.info(`User ${followerId} unfollowed user ${followingId}`)
    } catch (error) {
      logger.error('Failed to unfollow user:', error)
      throw new Error('Failed to unfollow user')
    }
  }

  async getFollowStats(userId: string, viewerId?: string): Promise<FollowStats> {
    const cacheKey = `follow_stats:${userId}:${viewerId || 'anonymous'}`
    
    try {
      const cached = await redisClient.get(cacheKey)
      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      logger.warn('Failed to get follow stats from cache:', error)
    }

    try {
      const [followersCount, followingCount, mutualFollows, isFollowing, isFollowedBy] = await Promise.all([
        prisma.userFollow.count({ where: { followingId: userId } }),
        prisma.userFollow.count({ where: { followerId: userId } }),
        viewerId ? this.getMutualFollowsCount(userId, viewerId) : 0,
        viewerId ? this.checkIsFollowing(viewerId, userId) : false,
        viewerId ? this.checkIsFollowing(userId, viewerId) : false
      ])

      const stats: FollowStats = {
        followersCount,
        followingCount,
        mutualFollowsCount: mutualFollows,
        isFollowing,
        isFollowedBy
      }

      // Cache for 30 minutes
      try {
        await redisClient.setex(cacheKey, this.FOLLOW_CACHE_TTL, JSON.stringify(stats))
      } catch (error) {
        logger.warn('Failed to cache follow stats:', error)
      }

      return stats
    } catch (error) {
      logger.error('Failed to get follow stats:', error)
      throw new Error('Failed to retrieve follow statistics')
    }
  }

  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<{ followers: any[]; total: number }> {
    try {
      const offset = (page - 1) * limit

      const [followers, total] = await Promise.all([
        prisma.userFollow.findMany({
          where: { followingId: userId },
          include: {
            follower: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                bio: true,
                role: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.userFollow.count({ where: { followingId: userId } })
      ])

      return {
        followers: followers.map(f => f.follower),
        total
      }
    } catch (error) {
      logger.error('Failed to get followers:', error)
      throw new Error('Failed to retrieve followers')
    }
  }

  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<{ following: any[]; total: number }> {
    try {
      const offset = (page - 1) * limit

      const [following, total] = await Promise.all([
        prisma.userFollow.findMany({
          where: { followerId: userId },
          include: {
            following: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                bio: true,
                role: true,
                createdAt: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.userFollow.count({ where: { followerId: userId } })
      ])

      return {
        following: following.map(f => f.following),
        total
      }
    } catch (error) {
      logger.error('Failed to get following:', error)
      throw new Error('Failed to retrieve following')
    }
  }

  // Social Sharing
  async generateShareUrls(shareData: SocialShareData): Promise<Record<string, string>> {
    const baseUrls = {
      twitter: 'https://twitter.com/intent/tweet',
      facebook: 'https://www.facebook.com/sharer/sharer.php',
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/',
      reddit: 'https://reddit.com/submit',
      pinterest: 'https://pinterest.com/pin/create/button/'
    }

    const shareUrls: Record<string, string> = {}

    // Twitter
    const twitterParams = new URLSearchParams({
      text: `${shareData.title} - ${shareData.description}`,
      url: shareData.url,
      hashtags: shareData.tags?.join(',') || ''
    })
    shareUrls.twitter = `${baseUrls.twitter}?${twitterParams.toString()}`

    // Facebook
    const facebookParams = new URLSearchParams({
      u: shareData.url
    })
    shareUrls.facebook = `${baseUrls.facebook}?${facebookParams.toString()}`

    // LinkedIn
    const linkedinParams = new URLSearchParams({
      url: shareData.url
    })
    shareUrls.linkedin = `${baseUrls.linkedin}?${linkedinParams.toString()}`

    // Reddit
    const redditParams = new URLSearchParams({
      url: shareData.url,
      title: shareData.title
    })
    shareUrls.reddit = `${baseUrls.reddit}?${redditParams.toString()}`

    // Pinterest
    if (shareData.image) {
      const pinterestParams = new URLSearchParams({
        url: shareData.url,
        media: shareData.image,
        description: shareData.description
      })
      shareUrls.pinterest = `${baseUrls.pinterest}?${pinterestParams.toString()}`
    }

    return shareUrls
  }

  async trackSocialShare(postId: string, platform: string, userId?: string): Promise<void> {
    try {
      // Track share in database
      await prisma.socialShare.create({
        data: {
          postId,
          platform: platform.toUpperCase(),
          userId,
          sharedAt: new Date()
        }
      })

      // Update post share count
      await prisma.post.update({
        where: { id: postId },
        data: {
          shareCount: {
            increment: 1
          }
        }
      })

      logger.info(`Tracked social share: ${platform} for post ${postId}`)
    } catch (error) {
      logger.error('Failed to track social share:', error)
    }
  }

  // Social Media Post Scheduling
  async schedulePost(userId: string, postData: Omit<SocialPost, 'id' | 'status'>): Promise<SocialPost> {
    try {
      const socialPost = await prisma.socialPost.create({
        data: {
          userId,
          platform: postData.platform.toUpperCase(),
          content: postData.content,
          mediaUrls: postData.mediaUrls || [],
          scheduledAt: postData.scheduledAt,
          status: postData.scheduledAt ? 'SCHEDULED' : 'DRAFT'
        }
      })

      // If scheduled for future, add to job queue
      if (postData.scheduledAt && postData.scheduledAt > new Date()) {
        await this.queueScheduledPost(socialPost.id)
      }

      return {
        id: socialPost.id,
        platform: socialPost.platform,
        content: socialPost.content,
        mediaUrls: socialPost.mediaUrls,
        scheduledAt: socialPost.scheduledAt,
        publishedAt: socialPost.publishedAt,
        status: socialPost.status as any
      }
    } catch (error) {
      logger.error('Failed to schedule post:', error)
      throw new Error('Failed to schedule social media post')
    }
  }

  async publishScheduledPost(postId: string): Promise<void> {
    try {
      const socialPost = await prisma.socialPost.findUnique({
        where: { id: postId },
        include: {
          user: {
            include: {
              socialProfiles: true
            }
          }
        }
      })

      if (!socialPost) {
        throw new Error('Social post not found')
      }

      const socialProfile = socialPost.user.socialProfiles.find(
        sp => sp.provider === socialPost.platform
      )

      if (!socialProfile) {
        throw new Error(`No ${socialPost.platform} profile found for user`)
      }

      // Publish to social platform
      await this.publishToSocialPlatform(socialPost, socialProfile)

      // Update post status
      await prisma.socialPost.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      })

      logger.info(`Published scheduled post ${postId} to ${socialPost.platform}`)
    } catch (error) {
      logger.error('Failed to publish scheduled post:', error)
      
      // Mark as failed
      await prisma.socialPost.update({
        where: { id: postId },
        data: { status: 'FAILED' }
      })
      
      throw error
    }
  }

  async getSocialPosts(userId: string, platform?: string, status?: string): Promise<SocialPost[]> {
    try {
      const whereClause: any = { userId }
      
      if (platform) {
        whereClause.platform = platform.toUpperCase()
      }
      
      if (status) {
        whereClause.status = status.toUpperCase()
      }

      const posts = await prisma.socialPost.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' }
      })

      return posts.map(post => ({
        id: post.id,
        platform: post.platform,
        content: post.content,
        mediaUrls: post.mediaUrls,
        scheduledAt: post.scheduledAt,
        publishedAt: post.publishedAt,
        status: post.status as any
      }))
    } catch (error) {
      logger.error('Failed to get social posts:', error)
      throw new Error('Failed to retrieve social posts')
    }
  }

  // Helper methods
  private getProviderConfig(provider: string): SocialProvider | null {
    const configs: Record<string, SocialProvider> = {
      google: {
        id: 'google',
        name: 'Google',
        clientId: config.google?.clientId || '',
        clientSecret: config.google?.clientSecret || '',
        redirectUri: config.google?.redirectUri || '',
        scope: ['openid', 'email', 'profile'],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token'
      },
      github: {
        id: 'github',
        name: 'GitHub',
        clientId: config.github?.clientId || '',
        clientSecret: config.github?.clientSecret || '',
        redirectUri: config.github?.redirectUri || '',
        scope: ['user:email'],
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token'
      },
      twitter: {
        id: 'twitter',
        name: 'Twitter',
        clientId: config.twitter?.clientId || '',
        clientSecret: config.twitter?.clientSecret || '',
        redirectUri: config.twitter?.redirectUri || '',
        scope: ['tweet.read', 'users.read'],
        authUrl: 'https://twitter.com/i/oauth2/authorize',
        tokenUrl: 'https://api.twitter.com/2/oauth2/token'
      }
    }

    return configs[provider] || null
  }

  private async exchangeCodeForToken(provider: SocialProvider, code: string): Promise<any> {
    const tokenData = {
      grant_type: 'authorization_code',
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      redirect_uri: provider.redirectUri
    }

    const response = await axios.post(provider.tokenUrl, tokenData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    return response.data
  }

  private async getUserProfile(provider: SocialProvider, accessToken: string): Promise<SocialProfile> {
    let profileUrl = ''
    
    switch (provider.id) {
      case 'google':
        profileUrl = 'https://www.googleapis.com/oauth2/v2/userinfo'
        break
      case 'github':
        profileUrl = 'https://api.github.com/user'
        break
      case 'twitter':
        profileUrl = 'https://api.twitter.com/2/users/me'
        break
    }

    const response = await axios.get(profileUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const profile = response.data
    
    return {
      id: profile.id || profile.sub,
      email: profile.email,
      name: profile.name || profile.login,
      avatar: profile.picture || profile.avatar_url || profile.profile_image_url,
      provider: provider.id,
      accessToken
    }
  }

  private async getMutualFollowsCount(userId1: string, userId2: string): Promise<number> {
    const user1Following = await prisma.userFollow.findMany({
      where: { followerId: userId1 },
      select: { followingId: true }
    })

    const user2Following = await prisma.userFollow.findMany({
      where: { followerId: userId2 },
      select: { followingId: true }
    })

    const user1FollowingIds = new Set(user1Following.map(f => f.followingId))
    const mutualCount = user2Following.filter(f => user1FollowingIds.has(f.followingId)).length

    return mutualCount
  }

  private async checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    return !!follow
  }

  private async clearUserCache(userId: string): Promise<void> {
    try {
      const patterns = [`user:${userId}:*`, `follow_stats:${userId}:*`]
      
      for (const pattern of patterns) {
        const keys = await redisClient.keys(pattern)
        if (keys.length > 0) {
          await redisClient.del(...keys)
        }
      }
    } catch (error) {
      logger.warn('Failed to clear user cache:', error)
    }
  }

  private async clearFollowCache(userId: string): Promise<void> {
    try {
      const keys = await redisClient.keys(`follow_stats:*:${userId}`)
      if (keys.length > 0) {
        await redisClient.del(...keys)
      }
    } catch (error) {
      logger.warn('Failed to clear follow cache:', error)
    }
  }

  private async queueScheduledPost(postId: string): Promise<void> {
    // In production, this would integrate with a job queue like Bull or Agenda
    logger.info(`Queued scheduled post ${postId} for publishing`)
  }

  private async publishToSocialPlatform(socialPost: any, socialProfile: any): Promise<void> {
    // This would integrate with actual social media APIs
    logger.info(`Publishing to ${socialPost.platform}: ${socialPost.content}`)
  }
}

export const socialService = new SocialService()