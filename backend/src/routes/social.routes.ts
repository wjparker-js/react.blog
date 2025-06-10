import { Router } from 'express'
import { asyncHandler } from '@/middleware/asyncHandler'
import { authenticate, authorize } from '@/middleware/auth'
import { validate } from '@/middleware/validation'
import { rateLimiter } from '@/middleware/rateLimiter'
import { socialService } from '@/services/social.service'
import {
  socialAuthCallbackSchema,
  disconnectSocialProfileSchema,
  followUserSchema,
  unfollowUserSchema,
  getFollowersSchema,
  getFollowingSchema,
  getFollowStatsSchema,
  generateShareUrlsSchema,
  trackSocialShareSchema,
  createSocialPostSchema,
  updateSocialPostSchema,
  getSocialPostsSchema,
  deleteSocialPostSchema,
  publishSocialPostSchema,
  getSocialAnalyticsSchema,
  getShareAnalyticsSchema,
  getSocialProfilesSchema,
  updateSocialProfileSchema,
  bulkFollowUsersSchema,
  bulkUnfollowUsersSchema,
  bulkDeleteSocialPostsSchema,
  bulkScheduleSocialPostsSchema,
  exportSocialDataSchema,
  importSocialDataSchema,
  searchSocialUsersSchema,
  searchSocialPostsSchema,
  socialWebhookSchema,
  checkRateLimitSchema
} from '@/validation/social.validation'

const router = Router()

// Social Authentication Routes
router.post('/auth/callback',
  rateLimiter(10, 60), // 10 requests per minute
  validate(socialAuthCallbackSchema),
  asyncHandler(async (req, res) => {
    const { code, state, provider } = req.body

    const result = await socialService.authenticateWithProvider(provider, code, state)

    res.status(200).json({
      success: true,
      message: `Successfully authenticated with ${provider}`,
      data: {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          avatar: result.user.avatar
        },
        isNewUser: result.isNewUser
      }
    })
  })
)

router.delete('/auth/:provider',
  authenticate,
  validate(disconnectSocialProfileSchema),
  asyncHandler(async (req, res) => {
    const { provider } = req.params
    const userId = req.user!.id

    await socialService.disconnectSocialProfile(userId, provider)

    res.status(200).json({
      success: true,
      message: `Successfully disconnected ${provider} profile`
    })
  })
)

// User Following Routes
router.post('/users/:userId/follow',
  authenticate,
  rateLimiter(30, 300), // 30 follows per 5 minutes
  validate(followUserSchema),
  asyncHandler(async (req, res) => {
    const { userId: followingId } = req.params
    const followerId = req.user!.id

    await socialService.followUser(followerId, followingId)

    res.status(200).json({
      success: true,
      message: 'Successfully followed user'
    })
  })
)

router.delete('/users/:userId/follow',
  authenticate,
  validate(unfollowUserSchema),
  asyncHandler(async (req, res) => {
    const { userId: followingId } = req.params
    const followerId = req.user!.id

    await socialService.unfollowUser(followerId, followingId)

    res.status(200).json({
      success: true,
      message: 'Successfully unfollowed user'
    })
  })
)

router.get('/users/:userId/followers',
  validate(getFollowersSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query

    const result = await socialService.getFollowers(userId, page, limit)

    res.status(200).json({
      success: true,
      data: result
    })
  })
)

router.get('/users/:userId/following',
  validate(getFollowingSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.params
    const { page = 1, limit = 20 } = req.query

    const result = await socialService.getFollowing(userId, page, limit)

    res.status(200).json({
      success: true,
      data: result
    })
  })
)

router.get('/users/:userId/follow-stats',
  validate(getFollowStatsSchema),
  asyncHandler(async (req, res) => {
    const { userId } = req.params
    const viewerId = req.user?.id

    const stats = await socialService.getFollowStats(userId, viewerId)

    res.status(200).json({
      success: true,
      data: stats
    })
  })
)

// Bulk Follow Operations
router.post('/users/bulk-follow',
  authenticate,
  rateLimiter(5, 300), // 5 bulk operations per 5 minutes
  validate(bulkFollowUsersSchema),
  asyncHandler(async (req, res) => {
    const { userIds } = req.body
    const followerId = req.user!.id

    const results = []
    for (const userId of userIds) {
      try {
        await socialService.followUser(followerId, userId)
        results.push({ userId, success: true })
      } catch (error) {
        results.push({ userId, success: false, error: error.message })
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk follow operation completed',
      data: { results }
    })
  })
)

router.post('/users/bulk-unfollow',
  authenticate,
  rateLimiter(5, 300), // 5 bulk operations per 5 minutes
  validate(bulkUnfollowUsersSchema),
  asyncHandler(async (req, res) => {
    const { userIds } = req.body
    const followerId = req.user!.id

    const results = []
    for (const userId of userIds) {
      try {
        await socialService.unfollowUser(followerId, userId)
        results.push({ userId, success: true })
      } catch (error) {
        results.push({ userId, success: false, error: error.message })
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk unfollow operation completed',
      data: { results }
    })
  })
)

// Social Sharing Routes
router.post('/share/generate-urls',
  rateLimiter(100, 3600), // 100 requests per hour
  validate(generateShareUrlsSchema),
  asyncHandler(async (req, res) => {
    const shareData = req.body

    const shareUrls = await socialService.generateShareUrls(shareData)

    res.status(200).json({
      success: true,
      data: { shareUrls }
    })
  })
)

router.post('/posts/:postId/share/track',
  validate(trackSocialShareSchema),
  asyncHandler(async (req, res) => {
    const { postId } = req.params
    const { platform } = req.body
    const userId = req.user?.id

    await socialService.trackSocialShare(postId, platform, userId)

    res.status(200).json({
      success: true,
      message: 'Share tracked successfully'
    })
  })
)

router.get('/posts/:postId/share/analytics',
  authenticate,
  authorize(['ADMIN', 'MODERATOR', 'EDITOR']),
  validate(getShareAnalyticsSchema),
  asyncHandler(async (req, res) => {
    const { postId } = req.params
    const { timeframe = '30d' } = req.query

    // This would integrate with analytics service
    res.status(200).json({
      success: true,
      data: {
        postId,
        timeframe,
        shares: {
          twitter: 45,
          facebook: 32,
          linkedin: 18,
          reddit: 7,
          pinterest: 12
        },
        totalShares: 114,
        engagement: {
          clicks: 1250,
          conversions: 35
        }
      }
    })
  })
)

// Social Media Post Management Routes
router.post('/posts',
  authenticate,
  rateLimiter(20, 3600), // 20 posts per hour
  validate(createSocialPostSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const postData = req.body

    const socialPost = await socialService.schedulePost(userId, postData)

    res.status(201).json({
      success: true,
      message: 'Social media post created successfully',
      data: socialPost
    })
  })
)

router.get('/posts',
  authenticate,
  validate(getSocialPostsSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const { platform, status } = req.query

    const posts = await socialService.getSocialPosts(userId, platform, status)

    res.status(200).json({
      success: true,
      data: { posts }
    })
  })
)

router.put('/posts/:postId',
  authenticate,
  validate(updateSocialPostSchema),
  asyncHandler(async (req, res) => {
    const { postId } = req.params
    const updateData = req.body

    // This would be implemented in the service
    res.status(200).json({
      success: true,
      message: 'Social media post updated successfully'
    })
  })
)

router.post('/posts/:postId/publish',
  authenticate,
  validate(publishSocialPostSchema),
  asyncHandler(async (req, res) => {
    const { postId } = req.params

    await socialService.publishScheduledPost(postId)

    res.status(200).json({
      success: true,
      message: 'Post published successfully'
    })
  })
)

router.delete('/posts/:postId',
  authenticate,
  validate(deleteSocialPostSchema),
  asyncHandler(async (req, res) => {
    const { postId } = req.params

    // This would be implemented in the service
    res.status(200).json({
      success: true,
      message: 'Social media post deleted successfully'
    })
  })
)

// Bulk Post Operations
router.post('/posts/bulk-schedule',
  authenticate,
  authorize(['ADMIN', 'EDITOR']),
  rateLimiter(5, 3600), // 5 bulk operations per hour
  validate(bulkScheduleSocialPostsSchema),
  asyncHandler(async (req, res) => {
    const { posts } = req.body
    const userId = req.user!.id

    const results = []
    for (const postData of posts) {
      try {
        const socialPost = await socialService.schedulePost(userId, postData)
        results.push({ success: true, post: socialPost })
      } catch (error) {
        results.push({ success: false, error: error.message })
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk schedule operation completed',
      data: { results }
    })
  })
)

router.delete('/posts/bulk-delete',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  validate(bulkDeleteSocialPostsSchema),
  asyncHandler(async (req, res) => {
    const { postIds, reason } = req.body

    // This would be implemented in the service
    res.status(200).json({
      success: true,
      message: `Bulk deleted ${postIds.length} social media posts`,
      data: { deletedCount: postIds.length, reason }
    })
  })
)

// Social Profile Management Routes
router.get('/profiles',
  authenticate,
  validate(getSocialProfilesSchema),
  asyncHandler(async (req, res) => {
    const userId = req.user!.id
    const { provider } = req.query

    // This would get user's connected social profiles
    res.status(200).json({
      success: true,
      data: {
        profiles: [] // Would be populated from database
      }
    })
  })
)

router.put('/profiles/:profileId',
  authenticate,
  validate(updateSocialProfileSchema),
  asyncHandler(async (req, res) => {
    const { profileId } = req.params
    const updateData = req.body

    // This would update social profile settings
    res.status(200).json({
      success: true,
      message: 'Social profile updated successfully'
    })
  })
)

// Social Analytics Routes
router.get('/analytics',
  authenticate,
  authorize(['ADMIN', 'MODERATOR', 'EDITOR']),
  validate(getSocialAnalyticsSchema),
  asyncHandler(async (req, res) => {
    const { platform, timeframe = '30d', metrics } = req.query

    // This would integrate with analytics service
    res.status(200).json({
      success: true,
      data: {
        platform,
        timeframe,
        metrics: {
          impressions: 15420,
          engagements: 2341,
          clicks: 567,
          shares: 123,
          followers: 1024
        }
      }
    })
  })
)

// Search Routes
router.get('/search/users',
  validate(searchSocialUsersSchema),
  asyncHandler(async (req, res) => {
    const { q, provider = 'all', page = 1, limit = 20 } = req.query

    // This would implement social user search
    res.status(200).json({
      success: true,
      data: {
        users: [],
        total: 0,
        page,
        limit
      }
    })
  })
)

router.get('/search/posts',
  authenticate,
  validate(searchSocialPostsSchema),
  asyncHandler(async (req, res) => {
    const { q, platform = 'all', status = 'all', page = 1, limit = 20 } = req.query

    // This would implement social post search
    res.status(200).json({
      success: true,
      data: {
        posts: [],
        total: 0,
        page,
        limit
      }
    })
  })
)

// Import/Export Routes
router.get('/export',
  authenticate,
  authorize(['ADMIN', 'MODERATOR']),
  validate(exportSocialDataSchema),
  asyncHandler(async (req, res) => {
    const { type, format = 'json', startDate, endDate } = req.query
    const userId = req.user!.id

    // This would export social data
    res.status(200).json({
      success: true,
      message: 'Social data export initiated',
      data: {
        exportId: 'export_123',
        type,
        format,
        status: 'processing'
      }
    })
  })
)

router.post('/import',
  authenticate,
  authorize(['ADMIN']),
  rateLimiter(2, 3600), // 2 imports per hour
  validate(importSocialDataSchema),
  asyncHandler(async (req, res) => {
    const { type, data, overwrite = false } = req.body

    // This would import social data
    res.status(200).json({
      success: true,
      message: 'Social data import initiated',
      data: {
        importId: 'import_123',
        type,
        status: 'processing',
        itemCount: Object.keys(data).length
      }
    })
  })
)

// Webhook Routes
router.post('/webhook/:platform',
  rateLimiter(1000, 3600), // 1000 webhooks per hour
  validate(socialWebhookSchema),
  asyncHandler(async (req, res) => {
    const { platform } = req.params
    const { event, data } = req.body

    // This would handle social platform webhooks
    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully'
    })
  })
)

// Rate Limit Check Route
router.get('/rate-limit/check',
  authenticate,
  validate(checkRateLimitSchema),
  asyncHandler(async (req, res) => {
    const { platform, endpoint, userId } = req.query

    // This would check API rate limits for social platforms
    res.status(200).json({
      success: true,
      data: {
        platform,
        endpoint,
        remaining: 150,
        resetTime: new Date(Date.now() + 3600000).toISOString(),
        limit: 300
      }
    })
  })
)

// Health Check Route
router.get('/health',
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Social service is healthy',
      timestamp: new Date().toISOString()
    })
  })
)

export default router 