/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
  siteMetadata: {
    title: `thamy-blog`,
    siteUrl: `https://www.yourdomain.tld`,
    description: "My new portfolio"
  },
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/src/images`,
        name: 'images',
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/src/images/portifolio`,
        name: "images-portifolio"
      }
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/src/images/portifolio/typography`,
        name: "images-typography"
      }
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        "name": "pages",
        "path": "./src/pages/"
      },
      __key: "pages"
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'blog',
        path: `${__dirname}/blog`
      }
    },
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'content',
        path: `${__dirname}/src/pages/projects/content`
      }
    },
    {
      resolve: 'gatsby-source-mongodb',
      options: {
          dbName: 'portfolio',
          collection: 'latin_phrases',
          server: {
              address: 'ac-u2aonht-shard-00-01.dqustge.mongodb.net',
              port: 27017
          },
          auth: {
              user: 'default',
              password: 'LPO1HvEWC9WW0uQZ'
          },
          extraParams: {
              ssl: true,
              authSource: 'admin',
              retryWrites: true
          }
      }
    },
    "gatsby-plugin-mdx",
    `gatsby-plugin-styled-components`,
    `gatsby-plugin-image`,
    `gatsby-plugin-sharp`,
    `gatsby-transformer-sharp`,
    {
      resolve: 'gatsby-plugin-react-svg',
      options: {
        rule: {
          include: /\.inline\.svg$/
        }
      }
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        icon: `./src/images/android-chrome-512x512.png`,
        icons: [
          {
            src: `./src/images/android-chrome-192x192.png`,
            sizes: `192x192`,
            type: `image/png`,
          },
          {
            src: `./src/images/android-chrome-512x512.png`,
            sizes: `512x512`,
            type: `image/png`,
          },
        ],
      },
    },
  ],
};