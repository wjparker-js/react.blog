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

module.exports = {
  siteMetadata,
  plugins: [
    "gatsby-plugin-react-helmet",
    "gatsby-plugin-typescript",
    "gatsby-plugin-styled-components",
    "gatsby-plugin-image",
    "gatsby-plugin-sharp",
    "gatsby-transformer-sharp",
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
  ],
} 