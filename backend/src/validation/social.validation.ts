import { z } from 'zod'

// Social Authentication Schemas
export const socialAuthCallbackSchema = z.object({
  body: z.object({
    code: z.string().min(1, 'Authorization code is required'),
    state: z.string().optional(),
    provider: z.enum(['google', 'github', 'twitter'], {
      errorMap: () => ({ message: 'Provider must be google, github, or twitter' })
    })
  })
})

export const disconnectSocialProfileSchema = z.object({
  params: z.object({
    provider: z.enum(['google', 'github', 'twitter'], {
      errorMap: () => ({ message: 'Invalid social provider' })
    })
  })
})

// User Following Schemas
export const followUserSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format')
  })
})

export const unfollowUserSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format')
  })
})

export const getFollowersSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format')
  }),
  query: z.object({
    page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional()
  })
})

export const getFollowingSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format')
  }),
  query: z.object({
    page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).optional()
  })
})

export const getFollowStatsSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format')
  })
})

// Social Sharing Schemas
export const generateShareUrlsSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
    url: z.string().url('Invalid URL format'),
    image: z.string().url('Invalid image URL format').optional(),
    tags: z.array(z.string().min(1).max(50)).max(10, 'Maximum 10 tags allowed').optional(),
    platforms: z.array(z.enum(['twitter', 'facebook', 'linkedin', 'reddit', 'pinterest'])).min(1, 'At least one platform required').optional()
  })
})

export const trackSocialShareSchema = z.object({
  params: z.object({
    postId: z.string().uuid('Invalid post ID format')
  }),
  body: z.object({
    platform: z.enum(['twitter', 'facebook', 'linkedin', 'reddit', 'pinterest', 'whatsapp', 'telegram'], {
      errorMap: () => ({ message: 'Invalid social platform' })
    })
  })
})

// Social Media Post Management Schemas
export const createSocialPostSchema = z.object({
  body: z.object({
    platform: z.enum(['twitter', 'facebook', 'linkedin', 'instagram'], {
      errorMap: () => ({ message: 'Platform must be twitter, facebook, linkedin, or instagram' })
    }),
    content: z.string().min(1, 'Content is required').max(2000, 'Content must be less than 2000 characters'),
    mediaUrls: z.array(z.string().url('Invalid media URL')).max(4, 'Maximum 4 media files allowed').optional(),
    scheduledAt: z.string().datetime('Invalid datetime format').optional()
  })
})

export const updateSocialPostSchema = z.object({
  params: z.object({
    postId: z.string().uuid('Invalid post ID format')
  }),
  body: z.object({
    content: z.string().min(1, 'Content is required').max(2000, 'Content must be less than 2000 characters').optional(),
    mediaUrls: z.array(z.string().url('Invalid media URL')).max(4, 'Maximum 4 media files allowed').optional(),
    scheduledAt: z.string().datetime('Invalid datetime format').optional(),
    status: z.enum(['draft', 'scheduled', 'published', 'cancelled'], {
      errorMap: () => ({ message: 'Invalid post status' })
    }).optional()
  })
})

export const getSocialPostsSchema = z.object({
  query: z.object({
    platform: z.enum(['twitter', 'facebook', 'linkedin', 'instagram']).optional(),
    status: z.enum(['draft', 'scheduled', 'published', 'failed', 'cancelled']).optional(),
    page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(50)).optional(),
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional()
  })
})

export const deleteSocialPostSchema = z.object({
  params: z.object({
    postId: z.string().uuid('Invalid post ID format')
  })
})

export const publishSocialPostSchema = z.object({
  params: z.object({
    postId: z.string().uuid('Invalid post ID format')
  })
})

// Social Analytics Schemas
export const getSocialAnalyticsSchema = z.object({
  query: z.object({
    platform: z.enum(['twitter', 'facebook', 'linkedin', 'instagram']).optional(),
    timeframe: z.enum(['24h', '7d', '30d', '90d', '1y'], {
      errorMap: () => ({ message: 'Timeframe must be 24h, 7d, 30d, 90d, or 1y' })
    }).optional(),
    metrics: z.array(z.enum(['impressions', 'engagements', 'clicks', 'shares', 'likes', 'comments'])).optional()
  })
})

export const getShareAnalyticsSchema = z.object({
  params: z.object({
    postId: z.string().uuid('Invalid post ID format')
  }),
  query: z.object({
    timeframe: z.enum(['24h', '7d', '30d', '90d'], {
      errorMap: () => ({ message: 'Timeframe must be 24h, 7d, 30d, or 90d' })
    }).optional()
  })
})

// Social Profile Management Schemas
export const getSocialProfilesSchema = z.object({
  query: z.object({
    provider: z.enum(['google', 'github', 'twitter', 'facebook', 'linkedin']).optional()
  })
})

export const updateSocialProfileSchema = z.object({
  params: z.object({
    profileId: z.string().uuid('Invalid profile ID format')
  }),
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    website: z.string().url('Invalid website URL').optional(),
    location: z.string().max(100).optional(),
    autoShare: z.boolean().optional(),
    shareTypes: z.array(z.enum(['posts', 'updates', 'announcements'])).optional()
  })
})

// Bulk Operations Schemas
export const bulkFollowUsersSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().uuid('Invalid user ID format')).min(1, 'At least one user ID required').max(50, 'Maximum 50 users allowed')
  })
})

export const bulkUnfollowUsersSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().uuid('Invalid user ID format')).min(1, 'At least one user ID required').max(50, 'Maximum 50 users allowed')
  })
})

export const bulkDeleteSocialPostsSchema = z.object({
  body: z.object({
    postIds: z.array(z.string().uuid('Invalid post ID format')).min(1, 'At least one post ID required').max(20, 'Maximum 20 posts allowed'),
    reason: z.string().min(1).max(200).optional()
  })
})

export const bulkScheduleSocialPostsSchema = z.object({
  body: z.object({
    posts: z.array(z.object({
      platform: z.enum(['twitter', 'facebook', 'linkedin', 'instagram']),
      content: z.string().min(1).max(2000),
      mediaUrls: z.array(z.string().url()).max(4).optional(),
      scheduledAt: z.string().datetime()
    })).min(1, 'At least one post required').max(10, 'Maximum 10 posts allowed'),
    timezone: z.string().optional()
  })
})

// Social Import/Export Schemas
export const exportSocialDataSchema = z.object({
  query: z.object({
    type: z.enum(['posts', 'analytics', 'followers', 'following', 'all'], {
      errorMap: () => ({ message: 'Export type must be posts, analytics, followers, following, or all' })
    }),
    format: z.enum(['json', 'csv', 'xlsx'], {
      errorMap: () => ({ message: 'Format must be json, csv, or xlsx' })
    }).optional(),
    startDate: z.string().datetime('Invalid start date format').optional(),
    endDate: z.string().datetime('Invalid end date format').optional()
  })
})

export const importSocialDataSchema = z.object({
  body: z.object({
    type: z.enum(['posts', 'followers'], {
      errorMap: () => ({ message: 'Import type must be posts or followers' })
    }),
    data: z.record(z.any()).refine(data => Object.keys(data).length > 0, {
      message: 'Import data cannot be empty'
    }),
    overwrite: z.boolean().optional()
  })
})

// Social Search Schemas
export const searchSocialUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
    provider: z.enum(['all', 'google', 'github', 'twitter', 'facebook', 'linkedin']).optional(),
    verified: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
    hasFollowers: z.string().transform(val => parseInt(val)).pipe(z.number().min(0)).optional(),
    page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(50)).optional()
  })
})

export const searchSocialPostsSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required').max(100, 'Search query must be less than 100 characters'),
    platform: z.enum(['all', 'twitter', 'facebook', 'linkedin', 'instagram']).optional(),
    status: z.enum(['all', 'draft', 'scheduled', 'published', 'failed']).optional(),
    hasMedia: z.string().transform(val => val === 'true').pipe(z.boolean()).optional(),
    page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(50)).optional(),
    sortBy: z.enum(['createdAt', 'scheduledAt', 'engagement', 'reach']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
})

// Webhook Schemas
export const socialWebhookSchema = z.object({
  body: z.object({
    event: z.string().min(1, 'Event type is required'),
    platform: z.enum(['twitter', 'facebook', 'linkedin', 'instagram']),
    data: z.record(z.any()),
    timestamp: z.string().datetime().optional(),
    signature: z.string().optional()
  }),
  headers: z.object({
    'x-webhook-signature': z.string().optional(),
    'user-agent': z.string().optional()
  }).passthrough()
})

// Rate Limiting Schemas
export const checkRateLimitSchema = z.object({
  query: z.object({
    platform: z.enum(['twitter', 'facebook', 'linkedin', 'instagram']),
    endpoint: z.string().min(1, 'Endpoint is required'),
    userId: z.string().uuid('Invalid user ID format').optional()
  })
})

export type SocialAuthCallbackInput = z.infer<typeof socialAuthCallbackSchema>
export type DisconnectSocialProfileInput = z.infer<typeof disconnectSocialProfileSchema>
export type FollowUserInput = z.infer<typeof followUserSchema>
export type UnfollowUserInput = z.infer<typeof unfollowUserSchema>
export type GetFollowersInput = z.infer<typeof getFollowersSchema>
export type GetFollowingInput = z.infer<typeof getFollowingSchema>
export type GetFollowStatsInput = z.infer<typeof getFollowStatsSchema>
export type GenerateShareUrlsInput = z.infer<typeof generateShareUrlsSchema>
export type TrackSocialShareInput = z.infer<typeof trackSocialShareSchema>
export type CreateSocialPostInput = z.infer<typeof createSocialPostSchema>
export type UpdateSocialPostInput = z.infer<typeof updateSocialPostSchema>
export type GetSocialPostsInput = z.infer<typeof getSocialPostsSchema>
export type DeleteSocialPostInput = z.infer<typeof deleteSocialPostSchema>
export type PublishSocialPostInput = z.infer<typeof publishSocialPostSchema>
export type GetSocialAnalyticsInput = z.infer<typeof getSocialAnalyticsSchema>
export type GetShareAnalyticsInput = z.infer<typeof getShareAnalyticsSchema>
export type GetSocialProfilesInput = z.infer<typeof getSocialProfilesSchema>
export type UpdateSocialProfileInput = z.infer<typeof updateSocialProfileSchema>
export type BulkFollowUsersInput = z.infer<typeof bulkFollowUsersSchema>
export type BulkUnfollowUsersInput = z.infer<typeof bulkUnfollowUsersSchema>
export type BulkDeleteSocialPostsInput = z.infer<typeof bulkDeleteSocialPostsSchema>
export type BulkScheduleSocialPostsInput = z.infer<typeof bulkScheduleSocialPostsSchema>
export type ExportSocialDataInput = z.infer<typeof exportSocialDataSchema>
export type ImportSocialDataInput = z.infer<typeof importSocialDataSchema>
export type SearchSocialUsersInput = z.infer<typeof searchSocialUsersSchema>
export type SearchSocialPostsInput = z.infer<typeof searchSocialPostsSchema>
export type SocialWebhookInput = z.infer<typeof socialWebhookSchema>
export type CheckRateLimitInput = z.infer<typeof checkRateLimitSchema> 