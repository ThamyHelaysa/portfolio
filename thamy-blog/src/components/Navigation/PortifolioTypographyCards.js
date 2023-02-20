import * as React from 'react';
import { graphql, useStaticQuery } from 'gatsby';

import PortifolioCards from './PortifolioCards';

const PortifolioTypographyCards = () => {
    const data = useStaticQuery(graphql`
      query {
        allFile(
          filter: {relativeDirectory: {eq: "portifolio/typography"}}
          sort: {name: ASC}
          ) {
            nodes {
              childImageSharp {
                id
                fluid {
                  src
                  presentationHeight
                  presentationWidth
                }
              }
              name
          }
        }
      }
    `)
    return (
      <PortifolioCards
        className="--app-cards"
        cards={data.allFile.nodes}>    
      </PortifolioCards>
    )
}

export default PortifolioTypographyCards;
