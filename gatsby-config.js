module.exports = {
  siteMetadata: {
    title: "Blog CMS",
    description: "A Gatsby blog with CMS functionality",
    author: "@gatsby",
  },
  plugins: [
    "gatsby-plugin-typescript",
    "gatsby-plugin-styled-components",
    {
      resolve: "gatsby-source-filesystem",
      options: {
        name: "src",
        path: `${__dirname}/src`,
      },
    },
  ],
} 