const meta = require("./gatsby-meta-config")

const siteMetadata = {
  title: meta.title,
  description: meta.description,
  author: meta.author,
  siteUrl: meta.siteUrl,
  lang: meta.lang,
  utterances: {
    repo: meta.utterances,
  },
  postTitle: "All",
  menuLinks: [
    {
      link: "/",
      name: "Home",
    },
    {
      link: "/about/",
      name: "About",
    },
    {
      link: meta.links.github,
      name: "Github",
    },
  ],
}

const corePlugins = [
  {
    resolve: "gatsby-source-filesystem",
    options: {
      name: "src",
      path: `${__dirname}/src`,
      ignore: [`**/*.d.ts`],
    },
  },
  {
    resolve: "gatsby-source-filesystem",
    options: {
      name: "images",
      path: `${__dirname}/src/images`,
    },
  },
]

const devPlugins = [
  {
    resolve: "gatsby-plugin-alias-imports",
    options: {
      alias: {
        "~": ".",
      },
      extensions: ["js", "ts", "tsx"],
    },
  },
  {
    resolve: "gatsby-plugin-typography",
    options: {
      pathToConfigModule: "src/styles/typography",
    },
  },
  "gatsby-plugin-react-helmet",
  "gatsby-plugin-typescript",
  "gatsby-plugin-styled-components",
]

const imagePlugins = [
  "gatsby-plugin-image",
  "gatsby-plugin-sharp",
  "gatsby-transformer-sharp",
]

const markdownPlugins = [
  {
    resolve: "gatsby-transformer-remark",
    options: {
      plugins: [
        "gatsby-remark-copy-linked-files",
        {
          resolve: "gatsby-remark-vscode",
          options: {
            theme: {
              default: "Github Light Theme",
              parentSelector: {
                "body[data-theme=dark]": "Dark Github",
              },
            },
            extensions: ["vscode-theme-github-light", "dark-github-theme"],
          },
        },
        {
          resolve: "gatsby-remark-images",
          options: {
            linkImagesToOriginal: false,
          },
        },
      ],
    },
  },
]

const searchPlugins = [
  "gatsby-plugin-sitemap",
  "gatsby-plugin-robots-txt",
  {
    resolve: `gatsby-plugin-feed`,
    options: {
      query: `
        {
          site {
            siteMetadata {
              title
              description
              siteUrl
              site_url: siteUrl
            }
          }
        }
      `,
      feeds: [
        {
          serialize: ({ query: { site, allMarkdownRemark } }) => {
            return allMarkdownRemark.edges.map(edge => {
              return Object.assign({}, edge.node.frontmatter, {
                description: edge.node.excerpt,
                date: edge.node.frontmatter.date,
                url: site.siteMetadata.siteUrl + edge.node.fields.slug,
                guid: site.siteMetadata.siteUrl + edge.node.fields.slug,
                custom_elements: [{ "content:encoded": edge.node.html }],
              })
            })
          },
          query: `
            {
              allMarkdownRemark(
                filter: { fileAbsolutePath: { regex: "/(posts/blog)/" } }
                sort: { frontmatter: { date: DESC } }
              ) {
                edges {
                  node {
                    excerpt
                    html
                    fields { slug }
                    frontmatter {
                      title
                      date
                    }
                  }
                }
              }
            }
          `,
          output: "/rss.xml",
          title: `${meta.title}'s RSS Feed`,
        },
      ],
    },
  },
]

const pwaPlugins = [
  {
    resolve: "gatsby-plugin-manifest",
    options: {
      name: meta.title,
      short_name: meta.title,
      description: meta.description,
      lang: meta.lang,
      start_url: "/",
      background_color: "#ffffff",
      theme_color: "#ffffff",
      display: "standalone",
      icon: meta.favicon,
      icon_options: {
        purpose: "any maskable",
      },
    },
  },
  "gatsby-plugin-offline",
]

module.exports = {
  graphqlTypegen: true,
  siteMetadata,
  plugins: [
    ...corePlugins,
    ...devPlugins,
    ...imagePlugins,
    ...markdownPlugins,
    ...searchPlugins,
    ...pwaPlugins,
    {
      resolve: 'gatsby-plugin-webpack-bundle-analyser-v2',
      options: {
        analyzerMode: 'static',
        reportFilename: 'bundle-report.html',
        openAnalyzer: false,
        generateStatsFile: true,
        statsFilename: 'webpack-stats.json'
      }
    },
    {
      resolve: 'gatsby-plugin-image',
      options: {
        defaults: {
          formats: ['auto', 'webp', 'avif'],
          placeholder: 'blurred',
          quality: 80,
          breakpoints: [750, 1080, 1366, 1920],
          backgroundColor: 'transparent'
        }
      }
    },
    {
      resolve: 'gatsby-plugin-critical',
      options: {
        base: './public/',
        src: 'index.html',
        dest: 'index.html',
        extract: true,
        inline: true,
        width: 1300,
        height: 900,
        penthouse: {
          blockJSRequests: false,
        }
      }
    },
    {
      resolve: 'gatsby-plugin-offline',
      options: {
        precachePages: ['/', '/admin/*'],
        workboxConfig: {
          globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,gif,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|webp|svg|gif|tiff)$/,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            }
          ]
        }
      }
    },
    {
      resolve: 'gatsby-plugin-preload-fonts',
      options: {
        crossOrigin: 'anonymous'
      }
    }
  ],
}
