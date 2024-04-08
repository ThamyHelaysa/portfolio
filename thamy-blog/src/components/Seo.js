import * as React from 'react';
import { graphql, useStaticQuery } from 'gatsby';;


const Seo = ({title}) => {

  const data = useStaticQuery(graphql`
    query {
      site {
        siteMetadata {
          title
        }
      }
    }
  `);

  const formatTitle = `${title} | ${data.site.siteMetadata.title}`;

  return (
    <title>{formatTitle}</title>
  )
}

export default Seo;
